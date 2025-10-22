import express from "express";
const router = express.Router();
import storeController from "../../controllers/users/store.controller";

router
    .route("/")
    .get(storeController.getAll)
    .post(storeController.create)
    .patch(storeController.update)
    .delete(storeController.delete);

router.route("/:id").get(storeController.getById);

export default router;
