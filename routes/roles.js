import express from "express";
import Role from "../models/role.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// CREATE role
router.post("/", authenticate, authorize(["Admin"]), async (req, res) => {
  const role = await Role.create({ name: req.body.name });
  res.status(201).json(role);
});

// READ all roles
router.get("/", authenticate, authorize(["Admin"]), async (req, res) => {
  const roles = await Role.findAll();
  res.json(roles);
});

// UPDATE role
router.put("/:id", authenticate, authorize(["Admin"]), async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) return res.status(404).json({ error: "Role not found" });
  role.name = req.body.name;
  await role.save();
  res.json(role);
});

// DELETE role
router.delete("/:id", authenticate, authorize(["Admin"]), async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) return res.status(404).json({ error: "Role not found" });
  await role.destroy();
  res.json({ message: "Role deleted" });
});

export default router;

