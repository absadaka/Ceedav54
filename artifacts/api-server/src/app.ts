import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import adminRouter from "./routes/admin";
import { handleStripeWebhook } from "./routes/stripeWebhook.js";
import paymentSuccessRouter from "./routes/paymentSuccess.js";
import advanceSuccessRouter from "./routes/advanceSuccess.js";
import { tenantMiddleware } from "./middleware/requireTenant.js";

const app: Express = express();

app.use(cors());

// Raw body for Stripe webhook
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes (no tenant middleware)
app.use("/api/payment-success", paymentSuccessRouter);
app.use("/api/advance-success", advanceSuccessRouter);

// Admin routes (self-authenticated; do NOT pass tenantMiddleware)
app.use("/api", adminRouter);

// Tenant-scoped routes (all other /api routes)
app.use("/api", tenantMiddleware, router);

export default app;
