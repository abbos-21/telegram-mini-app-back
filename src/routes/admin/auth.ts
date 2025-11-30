import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../../prisma";
import { ADMIN_JWT_SECRET } from "../../config/env";
import { requireAdmin } from "../../middleware/admin-auth";

const router = express.Router();

function generateToken(id: number) {
  return jwt.sign({ adminId: id }, ADMIN_JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", requireAdmin, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "A username and password are both required" });
  }

  const exists = await prisma.admin.findUnique({ where: { username } });
  if (exists) return res.status(400).json({ error: "Username already used" });

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: { username, password: hashed },
  });

  return res.json({ token: generateToken(admin.id) });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return res.status(400).json({ error: "Invalid login" });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(400).json({ error: "Invalid login" });

  return res.json({ token: generateToken(admin.id) });
});

router.get("/me", requireAdmin, async (req: any, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.adminId },
    select: { id: true, username: true, createdAt: true },
  });

  res.json(admin);
});

export default router;
