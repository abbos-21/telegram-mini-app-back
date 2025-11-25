import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import {
  COIN_TO_TON_RATE,
  MAXIMUM_COIN_WITHDRAWAL,
  MINIMUM_COIN_WITHDRAWAL,
} from "../config/game";
import { sendTonTransaction } from "../services/tonService";
import { bot } from "../bot";
import { getRealIp } from "../lib/ip";

const router = express.Router();
router.use(authenticate);

router.get("/data", async (req: Request, res: Response) => {
  try {
    const withdrawalData = {
      rate: COIN_TO_TON_RATE,
      min: MINIMUM_COIN_WITHDRAWAL,
      max: MAXIMUM_COIN_WITHDRAWAL,
    };

    return res.status(200).json({
      success: true,
      data: { ...withdrawalData },
    });
  } catch (error) {
    console.error("Withdrawal data error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.user.id },
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

    return res.status(200).json({
      success: true,
      data: { withdrawals },
    });
  } catch (error) {
    console.error("Withdrawal history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const clientIp = getRealIp(req);
    const userId = req.user?.id;
    const { targetAddress, amountCoins } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!targetAddress || !amountCoins)
      return res.status(400).json({
        success: false,
        message: "Missing targetAddress or amountCoins",
      });

    if (amountCoins < MINIMUM_COIN_WITHDRAWAL)
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ${MINIMUM_COIN_WITHDRAWAL} coins`,
      });

    if (amountCoins > MAXIMUM_COIN_WITHDRAWAL)
      return res.status(400).json({
        success: false,
        message: `Maximum withdrawal is ${MAXIMUM_COIN_WITHDRAWAL} coins`,
      });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.coins < amountCoins)
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });

    const amountTon = amountCoins / COIN_TO_TON_RATE;

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amountCoins,
        amountTon,
        targetAddress,
        status: "PENDING",
      },
    });

    try {
      const date = new Date();
      await sendTonTransaction(targetAddress, amountTon);

      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "COMPLETED", createdAt: date },
      });

      const user = await prisma.user.update({
        where: { id: userId },
        data: { coins: { decrement: amountCoins } },
      });

      bot.telegram.sendMessage(
        user.telegramId,
        `Withdrawal of <code>${amountTon.toFixed(
          2
        )}</code> TON to <code>${targetAddress}</code> successful.`,
        { parse_mode: "HTML" }
      );

      await prisma.action.create({
        data: {
          userId: userId,
          type: "WITHDRAW",
          ip: clientIp,
          data: JSON.stringify({ amountTon, targetAddress }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Withdrawal completed successfully",
        data: { amountTon, targetAddress },
      });
    } catch (txError: any) {
      console.error("TON transaction failed:", txError);

      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
          errorMessage: txError?.message ?? "Unknown TON transaction error",
        },
      });

      return res.status(500).json({
        success: false,
        message: "TON transaction failed",
        error: txError?.message,
      });
    }
  } catch (error) {
    console.error("Withdrawal request error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
