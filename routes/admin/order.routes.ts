import { Router } from "express";
import adminOrderController from "../../controllers/admin/order.controller";
import verifyJWT from "../../middleware/verifyJWT";
import { requirePermission } from "../../middleware/rbac";

const router = Router();

// Apply admin authentication middleware to all routes
router.use(verifyJWT);

/**
 * @route   GET /admin/orders
 * @desc    Get all orders with advanced filtering and pagination
 * @access  Private (Admin/Manager)
 * @query   page, limit, customerId, storeId, status, paymentMethod, paid, search, dateFrom, dateTo
 */
router.get(
    "/",
    requirePermission("orders", "view"),
    adminOrderController.getAllOrders
);

/**
 * @route   GET /admin/orders/analytics
 * @desc    Get order analytics and statistics
 * @access  Private (Admin/Manager)
 * @query   storeId, dateFrom, dateTo
 */
router.get(
    "/analytics",
    requirePermission("orders", "view"),
    adminOrderController.getOrderAnalytics
);

/**
 * @route   GET /admin/orders/export
 * @desc    Export orders to CSV
 * @access  Private (Admin/Manager)
 * @query   customerId, storeId, status, paymentMethod, paid, dateFrom, dateTo
 */
router.get(
    "/export",
    requirePermission("orders", "view"),
    adminOrderController.exportOrders
);

/**
 * @route   GET /admin/orders/:id
 * @desc    Get order details by ID
 * @access  Private (Admin/Manager)
 * @params  id - Order ID
 */
router.get(
    "/:id",
    requirePermission("orders", "view"),
    adminOrderController.getOrderDetails
);

/**
 * @route   PUT /admin/orders/:id
 * @desc    Update order status and details
 * @access  Private (Admin/Manager)
 * @params  id - Order ID
 * @body    {
 *   "status": "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" (optional),
 *   "paymentMethod": "CARD" | "MPESAEXPRESS" | "PAYBILL" | "PAYPAL" | "COD" | "OTHER" (optional),
 *   "paid": boolean (optional),
 *   "notes": string (optional),
 *   "addressId": number (optional)
 * }
 */
router.put(
    "/:id",
    requirePermission("orders", "edit"),
    adminOrderController.updateOrder
);

/**
 * @route   POST /admin/orders/:id/cancel
 * @desc    Cancel an order (admin)
 * @access  Private (Admin/Manager)
 * @params  id - Order ID
 * @body    {
 *   "reason": string
 * }
 */
router.post(
    "/:id/cancel",
    requirePermission("orders", "edit"),
    adminOrderController.cancelOrder
);

/**
 * @route   DELETE /admin/orders/:id
 * @desc    Delete an order (soft delete)
 * @access  Private (Admin)
 * @params  id - Order ID
 */
router.delete(
    "/:id",
    requirePermission("orders", "delete"),
    adminOrderController.deleteOrder
);

/**
 * @route   GET /admin/orders/customers/:customerId/orders
 * @desc    Get orders by customer
 * @access  Private (Admin/Manager)
 * @params  customerId - Customer ID
 * @query   page, limit
 */
router.get(
    "/customers/:customerId/orders",
    requirePermission("orders", "view"),
    adminOrderController.getCustomerOrders
);

/**
 * @route   POST /admin/orders/bulk-update
 * @desc    Bulk update order statuses
 * @access  Private (Admin/Manager)
 * @body    {
 *   "orderIds": number[],
 *   "status": "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED",
 *   "notes": string (optional)
 * }
 */
router.post(
    "/bulk-update",
    requirePermission("orders", "edit"),
    adminOrderController.bulkUpdateOrders
);

export default router;
