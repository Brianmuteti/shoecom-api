import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";
const BrandService = {
    findAll: async () => {
        return prisma.brand.findMany({ include: { products: true } });
    },
    findById: async (id: number) => {
        return prisma.brand.findUnique({
            where: { id, deletedAt: null },
            include: { products: true },
        });
    },
    create: async (data: Prisma.BrandCreateInput) => {
        return prisma.brand.create({ data });
    },
    update: async (id: number, data: Prisma.BrandUpdateInput) => {
        return prisma.brand.update({ where: { id }, data });
    },
    delete: async (id: number) => {
        return prisma.brand.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};

export default BrandService;
