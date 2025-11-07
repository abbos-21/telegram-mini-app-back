import express, { Request, Response } from "express";
import prisma from "../prisma";
import { HEALTH_REWARD_SECRET, ENERGY_REWARD_SECRET } from "../config/env";

const router = express.Router();

router.get(`/${HEALTH_REWARD_SECRET}`, async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "Missing userId parameter" });

    const user = await prisma.user.findUnique({
      where: { telegramId: String(userId) },
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { currentHealth: user.maxHealth },
    });

    return res.status(200).json({
      success: true,
      message: "Operation successful",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Health reward error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get(`/${ENERGY_REWARD_SECRET}`, async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "Missing userId parameter" });

    const user = await prisma.user.findUnique({
      where: { telegramId: String(userId) },
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { currentEnergy: user.maxEnergy },
    });

    return res.status(200).json({
      success: true,
      message: "Operation successful",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Energy reward error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
