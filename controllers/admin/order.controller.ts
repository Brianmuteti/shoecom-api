import { Request, Response } from "express";
import { z } from "zod";
import OrderService, {
    UpdateOrderData,
    OrderFilters,
} from "../../services/order/order.service";
import {
    formatOrderStatus,
    formatPaymentMethod,
    canCancelOrder,
    canReturnOrder,
    calculateEstimatedDelivery,
} from "../../utils/orderUtils";

const adminOrderController = {
    /**
     * Get all orders with advanced filtering and pagination
     */
    getAllOrders: async (req: Request, res: Response): Promise<void> => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const filters: OrderFilters = {
            customerId: req.query.customerId
                ? parseInt(req.query.customerId as string)
                : undefined,
            storeId: req.query.storeId
                ? parseInt(req.query.storeId as string)
                : undefined,
            status: req.query.status as any,
            paymentMethod: req.query.paymentMethod as any,
            paid:
                req.query.paid === "true"
                    ? true
                    : req.query.paid === "false"
                    ? false
                    : undefined,
            search: req.query.search as string,
            dateFrom: req.query.dateFrom
                ? new Date(req.query.dateFrom as string)
                : undefined,
            dateTo: req.query.dateTo
                ? new Date(req.query.dateTo as string)
                : undefined,
        };

        // Remove undefined values
        Object.keys(filters).forEach((key) => {
            if (filters[key as keyof OrderFilters] === undefined) {
                delete filters[key as keyof OrderFilters];
            }
        });

        const result = await OrderService.getOrders(filters, page, limit);

        const ordersWithDisplay = result.orders.map((order) => ({
            ...order,
            statusDisplay: formatOrderStatus(order.status),
            paymentMethodDisplay: formatPaymentMethod(order.paymentMethod),
            estimatedDelivery: calculateEstimatedDelivery(order.placedAt),
            canCancel: canCancelOrder(order.status),
            canReturn: canReturnOrder(order.status),
        }));

        res.json({
            success: true,
            data: {
                orders: ordersWithDisplay,
                pagination: {
                    currentPage: page,
                    totalPages: result.pages,
                    totalOrders: result.total,
                    hasNext: page < result.pages,
                    hasPrev: page > 1,
                },
                filters: filters,
            },
        });
    },

    /**
     * Get order details by ID
     */
    getOrderDetails: async (req: Request, res: Response): Promise<void> => {
        const orderId = parseInt(req.params.id);

        if (isNaN(orderId)) {
            res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
            return;
        }

        const order = await OrderService.getOrderById(orderId);

        if (!order) {
            res.status(404).json({
                success: false,
                message: "Order not found",
            });
            return;
        }

        res.json({
            success: true,
            data: {
                ...order,
                statusDisplay: formatOrderStatus(order.status),
                paymentMethodDisplay: formatPaymentMethod(order.paymentMethod),
                estimatedDelivery: calculateEstimatedDelivery(order.placedAt),
                canCancel: canCancelOrder(order.status),
                canReturn: canReturnOrder(order.status),
            },
        });
    },

    /**
     * Update order status and details
     */
    updateOrder: async (req: Request, res: Response): Promise<void> => {
        const orderId = parseInt(req.params.id);

        if (isNaN(orderId)) {
            res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
            return;
        }

        const schema = z.object({
            status: z
                .enum([
                    "PENDING",
                    "PROCESSING",
                    "SHIPPED",
                    "DELIVERED",
                    "CANCELLED",
                    "RETURNED",
                ])
                .optional(),
            paymentMethod: z
                .enum([
                    "CARD",
                    "MPESAEXPRESS",
                    "PAYBILL",
                    "PAYPAL",
                    "COD",
                    "OTHER",
                ])
                .optional(),
            paid: z.boolean().optional(),
            notes: z.string().optional(),
            addressId: z.number().int().positive().optional(),
        });

        const updateData = schema.parse(req.body);

        const updatedOrder = await OrderService.updateOrder(
            orderId,
            updateData
        );

        res.json({
            success: true,
            message: "Order updated successfully",
            data: {
                ...updatedOrder,
                statusDisplay: formatOrderStatus(updatedOrder.status),
                paymentMethodDisplay: formatPaymentMethod(
                    updatedOrder.paymentMethod
                ),
                estimatedDelivery: calculateEstimatedDelivery(
                    updatedOrder.placedAt
                ),
            },
        });
    },

    /**
     * Cancel an order (admin)
     */
    cancelOrder: async (req: Request, res: Response): Promise<void> => {
        const orderId = parseInt(req.params.id);

        if (isNaN(orderId)) {
            res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
            return;
        }

        const schema = z.object({
            reason: z.string().min(1, "Cancellation reason is required"),
        });

        const { reason } = schema.parse(req.body);

        const cancelledOrder = await OrderService.cancelOrder(orderId, reason);

        res.json({
            success: true,
            message: "Order cancelled successfully",
            data: {
                ...cancelledOrder,
                statusDisplay: formatOrderStatus(cancelledOrder.status),
                paymentMethodDisplay: formatPaymentMethod(
                    cancelledOrder.paymentMethod
                ),
            },
        });
    },

    /**
     * Delete an order (soft delete)
     */
    deleteOrder: async (req: Request, res: Response): Promise<void> => {
        const orderId = parseInt(req.params.id);

        if (isNaN(orderId)) {
            res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
            return;
        }

        await OrderService.deleteOrder(orderId);

        res.json({
            success: true,
            message: "Order deleted successfully",
        });
    },

    /**
     * Get order analytics and statistics
     */
    getOrderAnalytics: async (req: Request, res: Response): Promise<void> => {
        const storeId = req.query.storeId
            ? parseInt(req.query.storeId as string)
            : undefined;
        const dateFrom = req.query.dateFrom
            ? new Date(req.query.dateFrom as string)
            : undefined;
        const dateTo = req.query.dateTo
            ? new Date(req.query.dateTo as string)
            : undefined;

        const analytics = await OrderService.getOrderAnalytics(
            storeId,
            dateFrom,
            dateTo
        );

        // Format analytics for display
        const formattedAnalytics = {
            ...analytics,
            ordersByStatus: Object.entries(analytics.ordersByStatus).map(
                ([status, count]) => ({
                    status,
                    statusDisplay: formatOrderStatus(status),
                    count,
                })
            ),
            ordersByPaymentMethod: Object.entries(
                analytics.ordersByPaymentMethod
            ).map(([method, count]) => ({
                method,
                methodDisplay: formatPaymentMethod(method),
                count,
            })),
            recentOrders: analytics.recentOrders.map((order) => ({
                ...order,
                statusDisplay: formatOrderStatus(order.status),
                paymentMethodDisplay: formatPaymentMethod(order.paymentMethod),
            })),
        };

        res.json({
            success: true,
            data: formattedAnalytics,
        });
    },

    /**
     * Get orders by customer
     */
    getCustomerOrders: async (req: Request, res: Response): Promise<void> => {
        const customerId = parseInt(req.params.customerId);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (isNaN(customerId)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const result = await OrderService.getCustomerOrders(
            customerId,
            page,
            limit
        );

        const ordersWithDisplay = result.orders.map((order) => ({
            ...order,
            statusDisplay: formatOrderStatus(order.status),
            paymentMethodDisplay: formatPaymentMethod(order.paymentMethod),
            estimatedDelivery: calculateEstimatedDelivery(order.placedAt),
            canCancel: canCancelOrder(order.status),
            canReturn: canReturnOrder(order.status),
        }));

        res.json({
            success: true,
            data: {
                orders: ordersWithDisplay,
                pagination: {
                    currentPage: page,
                    totalPages: result.pages,
                    totalOrders: result.total,
                    hasNext: page < result.pages,
                    hasPrev: page > 1,
                },
            },
        });
    },

    /**
     * Bulk update order statuses
     */
    bulkUpdateOrders: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({
            orderIds: z
                .array(z.number().int().positive())
                .min(1, "At least one order ID is required"),
            status: z.enum([
                "PENDING",
                "PROCESSING",
                "SHIPPED",
                "DELIVERED",
                "CANCELLED",
                "RETURNED",
            ]),
            notes: z.string().optional(),
        });

        const { orderIds, status, notes } = schema.parse(req.body);

        const results = [];
        const errors = [];

        for (const orderId of orderIds) {
            try {
                const updateData: UpdateOrderData = { status };
                if (notes) {
                    updateData.notes = notes;
                }

                const updatedOrder = await OrderService.updateOrder(
                    orderId,
                    updateData
                );
                results.push({
                    orderId,
                    success: true,
                    order: {
                        ...updatedOrder,
                        statusDisplay: formatOrderStatus(updatedOrder.status),
                    },
                });
            } catch (error: any) {
                errors.push({
                    orderId,
                    success: false,
                    error: error.message,
                });
            }
        }

        res.json({
            success: true,
            message: `Bulk update completed. ${results.length} successful, ${errors.length} failed.`,
            data: {
                successful: results,
                failed: errors,
            },
        });
    },

    /**
     * Export orders to CSV
     */
    exportOrders: async (req: Request, res: Response): Promise<void> => {
        const filters: OrderFilters = {
            customerId: req.query.customerId
                ? parseInt(req.query.customerId as string)
                : undefined,
            storeId: req.query.storeId
                ? parseInt(req.query.storeId as string)
                : undefined,
            status: req.query.status as any,
            paymentMethod: req.query.paymentMethod as any,
            paid:
                req.query.paid === "true"
                    ? true
                    : req.query.paid === "false"
                    ? false
                    : undefined,
            dateFrom: req.query.dateFrom
                ? new Date(req.query.dateFrom as string)
                : undefined,
            dateTo: req.query.dateTo
                ? new Date(req.query.dateTo as string)
                : undefined,
        };

        // Remove undefined values
        Object.keys(filters).forEach((key) => {
            if (filters[key as keyof OrderFilters] === undefined) {
                delete filters[key as keyof OrderFilters];
            }
        });

        // Get all orders matching filters (no pagination for export)
        const result = await OrderService.getOrders(filters, 1, 10000);

        // Generate CSV content
        const csvHeaders = [
            "Order Number",
            "Customer Name",
            "Customer Email",
            "Status",
            "Payment Method",
            "Total Amount",
            "Paid",
            "Placed At",
            "Updated At",
            "Store",
            "Items Count",
        ];

        const csvRows = result.orders.map((order) => [
            order.orderNumber,
            (order as any).customer.name || "",
            (order as any).customer.email || "",
            formatOrderStatus(order.status),
            formatPaymentMethod(order.paymentMethod),
            order.totalAmount,
            order.paid ? "Yes" : "No",
            order.placedAt.toISOString(),
            order.updatedAt.toISOString(),
            (order as any).store?.name || "",
            (order as any).items.length,
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map((row) => row.map((field) => `"${field}"`).join(","))
            .join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="orders-${
                new Date().toISOString().split("T")[0]
            }.csv"`
        );
        res.send(csvContent);
    },
};

export default adminOrderController;
