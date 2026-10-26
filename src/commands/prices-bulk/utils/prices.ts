import { getJson } from "./http.ts";

const pricesApi = "https://prices.runescape.wiki/api/v1/osrs";

/**
 * How long the latest prices are reused before they are fetched again.
 */
const latestTtlMs = 60_000;

export type PricedItem = {
  name: string;
  price: number;
};

export type PriceList = {
  /** Items with a price, most expensive first. */
  priced: PricedItem[];
  /** Items with no id or no recent trade. */
  missing: string[];
};

type MappingEntry = { id: number; name: string };
type LatestPrices = Record<string, { high: number | null; low: number | null }>;

/**
 * Item ids keyed by lowercased item name, loaded once per bot run.
 */
let idsByName: Promise<Map<string, number>> | undefined;

let latest: { fetchedAt: number; prices: Promise<LatestPrices> } | undefined;

function getItemIds(): Promise<Map<string, number>> {
  idsByName ??= (getJson(`${pricesApi}/mapping`) as Promise<MappingEntry[]>)
    .then((entries) => new Map(entries.map((entry) => [entry.name.toLowerCase(), entry.id])))
    .catch((error) => {
      idsByName = undefined;
      throw error;
    });
  return idsByName;
}

function getLatestPrices(now: number): Promise<LatestPrices> {
  if (latest == null || now - latest.fetchedAt > latestTtlMs) {
    const prices = (getJson(`${pricesApi}/latest`) as Promise<{ data: LatestPrices }>)
      .then((body) => body.data)
      .catch((error) => {
        latest = undefined;
        throw error;
      });
    latest = { fetchedAt: now, prices };
  }
  return latest.prices;
}

/**
 * Prices the given items by exact name, using the instant buy price (falling back to instant sell).
 */
export function buildPriceList(
  names: string[],
  ids: Map<string, number>,
  prices: LatestPrices,
): PriceList {
  const priced: PricedItem[] = [];
  const missing: string[] = [];

  for (const name of names) {
    const id = ids.get(name.toLowerCase());
    const entry = id == null ? undefined : prices[String(id)];
    const price = entry?.high ?? entry?.low ?? undefined;
    if (price == null) {
      missing.push(name);
    } else {
      priced.push({ name, price });
    }
  }

  priced.sort((a, b) => b.price - a.price);
  return { priced, missing };
}

export async function priceItems(names: string[]): Promise<PriceList> {
  const [ids, prices] = await Promise.all([getItemIds(), getLatestPrices(Date.now())]);
  return buildPriceList(names, ids, prices);
}
