import { prisma } from "../../utils/prisma";
import { StockStatus } from "../../generated/prisma/client";

const InventoryService = {
    // Update variant pricing and SKU only
    updateVariantInventory: async (
        variantId: number,
        data: {
            price?: number;
            salePrice?: number;
            wholesalePrice?: number;
            wholesaleQty?: number;
            sku?: string;
        }
    ) => {
        return await prisma.productVariant.update({
            where: { id: variantId },
            data: {
                price: data.price,
                salePrice: data.salePrice,
                wholesalePrice: data.wholesalePrice,
                wholesaleQty: data.wholesaleQty,
                sku: data.sku,
            },
        });
    },

    // Update stock quantity for a specific store
    updateStock: async (
        variantId: number,
        storeId: number,
        data: {
            quantity: number;
            stockStatus: string;
            operation?: "set" | "increment" | "decrement";
            userId?: number; // Who is making the change
            reason?: string; // Why the change is being made
            notes?: string; // Additional notes
        }
    ) => {
        // Convert stockStatus string to enum
        const stockStatusEnum =
            (data.stockStatus as keyof typeof StockStatus) in StockStatus
                ? StockStatus[data.stockStatus as keyof typeof StockStatus]
                : undefined;
        if (!stockStatusEnum) throw new Error("Invalid stockStatus value");

        const operation = data.operation || "increment"; // Default to increment

        // 🔒 Use transaction to ensure stock update and movement log are atomic
        return await prisma.$transaction(async (tx) => {
            // Get current stock
            const currentStock = await tx.storeVariantStock.findUnique({
                where: {
                    storeId_variantId: {
                        storeId,
                        variantId,
                    },
                },
            });

            const previousQuantity = currentStock?.quantity || 0;
            let finalQuantity = data.quantity;

            // Calculate final quantity based on operation
            if (operation === "increment") {
                finalQuantity = previousQuantity + data.quantity;
            } else if (operation === "decrement") {
                finalQuantity = previousQuantity - data.quantity;

                // Ensure quantity doesn't go negative
                if (finalQuantity < 0) {
                    throw new Error(
                        `Cannot decrement stock below 0. Current: ${previousQuantity}, Decrement: ${data.quantity}`
                    );
                }
            }
            // For 'set', finalQuantity is already data.quantity

            // Update or create stock record
            const updatedStock = await tx.storeVariantStock.upsert({
                where: {
                    storeId_variantId: {
                        storeId,
                        variantId,
                    },
                },
                update: {
                    quantity: finalQuantity,
                    stockStatus: stockStatusEnum,
                },
                create: {
                    storeId,
                    variantId,
                    quantity: finalQuantity,
                    stockStatus: stockStatusEnum,
                },
            });

            // 📝 Create stock adjustment and movement log (if userId provided)
            if (data.userId) {
                // Create adjustment record
                const adjustment = await tx.stockAdjustment.create({
                    data: {
                        userId: data.userId,
                        storeId,
                        adjustmentType: data.reason || "CORRECTION",
                        reason: data.reason || "Manual stock update",
                        notes: data.notes,
                    },
                });

                // Create stock movement linked to adjustment
                await tx.stockMovement.create({
                    data: {
                        variantId,
                        storeId,
                        userId: data.userId, // Staff member
                        customerId: null, // No customer
                        orderId: null, // No order
                        adjustmentId: adjustment.id, // Link to adjustment
                        operation,
                        quantity: data.quantity, // Amount changed
                        previousQuantity,
                        newQuantity: finalQuantity,
                        reason: data.reason || null,
                        notes: data.notes || null,
                    },
                });
            }

            return updatedStock;
        });
    },

    // Get stock for a variant across all stores
    getVariantStock: async (variantId: number) => {
        return await prisma.storeVariantStock.findMany({
            where: { variantId },
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    },

    // Get stock for a specific variant in a specific store
    getStockByStore: async (variantId: number, storeId: number) => {
        return await prisma.storeVariantStock.findUnique({
            where: {
                storeId_variantId: {
                    storeId,
                    variantId,
                },
            },
        });
    },

    // Get stock movement history for a variant
    getVariantMovements: async (
        variantId: number,
        options?: {
            storeId?: number;
            limit?: number;
            offset?: number;
        }
    ) => {
        return await prisma.stockMovement.findMany({
            where: {
                variantId,
                ...(options?.storeId && { storeId: options.storeId }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                    },
                },
                variant: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: options?.limit || 50,
            skip: options?.offset || 0,
        });
    },

    // Get stock movement history for a store
    getStoreMovements: async (
        storeId: number,
        options?: {
            limit?: number;
            offset?: number;
            startDate?: Date;
            endDate?: Date;
        }
    ) => {
        return await prisma.stockMovement.findMany({
            where: {
                storeId,
                ...(options?.startDate && {
                    createdAt: { gte: options.startDate },
                }),
                ...(options?.endDate && {
                    createdAt: { lte: options.endDate },
                }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                variant: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: options?.limit || 50,
            skip: options?.offset || 0,
        });
    },

    // Get stock movements by user (who made changes)
    getUserMovements: async (
        userId: number,
        options?: {
            limit?: number;
            offset?: number;
        }
    ) => {
        return await prisma.stockMovement.findMany({
            where: { userId },
            include: {
                variant: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: options?.limit || 50,
            skip: options?.offset || 0,
        });
    },

    // Bulk update stock for multiple variants (for orders with multiple items)
    bulkUpdateStock: async (
        storeId: number,
        items: Array<{
            variantId: number;
            quantity: number;
            operation?: "set" | "increment" | "decrement";
        }>,
        metadata: {
            userId: number;
            reason: string;
            notes?: string;
            stockStatus?: string;
        }
    ) => {
        const stockStatusEnum = metadata.stockStatus
            ? (metadata.stockStatus as keyof typeof StockStatus) in StockStatus
                ? StockStatus[metadata.stockStatus as keyof typeof StockStatus]
                : StockStatus.IN_STOCK
            : StockStatus.IN_STOCK;

        // 🔒 Use transaction to ensure ALL stock updates are atomic
        return await prisma.$transaction(async (tx) => {
            const results = [];

            // Create stock adjustment record for this bulk operation
            const adjustment = await tx.stockAdjustment.create({
                data: {
                    userId: metadata.userId,
                    storeId,
                    adjustmentType: metadata.reason || "CORRECTION",
                    reason: metadata.reason || "Manual stock adjustment",
                    notes: metadata.notes,
                },
            });

            for (const item of items) {
                const operation = item.operation || "decrement"; // Default to decrement for orders

                // Get current stock
                const currentStock = await tx.storeVariantStock.findUnique({
                    where: {
                        storeId_variantId: {
                            storeId,
                            variantId: item.variantId,
                        },
                    },
                });

                const previousQuantity = currentStock?.quantity || 0;
                let finalQuantity = item.quantity;

                // Calculate final quantity based on operation
                if (operation === "increment") {
                    finalQuantity = previousQuantity + item.quantity;
                } else if (operation === "decrement") {
                    finalQuantity = previousQuantity - item.quantity;

                    // Ensure quantity doesn't go negative
                    if (finalQuantity < 0) {
                        throw new Error(
                            `Insufficient stock for variant ${item.variantId}. ` +
                                `Available: ${previousQuantity}, Requested: ${item.quantity}`
                        );
                    }
                }
                // For 'set', finalQuantity is already item.quantity

                // Determine stock status based on final quantity
                const finalStockStatus =
                    finalQuantity === 0
                        ? StockStatus.OUT_OF_STOCK
                        : finalQuantity <= 10
                        ? StockStatus.LIMITED
                        : StockStatus.IN_STOCK;

                // Update or create stock record
                const updatedStock = await tx.storeVariantStock.upsert({
                    where: {
                        storeId_variantId: {
                            storeId,
                            variantId: item.variantId,
                        },
                    },
                    update: {
                        quantity: finalQuantity,
                        stockStatus: finalStockStatus,
                    },
                    create: {
                        storeId,
                        variantId: item.variantId,
                        quantity: finalQuantity,
                        stockStatus: finalStockStatus,
                    },
                });

                // Log the stock movement with proper references
                await tx.stockMovement.create({
                    data: {
                        variantId: item.variantId,
                        storeId,
                        userId: metadata.userId, // Staff user making adjustment
                        customerId: null, // No customer for staff adjustments
                        orderId: null, // No order for manual adjustments
                        adjustmentId: adjustment.id, // Link to adjustment record
                        operation,
                        quantity: item.quantity,
                        previousQuantity,
                        newQuantity: finalQuantity,
                        reason: metadata.reason,
                        notes: metadata.notes || null,
                    },
                });

                results.push(updatedStock);
            }

            return results;
        });
    },

    // ===== STOCK ADJUSTMENT METHODS =====

    // Get all stock adjustments with pagination and filters
    getStockAdjustments: async (
        filters: {
            userId?: number;
            storeId?: number;
            adjustmentType?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        } = {}
    ) => {
        const where: any = {};

        if (filters.userId) where.userId = filters.userId;
        if (filters.storeId) where.storeId = filters.storeId;
        if (filters.adjustmentType)
            where.adjustmentType = filters.adjustmentType;

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        return await prisma.stockAdjustment.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                movements: {
                    include: {
                        variant: {
                            include: {
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
            },
            orderBy: { createdAt: "desc" },
            take: filters.limit || 50,
            skip: filters.offset || 0,
        });
    },

    // Get stock adjustment by ID
    getStockAdjustmentById: async (adjustmentId: number) => {
        return await prisma.stockAdjustment.findUnique({
            where: { id: adjustmentId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                movements: {
                    include: {
                        variant: {
                            include: {
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
            },
        });
    },

    // Get stock adjustments by user
    getStockAdjustmentsByUser: async (
        userId: number,
        options: {
            limit?: number;
            offset?: number;
            startDate?: Date;
            endDate?: Date;
        } = {}
    ) => {
        const where: any = { userId };

        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) where.createdAt.gte = options.startDate;
            if (options.endDate) where.createdAt.lte = options.endDate;
        }

        return await prisma.stockAdjustment.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                movements: {
                    include: {
                        variant: {
                            include: {
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
            },
            orderBy: { createdAt: "desc" },
            take: options.limit || 50,
            skip: options.offset || 0,
        });
    },

    // Get stock adjustments by store
    getStockAdjustmentsByStore: async (
        storeId: number,
        options: {
            limit?: number;
            offset?: number;
            startDate?: Date;
            endDate?: Date;
        } = {}
    ) => {
        const where: any = { storeId };

        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) where.createdAt.gte = options.startDate;
            if (options.endDate) where.createdAt.lte = options.endDate;
        }

        return await prisma.stockAdjustment.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                movements: {
                    include: {
                        variant: {
                            include: {
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
            },
            orderBy: { createdAt: "desc" },
            take: options.limit || 50,
            skip: options.offset || 0,
        });
    },

    // Get stock adjustment statistics
    getStockAdjustmentStats: async (
        filters: {
            userId?: number;
            storeId?: number;
            startDate?: Date;
            endDate?: Date;
        } = {}
    ) => {
        const where: any = {};

        if (filters.userId) where.userId = filters.userId;
        if (filters.storeId) where.storeId = filters.storeId;

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        const [totalAdjustments, adjustmentTypes, topUsers, recentAdjustments] =
            await Promise.all([
                // Total count
                prisma.stockAdjustment.count({ where }),

                // Group by adjustment type
                prisma.stockAdjustment.groupBy({
                    by: ["adjustmentType"],
                    where,
                    _count: { adjustmentType: true },
                    orderBy: { _count: { adjustmentType: "desc" } },
                }),

                // Top users by adjustment count
                prisma.stockAdjustment.groupBy({
                    by: ["userId"],
                    where,
                    _count: { userId: true },
                    orderBy: { _count: { userId: "desc" } },
                    take: 5,
                }),

                // Recent adjustments
                prisma.stockAdjustment.findMany({
                    where,
                    include: {
                        user: { select: { name: true } },
                        store: { select: { name: true } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                }),
            ]);

        // Get user details for top users
        const topUsersWithDetails = await Promise.all(
            topUsers.map(async (user) => {
                const userDetails = await prisma.user.findUnique({
                    where: { id: user.userId },
                    select: { name: true, email: true },
                });
                return {
                    userId: user.userId,
                    name: userDetails?.name,
                    email: userDetails?.email,
                    adjustmentCount: user._count.userId,
                };
            })
        );

        return {
            totalAdjustments,
            adjustmentTypes: adjustmentTypes.map((type) => ({
                type: type.adjustmentType,
                count: type._count.adjustmentType,
            })),
            topUsers: topUsersWithDetails,
            recentAdjustments,
        };
    },
};

export default InventoryService;
