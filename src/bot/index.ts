import { Telegraf } from "telegraf";
import { BOT_TOKEN, WEB_APP_URL } from "../config/env";

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing in .env");
}

export const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("👋 Welcome! Tap below to open the Mini App:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Open Mini App",
            web_app: { url: WEB_APP_URL },
          },
        ],
      ],
    },
  });
});

bot.command("help", (ctx) => ctx.reply("This bot powers the Mini App!"));
