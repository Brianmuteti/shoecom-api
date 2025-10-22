import { z } from "zod";
import { Request, Response } from "express";

export function createCrudController({
    service,
    schema,
    resourceName,
}: {
    service: {
        findAll: () => Promise<any[]>;
        findById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
    };
    schema: {
        create: z.ZodTypeAny;
        update: z.ZodTypeAny;
    };
    resourceName: string;
}) {
    const parseId = (value: any, name = "ID") => {
        const id = Number(value);
        if (isNaN(id) || id <= 0) {
            const err = new Error(`Invalid ${name}`);
            (err as any).status = 400;
            throw err;
        }
        return id;
    };

    return {
        getAll: async (req: Request, res: Response) => {
            const items = await service.findAll();
            const filtered = Array.isArray(items)
                ? items.filter((item: any) => item && item.deletedAt == null)
                : [];
            res.json({ data: filtered });
        },
        getById: async (req: Request, res: Response) => {
            const id = parseId(req.params.id, resourceName + "Id");
            const item = await service.findById(id);
            if (!item || item.deletedAt != null) {
                const err = new Error(`${resourceName} not found`);
                (err as any).status = 404;
                throw err;
            }
            res.json({ data: item });
        },
        create: async (req: Request, res: Response) => {
            const data = schema.create.parse(req.body);
            const created = await service.create(data);
            res.status(201).json({ data: created });
        },
        update: async (req: Request, res: Response) => {
            const { id, ...data } = schema.update.parse(req.body);
            const updated = await service.update(id, data);
            res.json({ data: updated });
        },
        delete: async (req: Request, res: Response) => {
            const id = parseId(req.body.id, resourceName + "Id");
            const item = await service.findById(id);
            if (!item) {
                const err = new Error(`${resourceName} not found`);
                (err as any).status = 404;
                throw err;
            }
            await service.delete(id);
            res.json({ message: `Deleted ${resourceName} with ID ${id}` });
        },
    };
}
