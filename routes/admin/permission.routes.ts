// routes/permissionRoutes.ts
import express from "express";
import permissionController from "../../controllers/users/permission.controller";

const router = express.Router();

router.post("/", permissionController.createPermission);
// router.post(
//     "/:roleId/permissions",
//     permissionController.assignPermissionToRole
// );
router.patch(
    "/role-permissions/:id",
    permissionController.updateRolePermission
);

export default router;
