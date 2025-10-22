import { prisma } from "../../utils/prisma";
import { Prisma, Action } from "../../generated/prisma/client";
// import { Action } from "../generated/prisma/client";
// interface CreateLog {
//     userId: number;
//     ip: string;
//     location: string;
//     os: string;
//     browser: string;
//     refreshToken: string;
// }

const UserService = {
    findAll: async () => {
        return prisma.user.findMany({
            select: {
                id: true,
                name: true,
                uuid: true,
                active: true,
                email: true,
                role: true,
                lastLogin: true,
                createdAt: true,
            },
            where: { deletedAt: null },
        });
    },
    findUserByEmail: async (email: string) => {
        return prisma.user.findUnique({
            where: {
                email,
            },
        });
    },
    findUserById: async (id: number) => {
        return prisma.user.findUnique({
            where: {
                id: id,
            },
        });
    },
    createUser: async (data: Prisma.UserCreateInput) => {
        return await prisma.user.create({ data });
    },
    updateUser: async (data: Prisma.UserUpdateInput, id: number) => {
        return await prisma.user.update({ where: { id }, data });
    },
    //  deleteUser: async (id: number) => {
    //      return prisma.user.delete({ where: { id } });
    //  },
    //   createLog: async (data: CreateLog) => {
    //       return await prisma.log.create({ data });
    //   },
    findLogs: async (userId: number) => {
        return prisma.log.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 15,
        });
    },
    createRole: async (data: Prisma.RoleCreateInput) => {
        return await prisma.role.create({ data });
    },
    updateRole: async (data: Prisma.RoleUpdateInput, id: number) => {
        return await prisma.role.update({ where: { id }, data });
    },
    findRoleById: async (id: number) => {
        return prisma.role.findUnique({
            where: {
                id: id,
            },
        });
    },
};

export default UserService;
