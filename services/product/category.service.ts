import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";

const CategoryService = {
    findAll: async () => {
        return prisma.category.findMany({
            where: { deletedAt: null },
            include: { products: true },
        });
    },
    findById: async (id: number) => {
        return prisma.category.findFirst({
            where: { id, deletedAt: null },
            include: { products: true },
        });
    },
    create: async (data: any) => {
        const { parentId, ...rest } = data ?? {};
        const clean: any = { ...(rest as any) };
        delete clean.parentId;
        const prismaData: Prisma.CategoryCreateInput = {
            ...(clean as Prisma.CategoryCreateInput),
            ...(typeof parentId === "number"
                ? ({ parent: { connect: { id: Number(parentId) } } } as any)
                : {}),
        };
        return prisma.category.create({
            data: prismaData,
            include: { products: true },
        });
    },
    update: async (id: number, data: any) => {
        const { parentId, ...rest } = data ?? {};
        const clean: any = { ...(rest as any) };
        delete clean.parentId;
        const relationPart =
            typeof parentId === "number"
                ? ({ parent: { connect: { id: Number(parentId) } } } as any)
                : parentId === null
                ? ({ parent: { disconnect: true } } as any)
                : ({} as any);
        const prismaData: Prisma.CategoryUpdateInput = {
            ...(clean as Prisma.CategoryUpdateInput),
            ...relationPart,
        };
        return prisma.category.update({
            where: { id },
            data: prismaData,
            include: { products: true },
        });
    },
    delete: async (id: number) => {
        return prisma.category.delete({ where: { id } });
    },
};
export default CategoryService;
