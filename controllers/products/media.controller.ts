import { Request, Response } from "express";
import MediaService from "../../services/product/media.service";
import { z } from "zod";
import { MediaType } from "../../generated/prisma/client";
import cloudinary, {
    uploadToCloudinary,
    extractPublicId,
} from "../../utils/cloudinary";

const parseId = (value: any, name = "ID") => {
    const id = Number(value);
    if (isNaN(id) || id <= 0) throw new Error(`Invalid ${name}`);
    return id;
};

// Helper function to determine media type from file
const getMediaType = (mimetype: string): MediaType => {
    if (mimetype.startsWith("video/")) {
        return MediaType.VIDEO;
    }
    return MediaType.IMAGE;
};

const mediaController = {
    addProductMedia: async (req: Request, res: Response): Promise<void> => {
        const productId = parseId(req.body.productId, "Product ID");
        const hasWatermark =
            req.body.hasWatermark === "true" || req.body.hasWatermark === true;

        const schema = z.object({
            productId: z.number(),
            hasWatermark: z.boolean().optional(),
        });

        schema.parse({ productId, hasWatermark });

        // Get uploaded files from req.files (set by fileUpload middleware)
        const files = (req as any).files;

        if (!files || (!files.thumbnail && !files.images)) {
            res.status(400).json({
                success: false,
                message:
                    "No files uploaded. Please provide thumbnail and/or images.",
            });
            return;
        }

        const mediaData: {
            url: string;
            type: MediaType;
            hasWatermark: boolean;
            isThumbnail: boolean;
        }[] = [];
        const uploadedImageUrls: string[] = []; // Track uploaded images for cleanup

        try {
            // Process thumbnail (single file)
            if (files.thumbnail && files.thumbnail.length > 0) {
                const thumbnailFile = files.thumbnail[0];
                const uploadResult = await uploadToCloudinary(
                    thumbnailFile,
                    "LandulaShop/products"
                );

                // Track uploaded URL for potential cleanup
                uploadedImageUrls.push(uploadResult.secure_url);

                mediaData.push({
                    url: uploadResult.secure_url,
                    type: getMediaType(thumbnailFile.mimetype),
                    hasWatermark,
                    isThumbnail: true,
                });
            }

            // Process images/videos (multiple files)
            if (files.images && files.images.length > 0) {
                for (const file of files.images) {
                    const uploadResult = await uploadToCloudinary(
                        file,
                        "LandulaShop/products"
                    );

                    // Track uploaded URL for potential cleanup
                    uploadedImageUrls.push(uploadResult.secure_url);

                    mediaData.push({
                        url: uploadResult.secure_url,
                        type: getMediaType(file.mimetype),
                        hasWatermark,
                        isThumbnail: false,
                    });
                }
            }

            if (mediaData.length === 0) {
                res.status(400).json({
                    success: false,
                    message: "No valid files processed.",
                });
                return;
            }

            // Try to save to database
            const result = await MediaService.addProductMedia(
                productId,
                mediaData
            );

            res.json({
                success: true,
                data: result,
                message: `Successfully uploaded ${mediaData.length} media files for product`,
            });
        } catch (error) {
            // 🧹 Cleanup: Delete uploaded images from Cloudinary if DB operation failed
            console.error(
                "❌ Product media upload failed, cleaning up uploaded images..."
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

    // Delete a specific media record
    deleteMedia: async (req: Request, res: Response): Promise<void> => {
        const { mediaId } = req.params;
        const id = parseId(mediaId, "Media ID");

        const deletedMedia = await MediaService.deleteMedia(id);
        res.json({
            success: true,
            data: deletedMedia,
            message: "Media deleted successfully",
        });
    },

    // Delete all media for a product
    deleteAllProductMedia: async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const { productId } = req.params;
        const id = parseId(productId, "Product ID");

        const result = await MediaService.deleteAllProductMedia(id);
        res.json({
            success: true,
            data: result,
            message: `Successfully deleted ${result.deletedCount} media files`,
        });
    },

    // Get product thumbnail
    getProductThumbnail: async (req: Request, res: Response): Promise<void> => {
        const { productId } = req.params;
        const id = parseId(productId, "Product ID");

        const thumbnailUrl = await MediaService.getProductThumbnail(id);
        res.json({
            success: true,
            data: { thumbnailUrl },
        });
    },

    // Sync metaImage with thumbnail
    syncMetaImage: async (req: Request, res: Response): Promise<void> => {
        const { productId } = req.params;
        const id = parseId(productId, "Product ID");

        const thumbnailUrl = await MediaService.syncMetaImageWithThumbnail(id);
        res.json({
            success: true,
            data: { metaImage: thumbnailUrl },
            message: thumbnailUrl
                ? "MetaImage synced with thumbnail successfully"
                : "No thumbnail found for this product",
        });
    },

    addVariantMedia: async (req: Request, res: Response) => {
        const variantId = parseId(req.params.variantId, "variantId");
        const schema = z.object({
            images: z.array(
                z.object({
                    url: z.string(),
                    type: z.string(),
                    hasWatermark: z.boolean().optional(),
                })
            ),
        });
        const { images } = schema.parse(req.body);
        const added = await MediaService.addVariantMedia(variantId, images);
        res.status(201).json({ data: added });
    },
};

export default mediaController;
