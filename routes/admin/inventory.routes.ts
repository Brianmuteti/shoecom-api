import express from "express";
import inventoryController from "../../controllers/products/inventory.controller";
const router = express.Router();

// Update variant pricing (price, salePrice, wholesalePrice, sku)
router
    .route("/variant/:variantId")
    .patch(inventoryController.updateVariantInventory);

// Update stock quantity for a variant in a specific store
router
    .route("/stock/:variantId/:storeId")
    .patch(inventoryController.updateStock)
    .get(inventoryController.getStockByStore);

// Get stock for a variant across all stores
router.route("/stock/:variantId").get(inventoryController.getVariantStock);

// Bulk update stock for multiple variants (useful for orders)
router.route("/stock/bulk/:storeId").post(inventoryController.bulkUpdateStock);

// Stock movement history endpoints
router
    .route("/movements/variant/:variantId")
    .get(inventoryController.getVariantMovements);

router
    .route("/movements/store/:storeId")
    .get(inventoryController.getStoreMovements);

router
    .route("/movements/user/:userId")
    .get(inventoryController.getUserMovements);

// Stock adjustment endpoints
router.route("/adjustments").get(inventoryController.getStockAdjustments);

router
    .route("/adjustments/stats")
    .get(inventoryController.getStockAdjustmentStats);

router
    .route("/adjustments/:adjustmentId")
    .get(inventoryController.getStockAdjustmentById);

router
    .route("/adjustments/user/:userId")
    .get(inventoryController.getStockAdjustmentsByUser);

router
    .route("/adjustments/store/:storeId")
    .get(inventoryController.getStockAdjustmentsByStore);

export default router;
