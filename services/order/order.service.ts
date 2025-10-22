import {
    PrismaClient,
    Order,
    OrderStatus,
    PaymentMethod,
    Prisma,
} from "../../generated/prisma/client";
import { generateOrderNumber } from "../../utils/orderUtils";

const prisma = new PrismaClient();

export interface CreateOrderData {
    customerId: number;
    addressId?: number;
    items: {
        variantId: number;
        quantity: number;
        price: number;
    }[];
    paymentMethod: PaymentMethod;
    totalAmount: number;
    notes?: string;
    storeId?: number;
    couponCodes?: string[];
}

export interface UpdateOrderData {
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    paid?: boolean;
    notes?: string;
    addressId?: number;
}

export interface OrderFilters {
    customerId?: number;
    storeId?: number;
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    paid?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
}

export interface OrderAnalytics {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    ordersByPaymentMethod: Record<PaymentMethod, number>;
    recentOrders: Order[];
    topProducts: Array<{
        variantId: number;
        productName: string;
        totalSold: number;
        revenue: number;
    }>;
}

class OrderService {
    /**
     * Create a new order with items and handle stock updates
     */
    async createOrder(data: CreateOrderData): Promise<Order> {
        return await prisma.$transaction(async (tx) => {
            // Validate foreign key references before creating order
            try {
                // Check customer exists
                const customer = await tx.customer.findUnique({
                    where: { id: data.customerId },
                });
                if (!customer) {
                    throw new Error(
                        `Customer with ID ${data.customerId} not found`
                    );
                }

                // Check address exists (if provided)
                if (data.addressId) {
                    const address = await tx.address.findUnique({
                        where: { id: data.addressId },
                    });
                    if (!address) {
                        throw new Error(
                            `Address with ID ${data.addressId} not found`
                        );
                    }
                }

                // Check store exists (if provided, or default to 1)
                const storeId = data.storeId || 1;
                const store = await tx.store.findUnique({
                    where: { id: storeId },
                });
                if (!store) {
                    throw new Error(`Store with ID ${storeId} not found`);
                }

                // Check all variants exist
                for (const item of data.items) {
                    const variant = await tx.productVariant.findUnique({
                        where: { id: item.variantId },
                    });
                    if (!variant) {
                        throw new Error(
                            `Product variant with ID ${item.variantId} not found`
                        );
                    }
                }
            } catch (error) {
                console.error("Foreign key validation failed:", error);
                throw error;
            }

            // Generate unique order number
            const orderNumber = await generateOrderNumber();

            // Validate and reserve stock for all items
            for (const item of data.items) {
                const variant = await tx.productVariant.findUnique({
                    where: { id: item.variantId },
                    include: { product: true },
                });

                if (!variant) {
                    throw new Error(
                        `Product variant with ID ${item.variantId} not found`
                    );
                }

                // Check stock availability
                const stock = await tx.storeVariantStock.findFirst({
                    where: {
                        variantId: item.variantId,
                        storeId: data.storeId || 1, // Default to store 1 if not specified
                    },
                });

                if (!stock || stock.quantity < item.quantity) {
                    throw new Error(
                        `Insufficient stock for variant ${variant.name}`
                    );
                }

                // Reserve stock
                await tx.storeVariantStock.update({
                    where: { id: stock.id },
                    data: {
                        quantity: {
                            decrement: item.quantity,
                        },
                    },
                });

                // Create stock movement record
                await tx.stockMovement.create({
                    data: {
                        variantId: item.variantId,
                        storeId: data.storeId || 1,
                        customerId: data.customerId,
                        orderId: null, // Will be updated after order creation
                        operation: "decrement",
                        quantity: item.quantity,
                        previousQuantity: stock.quantity,
                        newQuantity: stock.quantity - item.quantity,
                        reason: `Order ${orderNumber}`,
                    },
                });
            }

            // Create the order
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    customerId: data.customerId,
                    addressId: data.addressId,
                    status: "PENDING",
                    totalAmount: data.totalAmount,
                    paymentMethod: data.paymentMethod,
                    paid: false,
                    notes: data.notes,
                    storeId: data.storeId,
                    items: {
                        create: data.items.map((item) => ({
                            variantId: item.variantId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    address: true,
                    items: {
                        include: {
                            variant: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    price: true,
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    store: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // Update stock movements with order ID
            await tx.stockMovement.updateMany({
                where: {
                    variantId: { in: data.items.map((item) => item.variantId) },
                    orderId: null,
                    reason: `Order ${orderNumber}`,
                },
                data: {
                    orderId: order.id,
                },
            });

            // Apply coupons if provided
            if (data.couponCodes && data.couponCodes.length > 0) {
                for (const couponCode of data.couponCodes) {
                    const coupon = await tx.coupon.findFirst({
                        where: {
                            code: couponCode,
                            status: "ACTIVE",
                            isExpired: false,
                        },
                    });

                    if (coupon) {
                        await tx.orderCoupon.create({
                            data: {
                                orderId: order.id,
                                couponId: coupon.id,
                            },
                        });
                    }
                }
            }

            return order;
        });
    }

    /**
     * Get all orders with filtering and pagination
     */
    async getOrders(
        filters: OrderFilters = {},
        page: number = 1,
        limit: number = 20
    ): Promise<{ orders: Order[]; total: number; pages: number }> {
        const skip = (page - 1) * limit;

        const where: Prisma.OrderWhereInput = {
            ...(filters.customerId && { customerId: filters.customerId }),
            ...(filters.storeId && { storeId: filters.storeId }),
            ...(filters.status && { status: filters.status }),
            ...(filters.paymentMethod && {
                paymentMethod: filters.paymentMethod,
            }),
            ...(filters.paid !== undefined && { paid: filters.paid }),
            ...((filters.dateFrom || filters.dateTo) && {
                placedAt: {
                    ...(filters.dateFrom && { gte: filters.dateFrom }),
                    ...(filters.dateTo && { lte: filters.dateTo }),
                },
            }),
            ...(filters.search && {
                OR: [
                    {
                        orderNumber: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        customer: {
                            name: {
                                contains: filters.search,
                                mode: "insensitive",
                            },
                        },
                    },
                    {
                        customer: {
                            email: {
                                contains: filters.search,
                                mode: "insensitive",
                            },
                        },
                    },
                ],
            }),
        };

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    address: true,
                    items: {
                        include: {
                            variant: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    price: true,
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    store: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    transactions: true,
                    coupons: {
                        include: {
                            coupon: true,
                        },
                    },
                },
                orderBy: { placedAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);

        return {
            orders,
            total,
            pages: Math.ceil(total / limit),
        };
    }

    /**
     * Get order by ID
     */
    async getOrderById(id: number): Promise<Order | null> {
        return await prisma.order.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                address: true,
                items: {
                    include: {
                        variant: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                price: true,
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                transactions: true,
                coupons: {
                    include: {
                        coupon: true,
                    },
                },
                stockMovements: {
                    include: {
                        variant: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Get order by order number
     */
    async getOrderByNumber(orderNumber: string): Promise<Order | null> {
        return await prisma.order.findUnique({
            where: { orderNumber },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                address: true,
                items: {
                    include: {
                        variant: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                price: true,
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                transactions: true,
                coupons: {
                    include: {
                        coupon: true,
                    },
                },
            },
        });
    }

    /**
     * Update order status and details
     */
    async updateOrder(id: number, data: UpdateOrderData): Promise<Order> {
        return await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id },
                include: { items: true, coupons: true },
            });

            if (!order) {
                throw new Error("Order not found");
            }

            // Handle status changes
            if (data.status && data.status !== order.status) {
                // If cancelling order, restore stock
                if (
                    data.status === "CANCELLED" &&
                    order.status !== "CANCELLED"
                ) {
                    for (const item of order.items) {
                        const stock = await tx.storeVariantStock.findFirst({
                            where: {
                                variantId: item.variantId,
                                storeId: order.storeId || 1,
                            },
                        });

                        if (stock) {
                            await tx.storeVariantStock.update({
                                where: { id: stock.id },
                                data: {
                                    quantity: {
                                        increment: item.quantity,
                                    },
                                },
                            });

                            // Create stock movement for cancellation
                            await tx.stockMovement.create({
                                data: {
                                    variantId: item.variantId,
                                    storeId: order.storeId || 1,
                                    orderId: order.id,
                                    operation: "increment",
                                    quantity: item.quantity,
                                    previousQuantity: stock.quantity,
                                    newQuantity: stock.quantity + item.quantity,
                                    reason: `Order ${order.orderNumber} cancelled`,
                                },
                            });
                        }
                    }
                }
            }

            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date(),
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    address: true,
                    items: {
                        include: {
                            variant: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    price: true,
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    store: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    transactions: true,
                    coupons: {
                        include: {
                            coupon: true,
                        },
                    },
                },
            });

            // If order just became paid, record coupon usage(s)
            if (data.paid === true && order.paid === false) {
                for (const oc of order.coupons) {
                    await tx.couponUsage.upsert({
                        where: {
                            couponId_customerId_orderId: {
                                couponId: oc.couponId,
                                customerId: order.customerId,
                                orderId: order.id,
                            },
                        },
                        update: {},
                        create: {
                            couponId: oc.couponId,
                            customerId: order.customerId,
                            orderId: order.id,
                        },
                    });
                }
            }

            return updatedOrder;
        });
    }

    /**
     * Cancel an order
     */
    async cancelOrder(id: number, reason?: string): Promise<Order> {
        return await this.updateOrder(id, {
            status: "CANCELLED",
            notes: reason ? `Cancelled: ${reason}` : "Order cancelled",
        });
    }

    /**
     * Get customer orders
     */
    async getCustomerOrders(
        customerId: number,
        page: number = 1,
        limit: number = 20
    ): Promise<{ orders: Order[]; total: number; pages: number }> {
        return await this.getOrders({ customerId }, page, limit);
    }

    /**
     * Get order analytics
     */
    async getOrderAnalytics(
        storeId?: number,
        dateFrom?: Date,
        dateTo?: Date
    ): Promise<OrderAnalytics> {
        const where: Prisma.OrderWhereInput = {
            ...(storeId && { storeId }),
            ...((dateFrom || dateTo) && {
                placedAt: {
                    ...(dateFrom && { gte: dateFrom }),
                    ...(dateTo && { lte: dateTo }),
                },
            }),
        };

        const [
            totalOrders,
            totalRevenue,
            ordersByStatus,
            ordersByPaymentMethod,
            recentOrders,
            topProducts,
        ] = await Promise.all([
            // Total orders
            prisma.order.count({ where }),

            // Total revenue
            prisma.order.aggregate({
                where: { ...where, paid: true },
                _sum: { totalAmount: true },
            }),

            // Orders by status
            prisma.order.groupBy({
                by: ["status"],
                where,
                _count: { status: true },
            }),

            // Orders by payment method
            prisma.order.groupBy({
                by: ["paymentMethod"],
                where,
                _count: { paymentMethod: true },
            }),

            // Recent orders
            prisma.order.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    items: {
                        include: {
                            variant: {
                                select: {
                                    name: true,
                                    product: {
                                        select: {
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { placedAt: "desc" },
                take: 10,
            }),

            // Top products
            prisma.orderItem.groupBy({
                by: ["variantId"],
                where: {
                    order: where,
                },
                _sum: {
                    quantity: true,
                    price: true,
                },
                orderBy: {
                    _sum: {
                        quantity: "desc",
                    },
                },
                take: 10,
            }),
        ]);

        // Get variant names for top products
        const variantIds = topProducts.map((p) => p.variantId);
        const variants = await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
                id: true,
                name: true,
                product: {
                    select: { name: true },
                },
            },
        });

        const variantMap = variants.reduce((acc, variant) => {
            acc[variant.id] = `${variant.product.name} - ${variant.name}`;
            return acc;
        }, {} as Record<number, string>);

        const topProductsWithNames = topProducts.map((item) => ({
            variantId: item.variantId,
            productName: variantMap[item.variantId] || "Unknown Product",
            totalSold: item._sum.quantity || 0,
            revenue: (item._sum.price || 0) * (item._sum.quantity || 0),
        }));

        return {
            totalOrders,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            averageOrderValue:
                totalOrders > 0
                    ? (totalRevenue._sum.totalAmount || 0) / totalOrders
                    : 0,
            ordersByStatus: ordersByStatus.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {} as Record<OrderStatus, number>),
            ordersByPaymentMethod: ordersByPaymentMethod.reduce((acc, item) => {
                acc[item.paymentMethod] = item._count.paymentMethod;
                return acc;
            }, {} as Record<PaymentMethod, number>),
            recentOrders,
            topProducts: topProductsWithNames,
        };
    }

    /**
     * Calculate coupon discount amount
     */
    private calculateCouponDiscount(coupon: any, orderAmount: number): number {
        switch (coupon.type) {
            case "FIXED":
                return Math.min(coupon.value, orderAmount);
            case "PERCENTAGE":
                return (orderAmount * coupon.value) / 100;
            case "FREESHIPPING":
                return 0; // Free shipping is handled separately
            default:
                return 0;
        }
    }

    /**
     * Delete order (soft delete)
     */
    async deleteOrder(id: number): Promise<void> {
        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!order) {
            throw new Error("Order not found");
        }

        if (order.status !== "CANCELLED") {
            throw new Error("Only cancelled orders can be deleted");
        }

        // Restore stock if not already restored
        for (const item of order.items) {
            const stock = await prisma.storeVariantStock.findFirst({
                where: {
                    variantId: item.variantId,
                    storeId: order.storeId || 1,
                },
            });

            if (stock) {
                await prisma.storeVariantStock.update({
                    where: { id: stock.id },
                    data: {
                        quantity: {
                            increment: item.quantity,
                        },
                    },
                });
            }
        }

        // Delete related records
        await prisma.$transaction([
            prisma.stockMovement.deleteMany({ where: { orderId: id } }),
            prisma.transaction.deleteMany({ where: { orderId: id } }),
            prisma.orderCoupon.deleteMany({ where: { orderId: id } }),
            prisma.orderItem.deleteMany({ where: { orderId: id } }),
            prisma.order.delete({ where: { id } }),
        ]);
    }
}

export default new OrderService();
