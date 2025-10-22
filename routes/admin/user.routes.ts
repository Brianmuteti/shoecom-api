import express, { Request, Response } from "express";
const router = express.Router();
import userController from "../../controllers/users/user.controller";
// import verifyJWT from "../../middleware/verifyJWT";

// router.use(verifyJWT);

router
    .route("/")
    .get(userController.getAllUsers)
    .post(userController.createUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);
router.route("/status").patch(userController.updateUserStatus);
router.route("/update-password").patch(userController.updatePassword);
router.route("/:id/login-logs").get(userController.getLoginLogs);

// router.delete(
//   "/products/:id",
//   verifyJWT,
//   checkRoleOrPermission(
//     { resource: "products", action: Action.DELETE },
//     {
//       allowedRoles: ["editor", "manager"],
//       adminOverride: true,
//     }
//   ),
//   deleteProductHandler
// );

export default router;
