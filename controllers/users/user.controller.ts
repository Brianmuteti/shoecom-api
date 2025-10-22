import User from "../../services/user/user.service";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import emailController from "./email.controller";
import { z } from "zod";

const parseId = (value: any, name = "ID") => {
    const id = Number(value);
    if (isNaN(id) || id <= 0) throw new Error(`Invalid ${name}`);
    return id;
};

const userController = {
    getAllUsers: async (req: Request, res: Response): Promise<void> => {
        const users = await User.findAll();
        if (!users?.length) throw new Error("No users found");
        res.json({ data: users });
    },
    createUser: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({
            email: z.string().email(),
            name: z.string().min(1),
            phone: z.string().min(10),
            password: z.string().min(6),
            roleId: z.number(),
            storeId: z.number().optional(),
            active: z.boolean(),
        });
        const { email, phone, name, password, roleId, active, storeId } =
            schema.parse(req.body);
        const normalizedEmail = email.toLowerCase();
        const duplicate = await User.findUserByEmail(normalizedEmail);
        if (duplicate) throw new Error("Duplicate email");
        const hashedPwd = await bcrypt.hash(password, 10);
        const newUser = await User.createUser({
            email: normalizedEmail,
            phone,
            name,
            password: hashedPwd,
            store: storeId ? { connect: { id: storeId } } : undefined,
            role: { connect: { id: roleId } },
            active,
        });
        if (!newUser) throw new Error("Invalid user data");
        res.status(201).json({
            data: { message: `New user ${newUser.email} created` },
        });
    },
    updateUser: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({
            id: z.number(),
            email: z.string().email(),
            phone: z.string().min(10),
            name: z.string().min(1),
            roleId: z.number(),
            active: z.boolean(),
            password: z.string().min(6).optional(),
            storeId: z.number().optional(),
        });
        const { id, email, phone, name, roleId, active, password, storeId } =
            schema.parse(req.body);
        const normalizedEmail = email.toLowerCase();
        const user = await User.findUserById(id);
        if (!user) throw new Error("User not found");
        const duplicate = await User.findUserByEmail(normalizedEmail);
        if (duplicate && duplicate.id !== id)
            throw new Error("Duplicate email");
        const updateData = {
            email: normalizedEmail,
            phone,
            name,
            store: storeId ? { connect: { id: storeId } } : undefined,
            role: { connect: { id: roleId } },
            active,
            password: password
                ? await bcrypt.hash(password, 10)
                : user.password,
        };
        const updatedUser = await User.updateUser(updateData, id);
        res.json({ data: { message: `${updatedUser.email} updated` } });
    },
    updateUserStatus: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({
            id: z.number(),
            active: z.boolean(),
        });
        const { id, active } = schema.parse(req.body);
        const user = await User.findUserById(id);
        if (!user) throw new Error("User not found");
        const updateData = { active };
        const updatedUser = await User.updateUser(updateData, id);
        res.json({ data: { message: `${updatedUser.email} updated` } });
    },
    deleteUser: async (req: Request, res: Response): Promise<void> => {
        const id = parseId(req.body.id, "userId");
        const user = await User.findUserById(id);
        if (!user) throw new Error("User not found");
        const updateData = { active: false, deletedAt: new Date() };
        const result = await User.updateUser(updateData, id);
        res.json({
            message: `User ${result.email} with ID ${result.id} deleted`,
        });
    },
    getLoginLogs: async (req: Request, res: Response): Promise<void> => {
        const id = parseId(req.params.id, "userId");
        const user = await User.findUserById(id);
        if (!user) throw new Error("User not found");
        const logs = await User.findLogs(id);
        res.json({ data: logs });
    },
    updatePassword: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({
            id: z.number(),
            currentpassword: z.string(),
            password: z.string(),
        });
        const { id, currentpassword, password } = schema.parse(req.body);
        const user = await User.findUserById(id);
        if (!user) throw new Error("User not found");
        const match = await bcrypt.compare(currentpassword, user.password);
        if (!match) throw new Error("Incorrect current password");
        const duplicate = await bcrypt.compare(password, user.password);
        if (duplicate)
            throw new Error("New password cannot be the same as old password");
        const updateData = {
            password: await bcrypt.hash(password, 10),
            passwordChangeAt: new Date(),
        };
        const updatedUser = await User.updateUser(updateData, id);
        res.json({ data: { message: `${updatedUser.email} updated` } });
    },
    createRole: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({ name: z.string() });
        const { name } = schema.parse(req.body);
        const newRole = await User.createRole({ name });
        if (!newRole) throw new Error("Invalid role data");
        res.status(201).json({
            data: { message: `New role ${newRole.name} created` },
        });
    },
    updateRole: async (req: Request, res: Response): Promise<void> => {
        const schema = z.object({ id: z.number(), name: z.string() });
        const { id, name } = schema.parse(req.body);
        const role = await User.findRoleById(id);
        if (!role) throw new Error("Role not found");
        const updateData = { name };
        await User.updateRole(updateData, id);
        res.json({ data: { message: `${name} role updated` } });
    },
};

export default userController;
