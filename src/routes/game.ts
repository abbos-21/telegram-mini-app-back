import express from "express";
import prisma from "../prisma";
import { authMiddleware } from "../middleware/authMiddleware";
import { LEVEL_THRESHOLDS, REFERRAL_REWARDS } from "../config/game";
// import { emitTempCoinsUpdate } from "..";

const router = express.Router();

router.use(authMiddleware);

router.post("/mine", async (req, res) => {
  const authUser = (req as any).user;

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found." });

  const now = new Date();

  if (!user.miningStarted) {
    await prisma.user.update({
      where: { id: user.id },
      data: { miningStarted: now, lastMiningTick: now },
    });
    return res.json({
      success: true,
      data: {
        ...user,
        miningStarted: now,
        lastMiningTick: now,
        message: "Mining started!",
      },
    });
  }

  const lastTick = user.lastMiningTick || user.miningStarted;
  const elapsedSeconds = Math.floor(
    (now.getTime() - new Date(lastTick).getTime()) / 1000
  );

  if (elapsedSeconds <= 0) {
    return res.json({
      success: true,
      data: { ...user, message: "No new coins mined yet." },
    });
  }

  let tempCoins = user.tempCoins;
  const maxCapacity = user.vaultCapacity;

  if (tempCoins >= maxCapacity) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastMiningTick: now,
      },
    });
    return res.json({
      success: true,
      data: {
        ...user,
        vaultFull: true,
        message: "Vault is full! Collect to continue mining.",
      },
    });
  }

  const userMiningRate = user.miningRate;

  const potentialMined = elapsedSeconds * userMiningRate;

  const mined = Math.min(potentialMined, maxCapacity - tempCoins);
  tempCoins += mined;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      tempCoins,
      lastMiningTick: now,
    },
  });

  // let counter = 0;

  // setInterval(() => {
  //   counter += 3;

  //   emitTempCoinsUpdate(updatedUser.id, counter);
  // }, 1000);
  // emitTempCoinsUpdate(updatedUser.id, updatedUser.tempCoins);

  return res.json({
    success: true,
    data: {
      ...updatedUser,
      mined,
      vaultFull: tempCoins >= maxCapacity,
      message: `Mined ${mined.toFixed(4)} new coins.`,
    },
  });
});

router.post("/collect", async (req, res) => {
  const authUser = (req as any).user;
  const user = await prisma.user.findUnique({ where: { id: authUser.id } });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  if (user.tempCoins < user.vaultCapacity) {
    return res.json({ success: false, message: "No coins to collect." });
  }

  const collected = user.tempCoins;
  let totalCoins = user.coins + collected;
  let newLevel = user.level;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalCoins >= (LEVEL_THRESHOLDS[i] ?? 0)) {
      newLevel = i + 1;
      break;
    }
  }

  if (newLevel > user.level && user.referredById) {
    const referrer = await prisma.user.findUnique({
      where: { id: user.referredById },
    });

    if (referrer) {
      const reward =
        REFERRAL_REWARDS[newLevel as keyof typeof REFERRAL_REWARDS] || 0;

      if (reward > 0) {
        await prisma.user.update({
          where: { id: referrer.id },
          data: { coins: { increment: reward } },
        });
      }
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      coins: totalCoins,
      tempCoins: 0,
      level: newLevel,
      lastMiningTick: new Date(),
    },
  });

  res.json({
    success: true,
    data: {
      updatedUser,
      collected,
      message: `Collected ${collected.toFixed(4)} coins.`,
    },
  });
});

export default router;
