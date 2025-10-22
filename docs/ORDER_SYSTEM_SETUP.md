# Order System Setup Guide

## Overview

This guide will help you set up and configure the Order Management System for the SHOESHOP e-commerce platform.

## Prerequisites

1. **Database Setup**: Ensure your PostgreSQL database is running and accessible
2. **Authentication System**: Customer and admin authentication must be configured
3. **Product System**: Products and inventory must be set up
4. **Address System**: Customer addresses must be configured

## Installation Steps

### 1. Database Schema

The order system uses the following Prisma models:

```prisma
model Order {
  id             Int             @id @default(autoincrement())
  orderNumber    String          @unique
  customerId     Int
  addressId      Int?
  status         OrderStatus     @default(PENDING)
  totalAmount    Float
  paymentMethod  PaymentMethod
  paid           Boolean         @default(false)
  notes          String?
  placedAt       DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  storeId        Int?
  // ... relations
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  price     Float
  // ... relations
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum PaymentMethod {
  CARD
  MPESAEXPRESS
  PAYBILL
  PAYPAL
  COD
  OTHER
}
```

### 2. Required Files

The following files have been created for the order system:

```
api/
├── services/order/
│   └── order.service.ts
├── controllers/
│   ├── customer/
│   │   └── order.controller.ts
│   └── admin/
│       └── order.controller.ts
├── routes/
│   ├── customer-order.routes.ts
│   └── admin-order.routes.ts
├── validation/
│   └── order.validation.ts
├── utils/
│   └── orderUtils.ts
└── docs/
    ├── ORDER_MANAGEMENT_API.md
    └── ORDER_SYSTEM_SETUP.md
```

### 3. App Integration

The order routes have been integrated into `api/app.ts`:

```typescript
import customerOrderRoutes from "./routes/customer-order.routes";
import adminOrderRoutes from "./routes/admin-order.routes";

// Routes
app.use("/customer/orders", customerOrderRoutes);
app.use("/admin/orders", adminOrderRoutes);
```

## Configuration

### 1. Environment Variables

Ensure these environment variables are set:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/shoeshop"

# JWT Secrets
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_CUSTOMER_ACCESS_SECRET="your-customer-access-secret"
JWT_CUSTOMER_REFRESH_SECRET="your-customer-refresh-secret"

# Order Configuration
ORDER_NUMBER_PREFIX="ORD"
DEFAULT_SHIPPING_METHOD="standard"
```

### 2. Permissions Setup

Create the following permissions in your database:

```sql
INSERT INTO "Permission" (resource, action) VALUES
('orders', 'view'),
('orders', 'edit'),
('orders', 'delete'),
('orders', 'create');
```

Assign these permissions to appropriate roles:

```sql
-- Admin role gets all permissions
INSERT INTO "RolePermission" (roleId, permissionId)
SELECT r.id, p.id
FROM "Role" r, "Permission" p
WHERE r.name = 'Admin' AND p.resource = 'orders';

-- Manager role gets view and edit permissions
INSERT INTO "RolePermission" (roleId, permissionId)
SELECT r.id, p.id
FROM "Role" r, "Permission" p
WHERE r.name = 'Manager' AND p.resource = 'orders' AND p.action IN ('view', 'edit');
```

## Testing the Setup

### 1. Test Customer Order Placement

```bash
# Register a customer first
curl -X POST http://localhost:3000/customer/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test Customer"
  }'

# Place an order
curl -X POST http://localhost:3000/customer/orders \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "price": 99.99
      }
    ],
    "paymentMethod": "CARD",
    "totalAmount": 199.98
  }'
```

### 2. Test Admin Order Management

```bash
# Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123!"
  }'

# Get all orders
curl -X GET http://localhost:3000/admin/orders \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Update order status
curl -X PUT http://localhost:3000/admin/orders/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SHIPPED",
    "notes": "Shipped via FedEx"
  }'
```

## Key Features

### 1. Order Management

-   ✅ Place orders with multiple items
-   ✅ Automatic stock management
-   ✅ Order status tracking
-   ✅ Order cancellation and returns
-   ✅ Coupon code support

### 2. Admin Features

-   ✅ Order analytics and reporting
-   ✅ Bulk order operations
-   ✅ Order export functionality
-   ✅ Advanced filtering and search
-   ✅ Customer order history

### 3. Security Features

-   ✅ JWT authentication
-   ✅ Role-based access control
-   ✅ Rate limiting
-   ✅ Input validation
-   ✅ Stock integrity checks

### 4. Business Logic

-   ✅ Automatic order number generation
-   ✅ Stock reservation and release
-   ✅ Order status workflow
-   ✅ Payment tracking
-   ✅ Audit trail

## Troubleshooting

### Common Issues

1. **Order Creation Fails**

    - Check if products exist and have sufficient stock
    - Verify customer authentication
    - Ensure all required fields are provided

2. **Stock Issues**

    - Check inventory records exist for products
    - Verify stock quantities are positive
    - Check for concurrent order placement

3. **Permission Errors**

    - Verify user has correct role and permissions
    - Check JWT token validity
    - Ensure middleware is properly configured

4. **Database Errors**
    - Verify database connection
    - Check Prisma schema is up to date
    - Ensure all required tables exist

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=order:*
```

## Performance Optimization

### 1. Database Indexes

Ensure these indexes exist for optimal performance:

```sql
CREATE INDEX idx_order_customer_id ON "Order"("customerId");
CREATE INDEX idx_order_status ON "Order"("status");
CREATE INDEX idx_order_placed_at ON "Order"("placedAt");
CREATE INDEX idx_order_store_id ON "Order"("storeId");
CREATE INDEX idx_order_item_order_id ON "OrderItem"("orderId");
CREATE INDEX idx_order_item_product_id ON "OrderItem"("productId");
```

### 2. Caching

Consider implementing Redis caching for:

-   Order analytics
-   Customer order history
-   Product availability

### 3. Pagination

Always use pagination for order lists:

-   Default page size: 20
-   Maximum page size: 100
-   Implement cursor-based pagination for large datasets

## Monitoring

### 1. Key Metrics to Monitor

-   Order placement rate
-   Order completion rate
-   Average order value
-   Stock movement accuracy
-   API response times

### 2. Logging

The system logs important events:

-   Order creation
-   Status changes
-   Stock movements
-   Payment updates
-   Error conditions

### 3. Alerts

Set up alerts for:

-   Failed order placements
-   Stock inconsistencies
-   High error rates
-   Performance degradation

## Maintenance

### 1. Regular Tasks

-   Monitor order analytics
-   Review failed orders
-   Check stock accuracy
-   Update order statuses
-   Clean up old data

### 2. Data Cleanup

Consider implementing:

-   Archive old completed orders
-   Clean up cancelled orders
-   Optimize database performance
-   Update statistics

## Support

For issues or questions:

1. Check the API documentation
2. Review error logs
3. Test with sample data
4. Contact the development team

## Version History

-   **v1.0.0**: Initial order system implementation
-   Features: Basic CRUD, status management, analytics
-   Security: JWT auth, role-based access, rate limiting
-   Performance: Pagination, filtering, bulk operations
