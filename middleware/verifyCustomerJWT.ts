import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * Middleware to verify customer JWT access token
 */
const verifyCustomerJWT = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (
        !authHeader ||
        typeof authHeader !== "string" ||
        !authHeader.startsWith("Bearer ")
    ) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string,
        (err: any, decoded: any) => {
            if (err) {
                res.status(403).json({ message: "Forbidden" });
                return;
            }

            // Attach customer info to request
            (req as any).customerId = decoded.CustomerInfo.id;
            (req as any).customerEmail = decoded.CustomerInfo.email;
            (req as any).customerName = decoded.CustomerInfo.name;

            next();
        }
    );
};

export default verifyCustomerJWT;
