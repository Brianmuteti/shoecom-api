import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";

const AttributeService = {
    findAll: async () => {
        return prisma.attribute.findMany({
            include: {
                values: true,
            },
        });
    },
    findById: async (id: number) => {
        return prisma.attribute.findUnique({
            where: { id },
            include: {
                values: true,
            },
        });
    },
    create: async (data: Prisma.AttributeCreateInput) => {
        return prisma.attribute.create({
            data,
            include: {
                values: true,
            },
        });
    },
    update: async (id: number, data: Prisma.AttributeUpdateInput) => {
        return prisma.attribute.update({
            where: { id },
            data,
            include: {
                values: true,
            },
        });
    },
    delete: async (id: number) => {
        // Check if attribute has values
        const attributeWithValues = await prisma.attribute.findUnique({
            where: { id },
            include: {
                values: true,
                VariantAttribute: true,
            },
        });

        if (!attributeWithValues) {
            throw new Error("Attribute not found.");
        }

        if (attributeWithValues.values.length > 0) {
            throw new Error(
                "Cannot delete attribute with existing values. Delete values first."
            );
        }

        if (attributeWithValues.VariantAttribute.length > 0) {
            throw new Error(
                "Cannot delete attribute that is used by product variants."
            );
        }

        return prisma.attribute.delete({ where: { id } });
    },
};

export default AttributeService;
