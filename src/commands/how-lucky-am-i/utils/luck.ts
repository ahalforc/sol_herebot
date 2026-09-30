import type { BossEntry } from "./bosses.ts";
import type { ClogItem } from "./temple.ts";
import type { DropTable, ItemRate } from "./wiki.ts";

/**
 * Some collection log counts stop increasing in game, so items at or above this count are ignored.
 */
export const trivialCap = 256;

export type SourceInput = {
  kills: number;
  killsPerHour: number | undefined;
  table: DropTable | undefined;
};

export type ItemStatus = "counted" | "trivial" | "unknown";

export type ItemResult = {
  name: string;
  actual: number;
  status: ItemStatus;
  expected?: number;
  /** Per-kill chance of the item, mixed across sources by kills. */
  probability?: number;
  ratio?: number;
  hoursWorth?: number;
  hoursToObtain?: number;
};

export type BossResult = {
  name: string;
  kills: number;
  hours?: number;
  ratio?: number;
  luckyHours?: number;
  items: ItemResult[];
  hoursToFinishFromZero?: number;
  hoursToFinishRemaining?: number;
};

export type AccountResult = {
  ratio?: number;
  hours: number;
  luckyHours: number;
  analyzed: number;
  luckiest: BossResult[];
  unluckiest: BossResult[];
};

/**
 * Expected kills to obtain every item at least once, where item i drops with probability p_i per kill.
 *
 * Integrates 1 - Π(1 - e^(-p_i t)) over t in log space, since rates can span several orders of magnitude.
 */
export function expectedKillsToComplete(probabilities: number[]): number {
  const rates = probabilities.filter((p) => p > 0);
  if (rates.length === 0) {
    return 0;
  }

  const notDone = (t: number): number =>
    1 - rates.reduce((product, p) => product * (1 - Math.exp(-p * t)), 1);

  // Below `start` nothing has realistically dropped yet, so notDone(t) ≈ 1.
  const start = 1e-3 / Math.max(...rates);
  const end = 50 / Math.min(...rates);
  const steps = 4000;
  const du = Math.log(end / start) / steps;

  let total = start;
  for (let i = 0; i < steps; i++) {
    const t0 = start * Math.exp(i * du);
    const t1 = start * Math.exp((i + 1) * du);
    total += ((notDone(t0) * t0 + notDone(t1) * t1) / 2) * du;
  }
  return total;
}

function rateFor(
  entry: BossEntry,
  itemName: string,
  table: DropTable | undefined,
): ItemRate | undefined {
  const override = entry.overrides?.[itemName];
  if (override != null) {
    return { probability: override, expectedPerKill: override };
  }
  return table?.get(itemName.toLowerCase());
}

export function analyzeBoss(
  entry: BossEntry,
  clogItems: ClogItem[],
  sources: SourceInput[],
): BossResult {
  const active = sources.filter((source) => source.kills > 0);
  const kills = active.reduce((sum, source) => sum + source.kills, 0);
  const hasHours = active.length > 0 && active.every((source) => (source.killsPerHour ?? 0) > 0);
  const hours = hasHours
    ? active.reduce((sum, source) => sum + source.kills / (source.killsPerHour ?? 1), 0)
    : undefined;
  const excluded = new Set((entry.exclude ?? []).map((name) => name.toLowerCase()));

  const items = clogItems.map((item): ItemResult => {
    const base = { name: item.name, actual: item.count };
    const rates: ItemRate[] = [];
    for (const source of active) {
      const rate = rateFor(entry, item.name, source.table);
      if (rate == null && source.table == null) {
        return { ...base, status: "unknown" };
      }
      rates.push(rate ?? { probability: 0, expectedPerKill: 0 });
    }
    if (kills === 0) {
      return { ...base, status: "unknown" };
    }

    const expected = active.reduce(
      (sum, source, i) => sum + source.kills * rates[i].expectedPerKill,
      0,
    );
    if (expected <= 0) {
      return { ...base, status: "unknown" };
    }
    if (
      item.count >= trivialCap ||
      expected >= trivialCap ||
      excluded.has(item.name.toLowerCase())
    ) {
      return { ...base, status: "trivial", expected };
    }

    const probability =
      active.reduce((sum, source, i) => sum + source.kills * rates[i].probability, 0) / kills;
    const ratio = item.count / expected;
    return {
      ...base,
      status: "counted",
      expected,
      probability,
      ratio,
      hoursWorth: hours == null ? undefined : ratio * hours,
      hoursToObtain: hours == null || item.count > 0 ? undefined : hours / (probability * kills),
    };
  });

  const counted = items.filter((item) => item.status === "counted");
  const ratio =
    counted.length > 0
      ? counted.reduce((sum, item) => sum + (item.ratio ?? 0), 0) / counted.length
      : undefined;
  const killsPerHour = hours == null || counted.length === 0 ? undefined : kills / hours;
  const missing = counted.filter((item) => item.actual === 0);

  return {
    name: entry.name,
    kills,
    hours,
    ratio,
    luckyHours: hours == null || ratio == null ? undefined : (ratio - 1) * hours,
    items,
    hoursToFinishFromZero:
      killsPerHour == null
        ? undefined
        : expectedKillsToComplete(counted.map((item) => item.probability ?? 0)) / killsPerHour,
    hoursToFinishRemaining:
      killsPerHour == null
        ? undefined
        : expectedKillsToComplete(missing.map((item) => item.probability ?? 0)) / killsPerHour,
  };
}

export function analyzeAccount(results: BossResult[]): AccountResult {
  const included = results.filter((result) => result.ratio != null);

  let weightedRatio = 0;
  let totalWeight = 0;
  for (const result of included) {
    const weight = result.hours ?? result.kills / 60;
    weightedRatio += weight * (result.ratio ?? 0);
    totalWeight += weight;
  }

  const ranked = included
    .filter((result) => (result.hours ?? 0) >= 1)
    .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
  const luckiest = ranked.slice(0, 3);
  const unluckiest = ranked
    .slice()
    .reverse()
    .filter((result) => !luckiest.includes(result))
    .slice(0, 3);

  return {
    ratio: totalWeight > 0 ? weightedRatio / totalWeight : undefined,
    hours: included.reduce((sum, result) => sum + (result.hours ?? 0), 0),
    luckyHours: included.reduce((sum, result) => sum + (result.luckyHours ?? 0), 0),
    analyzed: included.length,
    luckiest,
    unluckiest,
  };
}
