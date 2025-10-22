import { Request, Response } from "express";
import Coupon from "../services/coupon.service";
import { z } from "zod";
import { CouponType, CouponStatus } from "../generated/prisma/client";

const parseId = (value: any, name = "ID") => {
    const id = Number(value);
    if (isNaN(id) || id <= 0) throw new Error(`Invalid ${name}`);
    return id;
};

const couponController = {
    create: async (req: Request, res: Response) => {
        const schema = z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            code: z.string().min(1),
            type: z.enum([
                CouponType.FREESHIPPING,
                CouponType.PERCENTAGE,
                CouponType.FIXED,
            ]),
            amount: z.number(),
            isFirstOrder: z.boolean().optional(),
            isExpired: z.boolean().optional(),
            status: z
                .enum([
                    CouponStatus.ACTIVE,
                    CouponStatus.DISABLED,
                    CouponStatus.EXPIRED,
                ])
                .optional(),
            applyAllProducts: z.boolean().optional(),
            minSpend: z.number().optional().nullable(),
            usageLimit: z.number().int().optional().nullable(),
            usagePerCustomer: z.number().int().optional().nullable(),
        });
        const data = schema.parse(req.body);
        const coupon = await Coupon.create({ ...data });
        res.status(201).json({ data: coupon });
    },
    getById: async (req: Request, res: Response) => {
        const id = parseId(req.params.id, "couponId");
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            const err = new Error("Coupon not found");
            (err as any).status = 404;
            throw err;
        }
        res.json({ data: coupon });
    },
    getAll: async (req: Request, res: Response) => {
        const coupons = await Coupon.findAll();
        if (!coupons.length) {
            const err = new Error("No coupons found");
            (err as any).status = 404;
            throw err;
        }
        res.json({ data: coupons });
    },
    update: async (req: Request, res: Response) => {
        const schema = z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            code: z.string().min(1).optional(),
            type: z
                .enum([
                    CouponType.FREESHIPPING,
                    CouponType.PERCENTAGE,
                    CouponType.FIXED,
                ])
                .optional(),
            amount: z.number().optional(),
            isFirstOrder: z.boolean().optional(),
            isExpired: z.boolean().optional(),
            status: z
                .enum([
                    CouponStatus.ACTIVE,
                    CouponStatus.DISABLED,
                    CouponStatus.EXPIRED,
                ])
                .optional(),
            applyAllProducts: z.boolean().optional(),
            minSpend: z.number().optional().nullable(),
            usageLimit: z.number().int().optional().nullable(),
            usagePerCustomer: z.number().int().optional().nullable(),
        });
        const { id, ...body } = schema.parse(req.body);
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            const err = new Error("Coupon not found");
            (err as any).status = 404;
            throw err;
        }
        const updated = await Coupon.update(id, body);
        res.json({ data: updated });
    },
    delete: async (req: Request, res: Response) => {
        const id = parseId(req.params.id, "couponId");
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            const err = new Error("Coupon not found");
            (err as any).status = 404;
            throw err;
        }
        await Coupon.delete(id);
        res.json({ message: `Coupon ${coupon.name} deleted successfully` });
    },
};

export default couponController;
