# Quick Test for Bulk Stock Update

## ✅ System User Created

-   **User ID:** 6
-   **Name:** System
-   **Email:** system@shoeshop.internal

---

## Test the Bulk Update Endpoint

### Test 1: Increment Stock (with System User)

```bash
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "variantId": 2,
        "quantity": 5,
        "operation": "increment"
      }
    ],
    "userId": 6,
    "reason": "Test - Adding stock"
  }'
```

**Expected Response:**

```json
{
    "success": true,
    "message": "Successfully updated stock for 1 variants",
    "data": [
        {
            "id": 1,
            "variantId": 2,
            "storeId": 1,
            "quantity": 15,
            "stockStatus": "IN_STOCK"
        }
    ]
}
```

---

### Test 2: Decrement Stock (Multiple Variants - Customer Order)

```bash
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "variantId": 2,
        "quantity": 2,
        "operation": "decrement"
      },
      {
        "variantId": 5,
        "quantity": 1,
        "operation": "decrement"
      }
    ],
    "userId": 6,
    "reason": "Customer order #123",
    "notes": "Online purchase - 2 items"
  }'
```

**Expected Response:**

```json
{
    "success": true,
    "message": "Successfully updated stock for 2 variants",
    "data": [
        {
            "variantId": 2,
            "quantity": 13,
            "stockStatus": "IN_STOCK"
        },
        {
            "variantId": 5,
            "quantity": 14,
            "stockStatus": "IN_STOCK"
        }
    ]
}
```

---

### Test 3: Without userId (Uses Default System User = 6)

```bash
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "variantId": 2,
        "quantity": 1,
        "operation": "increment"
      }
    ],
    "reason": "Test - Default user"
  }'
```

**Should work because userId defaults to 6!**

---

### Test 4: View Stock Movements for System User

```bash
curl http://localhost:3500/inventory/movements/user/6
```

**Expected Response:**

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "variantId": 2,
            "storeId": 1,
            "operation": "increment",
            "quantity": 5,
            "previousQuantity": 10,
            "newQuantity": 15,
            "reason": "Test - Adding stock",
            "createdAt": "2025-10-09T...",
            "user": {
                "id": 6,
                "name": "System",
                "email": "system@shoeshop.internal"
            }
        }
        // ... more movements
    ]
}
```

---

## Common Error Scenarios

### ❌ Insufficient Stock

```bash
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "variantId": 2,
        "quantity": 100,
        "operation": "decrement"
      }
    ],
    "userId": 6,
    "reason": "Test - Too much"
  }'
```

**Expected Error:**

```json
{
    "error": "Insufficient stock for variant 2. Available: 15, Requested: 100"
}
```

**Result:** ✅ Transaction rolled back, NO stock changes

---

### ❌ Invalid User ID

```bash
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "variantId": 2,
        "quantity": 1,
        "operation": "increment"
      }
    ],
    "userId": 999,
    "reason": "Test"
  }'
```

**Expected Error:**

```json
{
    "error": "Foreign key constraint violated: StockMovement_userId_fkey"
}
```

**Solution:** Use a valid userId (like 6 for System user)

---

## Success Checklist

-   ✅ System user created (ID: 6)
-   ✅ Default userId = 6 in controller
-   ✅ Bulk update endpoint working
-   ✅ Stock movements being logged
-   ✅ Atomic transactions (all or nothing)
-   ✅ Insufficient stock properly handled

---

## Next Steps

### 1. Add to .env File

```env
SYSTEM_USER_ID=6
```

### 2. Use in Your Frontend

```javascript
// Customer checkout
const orderItems = [
    { variantId: 2, quantity: 2 },
    { variantId: 5, quantity: 1 },
];

const response = await fetch("/inventory/stock/bulk/1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        items: orderItems.map((item) => ({
            ...item,
            operation: "decrement",
        })),
        userId: 6, // System user
        reason: `Customer order #${orderId}`,
    }),
});

if (response.ok) {
    // Stock updated successfully
    // Proceed with order creation
} else {
    // Handle error (likely insufficient stock)
    const error = await response.json();
    alert(error.error);
}
```

---

## Your API is Ready! 🎉

✅ **Stock updates:** Single or bulk  
✅ **Operations:** Set, increment, decrement  
✅ **Tracking:** Who, when, why for every change  
✅ **Safety:** Atomic transactions, no partial updates  
✅ **Audit:** Complete movement history

**Time to integrate with your frontend!** 🚀
