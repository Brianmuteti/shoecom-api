import { prisma } from "../../utils/prisma";
import { MediaType } from "../../generated/prisma/client";
import cloudinary, { extractPublicId } from "../../utils/cloudinary";

const MediaService = {
    addProductMedia: async (
        productId: number,
        media: {
            url: string;
            type: MediaType;
            hasWatermark: boolean;
            isThumbnail: boolean;
        }[]
    ) => {
        // 🔒 Use a transaction to ensure ACID compliance
        return await prisma.$transaction(async (tx) => {
            // Separate thumbnail from other media
            const thumbnails = media.filter((item) => item.isThumbnail);
            const otherMedia = media.filter((item) => !item.isThumbnail);

            const results = [];

            // Handle thumbnails (delete existing first, then create new)
            if (thumbnails.length > 0) {
                // Delete any existing thumbnails for this product
                await tx.productMedia.deleteMany({
                    where: {
                        productId,
                        isThumbnail: true,
                    },
                });

                // Create new thumbnails (only take the first one if multiple)
                const thumbnail = thumbnails[0];
                const thumbnailResult = await tx.productMedia.create({
                    data: {
                        productId,
                        url: thumbnail.url,
                        type: thumbnail.type,
                        hasWatermark: thumbnail.hasWatermark,
                        isThumbnail: true,
                    },
                });
                results.push(thumbnailResult);

                // Auto-update product's metaImage with thumbnail URL
                await tx.product.update({
                    where: { id: productId },
                    data: {
                        metaImage: thumbnail.url,
                    },
                });
            }

            // Handle other media (create new records - no constraint issues now)
            if (otherMedia.length > 0) {
                const otherMediaResults = await tx.productMedia.createMany({
                    data: otherMedia.map((item) => ({
                        productId,
                        url: item.url,
                        type: item.type,
                        hasWatermark: item.hasWatermark,
                        isThumbnail: false,
                    })),
                });
                results.push(otherMediaResults);
            }

            return results;
        });
    },

    // Get current thumbnail URL for a product
    getProductThumbnail: async (productId: number) => {
        const thumbnail = await prisma.productMedia.findFirst({
            where: {
                productId,
                isThumbnail: true,
            },
            select: {
                url: true,
            },
        });
        return thumbnail?.url || null;
    },

    // Update product's metaImage to match current thumbnail
    syncMetaImageWithThumbnail: async (productId: number) => {
        // 🔒 Use a transaction to ensure ACID compliance
        return await prisma.$transaction(async (tx) => {
            const thumbnail = await tx.productMedia.findFirst({
                where: {
                    productId,
                    isThumbnail: true,
                },
                select: {
                    url: true,
                },
            });

            if (thumbnail) {
                await tx.product.update({
                    where: { id: productId },
                    data: {
                        metaImage: thumbnail.url,
                    },
                });
                return thumbnail.url;
            }
            return null;
        });
    },

    // Delete a specific media record and file from Cloudinary
    deleteMedia: async (mediaId: number) => {
        // Get the media record first (outside transaction for Cloudinary deletion)
        const media = await prisma.productMedia.findUnique({
            where: { id: mediaId },
        });

        if (!media) {
            throw new Error("Media not found");
        }

        // Delete from Cloudinary (outside transaction - external API call)
        try {
            const publicId = extractPublicId(media.url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (error) {
            console.error("Error deleting from Cloudinary:", error);
            // Continue with database deletion even if Cloudinary fails
        }

        // 🔒 Use a transaction for database operations
        return await prisma.$transaction(async (tx) => {
            // Delete from database
            const deletedMedia = await tx.productMedia.delete({
                where: { id: mediaId },
            });

            // If this was a thumbnail, update metaImage to null or find another thumbnail
            if (deletedMedia.isThumbnail) {
                const remainingThumbnail = await tx.productMedia.findFirst({
                    where: {
                        productId: deletedMedia.productId,
                        isThumbnail: true,
                    },
                });

                await tx.product.update({
                    where: { id: deletedMedia.productId },
                    data: {
                        metaImage: remainingThumbnail?.url || null,
                    },
                });
            }

            return deletedMedia;
        });
    },

    // Delete all media for a product
    deleteAllProductMedia: async (productId: number) => {
        // Get all media records for the product (outside transaction)
        const mediaRecords = await prisma.productMedia.findMany({
            where: { productId },
        });

        // Delete from Cloudinary (outside transaction - external API call)
        for (const media of mediaRecords) {
            try {
                const publicId = extractPublicId(media.url);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (error) {
                console.error("Error deleting from Cloudinary:", error);
                // Continue with other deletions
            }
        }

        // 🔒 Use a transaction for database operations
        return await prisma.$transaction(async (tx) => {
            // Delete all media from database
            const deletedCount = await tx.productMedia.deleteMany({
                where: { productId },
            });

            // Update product's metaImage to null
            await tx.product.update({
                where: { id: productId },
                data: {
                    metaImage: null,
                },
            });

            return { deletedCount: deletedCount.count };
        });
    },

    addVariantMedia: async (
        variantId: number,
        images: {
            url: string;
            type: string;
            hasWatermark?: boolean;
        }[]
    ) => {
        return await prisma.variantMedia.createMany({
            data: images.map((img) => ({
                variantId,
                url: img.url,
                type: img.type as MediaType,
                hasWatermark: img.hasWatermark ?? false,
            })),
        });
    },

    deleteProductMedia: async (productId: number) => {
        return await prisma.productMedia.deleteMany({
            where: { productId },
        });
    },

    deleteVariantMedia: async (variantId: number) => {
        return await prisma.variantMedia.deleteMany({
            where: { variantId },
        });
    },
};

export default MediaService;
