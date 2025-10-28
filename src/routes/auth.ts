import express from "express";
import jwt from "jsonwebtoken";
import { verifyTelegramAuth } from "../lib/verifyTelegramAuth";
import prisma from "../prisma";
import { JWT_SECRET } from "../config/env";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { initData, ref } = req.body;
    const { valid, user } = verifyTelegramAuth(initData);

    if (!valid || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Telegram data",
      });
    }

    const refId = ref;

    const referrer = refId
      ? await prisma.user.findUnique({ where: { telegramId: refId } })
      : null;

    const updateFields = {
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      username: user.username || null,
      languageCode: user.language_code || null,
      isBot: user.is_bot || false,
    };

    const dbUser = await prisma.user.upsert({
      where: { telegramId: String(user.id) },
      update: updateFields,
      create: {
        telegramId: String(user.id),
        ...updateFields,
        ...(referrer && { referredById: referrer.id }),
      },
    });

    const token = jwt.sign({ id: dbUser.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      success: true,
      data: { token, user: dbUser },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
