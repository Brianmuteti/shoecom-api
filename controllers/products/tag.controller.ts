import { Request, Response } from "express";
import { z } from "zod";
import TagService from "../../services/product/tag.service";
import { createCrudController } from "../crud.factory";

const tagSchema = {
    create: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }),
    update: z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    }),
};

const base = createCrudController({
    service: TagService,
    schema: tagSchema,
    resourceName: "tag",
});

const tagController = {
    ...base,
    getProductsByTag: async (req: Request, res: Response) => {
        const schema = z.object({ tag: z.string().min(1) });
        const { tag } = schema.parse(req.params);
        const products = await TagService.findProductsByTag(tag);
        res.json({ data: products });
    },
};

export default tagController;
