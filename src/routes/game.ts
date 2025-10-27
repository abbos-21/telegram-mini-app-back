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

  if (user.health <= 0) {
    if (user.tempCoins > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tempCoins: 0, miningStarted: null, lastMiningTick: null },
      });
    }
    return res.json({
      success: false,
      message:
        "Your health reached 0! All mined coins are lost and mining stopped.",
      data: {
        ...user,
      },
    });
  }

  if (user.energy <= 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { miningStarted: null, lastMiningTick: null },
    });
    return res.json({
      success: false,
      message: "Your energy is 0! Mining stopped. Please recharge energy.",
      data: {
        ...user,
      },
    });
  }

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
      data: { lastMiningTick: now },
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

  const mined = Math.min(
    elapsedSeconds * user.miningRate,
    maxCapacity - tempCoins
  );
  tempCoins += mined;

  const energyLoss = elapsedSeconds / 60;
  const healthLoss = elapsedSeconds / 90;

  let newEnergy = Math.max(0, user.energy - energyLoss);
  let newHealth = Math.max(0, user.health - healthLoss);

  let miningStopped = false;
  let burnedCoins = false;

  // If health hits 0 → burn coins and stop mining
  if (newHealth <= 0) {
    tempCoins = 0;
    miningStopped = true;
    burnedCoins = true;
  }

  // If energy hits 0 → stop mining
  if (newEnergy <= 0) {
    miningStopped = true;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      tempCoins,
      lastMiningTick: now,
      energy: newEnergy,
      health: newHealth,
      ...(miningStopped ? { miningStarted: null } : {}),
    },
  });

  if (burnedCoins) {
    return res.json({
      success: false,
      message:
        "Health dropped to 0! Your mined coins were lost and mining stopped.",
      data: updatedUser,
    });
  }

  if (miningStopped) {
    return res.json({
      success: false,
      message: "Energy depleted! Mining stopped.",
      data: updatedUser,
    });
  }

  return res.json({
    success: true,
    data: {
      ...updatedUser,
      mined,
      vaultFull: tempCoins >= maxCapacity,
      message: `Mined ${mined.toFixed(4)} coins. Energy: ${newEnergy.toFixed(
        1
      )}, Health: ${newHealth.toFixed(1)}`,
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
