# System User Setup - COMPLETED ✅

## System User Created

A dedicated "System" user has been created for automated operations like customer orders and stock updates.

### User Details

```
ID: 6
Name: System
Email: system@shoeshop.internal
Role ID: 1
```

---

## Configuration

### Step 1: Add to Environment Variables

Add this to your `.env` file:

```env
# System User for Automated Operations
SYSTEM_USER_ID=6
```

### Step 2: Use in Code

```typescript
// In your services
const SYSTEM_USER_ID = parseInt(process.env.SYSTEM_USER_ID || "6");

// Use for customer orders
await InventoryService.bulkUpdateStock(storeId, items, {
    userId: SYSTEM_USER_ID,
    reason: "Customer order #123",
});
```

---

## Usage Examples

### Customer Order Processing

```javascript
// When customer places order from website
await fetch("/inventory/stock/bulk/1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        items: [
            { variantId: 2, quantity: 2, operation: "decrement" },
            { variantId: 5, quantity: 1, operation: "decrement" },
        ],
        userId: 6, // ← System user
        reason: "Customer order #123",
        notes: "Online purchase",
    }),
});

// ✅ Works! Stock updated and logged as "System" user
```

### Manual Stock Adjustment by Employee

```javascript
// When employee manually adjusts stock
await fetch("/inventory/stock/bulk/1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        items: [{ variantId: 2, quantity: 10, operation: "increment" }],
        userId: 123, // ← Employee's actual user ID
        reason: "Found in backroom",
        notes: "During inventory check",
    }),
});

// ✅ Logs show actual employee who made the change
```

---

## Verification

Test that it works:

```bash
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "variantId": 2, "quantity": 5, "operation": "increment" }
    ],
    "userId": 6,
    "reason": "Test - System user working"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "Successfully updated stock for 1 variants",
#   "data": [...]
# }
```

---

## When to Use System User vs Real User

| Operation                        | Use System User (ID: 6) | Use Real User ID   |
| -------------------------------- | ----------------------- | ------------------ |
| **Customer orders** (automated)  | ✅ Yes                  | ❌ No              |
| **Customer returns** (automated) | ✅ Yes                  | ❌ No              |
| **Manual stock adjustments**     | ❌ No                   | ✅ Yes (track who) |
| **Receiving shipments**          | ❌ No                   | ✅ Yes (track who) |
| **Inventory counts**             | ❌ No                   | ✅ Yes (track who) |
| **Damage/loss**                  | ❌ No                   | ✅ Yes (track who) |

**Rule of Thumb:**

-   **System user (6):** Automated operations where no specific person is responsible
-   **Real user ID:** Manual operations where accountability matters

---

## Movement History Examples

### View Movements by System

```bash
GET /inventory/movements/user/6

# Shows all automated operations:
# - Customer orders
# - Automated processes
# - System-initiated changes
```

### View Movements by Employee

```bash
GET /inventory/movements/user/123

# Shows all manual operations by this employee:
# - Manual adjustments
# - Shipment receiving
# - Damage reports
```

---

## Security Note

The System user:

-   ✅ Has a secure password (you won't need to log in with it)
-   ✅ Is used ONLY for backend operations (not for frontend login)
-   ✅ Appears in audit trails as "System"
-   ✅ Helps distinguish automated vs manual operations

---

## If You Need to Recreate

The system user is already created, but if you ever need to recreate it:

```bash
npx ts-node scripts/create-system-user.ts
```

The script will:

-   Check if system user exists
-   Create if needed
-   Show the user ID to use

---

## Summary

✅ **System User Created:** ID = 6  
✅ **Use for:** Customer orders, automated operations  
✅ **Add to .env:** `SYSTEM_USER_ID=6`  
✅ **Test:** Run the curl command above

**Your stock movement tracking is now fully configured!** 🎉

---

## Next: Test Your Order Flow

```javascript
// 1. Customer adds items to cart
const cart = [
    { variantId: 2, quantity: 2, price: 99.99 },
    { variantId: 5, quantity: 1, price: 89.99 }
];

// 2. Customer checks out
POST /inventory/stock/bulk/1
{
    items: cart.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
        operation: "decrement"
    })),
    userId: 6,  // System user
    reason: "Customer order #123"
}

// 3. Stock reduced ✅
// 4. Movements logged ✅
// 5. Audit trail complete ✅
```

**Everything is ready for production!** 🚀
