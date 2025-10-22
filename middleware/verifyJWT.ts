import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

interface DecodedUser extends JwtPayload {
    UserInfo: {
        email: string;
        role: number;
    };
}

interface AuthenticatedRequest extends Request {
    user?: string;
    role?: number;
}

const verifyJWT = (
    req: AuthenticatedRequest,
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

    try {
        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET as string
        ) as DecodedUser;
        req.user = decoded.UserInfo.email;
        req.role = decoded.UserInfo.role;
        next();
    } catch (err) {
        res.status(403).json({ message: "Forbidden" });
    }
};

export default verifyJWT;
