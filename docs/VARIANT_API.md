# Variant API Documentation

## Overview

The Variant API allows you to create product variants with multiple images that are automatically uploaded to Cloudinary.

## Endpoints

### 1. Create Product Variants with Images

**Endpoint:** `POST /variants/:productId`

**Description:** Creates one or more variants for a product with images uploaded to Cloudinary.

**Content-Type:** `multipart/form-data`

**Request Body:**

-   `variants` (JSON string or object): Array of variant data
-   `variant_0` (files): Images for the first variant (up to 10 files)
-   `variant_1` (files): Images for the second variant (up to 10 files)
-   `variant_N` (files): Images for the Nth variant (up to 10 files)

**Variant Object Schema:**

```json
{
    "name": "string (required)",
    "sku": "string (required, must be unique)",
    "price": "number (required, positive)",
    "salePrice": "number (optional, positive)",
    "wholesalePrice": "number (optional, positive)",
    "wholesaleQty": "number (optional, positive integer)",
    "attributes": [
        {
            "attributeId": "number (required)",
            "valueId": "number (required)"
        }
    ],
    "hasWatermark": "boolean (optional, default: false)",
    "thumbnailIndex": "number (optional, default: 0) - Index of which uploaded image should be the thumbnail"
}
```

**Example Request (using JavaScript/FormData):**

```javascript
const formData = new FormData();

// Add variant metadata
const variants = [
    {
        name: "Red Sneaker - Size 42",
        sku: "SNKR-RED-42",
        price: 99.99,
        salePrice: 79.99,
        attributes: [
            { attributeId: 1, valueId: 5 }, // Color: Red
            { attributeId: 2, valueId: 10 }, // Size: 42
        ],
        hasWatermark: false,
        thumbnailIndex: 0,
    },
    {
        name: "Blue Sneaker - Size 42",
        sku: "SNKR-BLUE-42",
        price: 99.99,
        attributes: [
            { attributeId: 1, valueId: 6 }, // Color: Blue
            { attributeId: 2, valueId: 10 }, // Size: 42
        ],
        thumbnailIndex: 1,
    },
];

formData.append("variants", JSON.stringify(variants));

// Add images for first variant (variant_0)
formData.append("variant_0", imageFile1); // Will be thumbnail (thumbnailIndex: 0)
formData.append("variant_0", imageFile2);
formData.append("variant_0", imageFile3);

// Add images for second variant (variant_1)
formData.append("variant_1", imageFile4);
formData.append("variant_1", imageFile5); // Will be thumbnail (thumbnailIndex: 1)

// Send request
fetch("/variants/123", {
    method: "POST",
    body: formData,
});
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Product Name",
    "variants": [
      {
        "id": 1,
        "name": "Red Sneaker - Size 42",
        "sku": "SNKR-RED-42",
        "price": 99.99,
        "salePrice": 79.99,
        "media": [
          {
            "id": 1,
            "url": "https://res.cloudinary.com/.../image1.jpg",
            "type": "IMAGE",
            "hasWatermark": false,
            "isThumbnail": true
          },
          {
            "id": 2,
            "url": "https://res.cloudinary.com/.../image2.jpg",
            "type": "IMAGE",
            "hasWatermark": false,
            "isThumbnail": false
          }
        ],
        "attributes": [...]
      }
    ]
  },
  "message": "Product variants created successfully"
}
```

---

### 2. Add Images to Existing Variant

**Endpoint:** `POST /variants/:variantId/images`

**Description:** Adds additional images to an existing variant. Images are uploaded to Cloudinary.

**Content-Type:** `multipart/form-data`

**Request Body:**

-   `images` (files): One or more image files (up to 10)
-   `hasWatermark` (string/boolean, optional): Whether to mark images as watermarked
-   `thumbnailIndex` (string/number, optional): Index of which image should be the thumbnail (default: 0)

**Example Request (using cURL):**

```bash
curl -X POST \
  http://localhost:3500/variants/1/images \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  -F "hasWatermark=false" \
  -F "thumbnailIndex=0"
```

**Example Request (using JavaScript/FormData):**

```javascript
const formData = new FormData();
formData.append("images", imageFile1);
formData.append("images", imageFile2);
formData.append("images", imageFile3);
formData.append("hasWatermark", "false");
formData.append("thumbnailIndex", "1"); // Second image will be thumbnail

fetch("/variants/1/images", {
    method: "POST",
    body: formData,
});
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Red Sneaker - Size 42",
    "sku": "SNKR-RED-42",
    "media": [
      {
        "id": 3,
        "url": "https://res.cloudinary.com/.../new-image1.jpg",
        "type": "IMAGE",
        "hasWatermark": false,
        "isThumbnail": false
      },
      {
        "id": 4,
        "url": "https://res.cloudinary.com/.../new-image2.jpg",
        "type": "IMAGE",
        "hasWatermark": false,
        "isThumbnail": true
      }
    ],
    "attributes": [...]
  },
  "message": "Successfully uploaded 3 images for variant"
}
```

---

### 3. Update Variant (Without Images)

**Endpoint:** `PATCH /variants/:variantId`

**Description:** Updates variant information (name, sku, price, attributes) without affecting images.

**Content-Type:** `application/json`

**Request Body:**

```json
{
    "name": "string (optional)",
    "sku": "string (optional)",
    "price": "number (optional, positive)",
    "salePrice": "number (optional, positive)",
    "wholesalePrice": "number (optional, positive)",
    "wholesaleQty": "number (optional, positive integer)",
    "attributes": [
        {
            "attributeId": "number",
            "valueId": "number"
        }
    ]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Variant Name",
    "sku": "NEW-SKU",
    "price": 109.99,
    "media": [...],
    "attributes": [...]
  },
  "message": "Variant updated successfully"
}
```

---

### 4. Delete Variants Not in List

**Endpoint:** `DELETE /variants/:productId/cleanup`

**Description:** Deletes all variants for a product except those in the provided list.

**Content-Type:** `application/json`

**Request Body:**

```json
{
    "keepIds": [1, 2, 5]
}
```

**Response (200 OK):**

```json
{
    "message": "Old variants removed."
}
```

---

## Important Notes

1. **Image Upload Limit:** Each variant can have up to 10 images.
2. **Supported Variants:** When creating variants, you can upload images for up to 10 variants at once (variant_0 through variant_9).
3. **Cloudinary Storage:** All images are automatically uploaded to Cloudinary in the `LandulaShop/products/variants` folder.
4. **Thumbnail Selection:**
    - By default, the first image is set as the thumbnail
    - You can specify `thumbnailIndex` to choose a different image as the thumbnail
    - Only one image per variant can be marked as a thumbnail
5. **SKU Uniqueness:** SKUs must be unique across all variants in the system.
6. **File Naming Convention:** When creating variants with images, use the field name pattern `variant_N` where N is the index (0-based) matching the variant's position in the variants array.

## Error Responses

### 400 Bad Request

```json
{
    "success": false,
    "message": "No images uploaded. Please provide at least one image."
}
```

### 404 Not Found

```json
{
    "message": "Product not found"
}
```

### 400 SKU Conflict

```json
{
    "error": "The following SKUs already exist: SNKR-RED-42, SNKR-BLUE-42"
}
```

### 400 Multiple Thumbnails

```json
{
    "error": "Only one image can be set as thumbnail"
}
```
