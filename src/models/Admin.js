import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "super-admin"], default: "admin" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
  resetOTP: { type: String },
  resetOTPExpires: { type: Date },
  settings: { type: Object },
});

export default mongoose.model("Admin", adminSchema);
