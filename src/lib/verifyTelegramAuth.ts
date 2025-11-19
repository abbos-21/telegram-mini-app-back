import { validate, parse } from "@tma.js/init-data-node";
import { BOT_TOKEN } from "../config/env";

export function verifyTelegramAuth(initData: string): {
  valid: boolean;
  user?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    is_bot?: boolean;
    [key: string]: any;
  };
} {
  if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing in .env");
  }

  if (!initData || typeof initData !== "string") {
    return { valid: false };
  }

  try {
    validate(initData, BOT_TOKEN, {
      expiresIn: 3600,
    });

    const parsed = parse(initData);

    if (!parsed.user) {
      return { valid: false };
    }

    return {
      valid: true,
      user: parsed.user,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.warn("Telegram initData validation failed:", error.message);
    } else {
      console.error("Unexpected error during Telegram validation:", error);
    }

    return { valid: false };
  }
}
