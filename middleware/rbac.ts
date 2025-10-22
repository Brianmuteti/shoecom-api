// middleware/rbac.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { Action } from "../generated/prisma/client";

interface AuthenticatedRequest extends Request {
    role?: number;
}

interface PermissionCheck {
    resource: string;
    action: Action;
}

interface HybridCheckOptions {
    allowedRoles?: string[]; // e.g., ["editor", "supervisor"]
    adminOverride?: boolean; // bypass checks if role is "admin"
}

export const checkRoleOrPermission = (
    check: PermissionCheck,
    options: HybridCheckOptions = { adminOverride: true }
) => {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        const roleId = req.role;

        if (!roleId) {
            res.status(403).json({ message: "Role ID not found in session" });
            return;
        }

        try {
            const role = await prisma.role.findUnique({
                where: { id: roleId },
                select: { name: true },
            });

            // ✅ Admin override takes priority
            if (options.adminOverride && role?.name.toLowerCase() === "admin") {
                return next();
            }

            // ✅ Role name check
            if (
                options.allowedRoles?.length &&
                role &&
                options.allowedRoles.includes(role.name.toLowerCase())
            ) {
                return next();
            }

            // ✅ Check permission in DB
            const hasPermission = await prisma.rolePermission.findFirst({
                where: {
                    roleId,
                    permission: {
                        resource: check.resource,
                        action: check.action,
                    },
                },
            });

            if (hasPermission) {
                return next(); // ✅ Permission found
            }

            // ❌ No match
            res.status(403).json({
                message: `Access denied: Missing permission ${check.resource}:${check.action}`,
                isError: true,
            });
            return;
        } catch (err) {
            console.error("Hybrid RBAC error:", err);
            res.status(500).json({
                message: "Internal permission/role check failed",
                isError: true,
            });
            return;
        }
    };
};

// Convenience function for permission checks
export const requirePermission = (resource: string, action: Action) => {
    return checkRoleOrPermission({ resource, action });
};
