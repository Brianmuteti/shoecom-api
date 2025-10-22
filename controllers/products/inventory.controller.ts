import { Request, Response } from "express";
import InventoryService from "../../services/product/inventory.service";
import { z } from "zod";

const inventoryController = {
    // Update variant pricing and SKU
    updateVariantInventory: async (req: Request, res: Response) => {
        const { variantId } = req.params;

        const schema = z.object({
            price: z.number().optional(),
            salePrice: z.number().optional(),
            wholesalePrice: z.number().optional(),
            wholesaleQty: z.number().optional(),
            sku: z.string().optional(),
        });

        const data = schema.parse(req.body);

        const updated = await InventoryService.updateVariantInventory(
            +variantId,
            data
        );

        res.json({
            success: true,
            data: updated,
            message: "Variant pricing updated successfully",
        });
    },

    // Update stock quantity for a specific store
    updateStock: async (req: Request, res: Response) => {
        const { variantId, storeId } = req.params;

        const schema = z.object({
            quantity: z.number().int().positive(),
            stockStatus: z.string(),
            operation: z.enum(["set", "increment", "decrement"]).optional(),
            userId: z.number().int().positive().optional(), // Who is making the change
            reason: z.string().optional(), // Why the change is being made
            notes: z.string().optional(), // Additional notes
        });

        const data = schema.parse(req.body);

        // Get userId from authenticated user or request body
        const userId = data.userId || (req as any).userId || 1; // Fallback to system user ID 1

        const updated = await InventoryService.updateStock(
            +variantId,
            +storeId,
            {
                ...data,
                userId, // Always provide userId
            }
        );

        const operationText = data.operation || "increment";
        const message =
            operationText === "set"
                ? `Stock set to ${updated.quantity}`
                : operationText === "increment"
                ? `Stock increased by ${data.quantity} to ${updated.quantity}`
                : `Stock decreased by ${data.quantity} to ${updated.quantity}`;

        res.json({
            success: true,
            data: updated,
            message: message,
        });
    },

    // Get stock for a variant across all stores
    getVariantStock: async (req: Request, res: Response) => {
        const { variantId } = req.params;
        const stock = await InventoryService.getVariantStock(+variantId);

        res.json({
            success: true,
            data: stock,
        });
    },

    // Get stock for a specific variant in a specific store
    getStockByStore: async (req: Request, res: Response) => {
        const { variantId, storeId } = req.params;
        const stock = await InventoryService.getStockByStore(
            +variantId,
            +storeId
        );

        res.json({
            success: true,
            data: stock,
        });
    },

    // Get stock movement history for a variant
    getVariantMovements: async (req: Request, res: Response) => {
        const { variantId } = req.params;
        const { storeId, limit, offset } = req.query;

        const movements = await InventoryService.getVariantMovements(
            +variantId,
            {
                storeId: storeId ? +storeId : undefined,
                limit: limit ? +limit : undefined,
                offset: offset ? +offset : undefined,
            }
        );

        res.json({
            success: true,
            data: movements,
            count: movements.length,
        });
    },

    // Get stock movement history for a store
    getStoreMovements: async (req: Request, res: Response) => {
        const { storeId } = req.params;
        const { limit, offset, startDate, endDate } = req.query;

        const movements = await InventoryService.getStoreMovements(+storeId, {
            limit: limit ? +limit : undefined,
            offset: offset ? +offset : undefined,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
        });

        res.json({
            success: true,
            data: movements,
            count: movements.length,
        });
    },

    // Get stock movements by user
    getUserMovements: async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { limit, offset } = req.query;

        const movements = await InventoryService.getUserMovements(+userId, {
            limit: limit ? +limit : undefined,
            offset: offset ? +offset : undefined,
        });

        res.json({
            success: true,
            data: movements,
            count: movements.length,
        });
    },

    // Bulk update stock for multiple variants (useful for orders)
    bulkUpdateStock: async (req: Request, res: Response) => {
        const { storeId } = req.params;

        const schema = z.object({
            items: z
                .array(
                    z.object({
                        variantId: z.number().int().positive(),
                        quantity: z.number().int().positive(),
                        operation: z
                            .enum(["set", "increment", "decrement"])
                            .optional(),
                    })
                )
                .min(1, "At least one item is required"),
            userId: z.number().int().positive().optional(),
            reason: z.string().min(1),
            notes: z.string().optional(),
            stockStatus: z.string().optional(),
        });

        const data = schema.parse(req.body);

        // Get userId from authenticated user or request body
        const userId = data.userId || (req as any).userId || 1; // Fallback to system user ID 1

        const results = await InventoryService.bulkUpdateStock(
            +storeId,
            data.items,
            {
                userId,
                reason: data.reason,
                notes: data.notes,
                stockStatus: data.stockStatus,
            }
        );

        res.json({
            success: true,
            data: results,
            message: `Successfully updated stock for ${results.length} variants`,
        });
    },

    // ===== STOCK ADJUSTMENT ENDPOINTS =====

    // Get all stock adjustments with filters
    getStockAdjustments: async (req: Request, res: Response) => {
        const {
            userId,
            storeId,
            adjustmentType,
            startDate,
            endDate,
            limit,
            offset,
        } = req.query;

        const filters = {
            userId: userId ? +userId : undefined,
            storeId: storeId ? +storeId : undefined,
            adjustmentType: adjustmentType as string,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            limit: limit ? +limit : undefined,
            offset: offset ? +offset : undefined,
        };

        const adjustments = await InventoryService.getStockAdjustments(filters);

        res.json({
            success: true,
            data: adjustments,
            count: adjustments.length,
            filters,
        });
    },

    // Get stock adjustment by ID
    getStockAdjustmentById: async (req: Request, res: Response) => {
        const { adjustmentId } = req.params;

        const adjustment = await InventoryService.getStockAdjustmentById(
            +adjustmentId
        );

        if (!adjustment) {
            res.status(404).json({
                success: false,
                message: "Stock adjustment not found",
            });
            return;
        }

        res.json({
            success: true,
            data: adjustment,
        });
    },

    // Get stock adjustments by user
    getStockAdjustmentsByUser: async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { limit, offset, startDate, endDate } = req.query;

        const options = {
            limit: limit ? +limit : undefined,
            offset: offset ? +offset : undefined,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
        };

        const adjustments = await InventoryService.getStockAdjustmentsByUser(
            +userId,
            options
        );

        res.json({
            success: true,
            data: adjustments,
            count: adjustments.length,
            userId: +userId,
            options,
        });
    },

    // Get stock adjustments by store
    getStockAdjustmentsByStore: async (req: Request, res: Response) => {
        const { storeId } = req.params;
        const { limit, offset, startDate, endDate } = req.query;

        const options = {
            limit: limit ? +limit : undefined,
            offset: offset ? +offset : undefined,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
        };

        const adjustments = await InventoryService.getStockAdjustmentsByStore(
            +storeId,
            options
        );

        res.json({
            success: true,
            data: adjustments,
            count: adjustments.length,
            storeId: +storeId,
            options,
        });
    },

    // Get stock adjustment statistics
    getStockAdjustmentStats: async (req: Request, res: Response) => {
        const { userId, storeId, startDate, endDate } = req.query;

        const filters = {
            userId: userId ? +userId : undefined,
            storeId: storeId ? +storeId : undefined,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
        };

        const stats = await InventoryService.getStockAdjustmentStats(filters);

        res.json({
            success: true,
            data: stats,
            filters,
        });
    },
};

export default inventoryController;
