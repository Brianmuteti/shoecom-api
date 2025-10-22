import { prisma } from "../../utils/prisma";
import { MediaType, Prisma } from "../../generated/prisma/client";
interface ProductImageData {
    url: string;
    type: MediaType;
    hasWatermark: boolean;
    isThumbnail: boolean;
}
interface ProductVariantData {
    name: string;
    sku: string;
    price: number;
    salePrice?: number;
    wholesalePrice?: number;
    wholesaleQty?: number;
    attributes: {
        attributeId: number;
        valueId: number;
    }[];
    images?: ProductImageData[];
}

const VariantService = {
    createVariants: async (
        productId: number,
        variants: ProductVariantData[]
    ) => {
        // 🔒 Use a transaction to ensure ACID compliance
        return await prisma.$transaction(async (tx) => {
            const createdVariants = [];

            for (const variant of variants) {
                // Validate only one thumbnail per variant before starting
                if (variant.images && variant.images.length > 0) {
                    const thumbnails = variant.images.filter(
                        (img) => img.isThumbnail
                    );
                    if (thumbnails.length > 1) {
                        throw new Error(
                            `Only one image can be set as thumbnail for variant ${variant.name}`
                        );
                    }
                }

                // Create the variant
                const createdVariant = await tx.productVariant.create({
                    data: {
                        productId,
                        name: variant.name,
                        sku: variant.sku,
                        price: variant.price,
                        salePrice: variant.salePrice,
                        wholesalePrice: variant.wholesalePrice,
                        wholesaleQty: variant.wholesaleQty,
                    },
                });

                // Create variant attributes
                if (variant.attributes && variant.attributes.length > 0) {
                    await tx.variantAttribute.createMany({
                        data: variant.attributes.map((attr) => ({
                            variantId: createdVariant.id,
                            attributeId: attr.attributeId,
                            valueId: attr.valueId,
                        })),
                    });
                }

                // Add variant images if provided
                if (variant.images && variant.images.length > 0) {
                    const thumbnails = variant.images.filter(
                        (img) => img.isThumbnail
                    );

                    // If there's a thumbnail in the new images, unset any existing thumbnails
                    if (thumbnails.length === 1) {
                        await tx.variantMedia.updateMany({
                            where: {
                                variantId: createdVariant.id,
                                isThumbnail: true,
                            },
                            data: {
                                isThumbnail: false,
                            },
                        });
                    }

                    await tx.variantMedia.createMany({
                        data: variant.images.map((img) => ({
                            variantId: createdVariant.id,
                            url: img.url,
                            type: img.type,
                            hasWatermark: img.hasWatermark,
                            isThumbnail: img.isThumbnail,
                        })),
                    });
                }

                createdVariants.push(createdVariant);
            }

            // Return product with variants and their media
            return await tx.product.findUnique({
                where: { id: productId },
                include: {
                    variants: {
                        include: {
                            media: true,
                            attributes: {
                                include: {
                                    attribute: true,
                                    value: true,
                                },
                            },
                        },
                    },
                },
            });
        });
    },

    updateVariant: async (
        variantId: number,
        data: Partial<{
            name: string;
            sku: string;
            price: number;
            salePrice: number;
            wholesalePrice: number;
            wholesaleQty: number;
            attributes: {
                attributeId: number;
                valueId: number;
            }[];
        }>
    ) => {
        const { attributes, ...variantData } = data;

        // 🔒 Use a transaction to ensure ACID compliance
        return await prisma.$transaction(async (tx) => {
            // Update variant basic info
            await tx.productVariant.update({
                where: { id: variantId },
                data: variantData,
            });

            // Update attributes if provided
            if (attributes) {
                // Delete existing attributes
                await tx.variantAttribute.deleteMany({
                    where: { variantId },
                });

                // Create new attributes
                if (attributes.length > 0) {
                    await tx.variantAttribute.createMany({
                        data: attributes.map((attr) => ({
                            variantId,
                            attributeId: attr.attributeId,
                            valueId: attr.valueId,
                        })),
                    });
                }
            }

            // Return updated variant with attributes
            return await tx.productVariant.findUnique({
                where: { id: variantId },
                include: {
                    attributes: {
                        include: {
                            attribute: true,
                            value: true,
                        },
                    },
                    media: true,
                },
            });
        });
    },

    deleteVariantsNotInList: async (productId: number, keepIds: number[]) => {
        return await prisma.productVariant.deleteMany({
            where: {
                productId,
                id: { notIn: keepIds },
            },
        });
    },
    findSkuExists: async (variants: any) => {
        return await prisma.productVariant.findMany({
            where: { sku: { in: variants.map((v: any) => v.sku) } },
            select: { sku: true },
        });
    },

    addVariantImages: async (variantId: number, images: ProductImageData[]) => {
        // Validate only one thumbnail
        const thumbnails = images.filter((img) => img.isThumbnail);
        if (thumbnails.length > 1) {
            throw new Error("Only one image can be set as thumbnail");
        }

        // 🔒 Use a transaction to ensure ACID compliance
        return await prisma.$transaction(async (tx) => {
            // If there's a thumbnail in the new images, unset any existing thumbnails
            if (thumbnails.length === 1) {
                await tx.variantMedia.updateMany({
                    where: {
                        variantId,
                        isThumbnail: true,
                    },
                    data: {
                        isThumbnail: false,
                    },
                });
            }

            // Create variant media records
            await tx.variantMedia.createMany({
                data: images.map((img) => ({
                    variantId,
                    url: img.url,
                    type: img.type,
                    hasWatermark: img.hasWatermark,
                    isThumbnail: img.isThumbnail,
                })),
            });

            // Return updated variant with all media
            return await tx.productVariant.findUnique({
                where: { id: variantId },
                include: {
                    media: true,
                    attributes: {
                        include: {
                            attribute: true,
                            value: true,
                        },
                    },
                },
            });
        });
    },
};

export default VariantService;
