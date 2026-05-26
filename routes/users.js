//This is a CRUD API by sharif Developers
import express from "express";
import UserController from "../controllers/user.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// CREATE user (Admin only)
router.post("/", authenticate, authorize(["Admin"]), UserController.createUser);

// READ all users (Admin only)
router.get("/", authenticate, authorize(["Admin"]), UserController.getAllUsers);

// READ single user (Admin only)
router.get("/:id", authenticate, authorize(["Admin"]), UserController.getUserById);

// UPDATE user (Admin only)
router.put("/:id", authenticate, authorize(["Admin"]), UserController.updateUser);

// DELETE user (Admin only)
router.delete("/:id", authenticate, authorize(["Admin"]), UserController.deleteUser);

export default router;

