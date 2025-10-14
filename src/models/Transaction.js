import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // linked active user
  pendingUser: { type: mongoose.Schema.Types.ObjectId, ref: "PendingUser" }, // optional, before activation
  stripeSessionId: String,
  stripePaymentId: String, // payment intent ID
  amount: Number, 
  currency: { type: String, default: "usd" },
  status: { type: String, enum: ["pending", "succeeded", "failed"], default: "pending" },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
  checkoutUrl: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Transaction", transactionSchema);
