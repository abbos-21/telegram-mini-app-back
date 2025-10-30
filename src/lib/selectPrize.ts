export function selectPrize(probabilityData: Record<number, number>): number {
  const entries = Object.entries(probabilityData);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  const rand = Math.random() * totalWeight;

  let cumulative = 0;
  for (const [value, weight] of entries) {
    cumulative += weight;
    if (rand <= cumulative) return Number(value);
  }

  return Number(entries[entries.length - 1][0]);
}
