import prisma from "../prisma";
import { REFERRAL_REWARDS } from "../config/game";

export async function checkAndRewardReferrer(userId: number, newLevel: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  });

  if (!user?.referredById) return;

  const rewardAmount =
    REFERRAL_REWARDS[newLevel as keyof typeof REFERRAL_REWARDS];
  if (!rewardAmount) return;

  await prisma.user.update({
    where: { id: user.referredById },
    data: {
      coins: { increment: rewardAmount },
    },
  });

  console.log(
    `Referral reward: User ${user.referredById} earned ${rewardAmount} coins because referral ${userId} reached level ${newLevel}`
  );
}
