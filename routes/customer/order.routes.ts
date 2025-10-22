import { Router } from "express";
import customerOrderController from "../../controllers/customer/order.controller";
// import verifyCustomerJWT from "../../middleware/verifyCustomerJWT";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiting for order operations
const orderRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        success: false,
        message: "Too many order requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply customer authentication middleware to all routes
// router.use(verifyCustomerJWT);

/**
 * @route   POST /customer/orders
 * @desc    Place a new order
 * @access  Private (Customer)
 * @body    {
 *   "addressId": number (optional),
 *   "items": [
 *     {
 *       "productId": number,
 *       "quantity": number,
 *       "price": number
 *     }
 *   ],
 *   "paymentMethod": "CARD" | "MPESAEXPRESS" | "PAYBILL" | "PAYPAL" | "COD" | "OTHER",
 *   "totalAmount": number,
 *   "notes": string (optional),
 *   "storeId": number (optional),
 *   "couponCodes": string[] (optional)
 * }
 */
router.post("/", customerOrderController.placeOrder);

/**
 * @route   GET /customer/orders
 * @desc    Get customer's orders with pagination and filtering
 * @access  Private (Customer)
 * @query   page, limit, status
 */
router.get("/", customerOrderController.getMyOrders);

/**
 * @route   GET /customer/orders/stats
 * @desc    Get customer's order statistics
 * @access  Private (Customer)
 */
router.get("/stats", customerOrderController.getOrderStats);

/**
 * @route   GET /customer/orders/:id
 * @desc    Get order details by ID
 * @access  Private (Customer)
 * @params  id - Order ID
 */
router.get("/:id", customerOrderController.getOrderDetails);

/**
 * @route   GET /customer/orders/track/:orderNumber
 * @desc    Get order details by order number
 * @access  Private (Customer)
 * @params  orderNumber - Order number (e.g., ORD-20240101-000001)
 */
router.get("/track/:orderNumber", customerOrderController.getOrderByNumber);

/**
 * @route   POST /customer/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Private (Customer)
 * @params  id - Order ID
 * @body    {
 *   "reason": string
 * }
 */
router.post("/:id/cancel", orderRateLimit, customerOrderController.cancelOrder);

/**
 * @route   POST /customer/orders/:id/return
 * @desc    Request order return
 * @access  Private (Customer)
 * @params  id - Order ID
 * @body    {
 *   "reason": string,
 *   "items": [
 *     {
 *       "itemId": number,
 *       "quantity": number,
 *       "reason": string
 *     }
 *   ]
 * }
 */
router.post(
    "/:id/return",
    orderRateLimit,
    customerOrderController.requestReturn
);

/**
 * @route   GET /customer/orders/track/:orderNumber/timeline
 * @desc    Track order with detailed timeline
 * @access  Private (Customer)
 * @params  orderNumber - Order number
 */
router.get("/track/:orderNumber/timeline", customerOrderController.trackOrder);

export default router;
