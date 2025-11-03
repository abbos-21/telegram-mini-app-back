import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import { UPGRADABLES, UPGRADE_COSTS } from "../config/game";

const router = express.Router();
router.use(authenticate);

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
    details: "Increase coin storage to accumulate more before collecting.",
    effectLabel: "Capacity",
    unit: "coins",
  },
  work: {
    description: "Coin mining",
    details: "Increase mining speed to earn more coins per second.",
    effectLabel: "Income",
    unit: "coins/second",
  },
  food: {
    description: "Energy tank",
    details: "Increase Energy tank for longer work without refilling.",
    effectLabel: "Work time",
    unit: "min.",
  },
  immune: {
    description: "Immune strength",
    details: "Improve disease resistance. Higher level = fewer daily damages.",
    effectLabel: "Withstand diseases",
    unit: "HP",
  },
};

router.get("/status", async (req: Request, res: Response) => {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const maxLevel = 13;

  const status = Object.entries(upgradeMap).map(([name, meta]) => {
    const currentLevel = (user as any)[meta.levelField];
    const nextLevel = currentLevel + 1;
    const key = meta.key;
    const { description, details, effectLabel, unit } =
      upgradeDescriptions[name as keyof typeof upgradeDescriptions];

    let nextValue =
      nextLevel <= maxLevel ? (UPGRADABLES as any)[key][nextLevel] : null;
    const cost =
      nextLevel <= maxLevel ? (UPGRADE_COSTS as any)[key][currentLevel] : null;

    let currentValue = (user as any)[meta.valueField];

    if (name === "food" || name === "immune") {
      currentValue = Math.round(currentValue / 60);
      if (nextValue) nextValue = Math.round(nextValue / 60);
    }

    let effect = nextValue
      ? `${effectLabel}: ${currentValue} -> ${nextValue} ${unit || ""}`
      : `${effectLabel}: Max level reached`;

    return {
      name,
      level: currentLevel,
      maxLevel,
      cost,
      canUpgrade: nextLevel <= maxLevel,
      effect,
      description,
      details,
    };
  });

  return res.status(200).json({
    success: true,
    data: { status },
  });
});

router.post("/:name", async (req: Request, res: Response) => {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const { name } = req.params;
  const meta = upgradeMap[name as keyof typeof upgradeMap];
  if (!meta)
    return res
      .status(400)
      .json({ success: false, message: "Invalid upgrade name" });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const currentLevel = (user as any)[meta.levelField];
  const nextLevel = currentLevel + 1;
  const maxLevel = 13;

  if (currentLevel >= maxLevel) {
    return res
      .status(403)
      .json({ success: false, message: "Already at max level" });
  }

  const key = meta.key;
  const cost =
    nextLevel <= maxLevel ? (UPGRADE_COSTS as any)[key][nextLevel] : null;

  if (cost === null) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Invalid upgrade cost or max level reached",
      });
  }

  if (user.coins < cost) {
    return res
      .status(403)
      .json({ success: false, message: "Not enough coins to upgrade" });
  }

  const newValue = (UPGRADABLES as any)[key][nextLevel];
  const data: any = {
    coins: user.coins - cost,
    [meta.levelField]: nextLevel,
    [meta.valueField]: newValue,
  };

  if (name === "food") data.currentEnergy = newValue;
  if (name === "immune") data.currentHealth = newValue;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return res.status(200).json({
    success: true,
    message: `${name} upgraded to level ${nextLevel}`,
    data: {
      user: updatedUser,
      spent: cost,
      newValue,
    },
  });
});

export default router;
