# E-Commerce Stock Integration Guide

## Overview

This document explains how the Stock Movement Tracking system integrates with customer orders, returns, and other e-commerce operations.

---

## 🔄 Customer Order Flow

### Current Infrastructure ✅

The stock movement tracking system provides:

-   ✅ `increment` operation (for receiving stock)
-   ✅ `decrement` operation (for reducing stock)
-   ✅ Audit trail (who, when, why, which variant, which store)
-   ✅ Transaction safety (atomic operations)
-   ✅ Negative prevention (can't go below 0)

### What's Needed Next 📋

You need to integrate this with your order processing. Here's how:

---

## 📦 Order Processing Integration

### Step 1: When Customer Places Order

```typescript
// services/order.service.ts (YOU NEED TO CREATE THIS)

const OrderService = {
    createOrder: async (orderData: {
        customerId: number;
        items: Array<{
            variantId: number;
            quantity: number;
            price: number;
        }>;
        storeId: number;
    }) => {
        // 🔒 Use transaction to ensure order + stock update are atomic
        return await prisma.$transaction(async (tx) => {
            // 1. Create the order
            const order = await tx.order.create({
                data: {
                    customerId: orderData.customerId,
                    storeId: orderData.storeId,
                    status: "PENDING",
                    total: orderData.items.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                    ),
                },
            });

            // 2. Create order items
            await tx.orderItem.createMany({
                data: orderData.items.map((item) => ({
                    orderId: order.id,
                    productId: item.variantId, // Assuming this links to variant
                    quantity: item.quantity,
                    price: item.price,
                })),
            });

            // 3. CRITICAL: Reduce stock for each item
            for (const item of orderData.items) {
                // Check if stock is available first
                const currentStock = await tx.storeVariantStock.findUnique({
                    where: {
                        storeId_variantId: {
                            storeId: orderData.storeId,
                            variantId: item.variantId,
                        },
                    },
                });

                if (!currentStock || currentStock.quantity < item.quantity) {
                    throw new Error(
                        `Insufficient stock for variant ${item.variantId}. ` +
                            `Available: ${
                                currentStock?.quantity || 0
                            }, Requested: ${item.quantity}`
                    );
                }

                // Decrement stock
                await tx.storeVariantStock.update({
                    where: {
                        storeId_variantId: {
                            storeId: orderData.storeId,
                            variantId: item.variantId,
                        },
                    },
                    data: {
                        quantity: currentStock.quantity - item.quantity,
                        stockStatus:
                            currentStock.quantity - item.quantity === 0
                                ? "OUT_OF_STOCK"
                                : currentStock.quantity - item.quantity <= 10
                                ? "LOW_STOCK"
                                : "IN_STOCK",
                    },
                });

                // 4. Log the stock movement
                await tx.stockMovement.create({
                    data: {
                        variantId: item.variantId,
                        storeId: orderData.storeId,
                        userId: 1, // System user ID (or customer service user)
                        operation: "decrement",
                        quantity: item.quantity,
                        previousQuantity: currentStock.quantity,
                        newQuantity: currentStock.quantity - item.quantity,
                        reason: `Customer order #${order.id}`,
                        notes: `Customer ID: ${orderData.customerId}`,
                    },
                });
            }

            // 5. Return the created order
            return await tx.order.findUnique({
                where: { id: order.id },
                include: {
                    items: true,
                },
            });
        });

        // ✅ If ANY step fails (insufficient stock, payment issue, etc.):
        // - Order NOT created
        // - Stock NOT reduced
        // - Movement NOT logged
        // Everything rolls back!
    },
};
```

**Key Points:**

1. ✅ **Transaction wraps everything** - Order + Stock update + Movement log
2. ✅ **Stock check BEFORE decrement** - Prevent overselling
3. ✅ **Automatic movement logging** - Audit trail for every sale
4. ✅ **Rollback on failure** - If payment fails, stock restored

---

### Step 2: When Order is Confirmed/Paid

```typescript
const OrderService = {
    confirmOrder: async (orderId: number) => {
        // Just update order status
        // Stock already reduced when order was created ✅
        return await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "CONFIRMED",
                paidAt: new Date(),
            },
        });
    },
};
```

**Note:** Stock was already reduced when order was created (optimistic locking).

---

### Step 3: When Customer Returns Product

```typescript
const OrderService = {
    processReturn: async (returnData: {
        orderId: number;
        items: Array<{
            variantId: number;
            quantity: number;
        }>;
        storeId: number;
        processedBy: number; // User ID of employee processing return
        reason: string;
    }) => {
        // 🔒 Use transaction to ensure return + stock increase are atomic
        return await prisma.$transaction(async (tx) => {
            // 1. Create return record
            const returnRecord = await tx.orderReturn.create({
                data: {
                    orderId: returnData.orderId,
                    status: "PENDING",
                    processedBy: returnData.processedBy,
                    reason: returnData.reason,
                },
            });

            // 2. CRITICAL: Restore stock for each returned item
            for (const item of returnData.items) {
                const currentStock = await tx.storeVariantStock.findUnique({
                    where: {
                        storeId_variantId: {
                            storeId: returnData.storeId,
                            variantId: item.variantId,
                        },
                    },
                });

                const previousQty = currentStock?.quantity || 0;
                const newQty = previousQty + item.quantity;

                // Increment stock
                await tx.storeVariantStock.upsert({
                    where: {
                        storeId_variantId: {
                            storeId: returnData.storeId,
                            variantId: item.variantId,
                        },
                    },
                    update: {
                        quantity: newQty,
                        stockStatus: "IN_STOCK", // Back in stock
                    },
                    create: {
                        storeId: returnData.storeId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        stockStatus: "IN_STOCK",
                    },
                });

                // 3. Log the stock movement
                await tx.stockMovement.create({
                    data: {
                        variantId: item.variantId,
                        storeId: returnData.storeId,
                        userId: returnData.processedBy,
                        operation: "increment",
                        quantity: item.quantity,
                        previousQuantity: previousQty,
                        newQuantity: newQty,
                        reason: `Customer return - Order #${returnData.orderId}`,
                        notes: returnData.reason,
                    },
                });
            }

            return returnRecord;
        });
    },
};
```

---

## 🎯 Complete E-Commerce Flow

### Scenario: Customer Buys Then Returns

```
┌─────────────────────────────────────────────────┐
│ INITIAL STATE                                    │
│ Variant: Red Sneaker Size 42                    │
│ Store: Main Store (ID: 1)                       │
│ Stock: 10 units                                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ CUSTOMER ORDERS (2 units)                        │
│                                                  │
│ Transaction:                                     │
│ 1. Create Order #123                             │
│ 2. Decrement stock: 10 - 2 = 8                  │
│ 3. Log movement:                                 │
│    - User: System (ID: 1)                        │
│    - Operation: decrement                        │
│    - Quantity: 2                                 │
│    - Previous: 10 → New: 8                       │
│    - Reason: "Customer order #123"               │
│                                                  │
│ Result: Stock now = 8 units ✅                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ CUSTOMER RETURNS (1 unit)                        │
│                                                  │
│ Transaction:                                     │
│ 1. Create Return record                          │
│ 2. Increment stock: 8 + 1 = 9                   │
│ 3. Log movement:                                 │
│    - User: Employee Jane (ID: 124)               │
│    - Operation: increment                        │
│    - Quantity: 1                                 │
│    - Previous: 8 → New: 9                        │
│    - Reason: "Customer return - Order #123"      │
│    - Notes: "Defective - wrong size"             │
│                                                  │
│ Result: Stock now = 9 units ✅                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ AUDIT TRAIL                                      │
│                                                  │
│ StockMovement records:                           │
│                                                  │
│ [1] 2025-10-08 10:00 AM                         │
│     System decremented 2 units (10 → 8)          │
│     Reason: Customer order #123                  │
│                                                  │
│ [2] 2025-10-09 02:30 PM                         │
│     Jane Smith incremented 1 unit (8 → 9)        │
│     Reason: Customer return - Order #123         │
│     Notes: Defective - wrong size                │
│                                                  │
│ Final Stock: 9 units                             │
└─────────────────────────────────────────────────┘
```

---

## 🛒 Integration with Your Current System

### What You Have NOW ✅

```typescript
// Inventory API already supports:
PATCH /inventory/stock/:variantId/:storeId
{
    "quantity": 2,
    "stockStatus": "IN_STOCK",
    "operation": "decrement",  // ← For sales
    "userId": 1,
    "reason": "Customer order #123"
}
```

### What You Need to BUILD 📋

```typescript
// Order Service (NOT YET IMPLEMENTED)
const OrderService = {
    createOrder: async (orderData) => {
        // Uses your inventory API internally
        await InventoryService.updateStock(variantId, storeId, {
            quantity: item.quantity,
            stockStatus: "IN_STOCK",
            operation: "decrement", // ← Your API handles this!
            userId: systemUserId,
            reason: `Customer order #${order.id}`,
        });
    },

    processReturn: async (returnData) => {
        // Uses your inventory API internally
        await InventoryService.updateStock(variantId, storeId, {
            quantity: returnQty,
            stockStatus: "IN_STOCK",
            operation: "increment", // ← Your API handles this!
            userId: employeeId,
            reason: `Return - Order #${orderId}`,
            notes: returnReason,
        });
    },
};
```

---

## ✅ What's Already Handled

Your inventory system **already supports** e-commerce operations:

### 1. **Customer Purchases (Stock Decrease)** ✅

```javascript
// When processing an order, call:
await fetch(`/inventory/stock/${variantId}/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify({
        quantity: 2, // Customer bought 2 units
        stockStatus: "IN_STOCK",
        operation: "decrement", // ← Decreases stock
        userId: 1, // System user or cashier
        reason: "Customer order #12345",
        notes: "Online purchase",
    }),
});

// Result:
// - Stock: 10 → 8 ✅
// - Movement logged: "decrement 2 units (10 → 8)" ✅
// - Reason: "Customer order #12345" ✅
```

### 2. **Customer Returns (Stock Increase)** ✅

```javascript
// When processing a return, call:
await fetch(`/inventory/stock/${variantId}/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify({
        quantity: 1, // Customer returned 1 unit
        stockStatus: "IN_STOCK",
        operation: "increment", // ← Increases stock
        userId: 124, // Employee processing return
        reason: "Customer return - Order #12345",
        notes: "Defective - wrong size",
    }),
});

// Result:
// - Stock: 8 → 9 ✅
// - Movement logged: "increment 1 unit (8 → 9)" ✅
// - Reason: "Customer return" ✅
```

### 3. **Oversell Prevention** ✅

```javascript
// If customer tries to buy 20 units but only 8 available:
await fetch(`/inventory/stock/${variantId}/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify({
        quantity: 20,
        operation: "decrement",
    }),
});

// Error: "Cannot decrement stock below 0. Current: 8, Decrement: 20"
// ✅ Order blocked, customer notified "Out of stock"
```

---

## 📝 Complete Order Processing Example

Here's what you need to implement:

```typescript
// services/order.service.ts (CREATE THIS FILE)

import { prisma } from "../utils/prisma";
import InventoryService from "./product/inventory.service";

const OrderService = {
    /**
     * Create order and reduce stock atomically
     */
    createOrder: async (orderData: {
        customerId: number;
        storeId: number;
        items: Array<{
            variantId: number;
            quantity: number;
            price: number;
        }>;
        processedBy?: number; // Employee ID if in-store, or system ID if online
    }) => {
        // 🔒 Everything in one transaction
        return await prisma.$transaction(async (tx) => {
            // 1. Verify stock availability for ALL items first
            for (const item of orderData.items) {
                const stock = await tx.storeVariantStock.findUnique({
                    where: {
                        storeId_variantId: {
                            storeId: orderData.storeId,
                            variantId: item.variantId,
                        },
                    },
                });

                if (!stock || stock.quantity < item.quantity) {
                    throw new Error(
                        `Insufficient stock for variant ${item.variantId}. ` +
                            `Available: ${stock?.quantity || 0}, Requested: ${
                                item.quantity
                            }`
                    );
                }
            }

            // 2. Create the order
            const order = await tx.order.create({
                data: {
                    customerId: orderData.customerId,
                    storeId: orderData.storeId,
                    status: "PENDING",
                    total: orderData.items.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                    ),
                },
            });

            // 3. Create order items
            const orderItems = await Promise.all(
                orderData.items.map((item) =>
                    tx.orderItem.create({
                        data: {
                            orderId: order.id,
                            productId: item.variantId,
                            quantity: item.quantity,
                            price: item.price,
                        },
                    })
                )
            );

            // 4. Reduce stock and log movements for each item
            for (const item of orderData.items) {
                const currentStock =
                    await tx.storeVariantStock.findUniqueOrThrow({
                        where: {
                            storeId_variantId: {
                                storeId: orderData.storeId,
                                variantId: item.variantId,
                            },
                        },
                    });

                const newQuantity = currentStock.quantity - item.quantity;

                // Update stock
                await tx.storeVariantStock.update({
                    where: {
                        storeId_variantId: {
                            storeId: orderData.storeId,
                            variantId: item.variantId,
                        },
                    },
                    data: {
                        quantity: newQuantity,
                        stockStatus:
                            newQuantity === 0
                                ? "OUT_OF_STOCK"
                                : newQuantity <= 10
                                ? "LOW_STOCK"
                                : "IN_STOCK",
                    },
                });

                // Log stock movement
                await tx.stockMovement.create({
                    data: {
                        variantId: item.variantId,
                        storeId: orderData.storeId,
                        userId: orderData.processedBy || 1, // System user
                        operation: "decrement",
                        quantity: item.quantity,
                        previousQuantity: currentStock.quantity,
                        newQuantity: newQuantity,
                        reason: `Customer order #${order.id}`,
                        notes: `Customer ID: ${orderData.customerId}`,
                    },
                });
            }

            // Return order with items
            return await tx.order.findUnique({
                where: { id: order.id },
                include: {
                    items: true,
                    customer: true,
                },
            });
        });
    },

    /**
     * Process customer return and restore stock
     */
    processReturn: async (returnData: {
        orderId: number;
        items: Array<{
            variantId: number;
            quantity: number;
        }>;
        storeId: number;
        processedBy: number; // Employee ID
        returnReason: string;
        refundAmount: number;
    }) => {
        // 🔒 Everything in one transaction
        return await prisma.$transaction(async (tx) => {
            // 1. Verify order exists
            const order = await tx.order.findUnique({
                where: { id: returnData.orderId },
                include: { items: true },
            });

            if (!order) {
                throw new Error("Order not found");
            }

            // 2. Create return record
            const returnRecord = await tx.orderReturn.create({
                data: {
                    orderId: returnData.orderId,
                    reason: returnData.returnReason,
                    refundAmount: returnData.refundAmount,
                    status: "APPROVED",
                    processedBy: returnData.processedBy,
                },
            });

            // 3. Restore stock for each returned item
            for (const item of returnData.items) {
                const currentStock = await tx.storeVariantStock.findUnique({
                    where: {
                        storeId_variantId: {
                            storeId: returnData.storeId,
                            variantId: item.variantId,
                        },
                    },
                });

                const previousQty = currentStock?.quantity || 0;
                const newQty = previousQty + item.quantity;

                // Increment stock
                await tx.storeVariantStock.upsert({
                    where: {
                        storeId_variantId: {
                            storeId: returnData.storeId,
                            variantId: item.variantId,
                        },
                    },
                    update: {
                        quantity: newQty,
                        stockStatus:
                            newQty > 10
                                ? "IN_STOCK"
                                : newQty > 0
                                ? "LOW_STOCK"
                                : "OUT_OF_STOCK",
                    },
                    create: {
                        storeId: returnData.storeId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        stockStatus: "IN_STOCK",
                    },
                });

                // Log stock movement
                await tx.stockMovement.create({
                    data: {
                        variantId: item.variantId,
                        storeId: returnData.storeId,
                        userId: returnData.processedBy,
                        operation: "increment",
                        quantity: item.quantity,
                        previousQuantity: previousQty,
                        newQuantity: newQty,
                        reason: `Customer return - Order #${returnData.orderId}`,
                        notes: returnData.returnReason,
                    },
                });
            }

            // 4. Update order status
            await tx.order.update({
                where: { id: returnData.orderId },
                data: { status: "RETURNED" },
            });

            return returnRecord;
        });
    },

    /**
     * Cancel order and restore stock
     */
    cancelOrder: async (
        orderId: number,
        cancelledBy: number,
        reason: string
    ) => {
        return await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true },
            });

            if (!order) {
                throw new Error("Order not found");
            }

            if (order.status === "SHIPPED" || order.status === "DELIVERED") {
                throw new Error("Cannot cancel shipped/delivered order");
            }

            // Restore stock for each item
            for (const item of order.items) {
                const currentStock = await tx.storeVariantStock.findUnique({
                    where: {
                        storeId_variantId: {
                            storeId: order.storeId!,
                            variantId: item.productId, // Assuming this is variantId
                        },
                    },
                });

                const previousQty = currentStock?.quantity || 0;
                const newQty = previousQty + item.quantity;

                await tx.storeVariantStock.update({
                    where: {
                        storeId_variantId: {
                            storeId: order.storeId!,
                            variantId: item.productId,
                        },
                    },
                    data: {
                        quantity: newQty,
                        stockStatus: newQty > 10 ? "IN_STOCK" : "LOW_STOCK",
                    },
                });

                // Log stock movement
                await tx.stockMovement.create({
                    data: {
                        variantId: item.productId,
                        storeId: order.storeId!,
                        userId: cancelledBy,
                        operation: "increment",
                        quantity: item.quantity,
                        previousQuantity: previousQty,
                        newQuantity: newQty,
                        reason: `Order cancelled #${orderId}`,
                        notes: reason,
                    },
                });
            }

            // Update order status
            return await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "CANCELLED",
                    cancelledAt: new Date(),
                },
            });
        });
    },
};

export default OrderService;
```

---

## 🎯 Your Questions Answered

### Q1: "Does this take care of when customer orders from website?"

**Answer:** YES, but you need to **call the inventory API** from your order processing code.

**Current State:**

-   ✅ Infrastructure is ready (increment/decrement operations)
-   ✅ Audit trail is automatic
-   ✅ Transactions are atomic
-   📋 You need to integrate it with order creation

**Implementation:**

```typescript
// In your order processing:
async function createOrder(orderData) {
    await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({ data: orderData });

        // For each item, reduce stock
        for (const item of orderData.items) {
            await InventoryService.updateStock(item.variantId, storeId, {
                quantity: item.quantity,
                operation: "decrement", // ← Reduces stock
                userId: systemUserId,
                reason: `Customer order #${order.id}`,
            });
        }
    });
}
```

### Q2: "If customer buys, stock should decrease?"

**Answer:** YES ✅

Use `operation: "decrement"` when creating order:

```typescript
// Customer buys 2 units
{
    quantity: 2,
    operation: "decrement", // ← Stock goes DOWN
    reason: "Customer order #123"
}

// Stock: 10 → 8 ✅
// Movement logged: "System decremented 2 units" ✅
```

### Q3: "If customer returns, stock should increase?"

**Answer:** YES ✅

Use `operation: "increment"` when processing return:

```typescript
// Customer returns 1 unit
{
    quantity: 1,
    operation: "increment", // ← Stock goes UP
    userId: employeeId,
    reason: "Customer return - Order #123",
    notes: "Defective item"
}

// Stock: 8 → 9 ✅
// Movement logged: "Jane incremented 1 unit" ✅
```

---

## 🔐 Safety Features Already Built-In

### 1. **Oversell Prevention** ✅

```typescript
// Customer tries to buy 20 units, but only 5 available
operation: "decrement", quantity: 20

// ❌ Error: "Cannot decrement stock below 0. Current: 5, Decrement: 20"
// ✅ Order blocked automatically!
```

### 2. **Atomic Operations** ✅

```typescript
// Order creation transaction:
BEGIN TRANSACTION
  Create order ✅
  Reduce stock (variant 1) ✅
  Reduce stock (variant 2) ❌ FAILS
ROLLBACK

// Result:
// - Order NOT created ✅
// - Stock NOT reduced ✅
// - Movement NOT logged ✅
// Customer notified: "Product unavailable"
```

### 3. **Complete Audit Trail** ✅

Every sale/return is logged:

```
GET /inventory/movements/variant/2

Response:
[
  {
    "operation": "decrement",
    "quantity": 2,
    "previousQuantity": 10,
    "newQuantity": 8,
    "reason": "Customer order #123",
    "createdAt": "2025-10-08 10:00 AM"
  },
  {
    "operation": "increment",
    "quantity": 1,
    "previousQuantity": 8,
    "newQuantity": 9,
    "reason": "Customer return - Order #123",
    "createdAt": "2025-10-09 02:30 PM"
  }
]
```

---

## 🏗️ Next Steps for Full E-Commerce

### Phase 1: Order Service (NEXT) 📋

```typescript
// api/services/order.service.ts (CREATE THIS)
const OrderService = {
    createOrder: async (orderData) => {
        // Create order + reduce stock + log movement
    },
    processReturn: async (returnData) => {
        // Create return + restore stock + log movement
    },
    cancelOrder: async (orderId) => {
        // Cancel order + restore stock + log movement
    },
};
```

### Phase 2: Order Controller 📋

```typescript
// api/controllers/order.controller.ts (CREATE THIS)
const orderController = {
    createOrder: async (req, res) => {
        const order = await OrderService.createOrder(req.body);
        res.json({ success: true, data: order });
    },
    // ... other methods
};
```

### Phase 3: Order Routes 📋

```typescript
// api/routes/order.routes.ts (CREATE THIS)
router.post("/", orderController.createOrder);
router.patch("/:orderId/cancel", orderController.cancelOrder);
router.post("/returns", orderController.processReturn);
```

---

## ✅ What You DON'T Need to Build

You **don't** need to rebuild stock management because:

✅ **Stock increment/decrement** - Already implemented  
✅ **Audit trail** - Automatic logging  
✅ **Oversell prevention** - Built-in validation  
✅ **Transaction safety** - Already atomic  
✅ **User tracking** - Already recording who/when/why

You just need to **call the existing inventory API** from your order processing!

---

## 🎯 Integration Diagram

```
┌──────────────────────────────────────────────────┐
│ CUSTOMER PLACES ORDER                             │
│ (Frontend calls POST /orders)                     │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ ORDER SERVICE (YOU BUILD THIS)                    │
│                                                   │
│ prisma.$transaction(async (tx) => {               │
│   1. Create order record                          │
│   2. Create order items                           │
│   3. Call InventoryService.updateStock() ← EXISTS!│
│      {                                             │
│        operation: "decrement",                     │
│        quantity: orderQty,                         │
│        userId: systemUser,                         │
│        reason: "Customer order #123"               │
│      }                                             │
│ })                                                 │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ INVENTORY SERVICE (ALREADY EXISTS!)               │
│                                                   │
│ prisma.$transaction(async (tx) => {               │
│   1. Update stock (decrement)                     │
│   2. Create movement log ← AUTOMATIC!            │
│ })                                                 │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ DATABASE                                          │
│ ✅ Order created                                  │
│ ✅ Stock reduced                                  │
│ ✅ Movement logged with reason                    │
│                                                   │
│ If ANY step fails:                                │
│ ❌ ALL changes rolled back                        │
└──────────────────────────────────────────────────┘
```

---

## 💡 My Recommendation

### Use the Existing Inventory API

**Instead of:**

```typescript
// ❌ Don't do raw stock updates in order service
await prisma.storeVariantStock.update({
    where: { ... },
    data: { quantity: newQty },
});
// ⚠️  No movement logging!
// ⚠️  No validation!
```

**Do this:**

```typescript
// ✅ Use the inventory service
await InventoryService.updateStock(variantId, storeId, {
    quantity: orderQty,
    operation: "decrement",
    userId: systemUserId,
    reason: `Customer order #${orderId}`,
});
// ✅ Automatic movement logging!
// ✅ Automatic validation!
// ✅ Transaction-safe!
```

---

## 📊 Example Movement History

After a few customer orders and returns:

```javascript
GET /
    inventory /
    movements /
    variant /
    (2)[
        ({
            createdAt: "2025-10-09 15:00",
            user: "Jane Smith",
            operation: "increment",
            quantity: 1,
            previous: 7,
            new: 8,
            reason: "Customer return - Order #125",
            notes: "Wrong size",
        },
        {
            createdAt: "2025-10-09 11:30",
            user: "System",
            operation: "decrement",
            quantity: 1,
            previous: 8,
            new: 7,
            reason: "Customer order #125",
            notes: "Online purchase",
        },
        {
            createdAt: "2025-10-08 14:15",
            user: "System",
            operation: "decrement",
            quantity: 2,
            previous: 10,
            new: 8,
            reason: "Customer order #123",
            notes: "Online purchase",
        })
    ];
```

---

## ✅ Summary

### What's Already Done ✅

-   ✅ Infrastructure for stock increment/decrement
-   ✅ Automatic movement logging
-   ✅ Audit trail with user/reason/notes
-   ✅ Transaction safety
-   ✅ Oversell prevention

### What You Need to Build 📋

-   📋 Order service that uses the inventory API
-   📋 Return processing that uses the inventory API
-   📋 Order cancellation that restores stock

### How They Connect 🔗

```
Order Service → Calls → Inventory Service → Logs Movement
     ↓
   Order created + Stock updated + Movement logged
     ↓
   ALL ATOMIC (transaction) ✅
```

**Your inventory system is READY for e-commerce! You just need to integrate it with order processing.** 🎉

The beauty of this design:

-   ✅ **Separation of concerns** - Inventory is independent
-   ✅ **Reusable** - Same API for orders, returns, manual adjustments
-   ✅ **Auditable** - Every stock change logged, regardless of source
-   ✅ **Safe** - Transactions prevent inconsistencies

**You've built the foundation perfectly!** Now you just need to build the order processing layer on top of it. 🚀
