import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import { sendTonTransaction, validateTonAddress } from "../services/tonService";
import { COIN_TO_TON_RATE, MINIMUM_COIN_WITHDRAWAL } from "../config/game";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /withdrawals
 * Body: { amountCoins: number, targetAddress: string }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { amountCoins, targetAddress } = req.body;

    // --- 1. Input Validation ---
    if (!amountCoins || !targetAddress) {
      return res.status(400).json({
        success: false,
        message: "Missing amountCoins or targetAddress",
      });
    }

    const coinAmountFloat = parseFloat(amountCoins);
    if (isNaN(coinAmountFloat) || coinAmountFloat <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coin amount" });
    }

    if (coinAmountFloat < MINIMUM_COIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ${MINIMUM_COIN_WITHDRAWAL} coins`,
      });
    }

    if (!validateTonAddress(targetAddress)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid TON address format" });
    }

    const tonAmount = coinAmountFloat / COIN_TO_TON_RATE;

    // --- 2. Atomic DB Transaction ---
    let newWithdrawal;
    try {
      newWithdrawal = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!user) throw new Error("User not found");
        if (user.coins < coinAmountFloat) throw new Error("Insufficient coins");

        // Deduct coins
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: coinAmountFloat } },
        });

        // Create withdrawal record
        return await tx.withdrawal.create({
          data: {
            userId,
            amountCoins: coinAmountFloat,
            amountTon: tonAmount,
            targetAddress,
            status: "PENDING",
          },
        });
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Transaction failed",
      });
    }

    // --- 3. Respond to client (queued) ---
    res.status(202).json({
      success: true,
      message: "Withdrawal initiated. It may take a few minutes.",
      data: { withdrawal: newWithdrawal },
    });

    // --- 4. Async payout (runs after response) ---
    try {
      const transfer = await sendTonTransaction({
        targetAddress,
        amountTon: tonAmount,
        message: `Withdrawal ID: ${newWithdrawal.id}`,
      });

      await prisma.withdrawal.update({
        where: { id: newWithdrawal.id },
        data: { status: "COMPLETED" },
      });
    } catch (error: any) {
      console.error(`Withdrawal ${newWithdrawal.id} FAILED:`, error.message);

      try {
        await prisma.$transaction(async (tx) => {
          await tx.withdrawal.update({
            where: { id: newWithdrawal.id },
            data: {
              status: "FAILED",
              errorMessage: error.message || "Unknown error",
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { coins: { increment: coinAmountFloat } },
          });
        });
        console.log(`Refunded ${coinAmountFloat} coins to user ${userId}`);
      } catch (refundError: any) {
        console.error(
          `CRITICAL: Failed to refund user ${userId} for withdrawal ${newWithdrawal.id}. Manual intervention required.`,
          refundError.message
        );
      }
    }
  } catch (error) {
    console.error("Withdrawal route error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// GET /withdrawals/history
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
