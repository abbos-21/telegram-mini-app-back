// src/lib/settings.ts  (or wherever you keep it)

import prisma from "../prisma";

async function loadSettings() {
  const s = await prisma.settings.findUnique({
    where: { id: 1 },
  });

  if (!s) {
    throw new Error("Settings row (id=1) not found in database");
  }

  return {
    REFERRAL_REWARDS: s.referralRewards as Record<number, number>,
    SPIN_WHEEL_COOLDOWN_HOURS: s.spinWheelCooldownHours,
    SPIN_WHEEL_PROBABILITY_DATA: s.spinWheelProbabilities as Record<
      number,
      number
    >,

    ENERGY_PRICE: s.energyPrice,
    HEALTH_PRICE: s.healthPrice,

    UPGRADABLES: s.upgradables as Record<string, any>,
    UPGRADE_COSTS: s.upgradeCosts as Record<string, any>,

    UPGRADABLES_MAX_LEVEL: s.upgradablesMaxLevel,

    COIN_TO_TON_RATE: s.coinToTonRate,
    MINIMUM_COIN_WITHDRAWAL: s.minimumCoinWithdrawal,
    MAXIMUM_COIN_WITHDRAWAL: s.maximumCoinWithdrawal,

    CHANNELS: s.channels as string[],
    REWARD_FOR_SUBSCRIPTION: s.rewardForSubscription,
  };
}

/**
 * Always returns fresh settings from the database
 */
export async function getSettings() {
  return await loadSettings();
}

/**
 * Preload at server start (optional but keeps the old behavior of settingsPromise)
 * Useful if you import { settingsPromise } somewhere and await it on cold start
 */
export const settingsPromise = getSettings();
