import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import { sendTonTransaction, validateTonAddress } from "../services/tonService";
import { COIN_TO_TON_RATE, MINIMUM_COIN_WITHDRAWAL } from "../config/game";

const router = express.Router();

router.use(authenticate);

router.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountCoins: true,
        amountTon: true,
        targetAddress: true,
        status: true,
        txHash: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      data: { withdrawals },
    });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
