import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";


const router = express.Router();


router.get("/admin", authenticate, authorize(["Admin"]), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

router.get("/walker", authenticate, authorize(["Walker"]), (req, res) => {
  res.json({ message: "Welcome Walker!" });
});

router.get("/walkee", authenticate, authorize(["Walkee"]), (req, res) => {
  res.json({ message: "Welcome Walkee!" });
});

export default router;

