import express from "express";
const router = express.Router();
import productController from "../../controllers/products/product.controller";
import mediaController from "../../controllers/products/media.controller";
import brandController from "../../controllers/products/brand.controller";
import categoryController from "../../controllers/products/category.controller";
import { uploadFiles } from "../../middleware/fileUpload";
import tagController from "../../controllers/products/tag.controller";
import attributeController from "../../controllers/products/attribute.controller";
import attributeValueController from "../../controllers/products/attributeValue.controller";

router
    .route("/")
    .get(productController.getAllProducts)
    .post(productController.createGeneral)
    .patch(productController.updateGeneral)
    .delete(productController.deleteProduct);

router.route("/setup/:productId").post(productController.updateSetup);
router.route("/seo/:productId").post(productController.updateSEO);
router.route("/status/:productId").post(productController.updateStatus);

router.route("/store/:storeId").get(productController.getProductsByStore);
router
    .route("/category/:categoryId")
    .get(productController.getProductsByCategory);

// ProductMedia routes
router
    .route("/media")
    .post(
        uploadFiles([
            { name: "thumbnail", maxCount: 1 },
            { name: "images", maxCount: 10 }, // Allow up to 10 images/videos
        ]),
        mediaController.addProductMedia
    )
    .patch(mediaController.addVariantMedia);

// Media management routes
router.route("/media/:mediaId").delete(mediaController.deleteMedia);
router
    .route("/media/product/:productId")
    .delete(mediaController.deleteAllProductMedia);
router
    .route("/media/product/:productId/thumbnail")
    .get(mediaController.getProductThumbnail);
router
    .route("/media/product/:productId/sync-meta")
    .post(mediaController.syncMetaImage);
//  .delete(mediaController.delete);
// router.route("/media/:id").get(mediaController.getById);
// router
//     .route("/media/product/:productId")
//     .get(productMediaController.getByProduct);

// Brand routes
router
    .route("/brands")
    .get(brandController.getAll)
    .post(brandController.create)
    .patch(brandController.update)
    .delete(brandController.delete);
router.route("/brands/:id").get(brandController.getById);

// Attribute routes
router
    .route("/attributes")
    .get(attributeController.getAll)
    .post(attributeController.create)
    .patch(attributeController.update)
    .delete(attributeController.delete);
router.route("/attributes/:id").get(attributeController.getById);

// Attribute Value routes
router
    .route("/attribute-values")
    .get(attributeValueController.getAll)
    .post(attributeValueController.create)
    .patch(attributeValueController.update)
    .delete(attributeValueController.delete);
router.route("/attribute-values/:id").get(attributeValueController.getById);

// Category routes
router
    .route("/categories")
    .get(categoryController.getAll)
    .post(
        uploadFiles([
            { name: "image", maxCount: 1 },
            { name: "icon", maxCount: 1 },
        ]),
        categoryController.create
    )
    .patch(
        uploadFiles([
            { name: "image", maxCount: 1 },
            { name: "icon", maxCount: 1 },
        ]),
        categoryController.update
    )
    .delete(categoryController.delete);
router.route("/categories/:id").get(categoryController.getById);
// router.route("/:id").get(productController.getProductById);

// Tags
router
    .route("/tags")
    .get(tagController.getAll)
    .post(tagController.create)
    .patch(tagController.update)
    .delete(tagController.delete);
router.route("/tags/:id").get(tagController.getById);
router.route("/tags/:tag/products").get(tagController.getProductsByTag);

// Product attribute routes
router.route("/attributes").get(productController.getAttributes);
router
    .route("/attributes/:attributeId/values")
    .get(productController.getAttributeValues);

export default router;
