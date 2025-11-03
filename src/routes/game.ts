import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import {
  ENERGY_PRICE,
  HEALTH_PRICE,
  SPIN_WHEEL_PROBABILITY_DATA,
  SPIN_WHEEL_COOLDOWN_HOURS,
} from "../config/game";
import { selectPrize } from "../lib/selectPrize";
import { getLevelByCoins } from "../lib/levelUtils";
import { checkAndRewardReferrer } from "../lib/referralReward";

const router = express.Router();
router.use(authenticate);

router.post("/start-mining", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.isMining) {
    return res.status(400).json({
      success: false,
      message: "Mining already in progress",
    });
  }

  if (!user.currentHealth && user.tempCoins) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        tempCoins: 0,
      },
    });
  }

  if (user.tempCoins >= user.vaultCapacity) {
    return res.status(403).json({
      success: false,
      message: "Vault is full. Please collect your coins first",
    });
  }

  if (user.currentEnergy <= 0) {
    return res.status(403).json({
      success: false,
      message:
        "You cannot start mining — energy is depleted. Please recover energy first",
    });
  }

  if (user.currentHealth <= 0) {
    return res.status(403).json({
      success: false,
      message:
        "You cannot start mining — your health is 0. Revive before mining again",
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastMiningTick: new Date(),
      isMining: true,
    },
  });

  return res.status(200).json({
    success: true,
    message: "Mining started",
    data: { user: updatedUser },
  });
});

router.post("/sync", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!user.isMining || !user.lastMiningTick) {
    return res.status(409).json({
      success: false,
      message: "Mining has not started. Please call /start-mining first",
    });
  }

  const now = new Date();
  const elapsedSeconds = (now.getTime() - user.lastMiningTick.getTime()) / 1000;

  const secondsToVaultFull =
    (user.vaultCapacity - user.tempCoins) / user.miningRate;
  const secondsToEnergyDepletion = user.currentEnergy / user.energyPerSecond;
  const secondsToHealthDepletion = user.currentHealth / user.healthPerSecond;

  const maxMiningSeconds = Math.min(
    secondsToVaultFull,
    secondsToEnergyDepletion,
    secondsToHealthDepletion
  );

  const actualMiningSeconds = Math.min(elapsedSeconds, maxMiningSeconds);

  const minedCoins = actualMiningSeconds * user.miningRate;
  const elapsedEnergy = actualMiningSeconds * user.energyPerSecond;
  const elapsedHealth = actualMiningSeconds * user.healthPerSecond;

  let newTempCoins = Math.min(user.tempCoins + minedCoins, user.vaultCapacity);
  let newEnergy = Math.max(user.currentEnergy - elapsedEnergy, 0);
  let newHealth = Math.max(user.currentHealth - elapsedHealth, 0);

  let shouldStopMining = false;
  let message = "Mining progress synced";

  if (newEnergy <= 0) {
    shouldStopMining = true;
    message = "Mining stopped: Energy depleted";
  }

  if (newHealth <= 0) {
    shouldStopMining = true;
    newTempCoins = 0;
    message = "Mining stopped: Health depleted — all temporary coins burned";
  }

  if (newTempCoins >= user.vaultCapacity) {
    shouldStopMining = true;
    message = "Mining stopped: Vault full";
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      tempCoins: newTempCoins,
      currentEnergy: newEnergy,
      currentHealth: newHealth,
      lastMiningTick: now,
      isMining: !shouldStopMining,
    },
  });

  return res.status(200).json({
    success: true,
    message,
    data: {
      user: updatedUser,
    },
  });
});

router.post("/collect-coins", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.currentHealth <= 0) {
    return res.status(403).json({
      success: false,
      message:
        "You cannot collect coins — your health is depleted and all temporary coins have burned.",
    });
  }

  if (user.tempCoins <= 0) {
    return res.status(403).json({
      success: false,
      message: "No coins to collect.",
    });
  }

  if (user.tempCoins < user.vaultCapacity * 0.1) {
    return res.status(403).json({
      success: false,
      message:
        "Insufficient funds: Your temporary coins must be at least 10% of your vault capacity to collect.",
    });
  }

  if (user.tempCoins > user.vaultCapacity) {
    return res.status(403).json({
      success: false,
      message:
        "Vault capacity exceeded: Temporary coins cannot exceed maximum vault capacity.",
    });
  }

  const tempCoins = user.tempCoins;

  let updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      coins: user.coins + tempCoins,
      totalCoins: user.totalCoins + tempCoins,
      tempCoins: 0,
      isMining: false,
    },
  });

  const newLevel = getLevelByCoins(updatedUser.totalCoins);
  if (newLevel > updatedUser.level) {
    updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { level: newLevel },
    });

    await checkAndRewardReferrer(user.id, newLevel);
  }

  if (updatedUser.currentEnergy < updatedUser.maxEnergy * 0.005) {
    updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        currentEnergy: 0,
      },
    });
  }

  if (updatedUser.currentHealth < updatedUser.maxHealth * 0.005) {
    updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        currentHealth: 0,
      },
    });
  }

  if (updatedUser.currentEnergy && updatedUser.currentHealth) {
    updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isMining: true,
        lastMiningTick: new Date(),
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: `Collected ${tempCoins.toFixed(2)} coins`,
    data: {
      user: updatedUser,
      coinsCollected: tempCoins,
    },
  });
});

router.post("/stop-mining", async (req: Request, res: Response) => {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { isMining: false },
  });

  return res.status(200).json({
    success: true,
    message: "Mining stopped manually",
    data: {
      user: updatedUser,
    },
  });
});

router.post("/recover-energy", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.coins < ENERGY_PRICE) {
    return res.status(403).json({
      success: false,
      message: "Not enough coins",
    });
  }

  if (user.currentEnergy === user.maxEnergy) {
    return res.status(403).json({
      success: false,
      message: "You already have energy",
    });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      currentEnergy: user.maxEnergy,
      coins: user.coins - ENERGY_PRICE,
    },
  });

  return res.status(200).json({
    success: true,
    message: "Operation successful",
    data: {
      user: updatedUser,
    },
  });
});

router.post("/recover-health", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.coins < HEALTH_PRICE) {
    return res.status(403).json({
      success: false,
      message: "Not enough coins",
    });
  }

  if (user.currentHealth === user.maxHealth) {
    return res.status(403).json({
      success: false,
      message: "You're already healthy",
    });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      currentHealth: user.maxHealth,
      coins: user.coins - HEALTH_PRICE,
    },
  });

  return res.status(200).json({
    success: true,
    message: "Operation successful",
    data: {
      user: updatedUser,
    },
  });
});

router.post("/spin-wheel", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const now = new Date();

  if (user.lastWheelSpin) {
    const diffHours =
      (now.getTime() - new Date(user.lastWheelSpin).getTime()) / 1000 / 3600;

    if (diffHours < SPIN_WHEEL_COOLDOWN_HOURS) {
      const remaining = SPIN_WHEEL_COOLDOWN_HOURS - diffHours;
      const hours = Math.floor(remaining);
      const minutes = Math.floor((remaining - hours) * 60);

      return res.status(403).json({
        success: false,
        message: `You can spin again in ${hours}h ${minutes}m.`,
        data: { remainingHours: remaining },
      });
    }
  }

  const prize = selectPrize(SPIN_WHEEL_PROBABILITY_DATA);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      coins: user.coins + prize,
      lastWheelSpin: now,
    },
  });

  return res.status(200).json({
    success: true,
    message: `You won ${prize} coins!`,
    data: {
      user: updatedUser,
      prize,
    },
  });
});

router.get("/spin-wheel/status", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const now = new Date();
  let canSpin = true;
  let remainingMs = 0;

  if (user.lastWheelSpin) {
    const lastSpin = new Date(user.lastWheelSpin);
    const diffMs = now.getTime() - lastSpin.getTime();
    const cooldownMs = SPIN_WHEEL_COOLDOWN_HOURS * 3600 * 1000;

    if (diffMs < cooldownMs) {
      canSpin = false;
      remainingMs = cooldownMs - diffMs;
    }
  }

  const remainingHours = remainingMs / 3600000;
  const hours = Math.floor(remainingHours);
  const minutes = Math.floor((remainingHours - hours) * 60);

  return res.status(200).json({
    success: true,
    data: {
      canSpin,
      remaining: canSpin
        ? null
        : {
            hours,
            minutes,
            remainingHours,
          },
      lastWheelSpin: user.lastWheelSpin,
    },
  });
});

export default router;
