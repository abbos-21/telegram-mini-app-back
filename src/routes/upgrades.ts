import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import { UPGRADABLES, UPGRADE_COSTS } from "../config/game";

const router = express.Router();
router.use(authenticate);

const upgradeFields = {
  vaultCapacity: {
    levelField: "vaultLevel",
    valueField: "vaultCapacity",
  },
  miningRate: {
    levelField: "miningRateLevel",
    valueField: "miningRate",
  },
  maxEnergy: {
    levelField: "energyLevel",
    valueField: "maxEnergy",
  },
  maxHealth: {
    levelField: "healthLevel",
    valueField: "maxHealth",
  },
};

router.get("/status", async (req: Request, res: Response) => {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const status = Object.entries(upgradeFields).map(([key, meta]) => {
    const level = (user as any)[meta.levelField];
    const nextLevel = level + 1;
    const maxLevel = 13;

    return {
      type: key,
      currentLevel: level,
      currentValue: (user as any)[meta.valueField],
      nextValue:
        nextLevel <= maxLevel ? (UPGRADABLES as any)[key][nextLevel] : null,
      upgradeCost:
        nextLevel <= maxLevel ? (UPGRADE_COSTS as any)[key][nextLevel] : null,
      canUpgrade: nextLevel <= maxLevel,
    };
  });

  return res.status(200).json({
    success: true,
    data: { status },
  });
});

router.post("/:type", async (req: Request, res: Response) => {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const { type } = req.params;
  const meta = upgradeFields[type as keyof typeof upgradeFields];

  if (!meta)
    return res
      .status(400)
      .json({ success: false, message: "Invalid upgrade type" });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const currentLevel = (user as any)[meta.levelField];
  const nextLevel = currentLevel + 1;
  const maxLevel = 13;

  if (currentLevel >= maxLevel) {
    return res.status(403).json({
      success: false,
      message: "Already at max level",
    });
  }

  const cost = (UPGRADE_COSTS as any)[type][nextLevel];
  if (user.coins < cost) {
    return res.status(403).json({
      success: false,
      message: "Not enough coins to upgrade",
    });
  }

  const newValue = (UPGRADABLES as any)[type][nextLevel];

  const data: any = {
    coins: user.coins - cost,
  };
  data[meta.levelField] = nextLevel;
  data[meta.valueField] = newValue;

  if (type === "maxEnergy") {
    data.currentEnergy = newValue;
  }

  if (type === "maxHealth") {
    data.currentHealth = newValue;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return res.status(200).json({
    success: true,
    message: `${type} upgraded to level ${nextLevel}`,
    data: { user: updatedUser, spent: cost, newValue },
  });
});

export default router;
