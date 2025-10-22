import { prisma } from "../utils/prisma";
import { Prisma } from "../generated/prisma/client";

const CouponService = {
    create: async (data: Prisma.CouponCreateInput) => {
        return prisma.coupon.create({ data });
    },
    findById: async (id: number) => {
        return prisma.coupon.findUnique({ where: { id } });
    },
    findAll: async () => {
        return prisma.coupon.findMany({
            where: { deletedAt: null },
            include: { usages: true },
        });
    },
    update: async (id: number, data: Prisma.CouponUpdateInput) => {
        return prisma.coupon.update({ where: { id }, data });
    },
    delete: async (id: number) => {
        return prisma.coupon.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};

export default CouponService;
