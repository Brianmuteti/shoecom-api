# Updated Stock Movement System

## Schema Changes

### New Structure

```prisma
model StockMovement {
  id               Int             @id
  variantId        Int
  storeId          Int
  userId           Int?            // Staff user (for manual adjustments)
  customerId       Int?            // Customer (for purchases)
  orderId          Int?            // Reference to Order
  adjustmentId     Int?            // Reference to StockAdjustment
  operation        String          // 'increment', 'decrement', 'set'
  quantity         Int
  previousQuantity Int
  newQuantity      Int
  reason           String?
  notes            String?
  createdAt        DateTime
  // Relations...
}

model StockAdjustment {
  id             Int      @id
  userId         Int      // Staff member
  storeId        Int
  adjustmentType String   // 'RESTOCK', 'DAMAGE', 'LOSS', 'CORRECTION', 'RETURN'
  reason         String
  notes          String?
  createdAt      DateTime
  movements      StockMovement[]
  // Relations...
}
```

## Usage Examples

### 1. Customer Order (Decreases Stock)

```typescript
// When processing a customer order
async function processOrderStockMovement(order: Order, items: OrderItem[]) {
    await prisma.$transaction(async (tx) => {
        for (const item of items) {
            const currentStock = await tx.storeVariantStock.findUnique({
                where: {
                    storeId_variantId: {
                        storeId: order.storeId,
                        variantId: item.variantId,
                    },
                },
            });

            const previousQuantity = currentStock?.quantity || 0;
            const newQuantity = previousQuantity - item.quantity;

            // Update stock
            await tx.storeVariantStock.update({
                where: {
                    storeId_variantId: {
                        storeId: order.storeId,
                        variantId: item.variantId,
                    },
                },
                data: { quantity: newQuantity },
            });

            // Create movement record
            await tx.stockMovement.create({
                data: {
                    variantId: item.variantId,
                    storeId: order.storeId,
                    customerId: order.customerId, // Track customer
                    orderId: order.id, // Reference order
                    userId: null, // No staff user
                    adjustmentId: null, // Not an adjustment
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
}
```

### 2. Staff Manual Adjustment (Increases/Decreases Stock)

```typescript
// When staff makes manual inventory adjustment
async function createStockAdjustment(data: {
    userId: number;
    storeId: number;
    adjustmentType: "RESTOCK" | "DAMAGE" | "LOSS" | "CORRECTION" | "RETURN";
    reason: string;
    notes?: string;
    items: Array<{
        variantId: number;
        quantity: number;
        operation: "increment" | "decrement" | "set";
    }>;
}) {
    return await prisma.$transaction(async (tx) => {
        // Create adjustment record
        const adjustment = await tx.stockAdjustment.create({
            data: {
                userId: data.userId,
                storeId: data.storeId,
                adjustmentType: data.adjustmentType,
                reason: data.reason,
                notes: data.notes,
            },
        });

        // Process each item
        for (const item of data.items) {
            const currentStock = await tx.storeVariantStock.findUnique({
                where: {
                    storeId_variantId: {
                        storeId: data.storeId,
                        variantId: item.variantId,
                    },
                },
            });

            const previousQuantity = currentStock?.quantity || 0;
            let newQuantity: number;

            if (item.operation === "increment") {
                newQuantity = previousQuantity + item.quantity;
            } else if (item.operation === "decrement") {
                newQuantity = previousQuantity - item.quantity;
            } else {
                newQuantity = item.quantity; // 'set'
            }

            // Update stock
            await tx.storeVariantStock.upsert({
                where: {
                    storeId_variantId: {
                        storeId: data.storeId,
                        variantId: item.variantId,
                    },
                },
                create: {
                    storeId: data.storeId,
                    variantId: item.variantId,
                    quantity: newQuantity,
                },
                update: {
                    quantity: newQuantity,
                },
            });

            // Create movement record
            await tx.stockMovement.create({
                data: {
                    variantId: item.variantId,
                    storeId: data.storeId,
                    userId: data.userId, // Staff member
                    customerId: null, // No customer
                    orderId: null, // No order
                    adjustmentId: adjustment.id, // Link to adjustment
                    operation: item.operation,
                    quantity: item.quantity,
                    previousQuantity,
                    newQuantity,
                    reason: data.adjustmentType,
                    notes: data.reason,
                },
            });
        }

        return adjustment;
    });
}
```

### 3. Order Return (Increases Stock)

```typescript
// When customer returns items
async function processOrderReturn(
    orderId: number,
    returnItems: Array<{
        variantId: number;
        quantity: number;
    }>
) {
    return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
        });

        if (!order) throw new Error("Order not found");

        // Create adjustment for the return
        const adjustment = await tx.stockAdjustment.create({
            data: {
                userId: 1, // System user or staff processing return
                storeId: order.storeId!,
                adjustmentType: "RETURN",
                reason: `Customer return for Order #${order.orderNumber}`,
                notes: `Customer ID: ${order.customerId}`,
            },
        });

        for (const item of returnItems) {
            const currentStock = await tx.storeVariantStock.findUnique({
                where: {
                    storeId_variantId: {
                        storeId: order.storeId!,
                        variantId: item.variantId,
                    },
                },
            });

            const previousQuantity = currentStock?.quantity || 0;
            const newQuantity = previousQuantity + item.quantity;

            await tx.storeVariantStock.update({
                where: {
                    storeId_variantId: {
                        storeId: order.storeId!,
                        variantId: item.variantId,
                    },
                },
                data: { quantity: newQuantity },
            });

            await tx.stockMovement.create({
                data: {
                    variantId: item.variantId,
                    storeId: order.storeId!,
                    userId: 1, // System/staff user
                    customerId: order.customerId,
                    orderId: order.id,
                    adjustmentId: adjustment.id,
                    operation: "increment",
                    quantity: item.quantity,
                    previousQuantity,
                    newQuantity,
                    reason: "RETURN",
                    notes: `Return for Order #${order.orderNumber}`,
                },
            });
        }

        return adjustment;
    });
}
```

## Querying Stock Movements

### Get All Movements for an Order

```typescript
const orderMovements = await prisma.stockMovement.findMany({
    where: { orderId: orderId },
    include: {
        variant: { include: { product: true } },
        store: true,
        customer: true,
    },
});
```

### Get All Movements for a Customer

```typescript
const customerMovements = await prisma.stockMovement.findMany({
    where: { customerId: customerId },
    include: {
        variant: { include: { product: true } },
        order: true,
        store: true,
    },
    orderBy: { createdAt: "desc" },
});
```

### Get Staff Adjustments

```typescript
const staffAdjustments = await prisma.stockAdjustment.findMany({
    where: { userId: staffUserId },
    include: {
        user: { select: { name: true, email: true } },
        store: true,
        movements: {
            include: {
                variant: { include: { product: true } },
            },
        },
    },
    orderBy: { createdAt: "desc" },
});
```

### Get Movement History for a Variant

```typescript
const variantHistory = await prisma.stockMovement.findMany({
    where: {
        variantId: variantId,
        storeId: storeId,
    },
    include: {
        user: { select: { name: true } },
        customer: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
        adjustment: { select: { adjustmentType: true, reason: true } },
    },
    orderBy: { createdAt: "desc" },
});
```

## Reporting Queries

### Stock Movement Report

```typescript
// Daily stock movement summary
const dailyReport = await prisma.stockMovement.groupBy({
    by: ["operation", "reason"],
    where: {
        storeId: storeId,
        createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
    },
    _sum: { quantity: true },
    _count: true,
});
```

### Customer Purchase Analytics

```typescript
// Top customers by quantity purchased
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

## Benefits of This Approach

1. **Clear Separation**: Customer purchases vs staff adjustments
2. **Full Traceability**: Know exactly who/what caused each movement
3. **Better Reporting**: Easy to filter by customer, order, or adjustment type
4. **Data Integrity**: Proper foreign keys ensure referential integrity
5. **Audit Trail**: Complete history with proper references
6. **Flexible Queries**: Can easily query by any dimension

## Migration Notes

Existing stock movements with `userId` will need to be reviewed:

-   If related to customer orders → set `orderId` and `customerId`
-   If staff adjustments → create `StockAdjustment` record and link
