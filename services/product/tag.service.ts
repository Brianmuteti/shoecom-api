import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";

const TagService = {
    findAll: async () => {
        return prisma.tag.findMany({ where: { deletedAt: null } });
    },
    findById: async (id: number) => {
        return prisma.tag.findUnique({ where: { id } });
    },
    create: async (data: Prisma.TagCreateInput) => {
        return prisma.tag.create({ data });
    },
    update: async (id: number, data: Prisma.TagUpdateInput) => {
        return prisma.tag.update({ where: { id }, data });
    },
    delete: async (id: number) => {
        return prisma.tag.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },

    // For products by tag name from Product.tags array
    findProductsByTag: async (tag: string) => {
        return prisma.product.findMany({
            where: { deletedAt: null, tags: { some: { name: tag } } },
        });
    },
};

export default TagService;
