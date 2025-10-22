import AttributeValueService from "../../services/product/attributeValue.service";
import { z } from "zod";
import { createCrudController } from "../crud.factory";

const attributeValueSchema = {
    create: z.object({
        attributeId: z.number(),
        values: z.array(z.string().min(1)).min(1),
    }),
    update: z.object({
        id: z.number(),
        attributeId: z.number().optional(),
        value: z.string().min(1).optional(),
    }),
};

const attributeValueController = createCrudController({
    service: AttributeValueService,
    schema: attributeValueSchema,
    resourceName: "attributeValue",
});

export default attributeValueController;
