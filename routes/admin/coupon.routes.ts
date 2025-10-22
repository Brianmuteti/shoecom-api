import express from "express";
const router = express.Router();
import couponController from "../../controllers/coupon.controller";
router
    .route("/")
    .get(couponController.getAll)
    .post(couponController.create)
    .patch(couponController.update)
    .delete(couponController.delete);
router.route("/:id").get(couponController.getById);

export default router;
