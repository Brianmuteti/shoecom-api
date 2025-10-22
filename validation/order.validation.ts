import { z } from "zod";

// Order Status Enum
export const OrderStatusSchema = z.enum([
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
]);

// Payment Method Enum
export const PaymentMethodSchema = z.enum([
    "CARD",
    "MPESAEXPRESS",
    "PAYBILL",
    "PAYPAL",
    "COD",
    "OTHER",
]);

// Order Item Schema
export const OrderItemSchema = z.object({
    variantId: z
        .number()
        .int()
        .positive("Variant ID must be a positive integer"),
    quantity: z.number().int().positive().min(1, "Quantity must be at least 1"),
    price: z.number().positive("Price must be positive"),
});

// Create Order Schema (Customer)
export const CreateOrderSchema = z
    .object({
        addressId: z
            .number()
            .int()
            .positive("Address ID must be a positive integer")
            .optional(),
        items: z
            .array(OrderItemSchema)
            .min(1, "At least one item is required")
            .max(50, "Maximum 50 items per order"),
        paymentMethod: PaymentMethodSchema,
        totalAmount: z.number().positive("Total amount must be positive"),
        notes: z
            .string()
            .max(1000, "Notes cannot exceed 1000 characters")
            .optional(),
        storeId: z
            .number()
            .int()
            .positive("Store ID must be a positive integer")
            .optional(),
        couponCodes: z
            .array(z.string().min(1, "Coupon code cannot be empty"))
            .max(5, "Maximum 5 coupons per order")
            .optional(),
        shippingMethod: z
            .enum(["standard", "express", "overnight"])
            .default("standard"),
    })
    .refine(
        (data) => {
            // Validate total amount matches items
            const calculatedTotal = data.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );
            return Math.abs(calculatedTotal - data.totalAmount) <= 0.01;
        },
        {
            message: "Total amount must match the sum of item prices",
            path: ["totalAmount"],
        }
    );

// Update Order Schema (Admin)
export const UpdateOrderSchema = z.object({
    status: OrderStatusSchema.optional(),
    paymentMethod: PaymentMethodSchema.optional(),
    paid: z.boolean().optional(),
    notes: z
        .string()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional(),
    addressId: z
        .number()
        .int()
        .positive("Address ID must be a positive integer")
        .optional(),
});

// Cancel Order Schema
export const CancelOrderSchema = z.object({
    reason: z
        .string()
        .min(1, "Cancellation reason is required")
        .max(500, "Reason cannot exceed 500 characters"),
});

// Return Order Schema
export const ReturnOrderSchema = z.object({
    reason: z
        .string()
        .min(1, "Return reason is required")
        .max(500, "Reason cannot exceed 500 characters"),
    items: z
        .array(
            z.object({
                itemId: z
                    .number()
                    .int()
                    .positive("Item ID must be a positive integer"),
                quantity: z
                    .number()
                    .int()
                    .positive()
                    .min(1, "Return quantity must be at least 1"),
                reason: z
                    .string()
                    .min(1, "Item return reason is required")
                    .max(200, "Item reason cannot exceed 200 characters"),
            })
        )
        .min(1, "At least one item must be returned"),
});

// Bulk Update Schema
export const BulkUpdateOrderSchema = z.object({
    orderIds: z
        .array(z.number().int().positive("Order ID must be a positive integer"))
        .min(1, "At least one order ID is required")
        .max(100, "Maximum 100 orders per bulk update"),
    status: OrderStatusSchema,
    notes: z
        .string()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional(),
});

// Order Filters Schema
export const OrderFiltersSchema = z
    .object({
        customerId: z
            .number()
            .int()
            .positive("Customer ID must be a positive integer")
            .optional(),
        storeId: z
            .number()
            .int()
            .positive("Store ID must be a positive integer")
            .optional(),
        status: OrderStatusSchema.optional(),
        paymentMethod: PaymentMethodSchema.optional(),
        paid: z.boolean().optional(),
        search: z
            .string()
            .max(100, "Search term cannot exceed 100 characters")
            .optional(),
        dateFrom: z.string().datetime("Invalid date format").optional(),
        dateTo: z.string().datetime("Invalid date format").optional(),
        page: z.number().int().positive().min(1).max(1000).default(1),
        limit: z.number().int().positive().min(1).max(100).default(20),
    })
    .refine(
        (data) => {
            // Validate date range
            if (data.dateFrom && data.dateTo) {
                const from = new Date(data.dateFrom);
                const to = new Date(data.dateTo);
                return from <= to;
            }
            return true;
        },
        {
            message: "Date from must be before or equal to date to",
            path: ["dateTo"],
        }
    );

// Order Analytics Filters Schema
export const OrderAnalyticsFiltersSchema = z
    .object({
        storeId: z
            .number()
            .int()
            .positive("Store ID must be a positive integer")
            .optional(),
        dateFrom: z.string().datetime("Invalid date format").optional(),
        dateTo: z.string().datetime("Invalid date format").optional(),
    })
    .refine(
        (data) => {
            // Validate date range
            if (data.dateFrom && data.dateTo) {
                const from = new Date(data.dateFrom);
                const to = new Date(data.dateTo);
                return from <= to;
            }
            return true;
        },
        {
            message: "Date from must be before or equal to date to",
            path: ["dateTo"],
        }
    );

// Order Number Schema
export const OrderNumberSchema = z
    .string()
    .regex(/^ORD-\d{8}-\d{6}$/, "Invalid order number format")
    .min(1, "Order number is required");

// Order ID Schema
export const OrderIdSchema = z
    .number()
    .int("Order ID must be an integer")
    .positive("Order ID must be positive");

// Customer ID Schema
export const CustomerIdSchema = z
    .number()
    .int("Customer ID must be an integer")
    .positive("Customer ID must be positive");

// Pagination Schema
export const PaginationSchema = z.object({
    page: z.number().int().positive().min(1).max(1000).default(1),
    limit: z.number().int().positive().min(1).max(100).default(20),
});

// Order Status Update Schema (for specific status transitions)
export const OrderStatusUpdateSchema = z.object({
    status: OrderStatusSchema,
    notes: z
        .string()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional(),
    trackingNumber: z
        .string()
        .max(100, "Tracking number cannot exceed 100 characters")
        .optional(),
    estimatedDelivery: z.string().datetime("Invalid date format").optional(),
});

// Order Payment Update Schema
export const OrderPaymentUpdateSchema = z.object({
    paid: z.boolean(),
    paymentMethod: PaymentMethodSchema.optional(),
    transactionId: z
        .string()
        .max(100, "Transaction ID cannot exceed 100 characters")
        .optional(),
    notes: z
        .string()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional(),
});

// Order Address Update Schema
export const OrderAddressUpdateSchema = z.object({
    addressId: z
        .number()
        .int()
        .positive("Address ID must be a positive integer"),
    notes: z
        .string()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional(),
});

// Order Search Schema
export const OrderSearchSchema = z.object({
    query: z
        .string()
        .min(1, "Search query is required")
        .max(100, "Search query cannot exceed 100 characters"),
    filters: OrderFiltersSchema.optional(),
});

// Order Export Schema
export const OrderExportSchema = z.object({
    format: z.enum(["csv", "xlsx"]).default("csv"),
    filters: OrderFiltersSchema.optional(),
    fields: z
        .array(
            z.enum([
                "orderNumber",
                "customerName",
                "customerEmail",
                "status",
                "paymentMethod",
                "totalAmount",
                "paid",
                "placedAt",
                "updatedAt",
                "store",
                "items",
            ])
        )
        .optional(),
});

// Validation helper functions
export const validateOrderNumber = (orderNumber: string): boolean => {
    try {
        OrderNumberSchema.parse(orderNumber);
        return true;
    } catch {
        return false;
    }
};

export const validateOrderId = (id: any): boolean => {
    try {
        OrderIdSchema.parse(id);
        return true;
    } catch {
        return false;
    }
};

export const validateCustomerId = (id: any): boolean => {
    try {
        CustomerIdSchema.parse(id);
        return true;
    } catch {
        return false;
    }
};

// Order status transition validation
export const validStatusTransitions: Record<string, string[]> = {
    PENDING: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "RETURNED"],
    DELIVERED: ["RETURNED"],
    CANCELLED: [], // Terminal state
    RETURNED: [], // Terminal state
};

export const canTransitionTo = (
    fromStatus: string,
    toStatus: string
): boolean => {
    return validStatusTransitions[fromStatus]?.includes(toStatus) || false;
};

// Export all schemas
export {
    OrderStatusSchema as OrderStatus,
    PaymentMethodSchema as PaymentMethod,
    OrderItemSchema as OrderItem,
    CreateOrderSchema as CreateOrder,
    UpdateOrderSchema as UpdateOrder,
    CancelOrderSchema as CancelOrder,
    ReturnOrderSchema as ReturnOrder,
    BulkUpdateOrderSchema as BulkUpdate,
    OrderFiltersSchema as OrderFilters,
    OrderAnalyticsFiltersSchema as OrderAnalyticsFilters,
    OrderNumberSchema as OrderNumber,
    OrderIdSchema as OrderId,
    CustomerIdSchema as CustomerId,
    PaginationSchema as Pagination,
    OrderStatusUpdateSchema as OrderStatusUpdate,
    OrderPaymentUpdateSchema as OrderPaymentUpdate,
    OrderAddressUpdateSchema as OrderAddressUpdate,
    OrderSearchSchema as OrderSearch,
    OrderExportSchema as OrderExport,
};
