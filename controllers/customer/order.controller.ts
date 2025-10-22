import { Request, Response } from "express";
import { z } from "zod";
import OrderService, {
    CreateOrderData,
} from "../../services/order/order.service";
import {
    formatOrderStatus,
    formatPaymentMethod,
    canCancelOrder,
    canReturnOrder,
    calculateEstimatedDelivery,
} from "../../utils/orderUtils";

const customerOrderController = {
    /**
     * Place a new order
     */
    placeOrder: async (req: Request, res: Response): Promise<void> => {
        //   const customerId = (req as any).customerId;
        const customerId = 1;

        const schema = z.object({
            addressId: z.number().int().positive().optional(),
            items: z
                .array(
                    z.object({
                        variantId: z.number().int().positive(),
                        quantity: z.number().int().positive().min(1),
                        price: z.number().positive(),
                    })
                )
                .min(1, "At least one item is required"),
            paymentMethod: z.enum([
                "CARD",
                "MPESAEXPRESS",
                "PAYBILL",
                "PAYPAL",
                "COD",
                "OTHER",
            ]),
            totalAmount: z.number().positive(),
            notes: z.string().optional(),
            storeId: z.number().int().positive().optional(),
            couponCodes: z.array(z.string()).optional(),
        });

        const data = schema.parse(req.body);

        // Validate total amount matches items
        const calculatedTotal = data.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        if (Math.abs(calculatedTotal - data.totalAmount) > 0.01) {
            res.status(400).json({
                success: false,
                message: "Total amount does not match item prices",
            });
            return;
        }

        const orderData: CreateOrderData = {
            customerId,
            ...data,
        };

        const order = await OrderService.createOrder(orderData);

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: {
                ...order,
                statusDisplay: formatOrderStatus(order.status),
                paymentMethodDisplay: formatPaymentMethod(order.paymentMethod),
                estimatedDelivery: calculateEstimatedDelivery(order.placedAt),
            },
        });
    },

    /**
     * Get customer's orders with pagination
     */
    getMyOrders: async (req: Request, res: Response): Promise<void> => {
        const customerId = (req as any).customerId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;

        const filters: any = { customerId };
        if (status) {
            filters.status = status;
        }

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
            },
        });
    },

    /**
     * Get order details by ID
     */
    getOrderDetails: async (req: Request, res: Response): Promise<void> => {
        const customerId = (req as any).customerId;
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

        // Check if order belongs to the customer
        if (order.customerId !== customerId) {
            res.status(403).json({
                success: false,
                message: "Access denied",
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
     * Get order details by order number
     */
    getOrderByNumber: async (req: Request, res: Response): Promise<void> => {
        const customerId = (req as any).customerId;
        const orderNumber = req.params.orderNumber;

        const order = await OrderService.getOrderByNumber(orderNumber);

        if (!order) {
            res.status(404).json({
                success: false,
                message: "Order not found",
            });
            return;
        }

        // Check if order belongs to the customer
        if (order.customerId !== customerId) {
            res.status(403).json({
                success: false,
                message: "Access denied",
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
     * Cancel an order
     */
    cancelOrder: async (req: Request, res: Response): Promise<void> => {
        const customerId = (req as any).customerId;
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

        // Check if order exists and belongs to customer
        const existingOrder = await OrderService.getOrderById(orderId);
        if (!existingOrder) {
            res.status(404).json({
                success: false,
                message: "Order not found",
            });
            return;
        }

        if (existingOrder.customerId !== customerId) {
            res.status(403).json({
                success: false,
                message: "Access denied",
            });
            return;
        }

        // Check if order can be cancelled
        if (!canCancelOrder(existingOrder.status)) {
            res.status(400).json({
                success: false,
                message: `Order cannot be cancelled. Current status: ${formatOrderStatus(
                    existingOrder.status
                )}`,
            });
            return;
        }

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
     * Request order return
     */
    requestReturn: async (req: Request, res: Response): Promise<void> => {
        const customerId = (req as any).customerId;
        const orderId = parseInt(req.params.id);

        if (isNaN(orderId)) {
            res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
            return;
        }

        const schema = z.object({
            reason: z.string().min(1, "Return reason is required"),
            items: z
                .array(
                    z.object({
                        itemId: z.number().int().positive(),
                        quantity: z.number().int().positive().min(1),
                        reason: z.string().min(1),
                    })
                )
                .min(1, "At least one item must be returned"),
        });

        const { reason, items } = schema.parse(req.body);

        // Check if order exists and belongs to customer
        const existingOrder = await OrderService.getOrderById(orderId);
        if (!existingOrder) {
            res.status(404).json({
                success: false,
                message: "Order not found",
            });
            return;
        }

        if (existingOrder.customerId !== customerId) {
            res.status(403).json({
                success: false,
                message: "Access denied",
            });
            return;
        }

        // Check if order can be returned
        if (!canReturnOrder(existingOrder.status)) {
            res.status(400).json({
                success: false,
                message: `Order cannot be returned. Current status: ${formatOrderStatus(
                    existingOrder.status
                )}`,
            });
            return;
        }

        // Validate return items
        const orderItemIds = (existingOrder as any).items.map(
            (item: any) => item.id
        );
        for (const returnItem of items) {
            if (!orderItemIds.includes(returnItem.itemId)) {
                res.status(400).json({
                    success: false,
                    message: `Item with ID ${returnItem.itemId} not found in order`,
                });
                return;
            }

            const orderItem = (existingOrder as any).items.find(
                (item: any) => item.id === returnItem.itemId
            );
            if (returnItem.quantity > orderItem!.quantity) {
                res.status(400).json({
                    success: false,
                    message: `Return quantity cannot exceed ordered quantity for item ${returnItem.itemId}`,
                });
                return;
            }
        }

        // Update order status to RETURNED
        const returnedOrder = await OrderService.updateOrder(orderId, {
            status: "RETURNED",
            notes: `Return requested: ${reason}. Items: ${JSON.stringify(
                items
            )}`,
        });

        res.json({
            success: true,
            message: "Return request submitted successfully",
            data: {
                ...returnedOrder,
                statusDisplay: formatOrderStatus(returnedOrder.status),
                paymentMethodDisplay: formatPaymentMethod(
                    returnedOrder.paymentMethod
                ),
            },
        });
    },

    /**
     * Track order status
     */
    trackOrder: async (req: Request, res: Response): Promise<void> => {
        const customerId = (req as any).customerId;
        const orderNumber = req.params.orderNumber;

        const order = await OrderService.getOrderByNumber(orderNumber);

        if (!order) {
            res.status(404).json({
                success: false,
                message: "Order not found",
            });
            return;
        }

        // Check if order belongs to the customer
        if (order.customerId !== customerId) {
            res.status(403).json({
                success: false,
                message: "Access denied",
            });
            return;
        }

        // Create tracking timeline
        const timeline = [
            {
                status: "PENDING",
                title: "Order Placed",
                description:
                    "Your order has been received and is being processed",
                date: order.placedAt,
                completed: [
                    "PENDING",
                    "PROCESSING",
                    "SHIPPED",
                    "DELIVERED",
                ].includes(order.status),
            },
            {
                status: "PROCESSING",
                title: "Order Processing",
                description: "Your order is being prepared for shipment",
                date: order.status !== "PENDING" ? order.updatedAt : null,
                completed: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(
                    order.status
                ),
            },
            {
                status: "SHIPPED",
                title: "Order Shipped",
                description: "Your order has been shipped and is on its way",
                date:
                    order.status === "SHIPPED" || order.status === "DELIVERED"
                        ? order.updatedAt
                        : null,
                completed: ["SHIPPED", "DELIVERED"].includes(order.status),
            },
            {
                status: "DELIVERED",
                title: "Order Delivered",
                description: "Your order has been delivered successfully",
                date: order.status === "DELIVERED" ? order.updatedAt : null,
                completed: order.status === "DELIVERED",
            },
        ];

        res.json({
            success: true,
            data: {
                order: {
                    ...order,
                    statusDisplay: formatOrderStatus(order.status),
                    paymentMethodDisplay: formatPaymentMethod(
                        order.paymentMethod
                    ),
                    estimatedDelivery: calculateEstimatedDelivery(
                        order.placedAt
                    ),
                },
                tracking: {
                    currentStatus: order.status,
                    timeline,
                    canCancel: canCancelOrder(order.status),
                    canReturn: canReturnOrder(order.status),
                },
            },
        });
    },

    /**
     * Get order statistics for customer
     */
    getOrderStats: async (req: Request, res: Response): Promise<void> => {
        const customerId = (req as any).customerId;

        const result = await OrderService.getOrders({ customerId }, 1, 1000); // Get all orders for stats

        const stats = {
            totalOrders: result.total,
            totalSpent: result.orders.reduce(
                (sum, order) => sum + order.totalAmount,
                0
            ),
            ordersByStatus: result.orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            recentOrders: result.orders.slice(0, 5).map((order) => ({
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                statusDisplay: formatOrderStatus(order.status),
                totalAmount: order.totalAmount,
                placedAt: order.placedAt,
            })),
        };

        res.json({
            success: true,
            data: stats,
        });
    },
};

export default customerOrderController;
