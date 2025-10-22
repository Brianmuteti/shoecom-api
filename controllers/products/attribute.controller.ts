import AttributeService from "../../services/product/attribute.service";
import { z } from "zod";
import { createCrudController } from "../crud.factory";

const attributeSchema = {
    create: z.object({
        name: z.string().min(1),
    }),
    update: z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
    }),
};

const attributeController = createCrudController({
    service: AttributeService,
    schema: attributeSchema,
    resourceName: "attribute",
});

export default attributeController;
