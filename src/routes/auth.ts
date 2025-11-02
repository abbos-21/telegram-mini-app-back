import express from "express";
import jwt from "jsonwebtoken";
import { verifyTelegramAuth } from "../lib/verifyTelegramAuth";
import prisma from "../prisma";
import { JWT_SECRET } from "../config/env";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("Auth request body:", req.body);
    const { initData, ref } = req.body;

    const { valid, user } = verifyTelegramAuth(initData);
    if (!valid || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Telegram data",
      });
    }

    let referredById: number | null = null;

    if (ref) {
      let referrer = null;

      if (ref.startsWith("ref_")) {
        const userId = parseInt(ref.replace("ref_", ""), 10);
        if (!isNaN(userId)) {
          referrer = await prisma.user.findUnique({ where: { id: userId } });
        }
      } else {
        referrer = await prisma.user.findUnique({
          where: { telegramId: String(ref) },
        });
      }

      if (referrer) {
        referredById = referrer.id;
      }
    }

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
        ...(referredById ? { referredById } : {}),
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
