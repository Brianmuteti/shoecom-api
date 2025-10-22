import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import CustomerService from "../../services/customer/customer.service";

/**
 * Customer Authentication Controller
 * Handles both email/password and OAuth authentication
 */
const customerAuthController = {
    /**
     * Register new customer with email/password
     */
    register: async (req: Request, res: Response): Promise<void> => {
        try {
            const schema = z.object({
                email: z.string().email(),
                password: z
                    .string()
                    .min(8, {
                        message: "Password must be at least 8 characters long",
                    })
                    .regex(
                        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]{}])[A-Za-z\d@$!%*?&#^()[\]{}]+$/,
                        {
                            message:
                                "Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character",
                        }
                    ),
                name: z.string().min(2),
                phone: z.string().optional(),
            });

            const { email, password, name, phone } = schema.parse(req.body);

            // Check if customer already exists
            const existingCustomer = await CustomerService.findByEmail(email);
            if (existingCustomer) {
                res.status(409).json({ message: "Email already registered" });
                return;
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create customer
            const customer = await CustomerService.create({
                email,
                password: hashedPassword,
                name,
                phone,
                providerType: "email",
                emailVerified: false,
            });

            // Generate tokens
            const accessToken = generateAccessToken(customer);
            const refreshToken = generateRefreshToken(customer.email!);

            // Set refresh token cookie
            res.cookie("jwt_customer", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.status(201).json({
                message: "Registration successful",
                customer: {
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    emailVerified: customer.emailVerified,
                },
                accessToken,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: error.errors[0].message });
                return;
            }
            console.error("Registration error:", error);
            res.status(500).json({ message: "Registration failed" });
        }
    },

    /**
     * Login with email/password
     */
    login: async (req: Request, res: Response): Promise<void> => {
        try {
            const schema = z.object({
                email: z.string().email(),
                password: z.string(),
            });

            const { email, password } = schema.parse(req.body);

            // Find customer
            const customer = await CustomerService.findByEmail(email);
            if (!customer) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }

            // Check if customer uses OAuth only
            if (!customer.password) {
                res.status(401).json({
                    message: `This account uses ${customer.providerType} login. Please use the appropriate login method.`,
                });
                return;
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(
                password,
                customer.password
            );
            if (!isPasswordValid) {
                res.status(401).json({ message: "Invalid credentials" });
                return;
            }

            // Generate tokens
            const accessToken = generateAccessToken(customer);
            const refreshToken = generateRefreshToken(customer.email!);

            // Set refresh token cookie
            res.cookie("jwt_customer", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({
                message: "Login successful",
                customer: {
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    emailVerified: customer.emailVerified,
                    avatar: customer.avatar,
                },
                accessToken,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: error.errors[0].message });
                return;
            }
            console.error("Login error:", error);
            res.status(500).json({ message: "Login failed" });
        }
    },

    /**
     * OAuth Login/Register (Google, Facebook)
     */
    oauthLogin: async (req: Request, res: Response): Promise<void> => {
        try {
            const schema = z.object({
                providerId: z.string(),
                providerType: z.enum(["google", "facebook"]),
                email: z.string().email(),
                name: z.string(),
                avatar: z.string().optional(),
            });

            const { providerId, providerType, email, name, avatar } =
                schema.parse(req.body);

            // Check if customer exists by provider ID
            let customer = await CustomerService.findByProviderId(
                providerId,
                providerType
            );

            // If not, check by email (might be existing email/password user)
            if (!customer) {
                customer = await CustomerService.findByEmail(email);

                // If exists with email, link OAuth account
                if (customer && !customer.providerId) {
                    customer = await CustomerService.update(customer.id, {
                        providerId,
                        providerType,
                        emailVerified: true, // OAuth emails are pre-verified
                        avatar: avatar || customer.avatar,
                    });
                }
            }

            // Create new customer if doesn't exist
            if (!customer) {
                customer = await CustomerService.create({
                    email,
                    name,
                    providerId,
                    providerType,
                    emailVerified: true, // OAuth emails are pre-verified
                    avatar,
                });
            }

            // Generate tokens
            const accessToken = generateAccessToken(customer);
            const refreshToken = generateRefreshToken(customer.email!);

            // Set refresh token cookie
            res.cookie("jwt_customer", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.json({
                message: "OAuth login successful",
                customer: {
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    emailVerified: customer.emailVerified,
                    avatar: customer.avatar,
                    providerType: customer.providerType,
                },
                accessToken,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: error.errors[0].message });
                return;
            }
            console.error("OAuth login error:", error);
            res.status(500).json({ message: "OAuth login failed" });
        }
    },

    /**
     * Refresh access token
     */
    refresh: async (req: Request, res: Response): Promise<void> => {
        try {
            const cookies = req.cookies;
            if (!cookies?.jwt_customer) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const refreshToken = cookies.jwt_customer;

            jwt.verify(
                refreshToken,
                process.env.REFRESH_TOKEN_SECRET as string,
                async (err: any, decoded: any) => {
                    if (err) {
                        res.status(403).json({ message: "Forbidden" });
                        return;
                    }

                    const customer = await CustomerService.findByEmail(
                        decoded.email
                    );
                    if (!customer) {
                        res.status(401).json({ message: "Unauthorized" });
                        return;
                    }

                    const accessToken = generateAccessToken(customer);
                    res.json({ accessToken });
                }
            );
        } catch (error) {
            console.error("Refresh token error:", error);
            res.status(500).json({ message: "Token refresh failed" });
        }
    },

    /**
     * Logout
     */
    logout: async (req: Request, res: Response): Promise<void> => {
        const cookies = req.cookies;
        if (!cookies?.jwt_customer) {
            res.sendStatus(204);
            return;
        }

        res.clearCookie("jwt_customer", {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        res.json({ message: "Logout successful" });
    },

    /**
     * Request password reset
     */
    requestPasswordReset: async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const schema = z.object({
                email: z.string().email(),
            });

            const { email } = schema.parse(req.body);

            const customer = await CustomerService.findByEmail(email);
            if (!customer) {
                // Don't reveal if email exists
                res.status(200).json({
                    message: "If the email exists, a reset link has been sent",
                });
                return;
            }

            // Check if customer uses OAuth
            if (customer.providerType && customer.providerType !== "email") {
                res.status(400).json({
                    message: `This account uses ${customer.providerType} login and doesn't have a password.`,
                });
                return;
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString("hex");
            const resetTokenExpiry = new Date();
            resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

            // TODO: Store reset token in database (add fields to Customer model if needed)
            // For now, just send a success message
            // In production, you'd:
            // 1. Store resetToken and expiry in database
            // 2. Send email with reset link
            // 3. Use emailController similar to User auth

            res.status(200).json({
                message: "If the email exists, a reset link has been sent",
                // In dev mode, you might want to return the token for testing
                ...(process.env.NODE_ENV === "development" && { resetToken }),
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: error.errors[0].message });
                return;
            }
            console.error("Password reset request error:", error);
            res.status(500).json({ message: "Password reset request failed" });
        }
    },

    /**
     * Get customer profile
     */
    getProfile: async (req: Request, res: Response): Promise<void> => {
        try {
            const customerId = (req as any).customerId; // Set by auth middleware

            const customer = await CustomerService.getProfile(customerId);
            if (!customer) {
                res.status(404).json({ message: "Customer not found" });
                return;
            }

            res.json({ customer });
        } catch (error) {
            console.error("Get profile error:", error);
            res.status(500).json({ message: "Failed to get profile" });
        }
    },
};

/**
 * Helper function to generate access token
 */
function generateAccessToken(customer: any): string {
    return jwt.sign(
        {
            CustomerInfo: {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                emailVerified: customer.emailVerified,
            },
        },
        process.env.ACCESS_TOKEN_SECRET as string,
        { expiresIn: "15m" }
    );
}

/**
 * Helper function to generate refresh token
 */
function generateRefreshToken(email: string): string {
    return jwt.sign({ email }, process.env.REFRESH_TOKEN_SECRET as string, {
        expiresIn: "7d",
    });
}

export default customerAuthController;
