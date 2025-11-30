import prisma from "../prisma";
// import { REFERRAL_REWARDS } from "../config/game";
import { getSettings } from "../config/settings";

export async function checkAndRewardReferrer(userId: number, newLevel: number) {
  if (newLevel < 2) return;

  const settings = await getSettings();
  const REFERRAL_REWARDS = settings.REFERRAL_REWARDS;

  const referralUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true, rewardedLevels: true },
  });

  if (!referralUser?.referredById) return;

  let rewardedLevels: number[] = [];
  try {
    rewardedLevels = JSON.parse(referralUser.rewardedLevels || "[]");
  } catch {
    rewardedLevels = [];
  }

  if (rewardedLevels.includes(newLevel)) return;

  const rewardAmount =
    REFERRAL_REWARDS[newLevel as keyof typeof REFERRAL_REWARDS];
  if (!rewardAmount) return;

  await prisma.user.update({
    where: { id: referralUser.referredById },
    data: {
      coins: { increment: rewardAmount },
      totalCoins: { increment: rewardAmount },
      referralEarnings: { increment: rewardAmount },
    },
  });

  rewardedLevels.push(newLevel);

  await prisma.user.update({
    where: { id: userId },
    data: { rewardedLevels: JSON.stringify(rewardedLevels) },
  });
}
