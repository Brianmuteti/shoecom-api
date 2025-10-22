import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";

const AttributeValueService = {
    findAll: async () => {
        return prisma.attributeValue.findMany({
            include: {
                attribute: true,
            },
            orderBy: { order: "asc" },
        });
    },
    findById: async (id: number) => {
        return prisma.attributeValue.findUnique({
            where: { id },
            include: {
                attribute: true,
            },
        });
    },
    findByAttribute: async (attributeId: number) => {
        return prisma.attributeValue.findMany({
            where: { attributeId },
            include: {
                attribute: true,
            },
            orderBy: { order: "asc" }, // Order by explicit order field
        });
    },
    create: async (data: { attributeId: number; values: string[] }) => {
        // Remove duplicates from incoming values array (preserving order)
        const uniqueValues = [...new Set(data.values)];

        // Check for existing values for this attribute
        const existingValues = await prisma.attributeValue.findMany({
            where: {
                attributeId: data.attributeId,
                value: {
                    in: uniqueValues,
                },
            },
        });

        const existingValueStrings = existingValues.map((v) => v.value);

        // Filter out values that already exist (preserving order)
        const valuesToCreate = uniqueValues.filter(
            (value) => !existingValueStrings.includes(value)
        );

        if (valuesToCreate.length === 0) {
            throw new Error(
                "All values already exist for this attribute. No new values to create."
            );
        }

        // 🔒 Use transaction with sequential creation to preserve order
        return await prisma.$transaction(async (tx) => {
            // Get the current highest order value for this attribute
            const maxOrder = await tx.attributeValue.findFirst({
                where: { attributeId: data.attributeId },
                orderBy: { order: "desc" },
                select: { order: true },
            });

            const startOrder = maxOrder ? maxOrder.order + 1 : 0;
            const createdValues = [];

            // Create values sequentially with incremental order
            for (let i = 0; i < valuesToCreate.length; i++) {
                const created = await tx.attributeValue.create({
                    data: {
                        value: valuesToCreate[i],
                        order: startOrder + i, // Explicit order from array position
                        attribute: {
                            connect: { id: data.attributeId },
                        },
                    },
                    include: {
                        attribute: true,
                    },
                });
                createdValues.push(created);
            }

            return createdValues;
        });
    },
    update: async (id: number, data: Prisma.AttributeValueUpdateInput) => {
        return prisma.attributeValue.update({
            where: { id },
            data,
            include: {
                attribute: true,
            },
        });
    },
    delete: async (id: number) => {
        // Check if attribute value is used by variants
        const valueWithVariants = await prisma.attributeValue.findUnique({
            where: { id },
            include: {
                VariantAttribute: true,
            },
        });

        if (
            valueWithVariants?.VariantAttribute?.length &&
            valueWithVariants.VariantAttribute.length > 0
        ) {
            throw new Error(
                "Cannot delete attribute value that is used by product variants."
            );
        }

        return prisma.attributeValue.delete({ where: { id } });
    },
};

export default AttributeValueService;
