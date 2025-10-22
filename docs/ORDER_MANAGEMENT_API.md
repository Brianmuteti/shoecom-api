# Order Management API Documentation

## Overview

The Order Management API provides comprehensive functionality for both customers and administrators to manage orders in the SHOESHOP e-commerce system. This includes order placement, tracking, status management, analytics, and more.

## Base URLs

-   **Customer Orders**: `/customer/orders`
-   **Admin Orders**: `/admin/orders`

## Authentication

### Customer Authentication

-   **Method**: JWT Bearer Token
-   **Header**: `Authorization: Bearer <token>`
-   **Middleware**: `verifyCustomerJWT`

### Admin Authentication

-   **Method**: JWT Bearer Token
-   **Header**: `Authorization: Bearer <token>`
-   **Middleware**: `verifyJWT` + `requirePermission`

---

## Customer Order Operations

### 1. Place Order

**POST** `/customer/orders`

Place a new order with items and payment information.

**Request Body:**

```json
{
    "addressId": 1,
    "items": [
        {
            "variantId": 123,
            "quantity": 2,
            "price": 99.99
        }
    ],
    "paymentMethod": "CARD",
    "totalAmount": 199.98,
    "notes": "Please handle with care",
    "storeId": 1,
    "couponCodes": ["SAVE10", "FREESHIP"]
}
```

**Response (201):**

```json
{
    "success": true,
    "message": "Order placed successfully",
    "data": {
        "id": 1,
        "orderNumber": "ORD-20240101-000001",
        "customerId": 1,
        "status": "PENDING",
        "statusDisplay": "Pending",
        "totalAmount": 199.98,
        "paymentMethod": "CARD",
        "paymentMethodDisplay": "Credit/Debit Card",
        "paid": false,
        "placedAt": "2024-01-01T10:00:00Z",
        "estimatedDelivery": "2024-01-06T10:00:00Z",
        "items": [
            {
                "id": 1,
                "variantId": 123,
                "quantity": 2,
                "price": 99.99,
                "variant": {
                    "id": 123,
                    "name": "Size 10 - Black",
                    "sku": "NIKE-AM-10-BLK",
                    "price": 99.99,
                    "product": {
                        "id": 1,
                        "name": "Nike Air Max"
                    }
                }
            }
        ]
    }
}
```

### 2. Get My Orders

**GET** `/customer/orders`

Retrieve customer's orders with pagination and filtering.

**Query Parameters:**

-   `page` (optional): Page number (default: 1)
-   `limit` (optional): Items per page (default: 20, max: 100)
-   `status` (optional): Filter by status

**Response (200):**

```json
{
    "success": true,
    "data": {
        "orders": [
            {
                "id": 1,
                "orderNumber": "ORD-20240101-000001",
                "status": "DELIVERED",
                "statusDisplay": "Delivered",
                "totalAmount": 199.98,
                "placedAt": "2024-01-01T10:00:00Z",
                "canCancel": false,
                "canReturn": true
            }
        ],
        "pagination": {
            "currentPage": 1,
            "totalPages": 5,
            "totalOrders": 100,
            "hasNext": true,
            "hasPrev": false
        }
    }
}
```

### 3. Get Order Details

**GET** `/customer/orders/:id`

Get detailed information about a specific order.

**Response (200):**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "orderNumber": "ORD-20240101-000001",
        "status": "SHIPPED",
        "statusDisplay": "Shipped",
        "totalAmount": 199.98,
        "paymentMethod": "CARD",
        "paymentMethodDisplay": "Credit/Debit Card",
        "placedAt": "2024-01-01T10:00:00Z",
        "estimatedDelivery": "2024-01-06T10:00:00Z",
        "canCancel": false,
        "canReturn": false,
        "customer": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com"
        },
        "address": {
            "id": 1,
            "street": "123 Main St",
            "city": "New York",
            "zipCode": "10001"
        },
        "items": [
            {
                "id": 1,
                "productId": 123,
                "quantity": 2,
                "price": 99.99,
                "product": {
                    "id": 123,
                    "name": "Nike Air Max",
                    "slug": "nike-air-max",
                    "images": ["image1.jpg", "image2.jpg"]
                }
            }
        ]
    }
}
```

### 4. Track Order

**GET** `/customer/orders/track/:orderNumber`

Track order with detailed timeline.

**Response (200):**

```json
{
    "success": true,
    "data": {
        "order": {
            "id": 1,
            "orderNumber": "ORD-20240101-000001",
            "status": "SHIPPED",
            "statusDisplay": "Shipped",
            "estimatedDelivery": "2024-01-06T10:00:00Z"
        },
        "tracking": {
            "currentStatus": "SHIPPED",
            "timeline": [
                {
                    "status": "PENDING",
                    "title": "Order Placed",
                    "description": "Your order has been received and is being processed",
                    "date": "2024-01-01T10:00:00Z",
                    "completed": true
                },
                {
                    "status": "PROCESSING",
                    "title": "Order Processing",
                    "description": "Your order is being prepared for shipment",
                    "date": "2024-01-02T10:00:00Z",
                    "completed": true
                },
                {
                    "status": "SHIPPED",
                    "title": "Order Shipped",
                    "description": "Your order has been shipped and is on its way",
                    "date": "2024-01-03T10:00:00Z",
                    "completed": true
                },
                {
                    "status": "DELIVERED",
                    "title": "Order Delivered",
                    "description": "Your order has been delivered successfully",
                    "date": null,
                    "completed": false
                }
            ],
            "canCancel": false,
            "canReturn": false
        }
    }
}
```

### 5. Cancel Order

**POST** `/customer/orders/:id/cancel`

Cancel an order (only if status is PENDING or PROCESSING).

**Request Body:**

```json
{
    "reason": "Changed my mind"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Order cancelled successfully",
    "data": {
        "id": 1,
        "orderNumber": "ORD-20240101-000001",
        "status": "CANCELLED",
        "statusDisplay": "Cancelled"
    }
}
```

### 6. Request Return

**POST** `/customer/orders/:id/return`

Request return for delivered orders.

**Request Body:**

```json
{
    "reason": "Product doesn't fit",
    "items": [
        {
            "itemId": 1,
            "quantity": 1,
            "reason": "Size too small"
        }
    ]
}
```

### 7. Get Order Statistics

**GET** `/customer/orders/stats`

Get customer's order statistics.

**Response (200):**

```json
{
    "success": true,
    "data": {
        "totalOrders": 25,
        "totalSpent": 2499.75,
        "ordersByStatus": {
            "DELIVERED": 20,
            "SHIPPED": 3,
            "PENDING": 2
        },
        "recentOrders": [
            {
                "id": 1,
                "orderNumber": "ORD-20240101-000001",
                "status": "DELIVERED",
                "statusDisplay": "Delivered",
                "totalAmount": 199.98,
                "placedAt": "2024-01-01T10:00:00Z"
            }
        ]
    }
}
```

---

## Admin Order Operations

### 1. Get All Orders

**GET** `/admin/orders`

Retrieve all orders with advanced filtering and pagination.

**Query Parameters:**

-   `page` (optional): Page number (default: 1)
-   `limit` (optional): Items per page (default: 20)
-   `customerId` (optional): Filter by customer ID
-   `storeId` (optional): Filter by store ID
-   `status` (optional): Filter by status
-   `paymentMethod` (optional): Filter by payment method
-   `paid` (optional): Filter by payment status (true/false)
-   `search` (optional): Search in order number, customer name, or email
-   `dateFrom` (optional): Filter orders from date (ISO format)
-   `dateTo` (optional): Filter orders to date (ISO format)

**Response (200):**

```json
{
    "success": true,
    "data": {
        "orders": [
            {
                "id": 1,
                "orderNumber": "ORD-20240101-000001",
                "customer": {
                    "id": 1,
                    "name": "John Doe",
                    "email": "john@example.com"
                },
                "status": "SHIPPED",
                "statusDisplay": "Shipped",
                "totalAmount": 199.98,
                "paymentMethod": "CARD",
                "paymentMethodDisplay": "Credit/Debit Card",
                "paid": true,
                "placedAt": "2024-01-01T10:00:00Z",
                "canCancel": false,
                "canReturn": false
            }
        ],
        "pagination": {
            "currentPage": 1,
            "totalPages": 10,
            "totalOrders": 200,
            "hasNext": true,
            "hasPrev": false
        },
        "filters": {
            "status": "SHIPPED"
        }
    }
}
```

### 2. Get Order Details

**GET** `/admin/orders/:id`

Get detailed information about a specific order (admin view).

**Response (200):**

```json
{
    "success": true,
    "data": {
        "id": 1,
        "orderNumber": "ORD-20240101-000001",
        "customer": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890"
        },
        "status": "SHIPPED",
        "statusDisplay": "Shipped",
        "totalAmount": 199.98,
        "paymentMethod": "CARD",
        "paymentMethodDisplay": "Credit/Debit Card",
        "paid": true,
        "placedAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-03T10:00:00Z",
        "items": [
            {
                "id": 1,
                "variantId": 123,
                "quantity": 2,
                "price": 99.99,
                "variant": {
                    "id": 123,
                    "name": "Size 10 - Black",
                    "sku": "NIKE-AM-10-BLK",
                    "price": 99.99,
                    "product": {
                        "id": 1,
                        "name": "Nike Air Max"
                    }
                }
            }
        ],
        "transactions": [
            {
                "id": 1,
                "amount": 199.98,
                "method": "CARD",
                "status": "completed",
                "providerTxId": "tx_123456789",
                "createdAt": "2024-01-01T10:05:00Z"
            }
        ],
        "stockMovements": [
            {
                "id": 1,
                "productId": 123,
                "quantity": -2,
                "type": "SALE",
                "reason": "Order ORD-20240101-000001",
                "createdAt": "2024-01-01T10:00:00Z"
            }
        ]
    }
}
```

### 3. Update Order

**PUT** `/admin/orders/:id`

Update order status and details.

**Request Body:**

```json
{
    "status": "SHIPPED",
    "notes": "Shipped via FedEx",
    "paid": true
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Order updated successfully",
    "data": {
        "id": 1,
        "orderNumber": "ORD-20240101-000001",
        "status": "SHIPPED",
        "statusDisplay": "Shipped",
        "notes": "Shipped via FedEx",
        "paid": true
    }
}
```

### 4. Cancel Order (Admin)

**POST** `/admin/orders/:id/cancel`

Cancel an order (admin override).

**Request Body:**

```json
{
    "reason": "Customer requested cancellation"
}
```

### 5. Delete Order

**DELETE** `/admin/orders/:id`

Delete an order (only cancelled orders can be deleted).

**Response (200):**

```json
{
    "success": true,
    "message": "Order deleted successfully"
}
```

### 6. Get Order Analytics

**GET** `/admin/orders/analytics`

Get comprehensive order analytics and statistics.

**Query Parameters:**

-   `storeId` (optional): Filter by store ID
-   `dateFrom` (optional): Analytics from date (ISO format)
-   `dateTo` (optional): Analytics to date (ISO format)

**Response (200):**

```json
{
    "success": true,
    "data": {
        "totalOrders": 1000,
        "totalRevenue": 99999.99,
        "averageOrderValue": 99.99,
        "ordersByStatus": [
            {
                "status": "DELIVERED",
                "statusDisplay": "Delivered",
                "count": 800
            },
            {
                "status": "SHIPPED",
                "statusDisplay": "Shipped",
                "count": 100
            }
        ],
        "ordersByPaymentMethod": [
            {
                "method": "CARD",
                "methodDisplay": "Credit/Debit Card",
                "count": 600
            },
            {
                "method": "MPESAEXPRESS",
                "methodDisplay": "M-Pesa Express",
                "count": 300
            }
        ],
        "recentOrders": [
            {
                "id": 1,
                "orderNumber": "ORD-20240101-000001",
                "customer": {
                    "name": "John Doe",
                    "email": "john@example.com"
                },
                "totalAmount": 199.98,
                "status": "DELIVERED",
                "statusDisplay": "Delivered",
                "placedAt": "2024-01-01T10:00:00Z"
            }
        ],
        "topProducts": [
            {
                "productId": 123,
                "productName": "Nike Air Max",
                "totalSold": 50,
                "revenue": 4999.5
            }
        ]
    }
}
```

### 7. Get Customer Orders

**GET** `/admin/orders/customers/:customerId/orders`

Get all orders for a specific customer.

**Query Parameters:**

-   `page` (optional): Page number (default: 1)
-   `limit` (optional): Items per page (default: 20)

### 8. Bulk Update Orders

**POST** `/admin/orders/bulk-update`

Update multiple orders at once.

**Request Body:**

```json
{
    "orderIds": [1, 2, 3, 4, 5],
    "status": "SHIPPED",
    "notes": "Bulk shipped via FedEx"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Bulk update completed. 5 successful, 0 failed.",
    "data": {
        "successful": [
            {
                "orderId": 1,
                "success": true,
                "order": {
                    "id": 1,
                    "status": "SHIPPED",
                    "statusDisplay": "Shipped"
                }
            }
        ],
        "failed": []
    }
}
```

### 9. Export Orders

**GET** `/admin/orders/export`

Export orders to CSV format.

**Query Parameters:**

-   Same filtering options as "Get All Orders"
-   `format` (optional): Export format (csv/xlsx, default: csv)

**Response:** CSV file download

---

## Order Status Flow

### Valid Status Transitions

```
PENDING → PROCESSING → SHIPPED → DELIVERED
    ↓         ↓           ↓
CANCELLED  CANCELLED   RETURNED
```

### Status Descriptions

-   **PENDING**: Order placed, awaiting processing
-   **PROCESSING**: Order being prepared for shipment
-   **SHIPPED**: Order shipped and in transit
-   **DELIVERED**: Order delivered to customer
-   **CANCELLED**: Order cancelled (stock restored)
-   **RETURNED**: Order returned by customer

---

## Error Responses

### Common Error Codes

-   **400 Bad Request**: Invalid request data
-   **401 Unauthorized**: Missing or invalid authentication
-   **403 Forbidden**: Insufficient permissions
-   **404 Not Found**: Order not found
-   **409 Conflict**: Invalid status transition
-   **429 Too Many Requests**: Rate limit exceeded
-   **500 Internal Server Error**: Server error

### Error Response Format

```json
{
    "success": false,
    "message": "Error description",
    "errors": [
        {
            "field": "fieldName",
            "message": "Field-specific error message"
        }
    ]
}
```

---

## Rate Limiting

### Customer Endpoints

-   **Order Placement**: 10 requests per 15 minutes per IP
-   **Order Cancellation**: 10 requests per 15 minutes per IP
-   **Return Requests**: 10 requests per 15 minutes per IP

### Admin Endpoints

-   **Bulk Operations**: 5 requests per minute per user
-   **Export Operations**: 3 requests per minute per user

---

## Webhooks (Future Implementation)

Order status changes can trigger webhooks to external systems:

-   Order placed
-   Order shipped
-   Order delivered
-   Order cancelled
-   Order returned

---

## Integration Examples

### Frontend Integration

```javascript
// Place order
const placeOrder = async (orderData) => {
    const response = await fetch("/customer/orders", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
    });
    return response.json();
};

// Track order
const trackOrder = async (orderNumber) => {
    const response = await fetch(`/customer/orders/track/${orderNumber}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.json();
};
```

### Admin Dashboard Integration

```javascript
// Get order analytics
const getAnalytics = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/admin/orders/analytics?${params}`, {
        headers: {
            Authorization: `Bearer ${adminToken}`,
        },
    });
    return response.json();
};

// Bulk update orders
const bulkUpdate = async (orderIds, status, notes) => {
    const response = await fetch("/admin/orders/bulk-update", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderIds, status, notes }),
    });
    return response.json();
};
```

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Admin endpoints require specific permissions
3. **Rate Limiting**: Prevents abuse of order operations
4. **Input Validation**: All inputs validated using Zod schemas
5. **Stock Management**: Automatic stock updates with rollback on failures
6. **Audit Trail**: All order changes tracked in stock movements
7. **Data Privacy**: Customer data only accessible to authorized users

---

## Performance Considerations

1. **Pagination**: All list endpoints support pagination
2. **Filtering**: Advanced filtering reduces data transfer
3. **Indexing**: Database indexes on frequently queried fields
4. **Caching**: Order analytics can be cached for better performance
5. **Bulk Operations**: Efficient bulk updates for admin operations

---

## Future Enhancements

1. **Real-time Updates**: WebSocket support for order status updates
2. **Advanced Analytics**: More detailed reporting and insights
3. **Multi-currency Support**: International order handling
4. **Subscription Orders**: Recurring order management
5. **Order Templates**: Save and reuse order configurations
6. **Advanced Shipping**: Integration with shipping providers
7. **Order Splitting**: Split orders across multiple shipments
8. **Custom Statuses**: Configurable order status workflows
