import "dotenv/config";
import {
  CHANNELS,
  COIN_TO_TON_RATE,
  ENERGY_PRICE,
  HEALTH_PRICE,
  MAXIMUM_COIN_WITHDRAWAL,
  MINIMUM_COIN_WITHDRAWAL,
  REFERRAL_REWARDS,
  REWARD_FOR_SUBSCRIPTION,
  SPIN_WHEEL_COOLDOWN_HOURS,
  SPIN_WHEEL_PROBABILITY_DATA,
  UPGRADABLES,
  UPGRADABLES_MAX_LEVEL,
  UPGRADE_COSTS,
} from "./config/game";
import prisma from "./prisma";

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      referralRewards: REFERRAL_REWARDS,
      spinWheelCooldownHours: SPIN_WHEEL_COOLDOWN_HOURS,
      spinWheelProbabilities: SPIN_WHEEL_PROBABILITY_DATA,

      energyPrice: ENERGY_PRICE,
      healthPrice: HEALTH_PRICE,

      upgradables: UPGRADABLES,
      upgradeCosts: UPGRADE_COSTS,

      upgradablesMaxLevel: UPGRADABLES_MAX_LEVEL,

      coinToTonRate: COIN_TO_TON_RATE,
      minimumCoinWithdrawal: MINIMUM_COIN_WITHDRAWAL,
      maximumCoinWithdrawal: MAXIMUM_COIN_WITHDRAWAL,

      channels: CHANNELS,
      rewardForSubscription: REWARD_FOR_SUBSCRIPTION,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
