import { prisma } from "../../utils/prisma";
import {
    Prisma,
    ProductStatus,
    PromotionStatus,
} from "../../generated/prisma/client";

const ProductService = {
    findAll: async () => {
        return prisma.product.findMany({
            where: {},
            include: {
                brand: true,
                category: true,
                media: true,
            },
        });
    },
    findById: async (id: number) => {
        return prisma.product.findUnique({
            where: { id },
            include: {
                brand: true,
                category: true,
                media: true,
            },
        });
    },
    publishProduct: async (productId: number) => {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variants: {
                    include: {
                        stock: true,
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

        if (!product) {
            throw new Error("Product not found");
        }

        // Check if product has variants with stock
        const hasStock = product.variants.some((variant) =>
            variant.stock.some((vs) => vs.quantity > 0)
        );

        if (!hasStock) {
            throw new Error("Cannot publish product with no stock");
        }

        return prisma.product.update({
            where: { id: productId },
            data: { status: "ENABLED" },
        });
    },

    // Disable product
    disableProduct: async (id: number) => {
        return prisma.product.update({
            where: { id },
            data: { status: "DISABLED" },
        });
    },

    // Archive product
    archiveProduct: async (id: number) => {
        return prisma.product.update({
            where: { id },
            data: { status: "ARCHIVED" },
        });
    },

    // Get all purchasable products for a store

    findByCategory: async (categoryId: number) => {
        return prisma.product.findMany({
            where: { categoryId },
            include: {
                brand: true,
                category: true,
                //  Store: true,
                media: true,
                //  listings: true,
            },
        });
    },
    createDraft: async (data: Prisma.ProductCreateInput) => {
        // Check if product with same name already exists
        if (data.name) {
            const existing = await prisma.product.findFirst({
                where: { name: data.name as string },
            });
            if (existing) {
                throw new Error(
                    `Product with name "${data.name}" already exists.`
                );
            }
        }
        return await prisma.product.create({ data });
    },

    updateGeneral: async (
        productId: number,
        data: Prisma.ProductUpdateInput
    ) => {
        // Check if product with same name already exists (excluding current product)
        if (data.name) {
            const existing = await prisma.product.findFirst({
                where: {
                    name: data.name as string,
                    NOT: { id: productId },
                },
            });
            if (existing) {
                throw new Error(
                    `Product with name "${data.name}" already exists.`
                );
            }
        }
        return await prisma.product.update({
            where: { id: productId },
            data,
        });
    },

    updateSetup: async (
        productId: number,
        data: Partial<{
            categoryId: number;
            brandId: number;
            tags: number[]; // IDs
            promotionStatus: PromotionStatus;
            startDate: Date;
            endDate: Date;
        }>
    ) => {
        const { tags, categoryId, brandId, ...rest } = data;

        return await prisma.product.update({
            where: { id: productId },
            data: {
                ...rest,

                ...(categoryId
                    ? { category: { connect: { id: categoryId } } }
                    : {}),
                ...(brandId ? { brand: { connect: { id: brandId } } } : {}),

                ...(tags
                    ? {
                          tags: {
                              set: [],
                              connect: tags.map((tagId) => ({ id: tagId })),
                          },
                      }
                    : {}),
            },
            include: { tags: true },
        });
    },

    updateSEO: async (
        productId: number,
        data: Partial<{
            metaTitle: string;
            metaDesc: string;
        }>
    ) => {
        return await prisma.product.update({
            where: { id: productId },
            data,
        });
    },

    updateStatus: async (
        productId: number,
        data: Partial<{
            isFeatured: boolean;
            safeCheckout: boolean;
            secureCheckout: boolean;
            socialShare: boolean;
            encourageView: boolean;
            isTrending: boolean;
        }>
    ) => {
        return await prisma.product.update({
            where: { id: productId },
            data,
        });
    },
    softDelete: async (id: number) => {
        return prisma.product.update({
            where: { id },
            data: { updatedAt: new Date() },
        });
    },

    getAllAttributes: async () => {
        return await prisma.attribute.findMany({
            include: {
                values: {
                    orderBy: { value: "asc" },
                },
            },
            orderBy: { name: "asc" },
        });
    },

    getAttributeValues: async (attributeId: number) => {
        return await prisma.attributeValue.findMany({
            where: { attributeId },
            include: {
                attribute: true,
            },
            orderBy: { order: "asc" }, // Order by explicit order field
        });
    },

    /**
     * Get all products (variants) available in a specific store
     * - Variants: via StoreVariantStock, include parent product
     */
    getProductsByStore: async (storeId: number) => {
        // Get variants with stock in this store, including their parent product
        const variantStocks = await prisma.storeVariantStock.findMany({
            where: { storeId },
            include: {
                variant: {
                    include: {
                        product: {
                            include: {
                                brand: true,
                                category: true,
                                media: true,
                            },
                        },
                        stock: {
                            where: { storeId },
                        },
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

        // Map variant products to unified structure
        const unifiedVariants = variantStocks.map((vs) => ({
            id: vs.variant.product.id,
            name: vs.variant.product.name,
            stockQty: vs.variant.stock[0]?.quantity ?? 0,
            price: vs.variant.price,
            variantId: vs.variant.id,
            brand: vs.variant.product.brand,
            category: vs.variant.product.category,
            media: vs.variant.media,
            variantName: vs.variant.name,
            sku: vs.variant.sku,
            attributes: vs.variant.attributes.map((attr) => ({
                attributeName: attr.attribute.name,
                attributeValue: attr.value.value,
            })),
        }));

        return {
            products: unifiedVariants,
        };
    },

    // Get all products with pagination
    getAllProducts: async (
        page = 1,
        limit = 10,
        filters?: {
            status?: ProductStatus;
            categoryId?: number;
            brandId?: number;
            search?: string;
        }
    ) => {
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {
            deletedAt: null,
            ...(filters?.status && { status: filters.status }),
            ...(filters?.categoryId && { categoryId: filters.categoryId }),
            ...(filters?.brandId && { brandId: filters.brandId }),
            ...(filters?.search && {
                OR: [
                    { name: { contains: filters.search, mode: "insensitive" } },
                    {
                        shortDesc: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                    {
                        description: {
                            contains: filters.search,
                            mode: "insensitive",
                        },
                    },
                ],
            }),
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    media: {
                        where: { isThumbnail: true },
                        take: 1,
                    },
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                    brand: {
                        select: { id: true, name: true, logo: true },
                    },
                    variants: {
                        include: {
                            media: {
                                where: { isThumbnail: true },
                                take: 1,
                            },
                            attributes: {
                                include: {
                                    attribute: true,
                                    value: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            variants: true,
                            Reviews: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.product.count({ where }),
        ]);

        return {
            products,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        };
    },
};

export default ProductService;
