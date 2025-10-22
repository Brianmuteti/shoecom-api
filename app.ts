import express from "express";
import "express-async-errors";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import corsOptions from "./config/corsOptions";
import errorHandler from "./middleware/errorHandler";
import rootRouter from "./routes/root";
// Customer routes
import customerAuthRoutes from "./routes/customer/auth.routes";
import customerOrderRoutes from "./routes/customer/order.routes";
// Admin routes
import adminAuthRoutes from "./routes/admin/auth.routes";
import adminUserRoutes from "./routes/admin/user.routes";
import adminPermissionRoutes from "./routes/admin/permission.routes";
import adminRoleRoutes from "./routes/admin/role.routes";
import adminStoreRoutes from "./routes/admin/store.routes";
import adminProductRoutes from "./routes/admin/product.routes";
import adminVariantRoutes from "./routes/admin/variant.routes";
import adminInventoryRoutes from "./routes/admin/inventory.routes";
import adminCouponRoutes from "./routes/admin/coupon.routes";
import adminOrderRoutes from "./routes/admin/order.routes";
import { logger } from "./middleware/logger";

const app = express();

// Middleware
app.use(logger);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/", express.static(path.join(__dirname, "/public")));
app.use(
    "/uploads",
    express.static(path.join(__dirname, "/uploads"), {
        setHeaders: (res, filePath) => {
            // Set correct headers for PDF files
            if (filePath.endsWith(".pdf")) {
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Access-Control-Allow-Origin", "*"); // Or restrict to specific origin if needed
                res.setHeader("Access-Control-Allow-Headers", "Range");
                res.setHeader("Accept-Ranges", "bytes");
            }
        },
    })
);

// Routes
app.use("/", rootRouter);

// Customer routes
app.use("/customer/auth", customerAuthRoutes); // Customer authentication
app.use("/customer/orders", customerOrderRoutes); // Customer order operations

// Admin routes
app.use("auth", adminAuthRoutes); // Admin/Staff authentication
app.use("/users", adminUserRoutes);
app.use("/permissions", adminPermissionRoutes);
app.use("/roles", adminRoleRoutes);
app.use("/stores", adminStoreRoutes);
app.use("/products", adminProductRoutes);
app.use("/variants", adminVariantRoutes);
app.use("/inventory", adminInventoryRoutes);
app.use("/coupons", adminCouponRoutes);
app.use("/orders", adminOrderRoutes); // Admin order management

// 404 Handler
app.all("*", (req, res) => {
    res.status(404);
    if (req.accepts("html")) {
        res.sendFile(path.join(__dirname, "views", "404.html"));
    } else if (req.accepts("json")) {
        res.json({ message: "404 Not Found" });
    } else {
        res.type("txt").send("404 Not Found");
    }
});

// Error Handler
app.use(errorHandler);

export default app;
