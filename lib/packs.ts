// Shared, pure formatting for pack-based stock display — used by Stock and
// Consumables, the two screens that receive stock by the pack. Everything
// else (Dashboard, Reorder, Margin, deduction) keeps working in plain
// measuring units and never calls this.

export function formatOnHand(quantity: number, packName: string, packSize: number, unit: string): string {
  if (packSize <= 1) return `${quantity} ${unit}`;

  const packs = Math.floor(quantity / packSize);
  if (packs <= 0) return `${quantity} ${unit}`;

  const remainder = Math.round((quantity - packs * packSize) * 100) / 100;
  const label = packName.toLowerCase();
  const packLabel = `${packs} ${label}${packs === 1 ? "" : "s"}`;

  if (remainder <= 0) return `${packLabel} (${quantity} ${unit})`;
  return `${packLabel} + ${remainder} ${unit} (${quantity} ${unit})`;
}
