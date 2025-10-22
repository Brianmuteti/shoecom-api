import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import { ZodError } from "zod";
import { logEvents } from "./logger";

const errorHandler = (
    err: Error & { status?: number },
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // 🔍 Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            message: "Validation failed",
            isError: true,
            errors: err.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
            })),
        });
        return;
    }

    // 🔍 Prisma unique constraint error (e.g. duplicate email, username)
    if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
    ) {
        const fields =
            (err.meta?.target as string[])?.join(", ") || "unknown field";
        res.status(409).json({
            message: `Duplicate entry for: ${fields}`,
            isError: true,
        });
        return;
    }
    // ❌ Prisma "Record not found" (e.g. update/delete with wrong ID)
    if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
    ) {
        res.status(404).json({
            message: "Record not found. The specified ID may not exist.",
            isError: true,
        });
        return;
    }

    // 🔗 Optional: Foreign key constraint failed (e.g. linked record missing)
    if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
    ) {
        const field = err.meta?.field_name || "foreign key";
        res.status(400).json({
            message: `Foreign key constraint failed on: ${field}`,
            isError: true,
        });
        return;
    }

    // 📝 Log all other errors
    logEvents(
        `${err.name}: ${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
        "errLog.log"
    );

    console.error(err.stack);

    // Support custom status codes by throwing errors with a 'status' property:
    //   const err = new Error('Not found'); err.status = 404; throw err;
    const status =
        err.status ||
        (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

    res.status(status).json({
        message: err.message,
        isError: true,
    });
};

export default errorHandler;
