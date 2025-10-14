import Plan from "../models/Plan.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Add a new plan (with Stripe price)
 */

export const addPlan = async (req, res) => {
  try {
    let { title, description, price, durationValue, durationType } = req.body;

    if (!title || !price || !durationValue || !durationType) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const amountInCents = Math.round(price * 100);

    const plan = new Plan({
      title,
      description,
      price: amountInCents,
      durationValue,
      durationType
    });

    await plan.save();

    res.status(201).json({
      message: "Plan created successfully",
      plan,
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({ message: "Error creating plan", error: error.message });
  }
};

/**
 * Get all plans
 */
export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();

    // ✅ Convert cents → dollars for frontend
    const formattedPlans = plans.map((plan) => ({
      ...plan._doc,
      price: (plan.price / 100).toFixed(2),
    }));

    res.json({ plans: formattedPlans });
  } catch (error) {
    res.status(500).json({ message: "Error fetching plans", error: error.message });
  }
};

/**
 * Get a single plan by ID
 */
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // ✅ Convert cents → dollars
    res.json({
      plan: {
        ...plan._doc,
        price: (plan.price / 100).toFixed(2),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching plan", error: error.message });
  }
};


/**
 * Edit a plan by ID
 */
export const updatePlanById = async (req, res) => {
  try {
    const { id } = req.params;
    let { title, description, price, durationValue, durationType } = req.body;

    if (!title && !description && !price && !durationValue && !durationType) {
      return res.status(400).json({ message: "At least one field is required to update" });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Update fields if provided
    if (title) plan.title = title;
    if (description) plan.description = description;
    if (price !== undefined) plan.price = Math.round(price * 100); // convert to cents
    if (durationValue !== undefined) plan.durationValue = durationValue;
    if (durationType) plan.durationType = durationType;

    await plan.save();

    res.json({
      message: "Plan updated successfully",
      plan: {
        ...plan._doc,
        price: (plan.price / 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    res.status(500).json({ message: "Error updating plan", error: error.message });
  }
};

/**
 * Delete a plan by ID
 */
export const deletePlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Optional: Delete the price from Stripe if stripePriceId exists
    if (plan.stripePriceId) {
      try {
        await stripe.prices.update(plan.stripePriceId, { active: false });
      } catch (stripeError) {
        console.warn("Error deactivating Stripe price:", stripeError.message);
      }
    }

    await plan.deleteOne();

    res.json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting plan:", error);
    res.status(500).json({ message: "Error deleting plan", error: error.message });
  }
};