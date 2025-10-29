import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";

const router = express.Router();
router.use(authenticate);

router.post("/start-mining", async (req: Request, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // ❌ Prevent starting if already mining
  if (user.isMining) {
    return res.status(400).json({
      success: false,
      message: "Mining already in progress",
    });
  }

  // ❌ Prevent starting if vault is full
  if (user.tempCoins >= user.vaultCapacity) {
    return res.status(403).json({
      success: false,
      message: "Vault is full. Please collect your coins first.",
    });
  }

  // ❌ Prevent starting if energy is 0
  if (user.currentEnergy <= 0) {
    return res.status(403).json({
      success: false,
      message:
        "You cannot start mining — energy is depleted. Please recover energy first.",
    });
  }

  // ❌ Prevent starting if health is 0
  if (user.currentHealth <= 0) {
    return res.status(403).json({
      success: false,
      message:
        "You cannot start mining — your health is 0. Revive before mining again.",
    });
  }

  // ✅ Start mining
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
      message: "Mining has not started. Please call /start-mining first.",
    });
  }

  const now = new Date();
  const elapsedSeconds = (now.getTime() - user.lastMiningTick.getTime()) / 1000;

  // Calculate time until each limit is reached
  const secondsToVaultFull =
    (user.vaultCapacity - user.tempCoins) / user.miningRate;
  const secondsToEnergyDepletion = user.currentEnergy / user.energyPerSecond;
  const secondsToHealthDepletion = user.currentHealth / user.healthPerSecond;

  // Mining stops when any of these limits is reached
  const maxMiningSeconds = Math.min(
    secondsToVaultFull,
    secondsToEnergyDepletion,
    secondsToHealthDepletion
  );

  // Limit actual elapsed time
  const actualMiningSeconds = Math.min(elapsedSeconds, maxMiningSeconds);

  // Calculate mining results
  const minedCoins = actualMiningSeconds * user.miningRate;
  const elapsedEnergy = actualMiningSeconds * user.energyPerSecond;
  const elapsedHealth = actualMiningSeconds * user.healthPerSecond;

  // New values after mining
  let newTempCoins = Math.min(user.tempCoins + minedCoins, user.vaultCapacity);
  let newEnergy = Math.max(user.currentEnergy - elapsedEnergy, 0);
  let newHealth = Math.max(user.currentHealth - elapsedHealth, 0);

  // Determine stop condition
  let shouldStopMining = false;
  let message = "Mining progress synced";

  // ✅ Case 1: Energy Depleted → Stop mining
  if (newEnergy <= 0) {
    shouldStopMining = true;
    message = "Mining stopped: Energy depleted";
  }

  // ✅ Case 2: Health Depleted → Burn all temporary coins and stop
  if (newHealth <= 0) {
    shouldStopMining = true;
    newTempCoins = 0; // burn everything
    message = "Mining stopped: Health depleted — all temporary coins burned";
  }

  // ✅ Case 3: Vault full → Stop mining
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
    data: updatedUser,
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

  // ❌ Prevent collecting if health is zero
  if (user.currentHealth <= 0) {
    return res.status(403).json({
      success: false,
      message:
        "You cannot collect coins — your health is depleted and all temporary coins have burned.",
    });
  }

  // ❌ Prevent collecting if no coins available
  if (user.tempCoins <= 0) {
    return res.status(403).json({
      success: false,
      message: "No coins to collect.",
    });
  }

  // ✅ Require minimum coins to collect
  if (user.tempCoins < user.vaultCapacity * 0.1) {
    return res.status(403).json({
      success: false,
      message:
        "Insufficient funds: Your temporary coins must be at least 10% of your vault capacity to collect.",
    });
  }

  // ✅ Prevent overflow collection
  if (user.tempCoins > user.vaultCapacity) {
    return res.status(403).json({
      success: false,
      message:
        "Vault capacity exceeded: Temporary coins cannot exceed maximum vault capacity.",
    });
  }

  const tempCoins = user.tempCoins;

  // ✅ Stop mining before collecting
  let updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      coins: user.coins + tempCoins,
      tempCoins: 0,
      isMining: false, // stop mining before collection
    },
  });

  // ✅ Optional: auto-restart mining
  const AUTO_RESTART_MINING = true;
  if (AUTO_RESTART_MINING) {
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
    data: updatedUser,
  });
});

export default router;
