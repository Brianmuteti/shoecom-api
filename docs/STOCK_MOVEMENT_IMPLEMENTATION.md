# Stock Movement System - Implementation Summary

## ✅ What Was Implemented

### Schema Updates

#### StockMovement Model (Enhanced)

```prisma
model StockMovement {
  userId       Int?            // Optional - for staff adjustments
  customerId   Int?            // Optional - for customer purchases
  orderId      Int?            // Reference to Order (customer purchases)
  adjustmentId Int?            // Reference to StockAdjustment (staff changes)
  // ... other fields
}
```

#### New: StockAdjustment Model

```prisma
model StockAdjustment {
  id             Int      @id
  userId         Int      // Staff member who made adjustment
  storeId        Int
  adjustmentType String   // 'RESTOCK', 'DAMAGE', 'LOSS', 'CORRECTION', 'RETURN'
  reason         String   // Detailed reason
  notes          String?
  movements      StockMovement[] // All movements for this adjustment
}
```

### Key Benefits

1. **Clear Separation**: Customer purchases vs staff adjustments are now distinct
2. **Full Traceability**: Every movement links to its source (order OR adjustment)
3. **Better Auditing**: Can track who (customer/staff) caused each stock change
4. **Improved Reporting**: Easy to filter and analyze by type

---

## Usage Patterns

### 1. Customer Order (Your Existing Flow)

When a customer places an order, you'll create stock movements like this:

```typescript
// In your order processing logic
await prisma.$transaction(async (tx) => {
    // ... create order ...

    for (const item of orderItems) {
        await tx.stockMovement.create({
            data: {
                variantId: item.variantId,
                storeId: order.storeId,
                customerId: order.customerId, // ← Customer who purchased
                orderId: order.id, // ← Link to order
                userId: null, // ← No staff user
                adjustmentId: null, // ← Not an adjustment
                operation: "decrement",
                quantity: item.quantity,
                previousQuantity,
                newQuantity,
                reason: "CUSTOMER_PURCHASE",
                notes: `Order #${order.orderNumber}`,
            },
        });
    }
});
```

### 2. Staff Adjustment (Updated Service)

The `InventoryService.bulkUpdate()` now automatically creates a `StockAdjustment` record:

```typescript
// This is already implemented in inventory.service.ts
await InventoryService.bulkUpdate(
    storeId,
    [
        { variantId: 1, quantity: 10, operation: "increment" },
        { variantId: 2, quantity: 5, operation: "increment" },
    ],
    {
        userId: staffUserId,
        reason: "RESTOCK",
        notes: "Received new shipment",
    }
);

// Creates 1 StockAdjustment + 2 StockMovements (linked)
```

### 3. Order Returns

```typescript
async function processReturn(orderId: number, items: any[]) {
    await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });

        // Create adjustment for the return
        const adjustment = await tx.stockAdjustment.create({
            data: {
                userId: 1, // System/staff user
                storeId: order.storeId,
                adjustmentType: "RETURN",
                reason: `Return for Order #${order.orderNumber}`,
                notes: `Customer ID: ${order.customerId}`,
            },
        });

        for (const item of items) {
            // Update stock...

            await tx.stockMovement.create({
                data: {
                    variantId: item.variantId,
                    storeId: order.storeId,
                    userId: 1,
                    customerId: order.customerId, // Original customer
                    orderId: order.id, // Original order
                    adjustmentId: adjustment.id, // Return adjustment
                    operation: "increment",
                    quantity: item.quantity,
                    previousQuantity,
                    newQuantity,
                    reason: "RETURN",
                    notes: `Return for Order #${order.orderNumber}`,
                },
            });
        }
    });
}
```

---

## Querying Examples

### Get All Movements for an Order

```typescript
const movements = await prisma.stockMovement.findMany({
    where: { orderId },
    include: {
        variant: { include: { product: true } },
        customer: { select: { name: true, email: true } },
    },
});
```

### Get Customer Purchase History

```typescript
const customerPurchases = await prisma.stockMovement.findMany({
    where: {
        customerId,
        reason: "CUSTOMER_PURCHASE",
    },
    include: {
        variant: { include: { product: true } },
        order: { select: { orderNumber: true, placedAt: true } },
    },
});
```

### Get Staff Adjustments

```typescript
const adjustments = await prisma.stockAdjustment.findMany({
    where: { userId: staffUserId },
    include: {
        user: { select: { name: true } },
        movements: {
            include: {
                variant: { include: { product: true } },
            },
        },
    },
});
```

### Variant Movement History

```typescript
const history = await prisma.stockMovement.findMany({
    where: { variantId, storeId },
    include: {
        user: { select: { name: true } }, // Staff member (if adjustment)
        customer: { select: { name: true } }, // Customer (if purchase)
        order: { select: { orderNumber: true } },
        adjustment: {
            select: {
                adjustmentType: true,
                reason: true,
            },
        },
    },
    orderBy: { createdAt: "desc" },
});
```

---

## Reports You Can Now Generate

### 1. Daily Sales Summary

```typescript
const dailySales = await prisma.stockMovement.groupBy({
    by: ["reason"],
    where: {
        customerId: { not: null },
        createdAt: { gte: startOfDay, lt: endOfDay },
    },
    _sum: { quantity: true },
});
```

### 2. Stock Adjustment Report

```typescript
const adjustmentReport = await prisma.stockAdjustment.findMany({
    where: {
        createdAt: { gte: startDate, lt: endDate },
    },
    include: {
        user: { select: { name: true } },
        movements: {
            include: {
                variant: {
                    include: {
                        product: { select: { name: true } },
                    },
                },
            },
        },
    },
});
```

### 3. Top Customers by Quantity

```typescript
const topCustomers = await prisma.stockMovement.groupBy({
    by: ["customerId"],
    where: {
        customerId: { not: null },
        reason: "CUSTOMER_PURCHASE",
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
});
```

---

## Migration Notes

### For Existing Stock Movements

Existing `stockMovement` records have `userId` set. You'll need to determine:

1. **If it's a customer order**: Set `orderId` and `customerId`, make `userId` null
2. **If it's a staff adjustment**: Create a `StockAdjustment` record and link it

Example migration script:

```typescript
// For customer purchases
const orderMovements = await prisma.stockMovement.findMany({
    where: { reason: "CUSTOMER_PURCHASE" },
});

for (const movement of orderMovements) {
    // Find the order from notes or other means
    const orderId = extractOrderId(movement.notes);
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    await prisma.stockMovement.update({
        where: { id: movement.id },
        data: {
            customerId: order.customerId,
            orderId: order.id,
            userId: null,
        },
    });
}

// For staff adjustments
const adjustmentMovements = await prisma.stockMovement.findMany({
    where: {
        reason: { in: ["RESTOCK", "DAMAGE", "LOSS", "CORRECTION"] },
    },
});

// Group by userId + storeId + date to find related movements
const grouped = groupMovements(adjustmentMovements);

for (const group of grouped) {
    const adjustment = await prisma.stockAdjustment.create({
        data: {
            userId: group.userId,
            storeId: group.storeId,
            adjustmentType: group.reason,
            reason: group.reason,
            createdAt: group.createdAt,
        },
    });

    await prisma.stockMovement.updateMany({
        where: { id: { in: group.movementIds } },
        data: { adjustmentId: adjustment.id },
    });
}
```

---

## Summary

✅ **Implemented**:

-   Enhanced StockMovement with customer/order tracking
-   New StockAdjustment model for staff changes
-   Updated InventoryService.bulkUpdate() to use new pattern
-   Complete documentation with examples

✅ **Benefits**:

-   Clear separation of customer purchases vs staff adjustments
-   Full audit trail with proper references
-   Better reporting and analytics capabilities
-   Maintains data integrity with foreign keys

✅ **Next Steps**:

-   Implement customer order stock movement creation
-   Add order return functionality
-   Migrate existing stock movements (if needed)
-   Create reporting dashboards
