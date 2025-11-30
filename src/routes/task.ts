import express, { Request, Response } from "express";
import prisma from "../prisma";
import { authenticate } from "../middleware/authenticate";
import { checkIfUserIsSubscribed } from "../bot/helperFunctions";
import { getSettings } from "../config/settings";
// import { CHANNELS, REWARD_FOR_SUBSCRIPTION } from "../config/game";

const router = express.Router();
router.use(authenticate);

router.post("/check-subscription", async (req: Request, res: Response) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { channelUsername } = req.body;

    if (!channelUsername) {
      return res
        .status(400)
        .json({ success: false, message: "Channel not specified" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const settings = await getSettings();
    const REWARD_FOR_SUBSCRIPTION = settings.REWARD_FOR_SUBSCRIPTION;

    const isSubscribed = await checkIfUserIsSubscribed(
      user.telegramId,
      channelUsername
    );

    if (!isSubscribed) {
      return res.status(400).json({
        success: false,
        message: "You are not subscribed to the channel",
      });
    }

    const userSubscriptionsArray = JSON.parse(user.subscriptions);
    userSubscriptionsArray.push(channelUsername);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        coins: { increment: REWARD_FOR_SUBSCRIPTION },
        subscriptions: JSON.stringify(userSubscriptionsArray),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Nice job! Successfully received ${REWARD_FOR_SUBSCRIPTION} coins`,
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const settings = await getSettings();
    const CHANNELS = settings.CHANNELS;

    const userSubscriptionsArray = JSON.parse(user.subscriptions);
    const userSubscriptionsArraySet = new Set(userSubscriptionsArray);
    const tasks = CHANNELS.filter(
      (item) => !userSubscriptionsArraySet.has(item)
    );

    return res.status(200).json({
      success: true,
      data: {
        tasks: tasks,
      },
    });
  } catch (error) {
    console.error("Error getting tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/all", async (req: Request, res: Response) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const userSubscriptionsArray = JSON.parse(user.subscriptions);

    return res.status(200).json({
      success: true,
      data: {
        tasks: userSubscriptionsArray,
      },
    });
  } catch (error) {
    console.error("Error getting all tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
