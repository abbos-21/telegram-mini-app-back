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

const router = express.Router();
router.use(authenticate);

const error = (res: Response, status: number, msg: string) =>
  res.status(status).json({ success: false, message: msg });

router.post("/start-mining", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  let user = await prisma.user.findUnique({ where: { id } });
  if (!user) return error(res, 404, "User not found");
  if (user.isMining) return error(res, 400, "Already mining");
  if (!user.currentHealth && user.tempCoins)
    user = await prisma.user.update({ where: { id }, data: { tempCoins: 0 } });
  if (user.tempCoins >= user.vaultCapacity)
    return error(res, 403, "Vault full");
  if (user.currentEnergy <= 0) return error(res, 403, "No energy");
  if (user.currentHealth <= 0) return error(res, 403, "No health");

  const updated = await prisma.user.update({
    where: { id },
    data: { lastMiningTick: new Date(), isMining: true },
  });
  res.json({
    success: true,
    message: "Mining started",
    data: { user: updated },
  });
});

router.post("/sync", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return error(res, 404, "User not found");
  if (!user.isMining || !user.lastMiningTick)
    return error(res, 409, "Not mining");

  const now = new Date();
  const elapsed = (now.getTime() - user.lastMiningTick.getTime()) / 1000;
  const vaultTime = (user.vaultCapacity - user.tempCoins) / user.miningRate;
  const energyTime = user.currentEnergy / user.energyPerSecond;
  const healthTime = user.currentHealth / user.healthPerSecond;
  const activeSeconds = Math.min(elapsed, vaultTime, energyTime, healthTime);

  const mined = activeSeconds * user.miningRate;
  const newTemp = Math.min(user.tempCoins + mined, user.vaultCapacity);
  const newEnergy = Math.max(
    user.currentEnergy - activeSeconds * user.energyPerSecond,
    0
  );
  const newHealth = Math.max(
    user.currentHealth - activeSeconds * user.healthPerSecond,
    0
  );

  let stop = false;
  let msg = "Synced";

  if (newEnergy <= 0) {
    stop = true;
    msg = "Energy 0";
  }
  if (newHealth <= 0) {
    stop = true;
    msg = "Health 0, coins burned";
  }
  if (newTemp >= user.vaultCapacity) {
    stop = true;
    msg = "Vault full";
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      tempCoins: newHealth <= 0 ? 0 : newTemp,
      currentEnergy: newEnergy,
      currentHealth: newHealth,
      lastMiningTick: now,
      isMining: !stop,
    },
  });

  res.json({ success: true, message: msg, data: { user: updated } });
});

router.post("/collect-coins", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  let user = await prisma.user.findUnique({ where: { id } });
  if (!user) return error(res, 404, "User not found");
  if (user.currentHealth <= 0)
    return error(res, 403, "Health 0 — coins burned");
  if (user.tempCoins <= 0) return error(res, 403, "No coins");
  if (user.tempCoins < user.vaultCapacity * 0.1)
    return error(res, 403, "Need ≥10% vault");
  if (user.tempCoins > user.vaultCapacity)
    return error(res, 403, "Vault overflow");

  const temp = user.tempCoins;
  user = await prisma.user.update({
    where: { id },
    data: {
      coins: user.coins + temp,
      totalCoins: user.totalCoins + temp,
      tempCoins: 0,
      isMining: false,
    },
  });

  if (user.currentEnergy < user.maxEnergy * 0.005)
    user = await prisma.user.update({
      where: { id },
      data: { currentEnergy: 0 },
    });
  if (user.currentHealth < user.maxHealth * 0.005)
    user = await prisma.user.update({
      where: { id },
      data: { currentHealth: 0 },
    });

  if (user.currentEnergy && user.currentHealth)
    user = await prisma.user.update({
      where: { id },
      data: { isMining: true, lastMiningTick: new Date() },
    });

  res.json({
    success: true,
    message: `+${temp.toFixed(2)} coins`,
    data: { user, coinsCollected: temp },
  });
});

router.post("/stop-mining", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  const user = await prisma.user.update({
    where: { id },
    data: { isMining: false },
  });
  res.json({ success: true, message: "Stopped", data: { user } });
});

router.post("/recover-energy", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return error(res, 404, "User not found");
  if (user.coins < ENERGY_PRICE) return error(res, 403, "Not enough coins");
  if (user.currentEnergy === user.maxEnergy)
    return error(res, 403, "Full energy");

  const updated = await prisma.user.update({
    where: { id },
    data: { currentEnergy: user.maxEnergy, coins: user.coins - ENERGY_PRICE },
  });

  res.json({
    success: true,
    message: "Energy recovered",
    data: { user: updated },
  });
});

router.post("/recover-health", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return error(res, 404, "User not found");
  if (user.coins < HEALTH_PRICE) return error(res, 403, "Not enough coins");
  if (user.currentHealth === user.maxHealth)
    return error(res, 403, "Full health");

  const updated = await prisma.user.update({
    where: { id },
    data: { currentHealth: user.maxHealth, coins: user.coins - HEALTH_PRICE },
  });

  res.json({
    success: true,
    message: "Health recovered",
    data: { user: updated },
  });
});

router.post("/spin-wheel", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return error(res, 404, "User not found");

  const now = new Date();
  if (user.lastWheelSpin) {
    const hours = (now.getTime() - +new Date(user.lastWheelSpin)) / 3600000;
    if (hours < SPIN_WHEEL_COOLDOWN_HOURS) {
      const rem = SPIN_WHEEL_COOLDOWN_HOURS - hours;
      const h = Math.floor(rem);
      const m = Math.floor((rem - h) * 60);
      return error(res, 403, `Wait ${h}h ${m}m`);
    }
  }

  const prize = selectPrize(SPIN_WHEEL_PROBABILITY_DATA);
  const updated = await prisma.user.update({
    where: { id },
    data: { coins: user.coins + prize, lastWheelSpin: now },
  });

  res.json({
    success: true,
    message: `Won ${prize} coins`,
    data: { user: updated, prize },
  });
});

router.get("/spin-wheel/status", async (req: Request, res: Response) => {
  const id = req.user?.id;
  if (!id) return error(res, 401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return error(res, 404, "User not found");

  const now = new Date();
  let canSpin = true;
  let remMs = 0;

  if (user.lastWheelSpin) {
    const diff = now.getTime() - new Date(user.lastWheelSpin).getTime();
    const cooldown = SPIN_WHEEL_COOLDOWN_HOURS * 3600000;
    if (diff < cooldown) {
      canSpin = false;
      remMs = cooldown - diff;
    }
  }

  const hrs = remMs / 3600000;
  const h = Math.floor(hrs);
  const m = Math.floor((hrs - h) * 60);

  res.json({
    success: true,
    data: {
      canSpin,
      remaining: canSpin ? null : { hours: h, minutes: m, remainingHours: hrs },
      lastWheelSpin: user.lastWheelSpin,
    },
  });
});

export default router;
