import { bot } from ".";
import { CHANNELS } from "../config/game";
import prisma from "../prisma";

export async function checkIfBotIsAdmin(): Promise<boolean> {
  const botId = (await bot.telegram.getMe()).id;
  const failures: string[] = [];

  for (const channel of CHANNELS) {
    try {
      const member = await bot.telegram.getChatMember(channel, botId);
      if (!["administrator", "creator"].includes(member.status)) {
        failures.push(`${channel}: '${member.status}'`);
      }
    } catch (err: any) {
      failures.push(`${channel}: ${err.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Bot is not an admin in the following channels:");
    failures.forEach((f) => console.error(` - ${f}`));
    return false;
  }

  return true;
}

export async function checkIfUserIsSubscribed(
  telegramId: string,
  channelUsername: string
): Promise<boolean> {
  const isBotAdmin = await checkIfBotIsAdmin();
  if (!isBotAdmin) return false;

  try {
    const member = await bot.telegram.getChatMember(
      channelUsername,
      Number(telegramId)
    );

    const subscribedStatuses = ["member", "administrator", "creator"] as const;
    const isSubscribed = subscribedStatuses.includes(member.status as any);

    return isSubscribed;
  } catch (err: any) {
    console.warn(
      `Failed to check subscription for user ${telegramId} in ${channelUsername}: ${err.message}`
    );
    return false;
  }
}

export async function sendMessageToAllBotUsers(message: string) {
  const users = await prisma.user.findMany({ select: { telegramId: true } });

  for (const user of users) {
    const targetId = user.telegramId;

    try {
      await bot.telegram.sendMessage(targetId, message);

      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error: any) {
      console.log(`⚠️ Failed to send to ${targetId}:`, error.message);
    }
  }

  console.log("--- Broadcast Complete ---");
}
