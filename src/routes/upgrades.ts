import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import {
  UPGRADABLES,
  UPGRADABLES_MAX_LEVEL,
  UPGRADE_COSTS,
} from "../config/game";

const router = express.Router();
router.use(authenticate);

const err = (res: Response, status: number, msg: string) =>
  res.status(status).json({ success: false, message: msg });

const upgradeMap = {
  wealth: {
    key: "vaultCapacity",
    levelField: "vaultLevel",
    valueField: "vaultCapacity",
  },
  work: {
    key: "miningRate",
    levelField: "miningRateLevel",
    valueField: "miningRate",
  },
  food: {
    key: "maxEnergy",
    levelField: "energyLevel",
    valueField: "maxEnergy",
  },
  immune: {
    key: "maxHealth",
    levelField: "healthLevel",
    valueField: "maxHealth",
  },
};

const upgradeDescriptions = {
  wealth: {
    description: "Coin capacity",
    details: "Store more before collecting.",
    effectLabel: "Capacity",
    unit: "coins",
  },
  work: {
    description: "Coin mining",
    details: "Earn more per second.",
    effectLabel: "Income",
    unit: "coins/s",
  },
  food: {
    description: "Energy tank",
    details: "Work longer before refill.",
    effectLabel: "Work time",
    unit: "min",
  },
  immune: {
    description: "Immune strength",
    details: "Resist more damage.",
    effectLabel: "Durability",
    unit: "HP",
  },
};

router.get("/status", async (req, res) => {
  const id = req.user?.id;
  if (!id) return err(res, 401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return err(res, 404, "User not found");

  const status = Object.entries(upgradeMap).map(([name, meta]) => {
    const current = (user as any)[meta.levelField];
    const next = current + 1;
    const key = meta.key;
    const { description, details, effectLabel, unit } =
      upgradeDescriptions[name as keyof typeof upgradeDescriptions];
    let nextValue =
      next <= UPGRADABLES_MAX_LEVEL ? (UPGRADABLES as any)[key][next] : null;
    const cost =
      next <= UPGRADABLES_MAX_LEVEL
        ? (UPGRADE_COSTS as any)[key][current]
        : null;
    let currentValue = (user as any)[meta.valueField];
    if (name === "food" || name === "immune") {
      currentValue = Math.round(currentValue / 60);
      if (nextValue) nextValue = Math.round(nextValue / 60);
    }
    const effect = nextValue
      ? `${effectLabel}: ${currentValue} → ${nextValue} ${unit}`
      : `${effectLabel}: Max level`;
    return {
      name,
      level: current,
      UPGRADABLES_MAX_LEVEL,
      cost,
      canUpgrade: next <= UPGRADABLES_MAX_LEVEL,
      effect,
      description,
      details,
    };
  });

  res.json({ success: true, data: { status } });
});

router.post("/:name", async (req, res) => {
  const id = req.user?.id;
  if (!id) return err(res, 401, "Unauthorized");

  const { name } = req.params;
  const meta = upgradeMap[name as keyof typeof upgradeMap];
  if (!meta) return err(res, 400, "Invalid upgrade");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return err(res, 404, "User not found");

  const current = (user as any)[meta.levelField];
  const next = current + 1;

  if (current >= UPGRADABLES_MAX_LEVEL) return err(res, 403, "Max level");

  const key = meta.key;
  const costs = (UPGRADE_COSTS as any)[key];
  const upgrades = (UPGRADABLES as any)[key];
  if (!costs || !upgrades) return err(res, 500, "Config error");

  const cost = costs[current];
  const newValue = upgrades[next];
  if (user.coins < cost) return err(res, 403, "Not enough coins");

  const data: any = {
    coins: user.coins - cost,
    [meta.levelField]: next,
    [meta.valueField]: newValue,
  };
  if (name === "food") data.currentEnergy = newValue;
  if (name === "immune") data.currentHealth = newValue;

  const updated = await prisma.user.update({ where: { id }, data });

  res.json({
    success: true,
    message: `${name} upgraded to L${next}`,
    data: { user: updated, spent: cost, newValue },
  });
});

export default router;
