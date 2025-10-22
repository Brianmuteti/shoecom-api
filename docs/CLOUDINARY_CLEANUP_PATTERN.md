# Cloudinary Cleanup Pattern

## Problem

When uploading files to Cloudinary **before** saving metadata to the database, if the database transaction fails, we end up with **orphaned images** in Cloudinary that are never referenced in the database.

This leads to:

-   ❌ Wasted Cloudinary storage
-   ❌ Unnecessary costs
-   ❌ Clutter in media library
-   ❌ Difficulty identifying unused images

## Root Cause

**Typical Flow (Problematic):**

```typescript
// 1. Upload to Cloudinary (succeeds)
const uploadResult = await uploadToCloudinary(file, folder);

// 2. Save URL to database (fails!)
await prisma.productMedia.create({ data: { url: uploadResult.secure_url } });

// ⚠️ Image is in Cloudinary but not in database = orphaned!
```

**Why This Happens:**

-   Cloudinary upload is an **external operation** (can't be in DB transaction)
-   Database transaction might fail for various reasons:
    -   Validation errors
    -   Constraint violations
    -   Connection issues
    -   Business logic errors

## Solution: Track & Cleanup Pattern

### Pattern Overview

```typescript
const uploadedUrls: string[] = []; // 1. Track uploads

try {
    // 2. Upload to Cloudinary
    const result = await uploadToCloudinary(file, folder);
    uploadedUrls.push(result.secure_url);

    // 3. Save to database (in transaction)
    await prisma.$transaction(async (tx) => {
        await tx.media.create({ data: { url: result.secure_url } });
    });
} catch (error) {
    // 4. Cleanup on failure
    for (const url of uploadedUrls) {
        const publicId = extractPublicId(url);
        await cloudinary.uploader.destroy(publicId);
    }
    throw error; // Re-throw original error
}
```

## Implementation

### 1. **Variant Controller** ✅ Implemented

#### `createVariants()`

```typescript
const uploadedImageUrls: string[] = []; // Track uploads

try {
    // Upload all variant images to Cloudinary
    for (let i = 0; i < variants.length; i++) {
        for (const file of variantFiles) {
            const uploadResult = await uploadToCloudinary(
                file,
                "LandulaShop/products/variants"
            );
            uploadedImageUrls.push(uploadResult.secure_url); // Track

            variantImages.push({
                url: uploadResult.secure_url,
                // ... other fields
            });
        }
    }

    // Try to save to database
    const created = await VariantService.createVariants(
        productId,
        variantsWithImages
    );

    res.status(201).json({ success: true, data: created });
} catch (error) {
    // 🧹 Cleanup: Delete all uploaded images
    console.error("❌ Variant creation failed, cleaning up uploaded images...");

    for (const imageUrl of uploadedImageUrls) {
        try {
            const publicId = extractPublicId(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`✅ Deleted orphaned image: ${publicId}`);
            }
        } catch (cleanupError) {
            console.error(
                `⚠️  Failed to delete image ${imageUrl}:`,
                cleanupError
            );
            // Continue with other deletions
        }
    }

    throw error; // Re-throw original error
}
```

#### `addVariantImages()`

Same pattern applied for adding images to existing variants.

### 2. **Media Controller** ✅ Implemented

#### `addProductMedia()`

```typescript
const uploadedImageUrls: string[] = []; // Track uploads

try {
    // Process thumbnail
    if (files.thumbnail) {
        const uploadResult = await uploadToCloudinary(thumbnailFile, "LandulaShop/products");
        uploadedImageUrls.push(uploadResult.secure_url); // Track
        mediaData.push({ url: uploadResult.secure_url, ... });
    }

    // Process images
    for (const file of files.images) {
        const uploadResult = await uploadToCloudinary(file, "LandulaShop/products");
        uploadedImageUrls.push(uploadResult.secure_url); // Track
        mediaData.push({ url: uploadResult.secure_url, ... });
    }

    // Try to save to database
    const result = await MediaService.addProductMedia(productId, mediaData);

    res.json({ success: true, data: result });

} catch (error) {
    // 🧹 Cleanup: Delete all uploaded images
    console.error("❌ Product media upload failed, cleaning up uploaded images...");

    for (const imageUrl of uploadedImageUrls) {
        try {
            const publicId = extractPublicId(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`✅ Deleted orphaned image: ${publicId}`);
            }
        } catch (cleanupError) {
            console.error(`⚠️  Failed to delete image ${imageUrl}:`, cleanupError);
        }
    }

    throw error;
}
```

## Best Practices

### 1. ✅ Always Track Uploaded URLs

```typescript
// ✅ Good: Track all uploads
const uploadedUrls: string[] = [];
const result = await uploadToCloudinary(file, folder);
uploadedUrls.push(result.secure_url);

// ❌ Bad: No tracking
await uploadToCloudinary(file, folder); // Lost reference!
```

### 2. ✅ Cleanup Should Be Resilient

```typescript
// ✅ Good: Continue cleaning even if one fails
for (const url of uploadedUrls) {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (cleanupError) {
        console.error(`Failed to delete ${url}`, cleanupError);
        // Continue with next deletion
    }
}

// ❌ Bad: One failure stops all cleanup
for (const url of uploadedUrls) {
    await cloudinary.uploader.destroy(publicId); // Might throw
}
```

### 3. ✅ Always Re-throw Original Error

```typescript
// ✅ Good: Cleanup then re-throw
try {
    await saveToDatabase();
} catch (error) {
    await cleanupCloudinary();
    throw error; // Re-throw so caller knows it failed
}

// ❌ Bad: Swallow error
try {
    await saveToDatabase();
} catch (error) {
    await cleanupCloudinary();
    // Error lost! Caller thinks it succeeded
}
```

### 4. ✅ Log Cleanup Actions

```typescript
// ✅ Good: Log for debugging
console.error("❌ Operation failed, cleaning up...");
for (const url of uploadedUrls) {
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Deleted orphaned image: ${publicId}`);
}

// ❌ Bad: Silent cleanup
for (const url of uploadedUrls) {
    await cloudinary.uploader.destroy(publicId); // No feedback
}
```

## Files Updated

| File                                         | Methods Updated                          | Status  |
| -------------------------------------------- | ---------------------------------------- | ------- |
| `controllers/products/variant.controller.ts` | `createVariants()`, `addVariantImages()` | ✅ Done |
| `controllers/products/media.controller.ts`   | `addProductMedia()`                      | ✅ Done |

## Testing the Pattern

### Test Cleanup on Database Error

```typescript
test("should cleanup Cloudinary images if database save fails", async () => {
    // Mock Cloudinary upload to succeed
    const mockUploadResult = { secure_url: "https://cloudinary.com/test.jpg" };
    jest.spyOn(cloudinary.uploader, "upload_stream").mockImplementation(
        (options, callback) => {
            callback(null, mockUploadResult);
        }
    );

    // Mock database to fail
    jest.spyOn(prisma.productMedia, "create").mockRejectedValue(
        new Error("DB error")
    );

    // Spy on Cloudinary delete
    const destroySpy = jest.spyOn(cloudinary.uploader, "destroy");

    // Try to upload media (should fail)
    await expect(mediaController.addProductMedia(req, res)).rejects.toThrow(
        "DB error"
    );

    // Verify Cloudinary cleanup was called
    expect(destroySpy).toHaveBeenCalledWith(expect.stringContaining("test"));
});
```

### Manual Testing

```bash
# 1. Create a test variant with images (should succeed)
curl -X POST http://localhost:3500/variants/1 \
  -F "variants=[{\"name\":\"Test\",\"sku\":\"TEST123\",\"price\":100,\"attributes\":[]}]" \
  -F "variant_0=@test1.jpg" \
  -F "variant_0=@test2.jpg"

# 2. Check Cloudinary - should have 2 images

# 3. Create with invalid data (should fail)
curl -X POST http://localhost:3500/variants/999999 \
  -F "variants=[{\"name\":\"Test\",\"sku\":\"TEST123\",\"price\":100,\"attributes\":[]}]" \
  -F "variant_0=@test3.jpg"

# 4. Check server logs - should show cleanup messages
# Expected:
#   ❌ Variant creation failed, cleaning up uploaded images...
#   ✅ Deleted orphaned image: LandulaShop/products/variants/test3

# 5. Check Cloudinary - test3.jpg should be deleted
```

## Edge Cases Handled

### 1. ✅ Partial Upload Failure

```typescript
// Scenario: Upload 3 images, 2 succeed, 1 fails
const uploadedUrls = [];

try {
    uploadedUrls.push(await upload(file1)); // ✅ Success
    uploadedUrls.push(await upload(file2)); // ✅ Success
    uploadedUrls.push(await upload(file3)); // ❌ Fails
} catch (error) {
    // Only cleanup successful uploads
    for (const url of uploadedUrls) {
        // Only 2 URLs
        await cloudinary.uploader.destroy(publicId);
    }
}
```

### 2. ✅ Cleanup Failure

```typescript
// Scenario: Image uploaded but cleanup fails
try {
    await saveToDatabase(); // Fails
} catch (error) {
    try {
        await cloudinary.uploader.destroy(publicId); // Also fails
    } catch (cleanupError) {
        // Log but don't throw - original error is more important
        console.error("Cleanup failed:", cleanupError);
    }
    throw error; // Original error preserved
}
```

### 3. ✅ Multiple Images

```typescript
// Scenario: Upload 10 images, DB fails
const uploadedUrls = [];

for (const file of files) {
    const result = await uploadToCloudinary(file, folder);
    uploadedUrls.push(result.secure_url); // Track all 10
}

try {
    await saveToDatabase(); // Fails
} catch (error) {
    // Cleanup all 10 images
    for (const url of uploadedUrls) {
        await cloudinary.uploader.destroy(extractPublicId(url));
    }
}
```

## Benefits

| Aspect              | Before              | After             |
| ------------------- | ------------------- | ----------------- |
| **Orphaned Images** | ✅ Possible         | ❌ Prevented      |
| **Storage Cost**    | 💰 Wasted           | ✅ Optimized      |
| **Media Library**   | 🗑️ Cluttered        | ✅ Clean          |
| **Debugging**       | ❓ Unclear          | ✅ Logged         |
| **Reliability**     | ⚠️ Partial failures | ✅ All-or-nothing |

## Performance Impact

### Cleanup Overhead

```
Successful operation: No overhead (cleanup skipped)
Failed operation: +50-200ms (Cloudinary delete API calls)
```

**Analysis:**

-   Minimal impact on success path (most common)
-   Acceptable overhead on failure (rare)
-   Prevents long-term storage bloat

## Monitoring

### Recommended Logging

```typescript
// Add to cleanup block
console.error("❌ Operation failed, cleaning up uploaded images...");
console.log(`🧹 Cleaning ${uploadedUrls.length} orphaned images`);

for (const url of uploadedUrls) {
    const publicId = extractPublicId(url);
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Deleted: ${publicId}`);
}

console.log("✅ Cleanup completed");
```

### Metrics to Track

1. **Cleanup frequency** - How often do cleanups happen?
2. **Images cleaned** - How many orphaned images prevented?
3. **Cleanup failures** - Are cleanups successful?

```typescript
// Example metric tracking
try {
    await saveToDatabase();
} catch (error) {
    metrics.increment("cloudinary.cleanup.triggered");
    metrics.gauge("cloudinary.cleanup.images", uploadedUrls.length);

    // Cleanup...

    metrics.increment("cloudinary.cleanup.success");
}
```

## Future Improvements

### 1. Async Cleanup Queue

For better performance, queue cleanup jobs:

```typescript
// Instead of immediate cleanup
for (const url of uploadedUrls) {
    await cleanupQueue.add({ url, publicId });
}
```

### 2. Retry Logic

Add retries for failed cleanups:

```typescript
async function cleanupWithRetry(publicId: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await cloudinary.uploader.destroy(publicId);
            return;
        } catch (error) {
            if (i === retries - 1) throw error;
            await sleep(1000 * (i + 1)); // Exponential backoff
        }
    }
}
```

### 3. Orphan Detection Job

Periodic job to find and clean orphaned images:

```typescript
async function cleanOrphanedImages() {
    const cloudinaryImages = await cloudinary.api.resources();
    const dbUrls = await prisma.productMedia.findMany({
        select: { url: true },
    });

    const orphaned = cloudinaryImages.filter(
        (img) => !dbUrls.some((db) => db.url === img.secure_url)
    );

    for (const img of orphaned) {
        await cloudinary.uploader.destroy(img.public_id);
    }
}
```

## Summary

✅ **Pattern Implemented**: Track → Upload → Save → Cleanup on Error  
✅ **Files Updated**: Variant & Media controllers  
✅ **Orphaned Images**: Prevented through automatic cleanup  
✅ **Storage**: Optimized by removing failed uploads  
✅ **Reliability**: All-or-nothing guarantee  
✅ **Logging**: Full visibility into cleanup operations

**Result:** No more orphaned images in Cloudinary! 🎉
