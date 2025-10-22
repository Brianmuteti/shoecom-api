import express, { Request, Response } from "express";
const router = express.Router();
import loginLimiter from "../../middleware/loginLimiter";
import authController from "../../controllers/users/auth.controller";

// router.route("/").post(loginLimiter, authController.login);

// router.route("/refresh").get(authController.refresh);

// router.route("/logout").post(authController.logout);
// router.route("/verify-email").post(authController.emailVerify);

// router.route("/reset-password").post(authController.passwordReset);

export default router;
