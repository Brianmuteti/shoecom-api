# Inventory Management API

## Overview

The Inventory API allows you to manage stock quantities for product variants across multiple stores with support for increment, decrement, and set operations.

---

## Endpoints

### 1. Update Stock Quantity

**Endpoint:** `PATCH /inventory/stock/:variantId/:storeId`

**Description:** Updates the stock quantity for a specific variant in a specific store. Supports three operations:

-   **increment** (default): Add to existing quantity
-   **decrement**: Subtract from existing quantity
-   **set**: Replace with exact quantity

**Content-Type:** `application/json`

**Request Body:**

```json
{
    "quantity": "number (required, positive integer)",
    "stockStatus": "string (required: 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')",
    "operation": "string (optional: 'increment', 'decrement', 'set', default: 'increment')"
}
```

---

## Usage Examples

### Example 1: Increment Stock (Add Inventory)

**Scenario:** You receive 6 units. Current stock is 4. Final should be 10.

```bash
curl -X PATCH http://localhost:3500/inventory/stock/2/1 \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 6,
    "stockStatus": "IN_STOCK",
    "operation": "increment"
  }'
```

**OR** (since `increment` is default):

```bash
curl -X PATCH http://localhost:3500/inventory/stock/2/1 \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 6,
    "stockStatus": "IN_STOCK"
  }'
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "variantId": 2,
        "storeId": 1,
        "quantity": 10,
        "stockStatus": "IN_STOCK"
    },
    "message": "Stock increased by 6 to 10"
}
```

**Calculation:** `4 (current) + 6 (increment) = 10 (final)`

---

### Example 2: Decrement Stock (Remove Inventory)

**Scenario:** You sell 3 units. Current stock is 10. Final should be 7.

```bash
curl -X PATCH http://localhost:3500/inventory/stock/2/1 \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3,
    "stockStatus": "IN_STOCK",
    "operation": "decrement"
  }'
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "variantId": 2,
        "storeId": 1,
        "quantity": 7,
        "stockStatus": "IN_STOCK"
    },
    "message": "Stock decreased by 3 to 7"
}
```

**Calculation:** `10 (current) - 3 (decrement) = 7 (final)`

**Note:** Quantity cannot go below 0. If you try to decrement by more than available, you'll get an error:

```json
{
    "error": "Cannot decrement stock below 0. Current: 7, Decrement: 10"
}
```

---

### Example 3: Set Stock (Override)

**Scenario:** Physical inventory count shows exactly 50 units. Override current value.

```bash
curl -X PATCH http://localhost:3500/inventory/stock/2/1 \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 50,
    "stockStatus": "IN_STOCK",
    "operation": "set"
  }'
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "variantId": 2,
        "storeId": 1,
        "quantity": 50,
        "stockStatus": "IN_STOCK"
    },
    "message": "Stock set to 50"
}
```

**Calculation:** `50 (final)` - regardless of previous value

---

### Example 4: First-Time Stock Entry

**Scenario:** Adding stock for a variant that has no stock record yet.

```bash
curl -X PATCH http://localhost:3500/inventory/stock/2/1 \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 20,
    "stockStatus": "IN_STOCK"
  }'
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "variantId": 2,
        "storeId": 1,
        "quantity": 20,
        "stockStatus": "IN_STOCK"
    },
    "message": "Stock increased by 20 to 20"
}
```

**Note:** When no stock exists, `increment` and `set` behave the same way.

---

### Example 5: JavaScript/Frontend Usage

```javascript
// Receiving new inventory
async function receiveInventory(variantId, storeId, receivedQty) {
    const response = await fetch(`/inventory/stock/${variantId}/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            quantity: receivedQty,
            stockStatus: "IN_STOCK",
            operation: "increment", // Add to existing
        }),
    });

    const result = await response.json();
    console.log(result.message); // "Stock increased by 20 to 50"
    return result.data;
}

// Selling products
async function sellProduct(variantId, storeId, soldQty) {
    const response = await fetch(`/inventory/stock/${variantId}/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            quantity: soldQty,
            stockStatus: "IN_STOCK",
            operation: "decrement", // Subtract from existing
        }),
    });

    const result = await response.json();
    console.log(result.message); // "Stock decreased by 5 to 45"
    return result.data;
}

// Physical inventory count
async function setExactStock(variantId, storeId, exactQty) {
    const response = await fetch(`/inventory/stock/${variantId}/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            quantity: exactQty,
            stockStatus: "IN_STOCK",
            operation: "set", // Override with exact value
        }),
    });

    const result = await response.json();
    console.log(result.message); // "Stock set to 100"
    return result.data;
}
```

---

## Other Endpoints

### 2. Update Variant Pricing

**Endpoint:** `PATCH /inventory/variant/:variantId`

**Description:** Updates variant pricing information (price, salePrice, wholesalePrice, sku).

**Request Body:**

```json
{
    "price": "number (optional)",
    "salePrice": "number (optional)",
    "wholesalePrice": "number (optional)",
    "wholesaleQty": "number (optional)",
    "sku": "string (optional)"
}
```

**Example:**

```bash
curl -X PATCH http://localhost:3500/inventory/variant/2 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 99.99,
    "salePrice": 79.99,
    "wholesalePrice": 60.00,
    "wholesaleQty": 10,
    "sku": "SHOE-RED-42"
  }'
```

---

### 3. Get Variant Stock Across All Stores

**Endpoint:** `GET /inventory/stock/:variantId`

**Description:** Retrieves stock information for a variant across all stores.

**Example:**

```bash
curl http://localhost:3500/inventory/stock/2
```

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "variantId": 2,
            "storeId": 1,
            "quantity": 10,
            "stockStatus": "IN_STOCK",
            "store": {
                "id": 1,
                "name": "Main Store"
            }
        },
        {
            "id": 2,
            "variantId": 2,
            "storeId": 2,
            "quantity": 5,
            "stockStatus": "LOW_STOCK",
            "store": {
                "id": 2,
                "name": "Branch Store"
            }
        }
    ]
}
```

---

### 4. Get Stock for Specific Variant in Specific Store

**Endpoint:** `GET /inventory/stock/:variantId/:storeId`

**Description:** Retrieves stock information for a specific variant in a specific store.

**Example:**

```bash
curl http://localhost:3500/inventory/stock/2/1
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "variantId": 2,
        "storeId": 1,
        "quantity": 10,
        "stockStatus": "IN_STOCK"
    }
}
```

---

## Operation Types Explained

| Operation               | Behavior                         | Use Case                             | Example                             |
| ----------------------- | -------------------------------- | ------------------------------------ | ----------------------------------- |
| **increment** (default) | Adds to existing quantity        | Receiving inventory, restocking      | Current: 4 → Add 6 → Final: 10      |
| **decrement**           | Subtracts from existing quantity | Sales, damaged goods, returns        | Current: 10 → Subtract 3 → Final: 7 |
| **set**                 | Replaces with exact value        | Physical inventory count, correction | Current: 45 → Set to 50 → Final: 50 |

---

## Stock Status Values

| Value          | Description       | Recommended Usage                         |
| -------------- | ----------------- | ----------------------------------------- |
| `IN_STOCK`     | Product available | quantity > threshold (e.g., > 10)         |
| `LOW_STOCK`    | Running low       | quantity > 0 and ≤ threshold (e.g., 1-10) |
| `OUT_OF_STOCK` | Not available     | quantity = 0                              |

---

## Business Workflows

### Workflow 1: Receiving Inventory

```javascript
// 1. Scan barcode/SKU
const sku = "SHOE-RED-42";
const variant = await findVariantBySku(sku);

// 2. Enter quantity received
const receivedQty = 20;

// 3. Update stock (increment)
await fetch(`/inventory/stock/${variant.id}/${storeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        quantity: receivedQty,
        stockStatus: "IN_STOCK",
        operation: "increment",
    }),
});

// Result: Stock increased from 30 to 50
```

### Workflow 2: Processing a Sale

```javascript
// 1. Customer orders 2 units
const orderQty = 2;

// 2. Decrement stock
await fetch(`/inventory/stock/${variantId}/${storeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        quantity: orderQty,
        stockStatus: "IN_STOCK",
        operation: "decrement",
    }),
});

// Result: Stock decreased from 50 to 48
```

### Workflow 3: Physical Inventory Count

```javascript
// 1. Count physical stock
const actualCount = 47; // Found during physical count

// 2. Set exact quantity
await fetch(`/inventory/stock/${variantId}/${storeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        quantity: actualCount,
        stockStatus: "IN_STOCK",
        operation: "set",
    }),
});

// Result: Stock set to exactly 47 (was 48)
```

---

## Error Handling

### Error: Negative Stock Prevention

```json
// Request
{
    "quantity": 50,
    "stockStatus": "OUT_OF_STOCK",
    "operation": "decrement"
}

// Response (if current stock is only 7)
{
    "error": "Cannot decrement stock below 0. Current: 7, Decrement: 50"
}
```

### Error: Invalid Stock Status

```json
// Request
{
    "quantity": 10,
    "stockStatus": "INVALID_STATUS"
}

// Response
{
    "error": "Invalid stockStatus value"
}
```

### Error: Invalid Operation

```json
// Request
{
    "quantity": 10,
    "stockStatus": "IN_STOCK",
    "operation": "invalid"
}

// Response
{
    "error": "Validation error: operation must be 'set', 'increment', or 'decrement'"
}
```

---

## Important Notes

### 1. **Default Operation is INCREMENT**

If you don't specify an operation, it defaults to `increment`:

```json
// These are equivalent:
{ "quantity": 5, "stockStatus": "IN_STOCK" }
{ "quantity": 5, "stockStatus": "IN_STOCK", "operation": "increment" }
```

**Rationale:** Most common use case is receiving/adding inventory.

### 2. **Negative Stock Prevention**

The system prevents stock from going below 0:

```
Current: 5
Decrement: 10
Result: Error (can't go negative)
```

### 3. **First-Time Stock Entry**

When adding stock for the first time:

-   `increment` and `set` behave identically
-   Both create a new stock record with the specified quantity

### 4. **Stock Status Management**

The stock status is **always updated** with each operation. Consider:

```javascript
// When stock gets low
if (finalQuantity <= 10 && finalQuantity > 0) {
    stockStatus = "LOW_STOCK";
} else if (finalQuantity === 0) {
    stockStatus = "OUT_OF_STOCK";
} else {
    stockStatus = "IN_STOCK";
}
```

You might want to handle this logic on the frontend or add auto-status detection.

---

## Complete Examples

### Example: E-Commerce Order Flow

```javascript
async function processOrder(orderId) {
    const order = await getOrder(orderId);

    // For each item in the order
    for (const item of order.items) {
        try {
            // Decrement stock
            await fetch(`/inventory/stock/${item.variantId}/${item.storeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quantity: item.quantity,
                    stockStatus: "IN_STOCK",
                    operation: "decrement",
                }),
            });

            console.log(`✅ Stock reduced for variant ${item.variantId}`);
        } catch (error) {
            // Handle insufficient stock
            if (error.message.includes("Cannot decrement")) {
                console.error(
                    `❌ Insufficient stock for variant ${item.variantId}`
                );
                throw new Error("Insufficient stock");
            }
            throw error;
        }
    }

    console.log("✅ Order processed, inventory updated");
}
```

### Example: Inventory Receiving

```javascript
async function receiveShipment(shipmentId) {
    const shipment = await getShipment(shipmentId);

    // For each item in the shipment
    for (const item of shipment.items) {
        await fetch(`/inventory/stock/${item.variantId}/${item.storeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quantity: item.receivedQty,
                stockStatus: "IN_STOCK",
                operation: "increment", // Add to existing
            }),
        });

        console.log(
            `✅ Added ${item.receivedQty} units to variant ${item.variantId}`
        );
    }

    console.log("✅ Shipment received, inventory updated");
}
```

### Example: Stock Adjustment (Damage, Loss, etc.)

```javascript
async function adjustStock(variantId, storeId, adjustment, reason) {
    const operation = adjustment > 0 ? "increment" : "decrement";
    const quantity = Math.abs(adjustment);

    await fetch(`/inventory/stock/${variantId}/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            quantity,
            stockStatus: "IN_STOCK",
            operation,
        }),
    });

    // Log the adjustment
    await logStockAdjustment({
        variantId,
        storeId,
        adjustment,
        reason,
        timestamp: new Date(),
    });

    console.log(`✅ Stock adjusted by ${adjustment} (${reason})`);
}

// Usage
await adjustStock(2, 1, -5, "Damaged goods"); // Decrement by 5
await adjustStock(2, 1, 10, "Found in backroom"); // Increment by 10
```

---

## Migration Guide

### If You Were Using the Old API

**Before (Old API - Replace Mode):**

```json
// This used to SET the quantity to 6
{
    "quantity": 6,
    "stockStatus": "IN_STOCK"
}
```

**After (New API - Increment Mode by Default):**

```json
// This now INCREMENTS by 6 (default behavior)
{
    "quantity": 6,
    "stockStatus": "IN_STOCK"
}

// To get old behavior (replace), use 'set':
{
    "quantity": 6,
    "stockStatus": "IN_STOCK",
    "operation": "set"
}
```

**Migration Checklist:**

-   [ ] Review all stock update calls in your frontend
-   [ ] Add `operation: "set"` if you want to replace (old behavior)
-   [ ] Use `operation: "increment"` for adding inventory (new default)
-   [ ] Use `operation: "decrement"` for sales/reductions
-   [ ] Update UI to reflect increment/decrement operations

---

## Testing

### Test Increment

```javascript
// Setup: Create stock with quantity 4
const initial = await createStock({ variantId: 2, storeId: 1, quantity: 4 });

// Test: Increment by 6
const response = await fetch("/inventory/stock/2/1", {
    method: "PATCH",
    body: JSON.stringify({
        quantity: 6,
        stockStatus: "IN_STOCK",
        operation: "increment",
    }),
});

const result = await response.json();
expect(result.data.quantity).toBe(10); // 4 + 6 = 10 ✅
```

### Test Decrement

```javascript
// Setup: Stock with quantity 10
const initial = await createStock({ variantId: 2, storeId: 1, quantity: 10 });

// Test: Decrement by 3
const response = await fetch("/inventory/stock/2/1", {
    method: "PATCH",
    body: JSON.stringify({
        quantity: 3,
        stockStatus: "IN_STOCK",
        operation: "decrement",
    }),
});

const result = await response.json();
expect(result.data.quantity).toBe(7); // 10 - 3 = 7 ✅
```

### Test Negative Stock Prevention

```javascript
// Setup: Stock with quantity 5
const initial = await createStock({ variantId: 2, storeId: 1, quantity: 5 });

// Test: Try to decrement by 10
const response = await fetch("/inventory/stock/2/1", {
    method: "PATCH",
    body: JSON.stringify({
        quantity: 10,
        stockStatus: "OUT_OF_STOCK",
        operation: "decrement",
    }),
});

await expect(response).rejects.toThrow("Cannot decrement stock below 0"); ✅
```

---

## Summary

### Operations Supported ✅

| Operation             | Current: 4 | Quantity: 6 | Final  | Formula    |
| --------------------- | ---------- | ----------- | ------ | ---------- |
| `increment` (default) | 4          | +6          | **10** | 4 + 6 = 10 |
| `decrement`           | 10         | -6          | **4**  | 10 - 6 = 4 |
| `set`                 | 100        | 6           | **6**  | = 6        |

### Key Features ✅

-   ✅ **Increment** (add to stock) - Default operation
-   ✅ **Decrement** (remove from stock) - For sales
-   ✅ **Set** (override) - For inventory counts
-   ✅ **Negative prevention** - Can't go below 0
-   ✅ **Clear messages** - Shows operation results
-   ✅ **Upsert support** - Creates if doesn't exist

### Result ✅

**Before:** Current: 4 → Update: 6 → Final: **6** (replaced)  
**After:** Current: 4 → Update: 6 → Final: **10** (incremented) 🎉
