# Stock Movement Troubleshooting Guide

## Common Error: Foreign Key Constraint Violation

### Error Message

```
Foreign key constraint violated on the constraint: `StockMovement_userId_fkey`
```

### What This Means

The `userId` you provided **doesn't exist** in the `User` table. StockMovement requires a valid user ID because it tracks who made the stock change.

---

## Solutions

### Solution 1: Use a Valid User ID ✅

**Check existing users:**

```sql
SELECT id, name, email FROM "User" WHERE "deletedAt" IS NULL;
```

**Or via Prisma:**

```typescript
const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true },
});

console.log(users);
// Use one of these IDs in your stock update
```

**Then use a valid userId:**

```json
{
    "items": [...],
    "userId": 1,  // ← Use actual user ID from database
    "reason": "Customer order #123"
}
```

---

### Solution 2: Create a System User ✅ (Recommended)

For automated operations (like online orders), create a dedicated system user:

```typescript
// Run this once to create a system user
const systemUser = await prisma.user.create({
    data: {
        name: "System",
        email: "system@shoeshop.com",
        phone: "+1234567890",
        password: "hashed_password_here",
        roleId: 1, // Use appropriate role ID
        active: true,
    },
});

console.log(`System User ID: ${systemUser.id}`);
// Save this ID for use in automated operations
```

**Then use in your code:**

```javascript
const SYSTEM_USER_ID = 1;  // The ID from above

// For customer orders
await bulkUpdateStock(storeId, {
    items: [...],
    userId: SYSTEM_USER_ID,  // ← System user
    reason: "Customer order #123"
});
```

---

### Solution 3: Make userId Optional for System Operations ✅

I've already made `userId` optional in the controller. If omitted, it defaults to user ID `1`:

```json
{
    "items": [...],
    // userId: not provided
    "reason": "Customer order #123"
}

// Will use userId: 1 by default
```

**BUT** you must ensure user ID `1` exists in your database!

---

## Quick Fix Steps

### Step 1: Check if User ID 1 Exists

```sql
SELECT * FROM "User" WHERE id = 1;
```

Or via API:

```bash
# If you have a user endpoint
curl http://localhost:3500/users/1
```

### Step 2A: If User ID 1 Exists ✅

You're good! Just use it:

```json
{
    "items": [...],
    "userId": 1,
    "reason": "..."
}
```

### Step 2B: If User ID 1 Doesn't Exist ❌

Create a system user with ID 1, or use an existing user ID:

**Option A: Create system user**

```typescript
// scripts/create-system-user.ts
import { prisma } from "../utils/prisma";
import bcrypt from "bcrypt";

async function createSystemUser() {
    const hashedPassword = await bcrypt.hash("SystemUser123!", 10);

    const systemUser = await prisma.user.create({
        data: {
            name: "System",
            email: "system@shoeshop.internal",
            phone: "+0000000000",
            password: hashedPassword,
            roleId: 1, // Adjust to match your roles
            active: true,
        },
    });

    console.log("✅ System user created:");
    console.log(`   ID: ${systemUser.id}`);
    console.log(`   Name: ${systemUser.name}`);
    console.log(`   Email: ${systemUser.email}`);

    return systemUser;
}

createSystemUser()
    .then(() => {
        console.log("✅ Done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
```

**Run it:**

```bash
npx ts-node scripts/create-system-user.ts
```

**Option B: Use an existing user**

```typescript
// Find any existing user
const firstUser = await prisma.user.findFirst({
    where: { deletedAt: null },
});

console.log(`Use this userId: ${firstUser.id}`);
```

---

## Testing Your Fix

### Test the Bulk Update

```bash
# 1. Check users exist
curl http://localhost:3500/users

# 2. Use a valid userId (e.g., userId from above)
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "variantId": 2, "quantity": 5, "operation": "increment" }
    ],
    "userId": 1,
    "reason": "Test"
  }'

# Should work! ✅
```

---

## Best Practices

### 1. **Use System User for Automated Operations** ✅

```javascript
const SYSTEM_USER_ID = 1;

// Customer orders (automated)
await bulkUpdateStock(storeId, {
    items: orderItems,
    userId: SYSTEM_USER_ID, // System processes orders
    reason: `Customer order #${orderId}`,
});

// Manual adjustments (by employee)
await bulkUpdateStock(storeId, {
    items: adjustments,
    userId: employeeId, // Track who made manual changes
    reason: "Physical count correction",
});
```

### 2. **Always Validate User Exists** ✅

```typescript
// In your order service
async function validateUser(userId: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error(`User ${userId} not found`);
    }

    return user;
}

// Before creating order
await validateUser(userId);
await bulkUpdateStock(...);
```

### 3. **Use Environment Variable for System User** ✅

```env
# .env
SYSTEM_USER_ID=1
```

```typescript
// services/order.service.ts
const SYSTEM_USER_ID = parseInt(process.env.SYSTEM_USER_ID || "1");

await bulkUpdateStock(storeId, {
    items: orderItems,
    userId: SYSTEM_USER_ID,
    reason: `Customer order #${orderId}`,
});
```

---

## Summary

### The Problem ❌

```
Error: Foreign key constraint violated on StockMovement_userId_fkey
Cause: userId doesn't exist in User table
```

### The Solution ✅

1. **Check if user ID 1 exists** in your database
2. **Create a system user** if it doesn't exist
3. **Use valid user IDs** in all stock updates
4. **Set up environment variable** for system user ID

### Quick Fix Command

```bash
# Create system user (run once)
npx ts-node -e "
import { prisma } from './utils/prisma';
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash('SystemUser123!', 10);
const user = await prisma.user.create({
    data: {
        name: 'System',
        email: 'system@shoeshop.internal',
        phone: '+0000000000',
        password: hash,
        roleId: 1,
        active: true
    }
});
console.log('System User ID:', user.id);
await prisma.\$disconnect();
"
```

---

## Verification

After creating the system user, test:

```bash
curl -X POST http://localhost:3500/inventory/stock/bulk/1 \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "variantId": 2, "quantity": 5, "operation": "increment" }
    ],
    "userId": 1,
    "reason": "Test after fix"
  }'

# Should return:
# {
#   "success": true,
#   "message": "Successfully updated stock for 1 variants",
#   "data": [...]
# }
```

✅ **Fixed!** Your stock movements will now work correctly! 🎉
