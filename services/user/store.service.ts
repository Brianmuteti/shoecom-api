import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";

const StoreService = {
    findAllStores: async () => {
        return prisma.store.findMany({
            include: {
                users: true,
                orders: true,
            },
        });
    },
    findStoreById: async (id: number) => {
        return prisma.store.findUnique({
            where: { id },
            include: {
                users: true,
                orders: true,
            },
        });
    },
    createStore: async (data: Prisma.StoreCreateInput) => {
        return prisma.store.create({ data });
    },
    updateStore: async (data: Prisma.StoreUpdateInput, id: number) => {
        return prisma.store.update({ where: { id }, data });
    },
    deleteStore: async (id: number) => {
        return prisma.store.delete({ where: { id } });
    },
};

const StoreCrudService = {
    findAll: StoreService.findAllStores,
    findById: StoreService.findStoreById,
    create: StoreService.createStore,
    update: (id: number, data: any) => StoreService.updateStore(data, id),
    delete: StoreService.deleteStore,
};

export default StoreCrudService;
