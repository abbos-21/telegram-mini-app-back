import express from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";

const router = express.Router();

router.use(authenticate);

router.get("/me", async (req, res) => {
  try {
    const user = (req as any).user;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        coins: true,
        tempCoins: true,
        level: true,
        lastMiningTick: true,
        createdAt: true,
        updatedAt: true,
        referredById: true,
      },
    });

    if (!dbUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: dbUser,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
