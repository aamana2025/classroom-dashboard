import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true }, // in cents or your currency
  durationValue: { type: Number, required: true }, // عدد المدة
  durationType: { 
    type: String, 
    enum: ["day", "week", "month", "year"], 
    required: true 
  }, // نوع المدة
  stripePriceId: { type: String },
}, { timestamps: true });

export default mongoose.model("Plan", planSchema);
