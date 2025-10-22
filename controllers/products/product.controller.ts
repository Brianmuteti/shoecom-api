import {
    ProductStatus,
    PromotionStatus,
} from "./../../generated/prisma/client";
import { Request, Response } from "express";
import ProductService from "../../services/product/product.service";
import { z } from "zod";

// Helper for ID validation
const parseId = (value: any, name = "ID") => {
    const id = Number(value);
    if (isNaN(id) || id <= 0) throw new Error(`Invalid ${name}`);
    return id;
};

const productController = {
    // Step 1: Create General Product Info
    createGeneral: async (req: Request, res: Response) => {
        const schema = z.object({
            name: z.string(),
            shortDesc: z.string().optional(),
            description: z.string().optional(),
            // tax: z.number().default(0),
        });
        const data = schema.parse(req.body);
        const draft = await ProductService.createDraft({
            ...data,
            status: ProductStatus.DRAFT,
        });
        res.status(201).json({
            success: true,
            data: draft,
            message: "Product draft created successfully",
        });
    },
    // Update General Info
    updateGeneral: async (req: Request, res: Response) => {
        const schema = z.object({
            id: z.number(),
            name: z.string(),
            shortDesc: z.string().optional(),
            description: z.string().optional(),
            tax: z.number().optional(),
        });
        const { id, ...data } = schema.parse(req.body);
        const productId = parseId(id, "productId");
        const updated = await ProductService.updateGeneral(productId, data);
        res.status(201).json({
            success: true,
            data: updated,
            message: "Product general info updated successfully",
        });
    },

    // Step 5: Update Product Setup
    updateSetup: async (req: Request, res: Response) => {
        const productId = parseId(req.params.productId, "productId");
        const schema = z.object({
            categoryId: z.number().optional(),
            brandId: z.number().optional(),
            tags: z.array(z.number()).optional(),
            promotionStatus: z.nativeEnum(PromotionStatus).optional(),
            startDate: z.string().datetime().optional(),
            endDate: z.string().datetime().optional(),
        });
        const data = schema.parse(req.body);
        const updated = await ProductService.updateSetup(productId, {
            ...data,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            promotionStatus: data.promotionStatus,
        });
        res.json({
            success: true,
            data: updated,
            message: "Product setup updated successfully",
        });
    },

    // Step 6: Update SEO
    updateSEO: async (req: Request, res: Response) => {
        const productId = parseId(req.params.productId, "productId");
        const schema = z.object({
            metaTitle: z.string(),
            metaDesc: z.string().optional(),
        });
        const data = schema.parse(req.body);
        const updated = await ProductService.updateSEO(productId, data);
        res.json({
            success: true,
            data: updated,
            message: "Product SEO updated successfully",
        });
    },

    updateStatus: async (req: Request, res: Response) => {
        const productId = parseId(req.params.productId, "productId");
        const schema = z.object({
            isFeatured: z.boolean().optional(),
            safeCheckout: z.boolean().optional(),
            secureCheckout: z.boolean().optional(),
            socialShare: z.boolean().optional(),
            encourageView: z.boolean().optional(),
            isTrending: z.boolean().optional(),
        });
        const data = schema.parse(req.body);
        const updated = await ProductService.updateStatus(productId, data);
        res.json({ data: updated });
    },

    deleteProduct: async (req: Request, res: Response): Promise<void> => {
        const id = parseId(req.body.id, "productId");
        const product = await ProductService.findById(id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        await ProductService.softDelete(id);
        res.json({ message: `Product with ID ${id} deleted` });
    },

    // Get all attributes for variant creation
    getAttributes: async (req: Request, res: Response) => {
        const attributes = await ProductService.getAllAttributes();
        res.json({
            success: true,
            data: attributes,
        });
    },

    // Get attribute values by attribute ID
    getAttributeValues: async (req: Request, res: Response) => {
        const attributeId = parseId(req.params.attributeId, "attributeId");
        const values = await ProductService.getAttributeValues(attributeId);
        res.json({
            success: true,
            data: values,
        });
    },
    // Get all products with pagination and filters
    getAllProducts: async (req: Request, res: Response) => {
        const schema = z.object({
            page: z
                .string()
                .transform(Number)
                .pipe(z.number().int().min(1))
                .default("1"),
            limit: z
                .string()
                .transform(Number)
                .pipe(z.number().int().min(1).max(100))
                .default("10"),
            status: z.nativeEnum(ProductStatus).optional(),
            categoryId: z
                .string()
                .transform(Number)
                .pipe(z.number().int().positive())
                .optional(),
            brandId: z
                .string()
                .transform(Number)
                .pipe(z.number().int().positive())
                .optional(),
            search: z.string().optional(),
        });

        const filters = schema.parse(req.query);
        const { page, limit, search, ...restFilters } = filters;

        const result = await ProductService.getAllProducts(page, limit, {
            ...restFilters,
            search,
        });

        res.json({
            success: true,
            data: result.products,
            pagination: result.pagination,
            message: `Found ${result.pagination.total} products`,
        });
    },

    getProductsByStore: async (req: Request, res: Response): Promise<void> => {
        const storeId = parseId(req.params.storeId, "storeId");
        const page = parseId(req.query.page ?? 1, "page");
        const limit = parseId(req.query.limit ?? 20, "limit");
        const { products } = await ProductService.getProductsByStore(storeId);
        // In-memory pagination
        const paged = products.slice((page - 1) * limit, page * limit);
        res.json({ data: { products: paged, total: products.length } });
    },

    getProductsByCategory: async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const categoryId = parseId(req.params.categoryId, "categoryId");
        const page = parseId(req.query.page ?? 1, "page");
        const limit = parseId(req.query.limit ?? 20, "limit");
        const products = await ProductService.findByCategory(categoryId);
        const paged = products.slice((page - 1) * limit, page * limit);
        res.json({ data: { products: paged, total: products.length } });
    },
};

export default productController;
