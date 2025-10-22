import StoreService from "../../services/user/store.service";
import { z } from "zod";
import { createCrudController } from "../crud.factory";

const storeSchema = {
    create: z.object({
        name: z.string().min(1),
        location: z.string().optional(),
        phone: z.string().optional(),
    }),
    update: z.object({
        id: z.number(),
        name: z.string().min(1),
        location: z.string().optional(),
        phone: z.string().optional(),
    }),
};

const storeController = createCrudController({
    service: StoreService,
    schema: storeSchema,
    resourceName: "store",
});

export default storeController;
