// import { LEVEL_THRESHOLDS } from "../config/game";

// export function getLevelByCoins(coins: number): number {
//   let level = 1;
//   for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
//     if (coins >= LEVEL_THRESHOLDS[i]) {
//       level = i + 1;
//     } else {
//       break;
//     }
//   }
//   return level;
// }

export function getLevelByUpgradables(
  vaultLevel: number,
  miningRateLevel: number,
  energyLevel: number,
  healthLevel: number
): number {
  return Math.min(vaultLevel, miningRateLevel, energyLevel, healthLevel);
}
