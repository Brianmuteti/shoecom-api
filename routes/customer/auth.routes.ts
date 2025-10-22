import express from "express";
const router = express.Router();
import loginLimiter from "../../middleware/loginLimiter";
import customerAuthController from "../../controllers/customer/auth.controller";
import verifyCustomerJWT from "../../middleware/verifyCustomerJWT";

/**
 * Customer Authentication Routes
 */

// Public routes
router.post("/register", customerAuthController.register);
router.post("/login", loginLimiter, customerAuthController.login);
router.post("/oauth", customerAuthController.oauthLogin); // For Google/Facebook OAuth
router.post("/logout", customerAuthController.logout);
router.get("/refresh", customerAuthController.refresh);
router.post("/forgot-password", customerAuthController.requestPasswordReset);

// Protected routes (require authentication)
router.get("/profile", verifyCustomerJWT, customerAuthController.getProfile);

export default router;
