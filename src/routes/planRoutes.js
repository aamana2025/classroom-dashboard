import express from "express";
import { addPlan, deletePlanById, getAllPlans, getPlanById, updatePlanById } from "../controllers/planController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllPlans);
router.get("/:id", getPlanById);

router.use(authMiddleware);
// Add a new plan
router.post("/add", addPlan);
// Get all plans
// Get plan by ID
router.put("/:id", updatePlanById);
router.delete("/:id", deletePlanById);

export default router;
