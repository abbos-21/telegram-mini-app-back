import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import { BOT_USERNAME } from "../config/env";
import { REFERRAL_REWARDS } from "../config/game";

const router = express.Router();

router.use(authenticate);

router.get("/me", async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!dbUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: {
        user: dbUser,
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/invite-link", async (req: Request, res: Response) => {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const referralCode = `ref_${req.user.id}`;
  const link = `https://t.me/${BOT_USERNAME}?startapp=${referralCode}`;

  return res.status(200).json({
    success: true,
    data: { link },
  });
});

router.get("/referrals", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrals = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        level: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const { referralEarnings } = (await prisma.user.findUnique({
      where: { id: userId },
      select: { referralEarnings: true },
    })) || { referralEarnings: 0 };

    return res.json({
      success: true,
      data: {
        count: referrals.length,
        referralEarnings,
        referralRewards: REFERRAL_REWARDS,
        referrals,
      },
    });
  } catch (error) {
    console.error("Get referrals error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
