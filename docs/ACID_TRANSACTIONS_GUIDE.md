# ACID Transactions Guide

## Overview

This guide explains how to implement ACID-compliant database operations in your Node.js/Prisma application to ensure data consistency and prevent partial updates.

## What is ACID?

**ACID** stands for:

-   **Atomicity**: All operations succeed or all fail (no partial updates)
-   **Consistency**: Database stays in a valid state
-   **Isolation**: Concurrent transactions don't interfere with each other
-   **Durability**: Committed data persists even after system failure

## Why Use Transactions?

Without transactions, if you perform multiple database operations and one fails, you end up with **partial data** in your database:

### ❌ Bad Example (Without Transactions)

```typescript
// Creating a variant with attributes and images
const variant = await prisma.productVariant.create({ data: variantData });

// ⚠️ If this fails, the variant exists but has no attributes
await prisma.variantAttribute.createMany({ data: attributes });

// ⚠️ If this fails, variant exists with attributes but no images
await prisma.variantMedia.createMany({ data: images });
```

**Problem**: If the image creation fails, you have a variant with attributes but no images - inconsistent data!

### ✅ Good Example (With Transactions)

```typescript
await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.create({ data: variantData });
    await tx.variantAttribute.createMany({ data: attributes });
    await tx.variantMedia.createMany({ data: images });
    // If ANY operation fails, ALL changes are rolled back
});
```

**Result**: Either everything succeeds or nothing is saved - guaranteed consistency!

---

## Prisma Transaction Patterns

### 1. Interactive Transactions (Recommended)

Use for complex operations with conditional logic:

```typescript
const result = await prisma.$transaction(async (tx) => {
    // All operations use 'tx' instead of 'prisma'
    const user = await tx.user.create({ data: userData });

    if (user.role === "ADMIN") {
        await tx.permission.createMany({ data: adminPermissions });
    }

    await tx.auditLog.create({ data: { action: "USER_CREATED" } });

    return user;
});
```

**Key Points:**

-   Use `tx` (transaction context) instead of `prisma`
-   Any thrown error rolls back the entire transaction
-   Returns the final result

### 2. Sequential Transaction Array (Simple)

Use for simple sequential operations without conditional logic:

```typescript
const [user, profile] = await prisma.$transaction([
    prisma.user.create({ data: userData }),
    prisma.userProfile.create({ data: profileData }),
]);
```

**Limitations:**

-   Cannot use results from one operation in another
-   No conditional logic
-   Less flexible

### 3. Transaction Timeout

Default timeout is 5 seconds. For long operations:

```typescript
await prisma.$transaction(
    async (tx) => {
        // Long-running operations
    },
    {
        maxWait: 5000, // Max time to wait for transaction to start
        timeout: 10000, // Max time the transaction can run
    }
);
```

---

## Real-World Examples from the Project

### Example 1: Creating Variants (Fixed with Transactions)

**Before (❌ No Transaction):**

```typescript
// variant.service.ts
const createdVariant = await prisma.productVariant.create({ data });
await prisma.variantAttribute.createMany({ data: attributes });
await prisma.variantMedia.createMany({ data: images });
// ⚠️ If image upload fails, we have variant + attributes but no images!
```

**After (✅ With Transaction):**

```typescript
// variant.service.ts
return await prisma.$transaction(async (tx) => {
    const createdVariant = await tx.productVariant.create({ data });
    await tx.variantAttribute.createMany({ data: attributes });
    await tx.variantMedia.createMany({ data: images });
    // ✅ If ANY step fails, EVERYTHING is rolled back!
    return createdVariant;
});
```

### Example 2: Updating Product with Categories and Tags

```typescript
const updateProduct = async (productId: number, data: ProductUpdateData) => {
    return await prisma.$transaction(async (tx) => {
        // Update basic product info
        const product = await tx.product.update({
            where: { id: productId },
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
            },
        });

        // Update category relationship
        if (data.categoryId) {
            await tx.product.update({
                where: { id: productId },
                data: {
                    category: { connect: { id: data.categoryId } },
                },
            });
        }

        // Update tags
        if (data.tags) {
            // Remove old tags
            await tx.productTag.deleteMany({
                where: { productId },
            });

            // Add new tags
            await tx.productTag.createMany({
                data: data.tags.map((tagId) => ({
                    productId,
                    tagId,
                })),
            });
        }

        return product;
    });
};
```

### Example 3: Processing an Order

```typescript
const processOrder = async (orderData: OrderData) => {
    return await prisma.$transaction(async (tx) => {
        // Create the order
        const order = await tx.order.create({
            data: {
                customerId: orderData.customerId,
                total: orderData.total,
                status: "PENDING",
            },
        });

        // Create order items
        await tx.orderItem.createMany({
            data: orderData.items.map((item) => ({
                orderId: order.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
        });

        // Update product stock
        for (const item of orderData.items) {
            await tx.product.update({
                where: { id: item.productId },
                data: {
                    stock: { decrement: item.quantity },
                },
            });
        }

        // Apply coupon if exists
        if (orderData.couponId) {
            await tx.couponUsage.create({
                data: {
                    couponId: orderData.couponId,
                    orderId: order.id,
                    customerId: orderData.customerId,
                },
            });
        }

        return order;
    });
};
```

### Example 4: Syncing Role Permissions

```typescript
const syncRolePermissions = async (
    roleId: number,
    permissions: { resource: string; actions: string[] }[]
) => {
    return await prisma.$transaction(async (tx) => {
        // Remove all existing permissions
        await tx.rolePermission.deleteMany({
            where: { roleId },
        });

        // Add new permissions
        for (const perm of permissions) {
            for (const action of perm.actions) {
                // Ensure permission exists
                const permission = await tx.permission.upsert({
                    where: {
                        resource_action: { resource: perm.resource, action },
                    },
                    update: {},
                    create: { resource: perm.resource, action },
                });

                // Link to role
                await tx.rolePermission.create({
                    data: {
                        roleId,
                        permissionId: permission.id,
                    },
                });
            }
        }

        return tx.role.findUnique({
            where: { id: roleId },
            include: { permissions: true },
        });
    });
};
```

---

## Common Patterns and Best Practices

### 1. ✅ Always Use Transactions for Multi-Table Operations

```typescript
// ✅ Good
await prisma.$transaction(async (tx) => {
    await tx.tableA.create({ data });
    await tx.tableB.create({ data });
});

// ❌ Bad
await prisma.tableA.create({ data });
await prisma.tableB.create({ data }); // Not atomic!
```

### 2. ✅ Validate Before Starting Transaction

```typescript
// ✅ Good - validate first
if (!isValidEmail(email)) {
    throw new Error("Invalid email");
}

await prisma.$transaction(async (tx) => {
    // Expensive database operations
});

// ❌ Bad - validate inside transaction
await prisma.$transaction(async (tx) => {
    if (!isValidEmail(email)) {
        throw new Error("Invalid email"); // Wastes transaction resources
    }
});
```

### 3. ✅ Handle Errors Properly

```typescript
try {
    const result = await prisma.$transaction(async (tx) => {
        // Database operations
        return await tx.product.create({ data });
    });
    return result;
} catch (error) {
    // Transaction automatically rolled back
    console.error("Transaction failed:", error);
    throw new Error("Failed to create product. No changes were made.");
}
```

### 4. ✅ Keep Transactions Short

```typescript
// ✅ Good - keep transactions focused
const uploadedUrl = await uploadToCloudinary(file); // Outside transaction
await prisma.$transaction(async (tx) => {
    await tx.media.create({ data: { url: uploadedUrl } });
});

// ❌ Bad - external API calls in transaction
await prisma.$transaction(async (tx) => {
    const url = await uploadToCloudinary(file); // Slow external call!
    await tx.media.create({ data: { url } });
});
```

### 5. ✅ Don't Nest Transactions

```typescript
// ❌ Bad - nested transactions not supported
await prisma.$transaction(async (tx) => {
    await tx.user.create({ data });

    await prisma.$transaction(async (tx2) => {
        // ❌ Won't work!
        await tx2.profile.create({ data });
    });
});

// ✅ Good - use single transaction
await prisma.$transaction(async (tx) => {
    await tx.user.create({ data });
    await tx.profile.create({ data });
});
```

---

## When NOT to Use Transactions

### 1. Single Operation

```typescript
// No need for transaction
await prisma.user.create({ data });
```

### 2. Read-Only Operations

```typescript
// No need for transaction
const users = await prisma.user.findMany();
```

### 3. Independent Operations

```typescript
// These are independent - transaction not needed
await sendEmail(user.email);
await logEvent("EMAIL_SENT");
```

---

## Checklist for Adding Transactions

Use this checklist when reviewing or writing code:

-   [ ] Does this operation modify multiple tables?
-   [ ] Could a failure leave data in an inconsistent state?
-   [ ] Are there dependent operations that must succeed together?
-   [ ] Have I validated inputs before starting the transaction?
-   [ ] Are external API calls (Cloudinary, email, etc.) outside the transaction?
-   [ ] Is the transaction timeout appropriate for the operations?
-   [ ] Have I tested the rollback behavior?

---

## Testing Transactions

### Test Rollback Behavior

```typescript
// Test that failures roll back properly
test("should rollback all changes on error", async () => {
    const initialCount = await prisma.product.count();

    try {
        await prisma.$transaction(async (tx) => {
            await tx.product.create({ data: validData });
            await tx.productMedia.create({ data: invalidData }); // Will fail
        });
    } catch (error) {
        // Expected to fail
    }

    const finalCount = await prisma.product.count();
    expect(finalCount).toBe(initialCount); // ✅ Nothing was saved
});
```

---

## Migration Guide

To add transactions to existing code:

1. **Identify multi-table operations**

    ```bash
    # Search for services with multiple creates/updates
    grep -r "await prisma\." api/services/
    ```

2. **Wrap in transaction**

    ```typescript
    // Before
    const user = await prisma.user.create({ data });
    await prisma.profile.create({ data });

    // After
    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data });
        await tx.profile.create({ data });
        return user;
    });
    ```

3. **Replace all `prisma.` with `tx.`** inside the transaction

4. **Test rollback behavior**

---

## Resources

-   [Prisma Transactions Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
-   [Database ACID Properties](https://en.wikipedia.org/wiki/ACID)
-   [Transaction Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/prisma-client-transactions-guide)

---

## Summary

✅ **Always use transactions** when:

-   Modifying multiple tables
-   Operations depend on each other
-   Partial updates would be inconsistent

✅ **Best practices**:

-   Validate before the transaction
-   Keep transactions short
-   Move external API calls outside
-   Use `tx` instead of `prisma` inside transactions
-   Handle errors properly

✅ **Result**: Guaranteed data consistency and ACID compliance! 🎉
