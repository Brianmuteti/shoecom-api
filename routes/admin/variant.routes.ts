import express from "express";
const router = express.Router();
import variantController from "../../controllers/products/variant.controller";
import { uploadFiles } from "../../middleware/fileUpload";

// Create variants with images for a product
router.route("/:productId").post(
    uploadFiles([
        { name: "variant_0", maxCount: 10 },
        { name: "variant_1", maxCount: 10 },
        { name: "variant_2", maxCount: 10 },
        { name: "variant_3", maxCount: 10 },
        { name: "variant_4", maxCount: 10 },
        { name: "variant_5", maxCount: 10 },
        { name: "variant_6", maxCount: 10 },
        { name: "variant_7", maxCount: 10 },
        { name: "variant_8", maxCount: 10 },
        { name: "variant_9", maxCount: 10 },
    ]),
    variantController.createVariants
);

// Update variant information (without images)
router.route("/:variantId").patch(variantController.updateVariant);

// Add images to existing variant
router
    .route("/:variantId/images")
    .post(
        uploadFiles([{ name: "images", maxCount: 10 }]),
        variantController.addVariantImages
    );

// Delete variants not in the provided list
router.route("/:productId/cleanup").delete(variantController.deleteNotInList);

export default router;
