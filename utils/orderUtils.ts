import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXXXX (e.g., ORD-20240101-000001)
 */
export async function generateOrderNumber(): Promise<string> {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "");
    const basePrefix = `ORD-${datePrefix}-`;

    // Get the highest order number for today
    const lastOrder = await prisma.order.findFirst({
        where: {
            orderNumber: {
                startsWith: basePrefix,
            },
        },
        orderBy: {
            orderNumber: "desc",
        },
    });

    let sequence = 1;
    if (lastOrder) {
        const lastSequence = parseInt(lastOrder.orderNumber.split("-")[2]);
        sequence = lastSequence + 1;
    }

    // Format sequence with leading zeros (6 digits)
    const sequenceStr = sequence.toString().padStart(6, "0");

    return `${basePrefix}${sequenceStr}`;
}

/**
 * Validate order number format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
    const pattern = /^ORD-\d{8}-\d{6}$/;
    return pattern.test(orderNumber);
}

/**
 * Extract date from order number
 */
export function extractDateFromOrderNumber(orderNumber: string): Date | null {
    if (!isValidOrderNumber(orderNumber)) {
        return null;
    }

    const dateStr = orderNumber.split("-")[1];
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.slice(6, 8));

    return new Date(year, month, day);
}

/**
 * Calculate estimated delivery date based on order date and shipping method
 */
export function calculateEstimatedDelivery(
    orderDate: Date,
    shippingMethod: "standard" | "express" | "overnight" = "standard"
): Date {
    const deliveryDate = new Date(orderDate);

    switch (shippingMethod) {
        case "overnight":
            deliveryDate.setDate(deliveryDate.getDate() + 1);
            break;
        case "express":
            deliveryDate.setDate(deliveryDate.getDate() + 2);
            break;
        case "standard":
        default:
            deliveryDate.setDate(deliveryDate.getDate() + 5);
            break;
    }

    return deliveryDate;
}

/**
 * Format order status for display
 */
export function formatOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
        PENDING: "Pending",
        PROCESSING: "Processing",
        SHIPPED: "Shipped",
        DELIVERED: "Delivered",
        CANCELLED: "Cancelled",
        RETURNED: "Returned",
    };

    return statusMap[status] || status;
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
        CARD: "Credit/Debit Card",
        MPESAEXPRESS: "M-Pesa Express",
        PAYBILL: "M-Pesa PayBill",
        PAYPAL: "PayPal",
        COD: "Cash on Delivery",
        OTHER: "Other",
    };

    return methodMap[method] || method;
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status: string): boolean {
    const cancellableStatuses = ["PENDING", "PROCESSING"];
    return cancellableStatuses.includes(status);
}

/**
 * Check if order can be returned
 */
export function canReturnOrder(status: string): boolean {
    return status === "DELIVERED";
}

/**
 * Get order status color for UI
 */
export function getOrderStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
        PENDING: "#f59e0b", // amber
        PROCESSING: "#3b82f6", // blue
        SHIPPED: "#8b5cf6", // purple
        DELIVERED: "#10b981", // green
        CANCELLED: "#ef4444", // red
        RETURNED: "#6b7280", // gray
    };

    return colorMap[status] || "#6b7280";
}
