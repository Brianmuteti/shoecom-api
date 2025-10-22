import { prisma } from "../../utils/prisma";
import { Prisma } from "../../generated/prisma/client";

export interface CreateCustomerInput {
    email?: string;
    phone?: string;
    name?: string;
    password?: string;
    providerId?: string;
    providerType?: string;
    emailVerified?: boolean;
    avatar?: string;
}

const CustomerService = {
    /**
     * Find customer by email
     */
    findByEmail: async (email: string) => {
        return prisma.customer.findUnique({
            where: { email },
        });
    },

    /**
     * Find customer by phone
     */
    findByPhone: async (phone: string) => {
        return prisma.customer.findUnique({
            where: { phone },
        });
    },

    /**
     * Find customer by provider ID (OAuth)
     */
    findByProviderId: async (providerId: string, providerType: string) => {
        return prisma.customer.findFirst({
            where: {
                providerId,
                providerType,
            },
        });
    },

    /**
     * Find customer by ID
     */
    findById: async (id: number) => {
        return prisma.customer.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                phone: true,
                name: true,
                providerId: true,
                providerType: true,
                emailVerified: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },

    /**
     * Create a new customer
     */
    create: async (data: CreateCustomerInput) => {
        return await prisma.customer.create({
            data: {
                email: data.email,
                phone: data.phone,
                name: data.name,
                password: data.password,
                providerId: data.providerId,
                providerType: data.providerType,
                emailVerified: data.emailVerified || false,
                avatar: data.avatar,
            },
            select: {
                id: true,
                email: true,
                phone: true,
                name: true,
                password: true,
                providerId: true,
                providerType: true,
                emailVerified: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },

    /**
     * Update customer
     */
    update: async (id: number, data: Prisma.CustomerUpdateInput) => {
        return await prisma.customer.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                phone: true,
                name: true,
                password: true,
                providerId: true,
                providerType: true,
                emailVerified: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    },

    /**
     * Verify customer email
     */
    verifyEmail: async (id: number) => {
        return await prisma.customer.update({
            where: { id },
            data: { emailVerified: true },
        });
    },

    /**
     * Get customer with full profile
     */
    getProfile: async (id: number) => {
        return prisma.customer.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                phone: true,
                name: true,
                providerType: true,
                emailVerified: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
                addresses: {
                    orderBy: { createdAt: "desc" },
                },
                Order: {
                    orderBy: { placedAt: "desc" },
                    take: 10,
                },
            },
        });
    },

    /**
     * Update password
     */
    updatePassword: async (id: number, hashedPassword: string) => {
        return await prisma.customer.update({
            where: { id },
            data: { password: hashedPassword },
        });
    },
};

export default CustomerService;
