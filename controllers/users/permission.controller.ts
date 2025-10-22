// controllers/permissionController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { Action } from "../../generated/prisma/client";
import PermissionService from "../../services/user/permission.service";
import UserService from "../../services/user/user.service";

const permissionController = {
    createPermission: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({
            resource: z.string().min(1),
            action: z.nativeEnum(Action),
        });

        const { resource, action } = schema.parse(req.body);

        const existing = await PermissionService.findByResourceAndAction(
            resource,
            action
        );

        if (existing) {
            res.status(409).json({ message: "Permission already exists" });
            return;
        }

        const permission = await PermissionService.createPermission({
            resource,
            action,
        });
        res.status(201).json(permission);
    },

    syncRolePermissions: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({
            permissions: z.array(
                z.object({
                    resource: z.string(),
                    actions: z.array(z.nativeEnum(Action)),
                })
            ),
        });

        const roleId = parseInt(req.params.roleId);
        if (isNaN(roleId)) {
            res.status(400).json({ message: "Invalid role ID" });
            return;
        }

        const { permissions } = schema.parse(req.body);

        const role = await UserService.findRoleById(roleId);
        if (!role) {
            res.status(404).json({
                message: `Role with ID ${roleId} not found`,
            });
            return;
        }

        const result = await PermissionService.syncRolePermissions(
            roleId,
            permissions
        );

        res.status(200).json({
            message: "Role permissions synced",
            summary: result,
        });
    },

    updateRolePermission: async (
        req: Request,
        res: Response
    ): Promise<void> => {
        const schema = z.object({
            permissionId: z.number().int(),
        });

        const { permissionId } = schema.parse(req.body);
        const id = parseInt(req.params.id);

        const updated = await PermissionService.updateRolePermission(
            id,
            permissionId
        );
        res.status(200).json(updated);
    },
};

export default permissionController;
