import dotenv from "dotenv";
dotenv.config();
import app from "./app";
import { prisma } from "./utils/prisma";

const PORT = process.env.PORT || 3500;

const startServer = async () => {
    try {
        await prisma.$connect();
        console.log("✅ Connected to PostgreSQL");
        console.log(process.env.NODE_ENV);
        app.listen(PORT, () =>
            console.log(`🚀 Server running on port ${PORT}`)
        );
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1); // Exit process if DB connection fails
    }
};

// Gracefully handle Prisma disconnection when the app is shutting down
process.on("SIGINT", async () => {
    await prisma.$disconnect();
    console.log("🛑 Prisma disconnected. Server shutting down.");
    process.exit(0);
});

startServer();
