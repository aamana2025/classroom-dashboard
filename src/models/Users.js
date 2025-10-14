import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
  status: { type: String, enum: ["pending", "active"], default: "pending" },
  accessToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  resetOTP: { type: String },// ✅ store OTP
  resetOTPExpires: { type: Date },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  deviceToken: { type: String, default: null }, // ✅ track active device/session
  warning7Sent: { type: Boolean, default: false },
  warning1Sent: { type: Boolean, default: false },
});

export default mongoose.model("User", userSchema);
 