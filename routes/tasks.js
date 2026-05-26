import express from "express";
import TaskController from "../controllers/task.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// CREATE task (Walkee requests, Walker executes)
router.post("/", authenticate, authorize(["Walkee", "Walker", "Admin"]), TaskController.createTask);
router.post('/quote', TaskController.quoteTask);

// READ all tasks (Admin + Walker + Walkee)
router.get("/", authenticate, authorize(["Admin", "Walker", "Walkee"]), TaskController.getTasks);

// UPDATE task location (Walker)
router.put("/:id/location", authenticate, authorize(["Walker"]), TaskController.updateTaskLocation);

// CANCEL task (Walkee/Admin)
router.post("/:id/cancel", authenticate, authorize(["Walkee", "Admin"]), TaskController.cancelTask);
// APPROVE task (Admin)
router.post("/:id/approve", authenticate, authorize(["Admin"]), TaskController.approveTask);

// DELETE task (Admin only)
router.delete("/:id", authenticate, authorize(["Admin"]), TaskController.deleteTask);

// Additional routes for task management
router.get("/nearby", authenticate, authorize(["Walkee", "Walker", "Admin"]), TaskController.getNearbyWalkers);
router.post("/:id/assign", authenticate, authorize(["Admin", "Walker"]), TaskController.assignTask);
router.post("/:id/start", authenticate, authorize(["Walker"]), TaskController.startTask);
router.post("/:id/complete", authenticate, authorize(["Walker", "Walkee"]), TaskController.completeTask);
router.get("/:id/track", authenticate, TaskController.getTaskTracking);
router.post("/:id/feedback", authenticate, authorize(["Walkee"]), TaskController.submitFeedback);

export default router;

