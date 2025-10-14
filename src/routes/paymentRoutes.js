import express from "express";
import { createCheckoutSession, manageSubscription, retryPayment, stripeWebhook } from "../controllers/paymentController.js";
import bodyParser from "body-parser";

const router = express.Router();

// ⚠️ Stripe needs raw body for webhook
router.post("/webhook", bodyParser.raw({ type: "application/json" }), stripeWebhook);

// Checkout route
router.post("/create-checkout-session", createCheckoutSession);
router.post("/re-payment", retryPayment);

// re sub
router.post("/subscripe", manageSubscription);



export default router;
