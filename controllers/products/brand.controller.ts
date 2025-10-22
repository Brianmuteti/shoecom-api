import BrandService from "../../services/product/brand.service";
import { z } from "zod";
import { createCrudController } from "../crud.factory";

const brandSchema = {
    create: z.object({
        name: z.string().min(1),
        logo: z.string().optional(),
    }),
    update: z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        logo: z.string().optional(),
    }),
};

const brandController = createCrudController({
    service: BrandService,
    schema: brandSchema,
    resourceName: "brand",
});

export default brandController;
