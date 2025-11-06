import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import { COIN_TO_TON_RATE, MINIMUM_COIN_WITHDRAWAL } from "../config/game";
import { sendTonTransaction } from "../services/tonService";

const router = express.Router();

router.use(authenticate);

/**
 * GET /withdrawals/history
 * Return user’s past withdrawals
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

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

    return res.json({ success: true, data: { withdrawals } });
  } catch (error) {
    console.error("Error fetching withdrawal history:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /withdrawals
 * Create a new withdrawal request and perform TON transfer
 */
router.post("/", async (req: Request, res: Response) => {
  try {
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

    // Fetch user
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

    // Convert coins to TON
    const amountTon = amountCoins / COIN_TO_TON_RATE;

    // Create pending withdrawal entry
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amountCoins,
        amountTon,
        targetAddress,
        status: "PENDING",
      },
    });

    // Try sending TON
    try {
      const { txHash } = await sendTonTransaction(
        targetAddress,
        amountTon,
        "Withdrawal from BrunoPlay"
      );

      // Update withdrawal as completed
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "COMPLETED",
          txHash,
        },
      });

      // Deduct user coins
      await prisma.user.update({
        where: { id: userId },
        data: { coins: { decrement: amountCoins } },
      });

      return res.json({
        success: true,
        message: "Withdrawal completed successfully",
        data: { amountTon, targetAddress },
      });
    } catch (txError: any) {
      console.error("Withdrawal transaction failed:", txError);

      // Update withdrawal with failure info
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
