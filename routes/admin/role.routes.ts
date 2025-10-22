import express, { Request, Response } from "express";
const router = express.Router();
import userController from "../../controllers/users/user.controller";
import permissionController from "../../controllers/users/permission.controller";
// import verifyJWT from "../../middleware/verifyJWT";

// router.use(verifyJWT);

router
    .route("/")
    .post(userController.createRole)
    //     .post(userController.createNewUser)
    .patch(userController.updateRole);
//     .delete(userController.deleteUser);
// router.route("/status").patch(userController.updateUserStatus);
// router.route("/update-password").patch(userController.updatePassword);
router
    .route("/:roleId/permissions")
    .post(permissionController.syncRolePermissions);

export default router;
