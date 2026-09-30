/**
 * One row of a monster's drop table on the osrs wiki.
 */
export type DropRow = {
  itemName: string;
  rarity: string;
  rolls: number;
  quantityLow: number;
  quantityHigh: number;
  droppedFrom: string;
};

export type ItemRate = {
  /** Chance of getting at least one of the item on a kill. */
  probability: number;
  /** Average quantity of the item per kill. */
  expectedPerKill: number;
};

/**
 * Item rates keyed by lowercased item name.
 */
export type DropTable = Map<string, ItemRate>;

/**
 * Parses a wiki rarity such as "1/5,000", "43.7/127" or "Always" into a per-roll probability.
 */
export function parseRarity(rarity: string): number | undefined {
  const text = rarity.trim();
  if (text.toLowerCase() === "always") {
    return 1;
  }

  const match = /^([\d.,]+)\/([\d.,]+)$/.exec(text);
  if (match == null) {
    return undefined;
  }

  const numerator = Number(match[1].replaceAll(",", ""));
  const denominator = Number(match[2].replaceAll(",", ""));
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return undefined;
  }

  return Math.min(numerator / denominator, 1);
}

/**
 * Combines a monster's drop rows into per-kill rates for each item.
 */
export function buildDropTable(rows: DropRow[]): DropTable {
  const missChances = new Map<string, number>();
  const expectedPerKill = new Map<string, number>();

  for (const row of rows) {
    const probability = parseRarity(row.rarity);
    if (probability == null) {
      continue;
    }

    const key = row.itemName.toLowerCase();
    const quantity = (row.quantityLow + row.quantityHigh) / 2;
    missChances.set(key, (missChances.get(key) ?? 1) * (1 - probability) ** row.rolls);
    expectedPerKill.set(key, (expectedPerKill.get(key) ?? 0) + row.rolls * probability * quantity);
  }

  const table: DropTable = new Map();
  for (const [key, missChance] of missChances) {
    table.set(key, { probability: 1 - missChance, expectedPerKill: expectedPerKill.get(key) ?? 0 });
  }
  return table;
}
