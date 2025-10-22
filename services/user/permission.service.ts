// services/permissionService.ts
import { Prisma, Action } from "../../generated/prisma/client";
import { prisma } from "../../utils/prisma";

const PermissionService = {
    syncRolePermissions: async (
        roleId: number,
        permissions: { resource: string; actions: Action[] }[]
    ) => {
        // Flatten into [{resource, action}]
        const desired = permissions.flatMap((p) =>
            p.actions.map((action) => ({
                resource: p.resource,
                action,
            }))
        );

        // 🔒 Use a transaction to ensure ACID compliance
        return await prisma.$transaction(async (tx) => {
            // ✅ Ensure all permission entries exist
            for (const { resource, action } of desired) {
                await tx.permission.upsert({
                    where: {
                        resource_action: { resource, action },
                    },
                    update: {},
                    create: { resource, action },
                });
            }

            // ✅ Get current RolePermission list
            const current = await tx.rolePermission.findMany({
                where: { roleId },
                include: { permission: true },
            });

            const currentSet = new Set(
                current.map(
                    (rp) => `${rp.permission.resource}:${rp.permission.action}`
                )
            );

            const desiredSet = new Set(
                desired.map((p) => `${p.resource}:${p.action}`)
            );

            // ✅ Remove outdated permissions
            const toRemove = current.filter(
                (rp) =>
                    !desiredSet.has(
                        `${rp.permission.resource}:${rp.permission.action}`
                    )
            );

            for (const rp of toRemove) {
                await tx.rolePermission.delete({ where: { id: rp.id } });
            }

            // ✅ Add missing ones
            for (const { resource, action } of desired) {
                if (!currentSet.has(`${resource}:${action}`)) {
                    const permission = await tx.permission.findUnique({
                        where: { resource_action: { resource, action } },
                    });

                    if (permission) {
                        await tx.rolePermission.create({
                            data: {
                                roleId,
                                permissionId: permission.id,
                            },
                        });
                    }
                }
            }

            return { added: desired.length, removed: toRemove.length };
        });
    },

    findByResourceAndAction: async (resource: string, action: Action) => {
        return await prisma.permission.findUnique({
            where: {
                resource_action: {
                    resource,
                    action,
                },
            },
        });
    },

    createPermission: async (data: Prisma.PermissionCreateInput) => {
        return await prisma.permission.create({ data });
    },

    assignPermissionToRole: async (roleId: number, permissionId: number) => {
        return await prisma.rolePermission.create({
            data: { roleId, permissionId },
        });
    },

    findRolePermission: async (roleId: number, permissionId: number) => {
        return await prisma.rolePermission.findUnique({
            where: {
                roleId_permissionId: {
                    roleId,
                    permissionId,
                },
            },
        });
    },

    updateRolePermission: async (id: number, permissionId: number) => {
        return await prisma.rolePermission.update({
            where: { id },
            data: { permissionId },
        });
    },
    findPermissionExists: async (id: number) => {
        return prisma.permission.findUnique({
            where: {
                id: id,
            },
        });
    },
};

export default PermissionService;
