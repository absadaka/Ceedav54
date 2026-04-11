import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { handleStripeWebhook } from "./routes/stripeWebhook.js";
import paymentSuccessRouter from "./routes/paymentSuccess.js";
import advanceSuccessRouter from "./routes/advanceSuccess.js";

const app: Express = express();

app.use(cors());

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/payment-success", paymentSuccessRouter);
app.use("/api/advance-success", advanceSuccessRouter);
app.use("/api", router);

export default app;
