import { Request, Response } from "express";
import VariantService from "../../services/product/variant.service";
import { z } from "zod";
import { MediaType } from "../../generated/prisma/client";
import ProductService from "../../services/product/product.service";
import cloudinary, {
    uploadToCloudinary,
    extractPublicId,
} from "../../utils/cloudinary";

const parseId = (value: any, name = "ID") => {
    const id = Number(value);
    if (isNaN(id) || id <= 0) throw new Error(`Invalid ${name}`);
    return id;
};

const variantController = {
    createVariants: async (req: Request, res: Response) => {
        const productId = parseId(req.params.productId, "productId");

        // Parse JSON data from body
        const variantsData =
            typeof req.body.variants === "string"
                ? JSON.parse(req.body.variants)
                : req.body.variants;

        const schema = z.object({
            variants: z
                .array(
                    z.object({
                        name: z.string(),
                        sku: z.string(),
                        price: z.number().positive(),
                        salePrice: z.number().positive().optional(),
                        wholesalePrice: z.number().positive().optional(),
                        wholesaleQty: z.number().int().positive().optional(),
                        attributes: z.array(
                            z.object({
                                attributeId: z.number(),
                                valueId: z.number(),
                            })
                        ),
                        hasWatermark: z.boolean().default(false).optional(),
                        thumbnailIndex: z.number().int().min(0).optional(), // Index of which image should be thumbnail
                    })
                )
                .min(1, "At least one variant is required"),
        });

        const { variants } = schema.parse({ variants: variantsData });

        const productExists = await ProductService.findById(productId);
        if (!productExists) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        // Check for existing SKUs
        const existingSkus = await VariantService.findSkuExists(variants);
        if (existingSkus.length > 0) {
            const existingSkuList = existingSkus.map((v) => v.sku).join(", ");
            throw new Error(
                `The following SKUs already exist: ${existingSkuList}`
            );
        }

        // Process uploaded files and upload to Cloudinary
        const files = (req as any).files || {};
        const variantsWithImages = [];
        const uploadedImageUrls: string[] = []; // Track uploaded images for cleanup

        try {
            for (let i = 0; i < variants.length; i++) {
                const variant = variants[i];
                const variantImages: any[] = [];

                // Look for files with pattern: variant_0, variant_1, etc.
                const variantFieldName = `variant_${i}`;
                if (
                    files[variantFieldName] &&
                    Array.isArray(files[variantFieldName])
                ) {
                    const variantFiles = files[variantFieldName];

                    // Upload each image to Cloudinary
                    for (let j = 0; j < variantFiles.length; j++) {
                        const file = variantFiles[j];
                        const uploadResult = await uploadToCloudinary(
                            file,
                            "LandulaShop/products/variants"
                        );

                        // Track uploaded URL for potential cleanup
                        uploadedImageUrls.push(uploadResult.secure_url);

                        variantImages.push({
                            url: uploadResult.secure_url,
                            type: MediaType.IMAGE, // Can be extended to detect video
                            hasWatermark: variant.hasWatermark || false,
                            isThumbnail:
                                variant.thumbnailIndex !== undefined
                                    ? j === variant.thumbnailIndex
                                    : j === 0, // First image is thumbnail by default
                        });
                    }
                }

                variantsWithImages.push({
                    ...variant,
                    images:
                        variantImages.length > 0 ? variantImages : undefined,
                });
            }

            // Try to save to database
            const created = await VariantService.createVariants(
                productId,
                variantsWithImages
            );

            res.status(201).json({
                success: true,
                data: created,
                message: "Product variants created successfully",
            });
        } catch (error) {
            // 🧹 Cleanup: Delete uploaded images from Cloudinary if DB operation failed
            console.error(
                "❌ Variant creation failed, cleaning up uploaded images..."
            );

            for (const imageUrl of uploadedImageUrls) {
                try {
                    const publicId = extractPublicId(imageUrl);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`✅ Deleted orphaned image: ${publicId}`);
                    }
                } catch (cleanupError) {
                    console.error(
                        `⚠️  Failed to delete image ${imageUrl}:`,
                        cleanupError
                    );
                    // Continue with other deletions even if one fails
                }
            }

            // Re-throw the original error
            throw error;
        }
    },
    updateVariant: async (req: Request, res: Response) => {
        const variantId = parseId(req.params.variantId, "variantId");
        const schema = z.object({
            name: z.string().optional(),
            sku: z.string().optional(),
            price: z.number().positive().optional(),
            salePrice: z.number().positive().optional(),
            wholesalePrice: z.number().positive().optional(),
            wholesaleQty: z.number().int().positive().optional(),
            attributes: z
                .array(
                    z.object({
                        attributeId: z.number(),
                        valueId: z.number(),
                    })
                )
                .optional(),
        });
        const data = schema.parse(req.body);
        const updated = await VariantService.updateVariant(variantId, data);
        res.json({
            success: true,
            data: updated,
            message: "Variant updated successfully",
        });
    },
    deleteNotInList: async (req: Request, res: Response) => {
        const productId = parseId(req.params.productId, "productId");
        const schema = z.object({
            keepIds: z.array(z.number()),
        });
        const { keepIds } = schema.parse(req.body);
        await VariantService.deleteVariantsNotInList(productId, keepIds);
        res.json({ message: "Old variants removed." });
    },

    addVariantImages: async (req: Request, res: Response) => {
        const variantId = parseId(req.params.variantId, "variantId");

        const hasWatermark =
            req.body.hasWatermark === "true" || req.body.hasWatermark === true;
        const thumbnailIndex = req.body.thumbnailIndex
            ? parseInt(req.body.thumbnailIndex)
            : 0;

        // Get uploaded files from req.files
        const files = (req as any).files;

        if (!files || !files.images || files.images.length === 0) {
            res.status(400).json({
                success: false,
                message:
                    "No images uploaded. Please provide at least one image.",
            });
            return;
        }

        const variantImages: any[] = [];
        const uploadedImageUrls: string[] = []; // Track uploaded images for cleanup

        try {
            // Process and upload images to Cloudinary
            if (files.images && Array.isArray(files.images)) {
                for (let i = 0; i < files.images.length; i++) {
                    const file = files.images[i];
                    const uploadResult = await uploadToCloudinary(
                        file,
                        "LandulaShop/products/variants"
                    );

                    // Track uploaded URL for potential cleanup
                    uploadedImageUrls.push(uploadResult.secure_url);

                    variantImages.push({
                        url: uploadResult.secure_url,
                        type: MediaType.IMAGE,
                        hasWatermark,
                        isThumbnail: i === thumbnailIndex,
                    });
                }
            }

            // Try to save to database
            const result = await VariantService.addVariantImages(
                variantId,
                variantImages
            );

            res.status(201).json({
                success: true,
                data: result,
                message: `Successfully uploaded ${variantImages.length} images for variant`,
            });
        } catch (error) {
            // 🧹 Cleanup: Delete uploaded images from Cloudinary if DB operation failed
            console.error(
                "❌ Add variant images failed, cleaning up uploaded images..."
            );

            for (const imageUrl of uploadedImageUrls) {
                try {
                    const publicId = extractPublicId(imageUrl);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`✅ Deleted orphaned image: ${publicId}`);
                    }
                } catch (cleanupError) {
                    console.error(
                        `⚠️  Failed to delete image ${imageUrl}:`,
                        cleanupError
                    );
                    // Continue with other deletions even if one fails
                }
            }

            // Re-throw the original error
            throw error;
        }
    },
};

export default variantController;
