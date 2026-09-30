import { getJson } from "./http.ts";

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

const wikiApi = "https://oldschool.runescape.wiki/api.php";

/**
 * Keeps each bucket query well under the wiki's 5000 row limit.
 */
const pagesPerQuery = 20;

/**
 * Drop rows cached by wiki page name until the bot restarts.
 */
const cachedRows = new Map<string, DropRow[]>();

export type BucketResponse = {
  bucket?: { page_name: string; item_name: string; drop_json: string }[];
  error?: unknown;
};

type DropJson = {
  Rarity?: string;
  Rolls?: number;
  "Quantity Low"?: number;
  "Quantity High"?: number;
  "Dropped from"?: string;
};

function luaString(value: string): string {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

export function buildDropsQuery(pages: string[]): string {
  const filters = pages.map((page) => `{'page_name',${luaString(page)}}`).join(",");
  return (
    "bucket('dropsline').select('page_name','item_name','drop_json')" +
    `.where(bucket.Or(${filters})).limit(5000).run()`
  );
}

export function parseBucketResponse(
  pages: string[],
  response: BucketResponse,
): Map<string, DropRow[]> {
  if (response.bucket == null) {
    throw Error(`wiki bucket query failed: ${JSON.stringify(response.error)}`);
  }

  const rows = new Map<string, DropRow[]>(pages.map((page) => [page, []]));
  for (const entry of response.bucket) {
    const drop = JSON.parse(entry.drop_json) as DropJson;
    const quantityLow = Number(drop["Quantity Low"] ?? 1);
    rows.get(entry.page_name)?.push({
      itemName: entry.item_name,
      rarity: drop.Rarity ?? "",
      rolls: Number(drop.Rolls ?? 1),
      quantityLow,
      quantityHigh: Number(drop["Quantity High"] ?? quantityLow),
      droppedFrom: drop["Dropped from"] ?? "",
    });
  }
  return rows;
}

async function fetchDropRows(pages: string[]): Promise<Map<string, DropRow[]>> {
  const params = new URLSearchParams({
    action: "bucket",
    format: "json",
    query: buildDropsQuery(pages),
  });
  const response = (await getJson(`${wikiApi}?${params}`)) as BucketResponse;
  return parseBucketResponse(pages, response);
}

/**
 * Returns drop rows for each wiki page, fetching uncached pages in batches.
 *
 * Pages whose fetch failed are left out of the result and retried on the next call.
 */
export async function getDropRows(pages: string[]): Promise<Map<string, DropRow[]>> {
  const missing = [...new Set(pages)].filter((page) => !cachedRows.has(page));

  const chunks: string[][] = [];
  for (let i = 0; i < missing.length; i += pagesPerQuery) {
    chunks.push(missing.slice(i, i + pagesPerQuery));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        for (const [page, rows] of await fetchDropRows(chunk)) {
          cachedRows.set(page, rows);
        }
      } catch (error) {
        console.log(`Failed to fetch wiki drops for ${chunk.join(", ")}. Error: ${error}`);
      }
    }),
  );

  const result = new Map<string, DropRow[]>();
  for (const page of pages) {
    const rows = cachedRows.get(page);
    if (rows != null) {
      result.set(page, rows);
    }
  }
  return result;
}
