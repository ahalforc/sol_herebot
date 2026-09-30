# `/how-lucky-am-i` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/how-lucky-am-i` Discord slash command that compares a player's TempleOSRS boss collection log against OSRS Wiki drop rates, as a count ratio and in hours, and make `/iam` store registrations in memory.

**Architecture:** One new vertical slice at `src/commands/how-lucky-am-i/` with focused utils: `bosses.ts` (hand-written mapping), `http.ts` (JSON fetch), `temple.ts` (Temple API), `wiki.ts` (wiki drop table fetch, cache and rarity parsing), `luck.ts` (pure math), and `format.ts` (embeds). A shared in-memory registry at `src/registry.ts` is used by `/iam` and the new command. `src/index.ts` and `src/bot_commands.ts` only get wiring.

**Tech Stack:** TypeScript (Node 22+, ES modules, `.ts` import extensions), discord.js 14, `tsx`, `node:test` + `node:assert/strict`, pnpm, oxlint, oxfmt.

**Spec:** `docs/superpowers/specs/2026-09-29-how-lucky-am-i-design.md`

## Global Constraints

- Follow `.agents/skills/repo-architecture/SKILL.md`: one directory per slash command; `index.ts` exports `createCommand` and `execute`; command-only helpers live in that command's `utils/`; never import another command's `utils/`; `src/index.ts` and `src/bot_commands.ts` only compose slices.
- Imports use the `.ts` extension. Type-only imports use `import type` or inline `type` (required by `verbatimModuleSyntax`).
- No new dependencies. Tests use `node:test` via `tsx --test`.
- Tests live next to the file they test as `<name>.test.ts`.
- User agent for outbound requests: `"sol_herebot - experimental osrs discord bot"`.
- The trivial cap is `256`: an item is trivial when its actual count or expected count is `>= 256`.
- Only standard bosses are supported. Royal Titans, Barrows, Moons of Peril, Fortis Colosseum, raids, clues and minigames are not.
- Temple data is fetched fresh per command. Wiki drop rows are cached in memory per wiki page until restart; failed fetches are not cached.
- `README.md` has unrelated uncommitted changes from the user. Never stage the whole file; see Task 7.
- Run `pnpm format` before every commit so `pnpm format:check` passes.

## File map

| File | Status | Responsibility |
| --- | --- | --- |
| `package.json` | Modify | Add `test` script, include it in `check` |
| `src/registry.ts` | Create | In-memory Discord id → OSRS name map |
| `src/registry.test.ts` | Create | Registry tests |
| `src/commands/iam/index.ts` | Modify | Call `setOsrsName` |
| `src/commands/how-lucky-am-i/utils/http.ts` | Create | `userAgent`, `getJson` |
| `src/commands/how-lucky-am-i/utils/wiki.ts` | Create | Rarity parsing, drop tables, batched cached wiki fetch |
| `src/commands/how-lucky-am-i/utils/wiki.test.ts` | Create | Wiki tests |
| `src/commands/how-lucky-am-i/utils/temple.ts` | Create | Temple fetchers, parsers, `TempleError` |
| `src/commands/how-lucky-am-i/utils/temple.test.ts` | Create | Temple tests |
| `src/commands/how-lucky-am-i/utils/bosses.ts` | Create | Boss mapping, `findBoss`, `searchBosses` |
| `src/commands/how-lucky-am-i/utils/bosses.test.ts` | Create | Mapping tests |
| `src/commands/how-lucky-am-i/utils/luck.ts` | Create | Luck math |
| `src/commands/how-lucky-am-i/utils/luck.test.ts` | Create | Luck tests |
| `src/commands/how-lucky-am-i/utils/format.ts` | Create | Summary and boss embeds |
| `src/commands/how-lucky-am-i/utils/format.test.ts` | Create | Formatting helper tests |
| `src/commands/how-lucky-am-i/index.ts` | Create | `createCommand`, `autocomplete`, `execute` |
| `src/index.ts` | Modify | Wire executor and autocomplete; safe error reply after defer |
| `src/bot_commands.ts` | Modify | Register the command |
| `README.md` | Modify | Document the command |

---

### Task 1: Test runner, shared registry, and `/iam` persistence

**Files:**
- Modify: `package.json` (scripts)
- Create: `src/registry.ts`
- Test: `src/registry.test.ts`
- Modify: `src/commands/iam/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `setOsrsName(discordId: string, osrsName: string): void` and `getOsrsName(discordId: string): string | undefined` from `src/registry.ts`. A `pnpm test` script that runs every `src/**/*.test.ts`.

- [ ] **Step 1: Add the test script**

In `package.json`, change the `scripts` block to:

```json
  "scripts": {
    "start": "tsx src/index.ts",
    "commands": "tsx src/bot_commands.ts",
    "test": "tsx --test 'src/**/*.test.ts'",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix .",
    "format": "oxfmt .",
    "format:check": "oxfmt --check .",
    "check": "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test"
  },
```

- [ ] **Step 2: Write the failing test**

Create `src/registry.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { getOsrsName, setOsrsName } from "./registry.ts";

test("returns undefined for an unregistered user", () => {
  assert.equal(getOsrsName("unregistered"), undefined);
});

test("returns the latest registered name", () => {
  setOsrsName("123", "a half orc");
  setOsrsName("123", "Mikael");
  assert.equal(getOsrsName("123"), "Mikael");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL, with an error that `./registry.ts` cannot be found.

- [ ] **Step 4: Implement the registry**

Create `src/registry.ts`:

```ts
/**
 * OSRS names registered with /iam, keyed by Discord user id.
 *
 * Held in memory only, so registrations are lost when the bot restarts.
 */
const osrsNames = new Map<string, string>();

export function setOsrsName(discordId: string, osrsName: string): void {
  osrsNames.set(discordId, osrsName);
}

export function getOsrsName(discordId: string): string | undefined {
  return osrsNames.get(discordId);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS, 2 tests.

- [ ] **Step 6: Make `/iam` register**

In `src/commands/iam/index.ts`, add this import below the `discord.js` import:

```ts
import { setOsrsName } from "../../registry.ts";
```

Replace the line `  // addIamEntry(discordId, osrsName);` with:

```ts
  setOsrsName(discordId, osrsName);
```

- [ ] **Step 7: Verify and commit**

Run: `pnpm format && pnpm typecheck && pnpm lint && pnpm test`
Expected: all succeed.

```bash
git add package.json src/registry.ts src/registry.test.ts src/commands/iam/index.ts
git commit -m "Store /iam registrations in memory and add test runner"
```

---

### Task 2: Wiki rarity parsing and drop tables

**Files:**
- Create: `src/commands/how-lucky-am-i/utils/wiki.ts`
- Test: `src/commands/how-lucky-am-i/utils/wiki.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `wiki.ts`:
  - `type DropRow = { itemName: string; rarity: string; rolls: number; quantityLow: number; quantityHigh: number; droppedFrom: string }`
  - `type ItemRate = { probability: number; expectedPerKill: number }`
  - `type DropTable = Map<string, ItemRate>`, keyed by lowercased item name
  - `parseRarity(rarity: string): number | undefined`
  - `buildDropTable(rows: DropRow[]): DropTable`

- [ ] **Step 1: Write the failing tests**

Create `src/commands/how-lucky-am-i/utils/wiki.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDropTable, parseRarity, type DropRow } from "./wiki.ts";

function assertClose(actual: number | undefined, expected: number): void {
  assert.ok(actual != null, "expected a number");
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not close to ${expected}`);
}

function row(overrides: Partial<DropRow>): DropRow {
  return {
    itemName: "Item",
    rarity: "1/100",
    rolls: 1,
    quantityLow: 1,
    quantityHigh: 1,
    droppedFrom: "Boss",
    ...overrides,
  };
}

test("parseRarity handles fractions, commas and decimals", () => {
  assertClose(parseRarity("2/150"), 2 / 150);
  assertClose(parseRarity("1/5,000"), 1 / 5000);
  assertClose(parseRarity("43.7/127"), 43.7 / 127);
  assertClose(parseRarity("1/94.93"), 1 / 94.93);
  assertClose(parseRarity("1/1,667.28"), 1 / 1667.28);
});

test("parseRarity treats Always as 1", () => {
  assert.equal(parseRarity("Always"), 1);
});

test("parseRarity rejects text it cannot parse", () => {
  assert.equal(parseRarity("1/3,000 (on task)"), undefined);
  assert.equal(parseRarity("Unknown"), undefined);
  assert.equal(parseRarity(""), undefined);
  assert.equal(parseRarity("1/0"), undefined);
});

test("buildDropTable accounts for multiple rolls", () => {
  const table = buildDropTable([row({ itemName: "Tanzanite fang", rarity: "1/1,024", rolls: 2 })]);
  const rate = table.get("tanzanite fang");
  assertClose(rate?.probability, 1 - (1 - 1 / 1024) ** 2);
  assertClose(rate?.expectedPerKill, 2 / 1024);
});

test("buildDropTable combines rows for the same item", () => {
  const table = buildDropTable([
    row({ itemName: "Zulrah's scales", rarity: "Always", quantityLow: 100, quantityHigh: 299 }),
    row({ itemName: "Zulrah's scales", rarity: "5/249", rolls: 2, quantityLow: 500, quantityHigh: 500 }),
  ]);
  const rate = table.get("zulrah's scales");
  assertClose(rate?.probability, 1);
  assertClose(rate?.expectedPerKill, 199.5 + 2 * (5 / 249) * 500);
});

test("buildDropTable keys items by lowercased name", () => {
  const table = buildDropTable([row({ itemName: "Pet Snakeling", rarity: "1/4,000" })]);
  assertClose(table.get("pet snakeling")?.probability, 1 / 4000);
});

test("buildDropTable skips rows it cannot parse", () => {
  const table = buildDropTable([row({ itemName: "Mystery", rarity: "Varies" })]);
  assert.equal(table.has("mystery"), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, with an error that `./wiki.ts` cannot be found.

- [ ] **Step 3: Implement parsing and drop tables**

Create `src/commands/how-lucky-am-i/utils/wiki.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS, all wiki and registry tests.

- [ ] **Step 5: Commit**

Run: `pnpm format && pnpm typecheck && pnpm lint`

```bash
git add src/commands/how-lucky-am-i/utils/wiki.ts src/commands/how-lucky-am-i/utils/wiki.test.ts
git commit -m "Add wiki rarity parsing and drop tables for /how-lucky-am-i"
```

---

### Task 3: Batched, cached wiki drop fetch

**Files:**
- Create: `src/commands/how-lucky-am-i/utils/http.ts`
- Modify: `src/commands/how-lucky-am-i/utils/wiki.ts`
- Test: `src/commands/how-lucky-am-i/utils/wiki.test.ts`

**Interfaces:**
- Consumes: `DropRow` from Task 2.
- Produces:
  - From `http.ts`: `userAgent: string` and `getJson(url: string): Promise<unknown>`, which throws on a non-2xx response.
  - From `wiki.ts`:
    - `type BucketResponse = { bucket?: { page_name: string; item_name: string; drop_json: string }[]; error?: unknown }`
    - `buildDropsQuery(pages: string[]): string`
    - `parseBucketResponse(pages: string[], response: BucketResponse): Map<string, DropRow[]>`, which throws if `bucket` is missing
    - `getDropRows(pages: string[]): Promise<Map<string, DropRow[]>>`. Pages whose fetch failed are absent from the result; pages with no rows map to `[]`.

- [ ] **Step 1: Write the failing tests**

Append to `src/commands/how-lucky-am-i/utils/wiki.test.ts` and update its import line to:

```ts
import { buildDropsQuery, buildDropTable, parseBucketResponse, parseRarity, type DropRow } from "./wiki.ts";
```

```ts
test("buildDropsQuery ORs every page and escapes quotes", () => {
  assert.equal(
    buildDropsQuery(["Vorkath", "Kree'arra"]),
    "bucket('dropsline').select('page_name','item_name','drop_json')" +
      ".where(bucket.Or({'page_name','Vorkath'},{'page_name','Kree\\'arra'})).limit(5000).run()",
  );
});

test("parseBucketResponse groups rows by page and fills defaults", () => {
  const rows = parseBucketResponse(["Vorkath", "Zulrah", "Obor"], {
    bucket: [
      {
        page_name: "Vorkath",
        item_name: "Vorki",
        drop_json: JSON.stringify({ Rarity: "1/3,000", Rolls: 1, "Quantity Low": 1, "Quantity High": 1, "Dropped from": "Vorkath#Post-quest" }),
      },
      {
        page_name: "Zulrah",
        item_name: "Tanzanite fang",
        drop_json: JSON.stringify({ Rarity: "1/1,024", "Dropped from": "Zulrah" }),
      },
    ],
  });

  assert.deepEqual(rows.get("Vorkath"), [
    { itemName: "Vorki", rarity: "1/3,000", rolls: 1, quantityLow: 1, quantityHigh: 1, droppedFrom: "Vorkath#Post-quest" },
  ]);
  assert.deepEqual(rows.get("Zulrah"), [
    { itemName: "Tanzanite fang", rarity: "1/1,024", rolls: 1, quantityLow: 1, quantityHigh: 1, droppedFrom: "Zulrah" },
  ]);
  assert.deepEqual(rows.get("Obor"), []);
});

test("parseBucketResponse throws when the query failed", () => {
  assert.throws(() => parseBucketResponse(["Vorkath"], { error: "bad query" }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, because `buildDropsQuery` and `parseBucketResponse` are not exported.

- [ ] **Step 3: Add the HTTP helper**

Create `src/commands/how-lucky-am-i/utils/http.ts`:

```ts
/**
 * User agent used to provide context to the osrs wiki and TempleOSRS.
 */
export const userAgent = "sol_herebot - experimental osrs discord bot";

export async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw Error(`${url} responded with ${response.status}`);
  }
  return await response.json();
}
```

- [ ] **Step 4: Implement the fetch, parsing and cache**

In `src/commands/how-lucky-am-i/utils/wiki.ts`, add this import at the top of the file:

```ts
import { getJson } from "./http.ts";
```

Append to the end of the file:

```ts
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

export function parseBucketResponse(pages: string[], response: BucketResponse): Map<string, DropRow[]> {
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
  const params = new URLSearchParams({ action: "bucket", format: "json", query: buildDropsQuery(pages) });
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Smoke test against the live wiki**

Run:

```bash
pnpm exec tsx --eval 'import("./src/commands/how-lucky-am-i/utils/wiki.ts").then(async (wiki) => { const rows = await wiki.getDropRows(["Vorkath", "Kree\u0027arra", "Reward Chest (The Gauntlet)"]); console.log([...rows].map(([page, list]) => `${page}: ${list.length}`)); console.log(wiki.buildDropTable(rows.get("Vorkath") ?? []).get("vorki")); })'
```

Expected output, with row counts that may differ slightly as the wiki changes:

```
[ 'Vorkath: 90', "Kree'arra: 54", 'Reward Chest (The Gauntlet): 91' ]
{ probability: 0.0003333333333333333, expectedPerKill: 0.0003333333333333333 }
```

- [ ] **Step 7: Commit**

Run: `pnpm format && pnpm typecheck && pnpm lint`

```bash
git add src/commands/how-lucky-am-i/utils/http.ts src/commands/how-lucky-am-i/utils/wiki.ts src/commands/how-lucky-am-i/utils/wiki.test.ts
git commit -m "Add cached, batched wiki drop fetch for /how-lucky-am-i"
```

---

### Task 4: Temple API client

**Files:**
- Create: `src/commands/how-lucky-am-i/utils/temple.ts`
- Test: `src/commands/how-lucky-am-i/utils/temple.test.ts`

**Interfaces:**
- Consumes: `getJson` from `http.ts` (Task 3).
- Produces, from `temple.ts`:
  - `type TempleErrorKind = "not_found" | "not_synced" | "unavailable"`
  - `class TempleError extends Error { readonly kind: TempleErrorKind }`
  - `type TempleResponse = { data?: unknown; error?: { Code?: number; Message?: string } }`
  - `unwrap(response: TempleResponse): unknown`
  - `type PlayerStats = { gameMode: number; kills: Map<string, number> }`, where `kills` holds every positive numeric stat keyed by Temple name (e.g. `"Vorkath"`)
  - `type ClogItem = { id: number; name: string; count: number }`
  - `type CollectionLog = { lastChecked: string | null; categories: Map<string, ClogItem[]> }`
  - `parsePlayerStats(data: unknown): PlayerStats`
  - `parseCollectionLog(data: unknown): CollectionLog`
  - `parseKillsPerHour(data: unknown): Map<string, number>`
  - `rateType(gameMode: number): "main" | "im" | "uim"`
  - `fetchPlayerStats(player: string): Promise<PlayerStats>`
  - `fetchCollectionLog(player: string, categories: string[]): Promise<CollectionLog>`
  - `fetchKillsPerHour(gameMode: number): Promise<Map<string, number>>`
  - All three fetchers throw `TempleError` on failure.

- [ ] **Step 1: Write the failing tests**

Create `src/commands/how-lucky-am-i/utils/temple.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseCollectionLog,
  parseKillsPerHour,
  parsePlayerStats,
  rateType,
  TempleError,
  unwrap,
} from "./temple.ts";

function kindOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return error instanceof TempleError ? error.kind : "other";
  }
  return undefined;
}

test("unwrap returns data", () => {
  assert.deepEqual(unwrap({ data: { a: 1 } }), { a: 1 });
});

test("unwrap maps Temple error messages to kinds", () => {
  assert.equal(kindOf(() => unwrap({ error: { Code: 402, Message: "User not found in database" } })), "not_found");
  assert.equal(
    kindOf(() => unwrap({ error: { Code: 402, Message: "Player has not synced their collection log on TempleOSRS yet." } })),
    "not_synced",
  );
  assert.equal(kindOf(() => unwrap({ error: { Code: 500, Message: "Something broke" } })), "unavailable");
  assert.equal(kindOf(() => unwrap({})), "unavailable");
});

test("parsePlayerStats reads game mode and positive kill counts", () => {
  const stats = parsePlayerStats({
    info: { Username: "Mikael", "Game mode": 1 },
    Vorkath: 300,
    "Vorkath_ehb": 8.8,
    Zulrah: 0,
    Obor: -1,
  });
  assert.equal(stats.gameMode, 1);
  assert.equal(stats.kills.get("Vorkath"), 300);
  assert.equal(stats.kills.has("Zulrah"), false);
  assert.equal(stats.kills.has("Obor"), false);
});

test("parsePlayerStats defaults game mode to main", () => {
  assert.equal(parsePlayerStats({ info: {} }).gameMode, 0);
});

test("parseCollectionLog reads sync time and categories", () => {
  const log = parseCollectionLog({
    last_checked: "2026-09-29 13:56:15",
    items: { vorkath: [{ id: 21992, count: 0, date: null, name: "Vorki" }] },
  });
  assert.equal(log.lastChecked, "2026-09-29 13:56:15");
  assert.equal(log.categories.get("vorkath")?.[0].name, "Vorki");
  assert.equal(log.categories.get("vorkath")?.[0].count, 0);
});

test("parseKillsPerHour reads rates", () => {
  const rates = parseKillsPerHour({ info: {}, rates: { Vorkath: 34, Obor: 0 } });
  assert.equal(rates.get("Vorkath"), 34);
  assert.equal(rates.get("Obor"), 0);
});

test("rateType maps game modes to Temple rate sets", () => {
  assert.equal(rateType(0), "main");
  assert.equal(rateType(1), "im");
  assert.equal(rateType(2), "uim");
  assert.equal(rateType(3), "im");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, with an error that `./temple.ts` cannot be found.

- [ ] **Step 3: Implement the Temple client**

Create `src/commands/how-lucky-am-i/utils/temple.ts`:

```ts
import { getJson } from "./http.ts";

const templeApi = "https://templeosrs.com/api";

export type TempleErrorKind = "not_found" | "not_synced" | "unavailable";

export class TempleError extends Error {
  readonly kind: TempleErrorKind;

  constructor(kind: TempleErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export type TempleResponse = {
  data?: unknown;
  error?: { Code?: number; Message?: string };
};

export type PlayerStats = {
  gameMode: number;
  /** Positive stat values keyed by Temple name, e.g. "Vorkath". */
  kills: Map<string, number>;
};

export type ClogItem = {
  id: number;
  name: string;
  count: number;
};

export type CollectionLog = {
  lastChecked: string | null;
  categories: Map<string, ClogItem[]>;
};

export function unwrap(response: TempleResponse): unknown {
  if (response.error != null) {
    const message = response.error.Message ?? "Unknown Temple error";
    if (/synced/i.test(message)) {
      throw new TempleError("not_synced", message);
    }
    if (/not found/i.test(message)) {
      throw new TempleError("not_found", message);
    }
    throw new TempleError("unavailable", message);
  }
  if (response.data == null) {
    throw new TempleError("unavailable", "Temple returned no data");
  }
  return response.data;
}

async function getTemple(path: string, params: Record<string, string>): Promise<unknown> {
  let response: TempleResponse;
  try {
    response = (await getJson(`${templeApi}/${path}?${new URLSearchParams(params)}`)) as TempleResponse;
  } catch (error) {
    throw new TempleError("unavailable", `${error}`);
  }
  return unwrap(response);
}

export function parsePlayerStats(data: unknown): PlayerStats {
  const record = data as Record<string, unknown> & { info?: { "Game mode"?: number } };
  const kills = new Map<string, number>();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "number" && value > 0) {
      kills.set(key, value);
    }
  }
  return { gameMode: record.info?.["Game mode"] ?? 0, kills };
}

export function parseCollectionLog(data: unknown): CollectionLog {
  const record = data as { last_checked?: string | null; items?: Record<string, ClogItem[]> };
  return {
    lastChecked: record.last_checked ?? null,
    categories: new Map(Object.entries(record.items ?? {})),
  };
}

export function parseKillsPerHour(data: unknown): Map<string, number> {
  const record = data as { rates?: Record<string, number> };
  return new Map(Object.entries(record.rates ?? {}));
}

export function rateType(gameMode: number): "main" | "im" | "uim" {
  if (gameMode === 2) {
    return "uim";
  }
  if (gameMode === 1 || gameMode === 3) {
    return "im";
  }
  return "main";
}

export async function fetchPlayerStats(player: string): Promise<PlayerStats> {
  return parsePlayerStats(await getTemple("player_stats.php", { player, bosses: "1" }));
}

export async function fetchCollectionLog(player: string, categories: string[]): Promise<CollectionLog> {
  return parseCollectionLog(
    await getTemple("collection-log/player_collection_log.php", {
      player,
      categories: categories.join(","),
      includenames: "1",
      includemissingitems: "1",
    }),
  );
}

export async function fetchKillsPerHour(gameMode: number): Promise<Map<string, number>> {
  return parseKillsPerHour(await getTemple("rates/ehb_rates.php", { rate: rateType(gameMode) }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Smoke test against live Temple**

Run:

```bash
pnpm exec tsx --eval 'import("./src/commands/how-lucky-am-i/utils/temple.ts").then(async (t) => { const s = await t.fetchPlayerStats("Mikael"); const log = await t.fetchCollectionLog("Mikael", ["vorkath"]); const kph = await t.fetchKillsPerHour(s.gameMode); console.log(s.kills.get("Vorkath"), log.categories.get("vorkath")?.length, kph.get("Vorkath")); await t.fetchPlayerStats("zzqqxxnotreal123").catch((e) => console.log(e.kind)); })'
```

Expected: three numbers (Vorkath kills, `6`, `34`), then `not_found`. The kill count and rate may change over time.

- [ ] **Step 6: Commit**

Run: `pnpm format && pnpm typecheck && pnpm lint`

```bash
git add src/commands/how-lucky-am-i/utils/temple.ts src/commands/how-lucky-am-i/utils/temple.test.ts
git commit -m "Add TempleOSRS client for /how-lucky-am-i"
```

---

### Task 5: Boss mapping

**Files:**
- Create: `src/commands/how-lucky-am-i/utils/bosses.ts`
- Test: `src/commands/how-lucky-am-i/utils/bosses.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, from `bosses.ts`:
  - `type BossSource = { templeBoss: string; wikiPage: string; droppedFrom?: string }`
  - `type BossEntry = { name: string; category: string; sources: BossSource[]; overrides?: Record<string, number>; exclude?: string[] }`. `overrides` maps an exact collection log item name to a per-kill probability; `exclude` lists item names treated as trivial.
  - `bosses: BossEntry[]`
  - `findBoss(name: string): BossEntry | undefined` (case-insensitive exact match on `name`)
  - `searchBosses(query: string): BossEntry[]` (case-insensitive substring match on `name`, at most 25, which is Discord's autocomplete limit)

Every Temple name, category key and wiki page below was verified against the live APIs on 2026-09-29.

- [ ] **Step 1: Write the failing tests**

Create `src/commands/how-lucky-am-i/utils/bosses.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { bosses, findBoss, searchBosses } from "./bosses.ts";

test("every boss has a unique name and category and at least one source", () => {
  assert.equal(new Set(bosses.map((boss) => boss.name)).size, bosses.length);
  assert.equal(new Set(bosses.map((boss) => boss.category)).size, bosses.length);
  for (const boss of bosses) {
    assert.ok(boss.sources.length > 0, `${boss.name} has no sources`);
  }
});

test("findBoss matches names case-insensitively", () => {
  assert.equal(findBoss("vorkath")?.category, "vorkath");
  assert.equal(findBoss("  Kree'arra ")?.category, "kree_arra");
  assert.equal(findBoss("Vork"), undefined);
});

test("combined categories list every Temple boss", () => {
  assert.deepEqual(
    findBoss("Dagannoth Kings")?.sources.map((source) => source.templeBoss),
    ["Dagannoth Prime", "Dagannoth Rex", "Dagannoth Supreme"],
  );
  assert.deepEqual(
    findBoss("The Gauntlet")?.sources.map((source) => source.droppedFrom),
    ["Reward Chest (The Gauntlet)#Regular", "Reward Chest (The Gauntlet)#Corrupted"],
  );
});

test("searchBosses filters by substring and caps at 25", () => {
  assert.deepEqual(
    searchBosses("dagannoth").map((boss) => boss.name),
    ["Dagannoth Kings"],
  );
  assert.equal(searchBosses("").length, 25);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, with an error that `./bosses.ts` cannot be found.

- [ ] **Step 3: Implement the mapping**

Create `src/commands/how-lucky-am-i/utils/bosses.ts`:

```ts
export type BossSource = {
  /** Boss name in Temple's player stats and kills-per-hour rates. */
  templeBoss: string;
  /** Wiki page holding the boss's drop table. */
  wikiPage: string;
  /** Only use drop rows with this exact "Dropped from" value. */
  droppedFrom?: string;
};

export type BossEntry = {
  name: string;
  /** Temple collection log category key. */
  category: string;
  sources: BossSource[];
  /** Per-kill probability by exact collection log item name, used instead of the wiki. */
  overrides?: Record<string, number>;
  /** Collection log item names that are always treated as trivial. */
  exclude?: string[];
};

function single(name: string, category: string, templeBoss: string, wikiPage: string): BossEntry {
  return { name, category, sources: [{ templeBoss, wikiPage }] };
}

const gauntletChest = "Reward Chest (The Gauntlet)";

/**
 * Standard bosses supported by /how-lucky-am-i, one entry per collection log category.
 */
export const bosses: BossEntry[] = [
  single("Abyssal Sire", "abyssal_sire", "Abyssal Sire", "Abyssal Sire"),
  single("Alchemical Hydra", "alchemical_hydra", "Alchemical Hydra", "Alchemical Hydra"),
  single("Amoxliatl", "amoxliatl", "Amoxliatl", "Amoxliatl"),
  single("Araxxor", "araxxor", "Araxxor", "Araxxor"),
  single("Brutus", "brutus", "Brutus", "Brutus"),
  single("Bryophyta", "bryophyta", "Bryophyta", "Bryophyta"),
  {
    name: "Callisto and Artio",
    category: "callisto_and_artio",
    sources: [
      { templeBoss: "Callisto", wikiPage: "Callisto" },
      { templeBoss: "Artio", wikiPage: "Artio" },
    ],
  },
  single("Cerberus", "cerberus", "Cerberus", "Cerberus"),
  single("Chaos Elemental", "chaos_elemental", "Chaos Elemental", "Chaos Elemental"),
  single("Chaos Fanatic", "chaos_fanatic", "Chaos Fanatic", "Chaos Fanatic"),
  single("Commander Zilyana", "commander_zilyana", "Commander Zilyana", "Commander Zilyana"),
  single("Corporeal Beast", "corporeal_beast", "Corporeal Beast", "Corporeal Beast"),
  single("Crazy Archaeologist", "crazy_archaeologist", "Crazy Archaeologist", "Crazy archaeologist"),
  {
    name: "Dagannoth Kings",
    category: "dagannoth_kings",
    sources: [
      { templeBoss: "Dagannoth Prime", wikiPage: "Dagannoth Prime" },
      { templeBoss: "Dagannoth Rex", wikiPage: "Dagannoth Rex" },
      { templeBoss: "Dagannoth Supreme", wikiPage: "Dagannoth Supreme" },
    ],
  },
  single("Deranged Archaeologist", "deranged_archaeologist", "Deranged Archaeologist", "Deranged archaeologist"),
  single("Doom of Mokhaiotl", "doom_of_mokhaiotl", "Doom of Mokhaiotl", "Doom of Mokhaiotl"),
  single("Duke Sucellus", "duke_sucellus", "Duke Sucellus", "Duke Sucellus"),
  single("The Fight Caves", "the_fight_caves", "TzTok-Jad", "TzTok-Jad"),
  {
    name: "The Gauntlet",
    category: "the_gauntlet",
    sources: [
      { templeBoss: "The Gauntlet", wikiPage: gauntletChest, droppedFrom: `${gauntletChest}#Regular` },
      { templeBoss: "The Corrupted Gauntlet", wikiPage: gauntletChest, droppedFrom: `${gauntletChest}#Corrupted` },
    ],
  },
  single("General Graardor", "general_graardor", "General Graardor", "General Graardor"),
  single("Giant Mole", "giant_mole", "Giant Mole", "Giant Mole"),
  single("Grotesque Guardians", "grotesque_guardians", "Grotesque Guardians", "Grotesque Guardians"),
  single("Hespori", "hespori", "Hespori", "Hespori"),
  single("The Hueycoatl", "hueycoatl", "Hueycoatl", "The Hueycoatl"),
  single("The Inferno", "the_inferno", "TzKal-Zuk", "TzKal-Zuk"),
  single("Kalphite Queen", "kalphite_queen", "Kalphite Queen", "Kalphite Queen"),
  single("King Black Dragon", "king_black_dragon", "King Black Dragon", "King Black Dragon"),
  single("Kraken", "kraken", "Kraken", "Kraken"),
  single("Kree'arra", "kree_arra", "KreeArra", "Kree'arra"),
  single("K'ril Tsutsaroth", "kril_tsutsaroth", "Kril Tsutsaroth", "K'ril Tsutsaroth"),
  single("The Leviathan", "the_leviathan", "The Leviathan", "The Leviathan"),
  single("The Mad Angel", "the_mad_angel", "Mad Angel", "Mad Angel"),
  single("Maggot King", "maggot_king", "Maggot King", "Maggot King"),
  single("Nex", "nex", "Nex", "Nex"),
  {
    name: "The Nightmare",
    category: "the_nightmare",
    sources: [
      { templeBoss: "The Nightmare", wikiPage: "The Nightmare" },
      { templeBoss: "Phosanis Nightmare", wikiPage: "Phosani's Nightmare" },
    ],
  },
  single("Obor", "obor", "Obor", "Obor"),
  single("Phantom Muspah", "phantom_muspah", "Phantom Muspah", "Phantom Muspah"),
  single("Sarachnis", "sarachnis", "Sarachnis", "Sarachnis"),
  single("Scorpia", "scorpia", "Scorpia", "Scorpia"),
  single("Scurrius", "scurrius", "Scurrius", "Scurrius"),
  single("Shellbane Gryphon", "shellbane_gryphon", "Shellbane Gryphon", "Shellbane gryphon"),
  single("Skotizo", "skotizo", "Skotizo", "Skotizo"),
  single(
    "Thermonuclear Smoke Devil",
    "thermonuclear_smoke_devil",
    "Thermonuclear Smoke Devil",
    "Thermonuclear smoke devil",
  ),
  single("Vardorvis", "vardorvis", "Vardorvis", "Vardorvis"),
  {
    name: "Venenatis and Spindel",
    category: "venenatis_and_spindel",
    sources: [
      { templeBoss: "Venenatis", wikiPage: "Venenatis" },
      { templeBoss: "Spindel", wikiPage: "Spindel" },
    ],
  },
  {
    name: "Vet'ion and Calvar'ion",
    category: "vetion_and_calvarion",
    sources: [
      { templeBoss: "Vetion", wikiPage: "Vet'ion" },
      { templeBoss: "Calvarion", wikiPage: "Calvar'ion" },
    ],
  },
  single("Vorkath", "vorkath", "Vorkath", "Vorkath"),
  single("The Whisperer", "the_whisperer", "The Whisperer", "The Whisperer"),
  single("Yama", "yama", "Yama", "Yama"),
  single("Zulrah", "zulrah", "Zulrah", "Zulrah"),
];

export function findBoss(name: string): BossEntry | undefined {
  const query = name.trim().toLowerCase();
  return bosses.find((boss) => boss.name.toLowerCase() === query);
}

export function searchBosses(query: string): BossEntry[] {
  const lowered = query.trim().toLowerCase();
  return bosses.filter((boss) => boss.name.toLowerCase().includes(lowered)).slice(0, 25);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `pnpm format && pnpm typecheck && pnpm lint`

```bash
git add src/commands/how-lucky-am-i/utils/bosses.ts src/commands/how-lucky-am-i/utils/bosses.test.ts
git commit -m "Add boss mapping for /how-lucky-am-i"
```

---

### Task 6: Luck math

**Files:**
- Create: `src/commands/how-lucky-am-i/utils/luck.ts`
- Test: `src/commands/how-lucky-am-i/utils/luck.test.ts`

**Interfaces:**
- Consumes: `BossEntry` (Task 5), `ClogItem` (Task 4), `DropTable` and `ItemRate` (Task 2). All are type-only imports.
- Produces, from `luck.ts`:
  - `trivialCap = 256`
  - `type SourceInput = { kills: number; killsPerHour: number | undefined; table: DropTable | undefined }`, with one per `BossEntry.sources` element in the same order. `table` is `undefined` when the wiki fetch failed.
  - `type ItemStatus = "counted" | "trivial" | "unknown"`
  - `type ItemResult = { name: string; actual: number; status: ItemStatus; expected?: number; probability?: number; ratio?: number; hoursWorth?: number; hoursToObtain?: number }`
  - `type BossResult = { name: string; kills: number; hours?: number; ratio?: number; luckyHours?: number; items: ItemResult[]; hoursToFinishFromZero?: number; hoursToFinishRemaining?: number }`
  - `type AccountResult = { ratio?: number; hours: number; luckyHours: number; analyzed: number; luckiest: BossResult[]; unluckiest: BossResult[] }`
  - `expectedKillsToComplete(probabilities: number[]): number`
  - `analyzeBoss(entry: BossEntry, clogItems: ClogItem[], sources: SourceInput[]): BossResult`
  - `analyzeAccount(results: BossResult[]): AccountResult`

- [ ] **Step 1: Write the failing tests**

Create `src/commands/how-lucky-am-i/utils/luck.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { BossEntry } from "./bosses.ts";
import { analyzeAccount, analyzeBoss, expectedKillsToComplete, type BossResult } from "./luck.ts";
import type { DropTable } from "./wiki.ts";

function assertClose(actual: number | undefined, expected: number, relative = 1e-3): void {
  assert.ok(actual != null, "expected a number");
  assert.ok(
    Math.abs(actual - expected) <= Math.abs(expected) * relative + 1e-9,
    `${actual} is not close to ${expected}`,
  );
}

function table(rates: Record<string, number>): DropTable {
  return new Map(
    Object.entries(rates).map(([name, p]) => [name.toLowerCase(), { probability: p, expectedPerKill: p }]),
  );
}

const vorkath: BossEntry = {
  name: "Vorkath",
  category: "vorkath",
  sources: [{ templeBoss: "Vorkath", wikiPage: "Vorkath" }],
};

test("expectedKillsToComplete matches known coupon collector results", () => {
  assert.equal(expectedKillsToComplete([]), 0);
  assertClose(expectedKillsToComplete([1 / 100]), 100);
  assertClose(expectedKillsToComplete([1 / 100, 1 / 100]), 150);
  assertClose(expectedKillsToComplete([1 / 2, 1 / 1000]), 2 + 1000 - 1 / (0.5 + 0.001));
});

test("analyzeBoss computes ratios, hours and log completion", () => {
  const result = analyzeBoss(
    vorkath,
    [
      { id: 1, name: "Skeletal visage", count: 1 },
      { id: 2, name: "Draconic visage", count: 0 },
      { id: 3, name: "Superior dragon bones", count: 600 },
      { id: 4, name: "Vorki", count: 0 },
    ],
    [
      {
        kills: 300,
        killsPerHour: 30,
        table: table({ "Skeletal visage": 1 / 5000, "Draconic visage": 1 / 5000, "Superior dragon bones": 1 }),
      },
    ],
  );

  assert.equal(result.kills, 300);
  assertClose(result.hours, 10);

  const [skeletal, draconic, bones, vorki] = result.items;
  assert.equal(skeletal.status, "counted");
  assertClose(skeletal.expected, 0.06);
  assertClose(skeletal.ratio, 1 / 0.06);
  assertClose(skeletal.hoursWorth, 10 / 0.06);
  assert.equal(skeletal.hoursToObtain, undefined);

  assert.equal(draconic.status, "counted");
  assert.equal(draconic.ratio, 0);
  assertClose(draconic.hoursToObtain, 1 / ((1 / 5000) * 30));

  assert.equal(bones.status, "trivial");
  assert.equal(vorki.status, "unknown");

  assertClose(result.ratio, 1 / 0.06 / 2);
  assertClose(result.luckyHours, (1 / 0.06 / 2 - 1) * 10);
  assertClose(result.hoursToFinishFromZero, 7500 / 30);
  assertClose(result.hoursToFinishRemaining, 5000 / 30);
});

test("analyzeBoss marks items with expected counts at the cap as trivial", () => {
  const result = analyzeBoss(
    vorkath,
    [{ id: 1, name: "Blue dragonhide", count: 10 }],
    [{ kills: 300, killsPerHour: 30, table: table({ "Blue dragonhide": 1 }) }],
  );
  assert.equal(result.items[0].status, "trivial");
  assert.equal(result.ratio, undefined);
});

test("analyzeBoss honours exclude and overrides", () => {
  const entry: BossEntry = { ...vorkath, exclude: ["Jar of Decay"], overrides: { Vorki: 1 / 3000 } };
  const result = analyzeBoss(
    entry,
    [
      { id: 1, name: "Jar of Decay", count: 0 },
      { id: 2, name: "Vorki", count: 0 },
    ],
    [{ kills: 300, killsPerHour: 30, table: table({ "Jar of Decay": 1 / 3000 }) }],
  );
  assert.equal(result.items[0].status, "trivial");
  assert.equal(result.items[1].status, "counted");
  assertClose(result.items[1].expected, 0.1);
});

test("analyzeBoss omits hours when a source has no kills-per-hour rate", () => {
  const result = analyzeBoss(
    vorkath,
    [{ id: 1, name: "Skeletal visage", count: 0 }],
    [{ kills: 300, killsPerHour: 0, table: table({ "Skeletal visage": 1 / 5000 }) }],
  );
  assert.equal(result.hours, undefined);
  assert.equal(result.ratio, 0);
  assert.equal(result.luckyHours, undefined);
  assert.equal(result.items[0].hoursToObtain, undefined);
  assert.equal(result.hoursToFinishFromZero, undefined);
});

test("analyzeBoss mixes sources by kills and ignores sources without kills", () => {
  const entry: BossEntry = {
    name: "Mixed",
    category: "mixed",
    sources: [
      { templeBoss: "A", wikiPage: "A" },
      { templeBoss: "B", wikiPage: "B" },
      { templeBoss: "C", wikiPage: "C" },
    ],
  };
  const result = analyzeBoss(
    entry,
    [{ id: 1, name: "Pet", count: 0 }],
    [
      { kills: 100, killsPerHour: 50, table: table({ Pet: 1 / 100 }) },
      { kills: 300, killsPerHour: 100, table: table({ Pet: 1 / 300 }) },
      { kills: 0, killsPerHour: undefined, table: undefined },
    ],
  );
  assert.equal(result.kills, 400);
  assertClose(result.hours, 5);
  assertClose(result.items[0].expected, 2);
  assertClose(result.items[0].probability, 0.005);
  assertClose(result.items[0].hoursToObtain, 2.5);
});

test("analyzeBoss marks every item unknown when the wiki fetch failed", () => {
  const result = analyzeBoss(
    vorkath,
    [{ id: 1, name: "Skeletal visage", count: 0 }],
    [{ kills: 300, killsPerHour: 30, table: undefined }],
  );
  assert.equal(result.items[0].status, "unknown");
  assert.equal(result.ratio, undefined);
});

function boss(name: string, ratio: number | undefined, hours: number | undefined, kills = 100): BossResult {
  return {
    name,
    kills,
    ratio,
    hours,
    luckyHours: ratio == null || hours == null ? undefined : (ratio - 1) * hours,
    items: [],
  };
}

test("analyzeAccount weights by hours and falls back to kills / 60", () => {
  const account = analyzeAccount([
    boss("A", 2, 1),
    boss("B", 0.5, 3),
    boss("C", 1, undefined, 120),
    boss("D", undefined, 5),
  ]);
  assertClose(account.ratio, (2 * 1 + 0.5 * 3 + 1 * 2) / 6);
  assertClose(account.hours, 4);
  assertClose(account.luckyHours, 1 - 1.5);
  assert.equal(account.analyzed, 3);
});

test("analyzeAccount ranks bosses with at least an hour without overlap", () => {
  const account = analyzeAccount([
    boss("A", 3, 2),
    boss("B", 2, 2),
    boss("C", 0.2, 2),
    boss("D", 9, 0.5),
  ]);
  assert.deepEqual(account.luckiest.map((result) => result.name), ["A", "B", "C"]);
  assert.deepEqual(account.unluckiest.map((result) => result.name), []);

  const larger = analyzeAccount(["A", "B", "C", "D", "E", "F", "G"].map((name, i) => boss(name, i + 1, 2)));
  assert.deepEqual(larger.luckiest.map((result) => result.name), ["G", "F", "E"]);
  assert.deepEqual(larger.unluckiest.map((result) => result.name), ["A", "B", "C"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, with an error that `./luck.ts` cannot be found.

- [ ] **Step 3: Implement the luck math**

Create `src/commands/how-lucky-am-i/utils/luck.ts`:

```ts
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

  const notDone = (t: number): number => 1 - rates.reduce((product, p) => product * (1 - Math.exp(-p * t)), 1);

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

function rateFor(entry: BossEntry, itemName: string, table: DropTable | undefined): ItemRate | undefined {
  const override = entry.overrides?.[itemName];
  if (override != null) {
    return { probability: override, expectedPerKill: override };
  }
  return table?.get(itemName.toLowerCase());
}

export function analyzeBoss(entry: BossEntry, clogItems: ClogItem[], sources: SourceInput[]): BossResult {
  const active = sources.filter((source) => source.kills > 0);
  const kills = active.reduce((sum, source) => sum + source.kills, 0);
  const hasHours = active.length > 0 && active.every((source) => (source.killsPerHour ?? 0) > 0);
  const hours = hasHours
    ? active.reduce((sum, source) => sum + source.kills / (source.killsPerHour ?? 1), 0)
    : undefined;
  const excluded = new Set((entry.exclude ?? []).map((name) => name.toLowerCase()));

  const items = clogItems.map((item): ItemResult => {
    const base = { name: item.name, actual: item.count };
    const rates = active.map((source) => rateFor(entry, item.name, source.table));
    if (kills === 0 || rates.some((rate) => rate == null)) {
      return { ...base, status: "unknown" };
    }

    const known = rates as ItemRate[];
    const expected = active.reduce((sum, source, i) => sum + source.kills * known[i].expectedPerKill, 0);
    if (expected <= 0) {
      return { ...base, status: "unknown" };
    }
    if (item.count >= trivialCap || expected >= trivialCap || excluded.has(item.name.toLowerCase())) {
      return { ...base, status: "trivial", expected };
    }

    const probability = active.reduce((sum, source, i) => sum + source.kills * known[i].probability, 0) / kills;
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
    counted.length > 0 ? counted.reduce((sum, item) => sum + (item.ratio ?? 0), 0) / counted.length : undefined;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `pnpm format && pnpm typecheck && pnpm lint`

```bash
git add src/commands/how-lucky-am-i/utils/luck.ts src/commands/how-lucky-am-i/utils/luck.test.ts
git commit -m "Add luck math for /how-lucky-am-i"
```

---

### Task 7: Embeds, command, wiring, and docs

**Files:**
- Create: `src/commands/how-lucky-am-i/utils/format.ts`
- Test: `src/commands/how-lucky-am-i/utils/format.test.ts`
- Create: `src/commands/how-lucky-am-i/index.ts`
- Modify: `src/index.ts`
- Modify: `src/bot_commands.ts`
- Modify: `README.md` (Commands section)

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces:
  - From `format.ts`: `formatRatio(ratio: number): string`, `luckLabel(ratio: number): string`, `formatHours(hours: number): string`, `formatSignedHours(hours: number): string`, `bossEmbed(player: string, result: BossResult, lastChecked: string | null): EmbedBuilder`, `summaryEmbed(player: string, account: AccountResult, lastChecked: string | null): EmbedBuilder`
  - From `index.ts`: `createCommand(): SlashCommandOptionsOnlyBuilder`, `autocomplete(interaction: AutocompleteInteraction): Promise<void>`, `execute(interaction: ChatInputCommandInteraction): Promise<void>`

- [ ] **Step 1: Write the failing formatting tests**

Create `src/commands/how-lucky-am-i/utils/format.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHours, formatRatio, formatSignedHours, luckLabel } from "./format.ts";

test("formatRatio uses two decimals", () => {
  assert.equal(formatRatio(1.178), "1.18×");
});

test("luckLabel has an average band around 1", () => {
  assert.equal(luckLabel(1.2), "lucky");
  assert.equal(luckLabel(1.02), "about average");
  assert.equal(luckLabel(0.97), "about average");
  assert.equal(luckLabel(0.5), "unlucky");
});

test("formatHours and formatSignedHours use one decimal", () => {
  assert.equal(formatHours(12.34), "12.3h");
  assert.equal(formatSignedHours(14.25), "+14.3h");
  assert.equal(formatSignedHours(-3), "-3.0h");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, with an error that `./format.ts` cannot be found.

- [ ] **Step 3: Implement the embeds**

Create `src/commands/how-lucky-am-i/utils/format.ts`:

```ts
import { EmbedBuilder } from "discord.js";
import type { AccountResult, BossResult, ItemResult } from "./luck.ts";

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}×`;
}

export function luckLabel(ratio: number): string {
  if (ratio >= 1.05) {
    return "lucky";
  }
  if (ratio <= 0.95) {
    return "unlucky";
  }
  return "about average";
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export function formatSignedHours(hours: number): string {
  return `${hours >= 0 ? "+" : "-"}${formatHours(Math.abs(hours))}`;
}

function formatExpected(expected: number): string {
  return expected < 10 ? expected.toFixed(2) : expected.toFixed(0);
}

function syncFooter(lastChecked: string | null): string {
  return `Log last synced: ${lastChecked ?? "never"}`;
}

function itemLine(item: ItemResult): string {
  switch (item.status) {
    case "unknown":
      return `${item.name}: ${item.actual} (rate unknown)`;
    case "trivial":
      return `~~${item.name}: ${item.actual}~~ (trivial)`;
    case "counted": {
      const line = `${item.name}: ${item.actual} / ${formatExpected(item.expected ?? 0)} expected (${formatRatio(item.ratio ?? 0)})`;
      return item.hoursToObtain == null ? line : `${line}, ~${formatHours(item.hoursToObtain)} on average`;
    }
  }
}

export function bossEmbed(player: string, result: BossResult, lastChecked: string | null): EmbedBuilder {
  const summary = [
    `Kills: ${result.kills}`,
    result.hours == null ? "Hours spent: unknown (no Temple rate)" : `Hours spent: ${formatHours(result.hours)}`,
    result.ratio == null
      ? "Luck: not enough known drop rates"
      : `Luck: ${formatRatio(result.ratio)} (${luckLabel(result.ratio)})`,
  ];
  if (result.luckyHours != null) {
    summary.push(`Lucky hours: ${formatSignedHours(result.luckyHours)}`);
  }
  if (result.hoursToFinishFromZero != null && result.hoursToFinishRemaining != null) {
    summary.push(
      `Log completion: ~${formatHours(result.hoursToFinishFromZero)} from zero, ` +
        `~${formatHours(result.hoursToFinishRemaining)} remaining`,
    );
  }

  const description = `${summary.join("\n")}\n\n${result.items.map(itemLine).join("\n")}`;
  return new EmbedBuilder()
    .setTitle(`How lucky is ${player} at ${result.name}?`)
    .setDescription(description.slice(0, 4096))
    .setFooter({ text: syncFooter(lastChecked) });
}

export function summaryEmbed(player: string, account: AccountResult, lastChecked: string | null): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`How lucky is ${player}?`)
    .setFooter({ text: syncFooter(lastChecked) });

  if (account.ratio == null) {
    return embed.setDescription("No bosses with known drop rates to analyze.");
  }

  embed.setDescription(
    [
      `Overall: ${formatRatio(account.ratio)} (${luckLabel(account.ratio)})`,
      `Hours spent: ${formatHours(account.hours)}`,
      `Lucky hours: ${formatSignedHours(account.luckyHours)}`,
      `Bosses analyzed: ${account.analyzed}`,
    ].join("\n"),
  );

  const rankLine = (result: BossResult): string => `${result.name}: ${formatRatio(result.ratio ?? 0)}`;
  if (account.luckiest.length > 0) {
    embed.addFields({ name: "Luckiest", value: account.luckiest.map(rankLine).join("\n"), inline: true });
  }
  if (account.unluckiest.length > 0) {
    embed.addFields({ name: "Unluckiest", value: account.unluckiest.map(rankLine).join("\n"), inline: true });
  }
  return embed;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Implement the command**

Create `src/commands/how-lucky-am-i/index.ts`:

```ts
import {
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { getOsrsName } from "../../registry.ts";
import { bosses, findBoss, searchBosses, type BossEntry } from "./utils/bosses.ts";
import { bossEmbed, summaryEmbed } from "./utils/format.ts";
import { analyzeAccount, analyzeBoss, type SourceInput } from "./utils/luck.ts";
import {
  fetchCollectionLog,
  fetchKillsPerHour,
  fetchPlayerStats,
  TempleError,
  type PlayerStats,
  type TempleErrorKind,
} from "./utils/temple.ts";
import { buildDropTable, getDropRows, type DropRow } from "./utils/wiki.ts";

export function createCommand(): SlashCommandOptionsOnlyBuilder {
  return new SlashCommandBuilder()
    .setName("how-lucky-am-i")
    .setDescription("Compares your boss collection log against drop rates")
    .addStringOption((option) =>
      option.setName("username").setDescription("What is your osrs username? Defaults to your /iam name"),
    )
    .addStringOption((option) =>
      option.setName("boss").setDescription("Show a single boss").setAutocomplete(true),
    );
}

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const query = interaction.options.getFocused();
  await interaction.respond(searchBosses(query).map((boss) => ({ name: boss.name, value: boss.name })));
}

const templeErrorMessages: Record<TempleErrorKind, string> = {
  not_found: "That player isn't tracked on TempleOSRS. Look them up on https://templeosrs.com first.",
  not_synced:
    "That player hasn't synced their collection log. Sync it with the TempleOSRS RuneLite plugin, then try again.",
  unavailable: "Temple is unavailable, try again later.",
};

function killsAt(stats: PlayerStats, templeBoss: string): number {
  return stats.kills.get(templeBoss) ?? 0;
}

function totalKills(entry: BossEntry, stats: PlayerStats): number {
  return entry.sources.reduce((sum, source) => sum + killsAt(stats, source.templeBoss), 0);
}

function sourceInputs(
  entry: BossEntry,
  stats: PlayerStats,
  killsPerHour: Map<string, number>,
  rows: Map<string, DropRow[]>,
): SourceInput[] {
  return entry.sources.map((source) => {
    const pageRows = rows.get(source.wikiPage);
    const sourceRows =
      pageRows == null || source.droppedFrom == null
        ? pageRows
        : pageRows.filter((row) => row.droppedFrom === source.droppedFrom);
    return {
      kills: killsAt(stats, source.templeBoss),
      killsPerHour: killsPerHour.get(source.templeBoss),
      table: sourceRows == null ? undefined : buildDropTable(sourceRows),
    };
  });
}

/**
 * Compares a player's boss collection log against osrs wiki drop rates.
 *
 * /how-lucky-am-i
 * /how-lucky-am-i username:"a half orc" boss:"Vorkath"
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const player = interaction.options.getString("username") ?? getOsrsName(interaction.user.id);
  if (player == null) {
    await interaction.editReply("Pass a `username` or register with `/iam` first.");
    return;
  }

  const bossName = interaction.options.getString("boss");
  const boss = bossName == null ? undefined : findBoss(bossName);
  if (bossName != null && boss == null) {
    await interaction.editReply(`Unknown boss \`${bossName}\`.`);
    return;
  }
  const entries = boss == null ? bosses : [boss];

  try {
    const [stats, log] = await Promise.all([
      fetchPlayerStats(player),
      fetchCollectionLog(
        player,
        entries.map((entry) => entry.category),
      ),
    ]);
    const killsPerHour = await fetchKillsPerHour(stats.gameMode);

    const played = entries.filter((entry) => totalKills(entry, stats) > 0);
    if (played.length === 0) {
      await interaction.editReply(
        boss == null ? `\`${player}\` has no kills at supported bosses.` : `\`${player}\` has no ${boss.name} kills.`,
      );
      return;
    }

    const pages = played.flatMap((entry) =>
      entry.sources.filter((source) => killsAt(stats, source.templeBoss) > 0).map((source) => source.wikiPage),
    );
    const rows = await getDropRows(pages);

    const results = played.map((entry) =>
      analyzeBoss(entry, log.categories.get(entry.category) ?? [], sourceInputs(entry, stats, killsPerHour, rows)),
    );
    const embed =
      boss == null
        ? summaryEmbed(player, analyzeAccount(results), log.lastChecked)
        : bossEmbed(player, results[0], log.lastChecked);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof TempleError) {
      await interaction.editReply(templeErrorMessages[error.kind]);
      return;
    }
    throw error;
  }
}
```

- [ ] **Step 6: Wire the command into the bot**

In `src/bot_commands.ts`, add this import after the other command imports:

```ts
import { createCommand as createHowLuckyAmICommand } from "./commands/how-lucky-am-i/index.ts";
```

and add `createHowLuckyAmICommand().toJSON(),` as the last element of the `commands` array.

In `src/index.ts`:

1. Change the first import line to:

```ts
import {
  Client,
  Events,
  GatewayIntentBits,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
```

2. Add after the other command imports:

```ts
import { autocomplete as howLuckyAmIAutocomplete } from "./commands/how-lucky-am-i/index.ts";
import { execute as howLuckyAmI } from "./commands/how-lucky-am-i/index.ts";
```

3. Add `"how-lucky-am-i": howLuckyAmI,` to the `executors` object, and add below it:

```ts
const autocompleters: Record<string, (interaction: AutocompleteInteraction) => Promise<void>> = {
  "how-lucky-am-i": howLuckyAmIAutocomplete,
};
```

4. Replace the whole `client.on(Events.InteractionCreate, ...)` handler with the version below. It routes autocomplete, and it uses `editReply` when the command already deferred, because `reply` throws after a defer:

```ts
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    try {
      await autocompleters[interaction.commandName]?.(interaction);
    } catch (error) {
      console.log(`${interaction.commandName} autocomplete failed with error ${error}.`);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  try {
    console.log(`Running ${interaction.commandName}...`);
    const execute = executors[interaction.commandName];
    if (execute) {
      await execute(interaction);
    } else {
      console.log(`${interaction.commandName} unknown.`);
    }
  } catch (error) {
    console.log(`${interaction.commandName} failed with error ${error}.`);
    const content = `Failed to process command ${interaction.commandName}.`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
});
```

- [ ] **Step 7: Run all checks**

Run: `pnpm format && pnpm check`
Expected: typecheck, lint, format check and all tests pass.

- [ ] **Step 8: Smoke test the pipeline without Discord**

Run:

```bash
pnpm exec tsx --eval '
(async () => {
const b = await import("./src/commands/how-lucky-am-i/utils/bosses.ts");
const t = await import("./src/commands/how-lucky-am-i/utils/temple.ts");
const w = await import("./src/commands/how-lucky-am-i/utils/wiki.ts");
const l = await import("./src/commands/how-lucky-am-i/utils/luck.ts");
const entry = b.findBoss("Vorkath");
const stats = await t.fetchPlayerStats("Mikael");
const log = await t.fetchCollectionLog("Mikael", [entry.category]);
const kph = await t.fetchKillsPerHour(stats.gameMode);
const rows = await w.getDropRows(["Vorkath"]);
const result = l.analyzeBoss(entry, log.categories.get("vorkath") ?? [], [{ kills: stats.kills.get("Vorkath") ?? 0, killsPerHour: kph.get("Vorkath"), table: w.buildDropTable(rows.get("Vorkath") ?? []) }]);
console.log(JSON.stringify(result, null, 2));
})();
'
```

Expected: a `BossResult` with `name: "Vorkath"`, `kills` above 0, `hours` defined, most items `"counted"`, "Vorkath's head" counted with a ratio near 1, and finite `hoursToFinishFromZero` and `hoursToFinishRemaining`.

- [ ] **Step 9: Document the command**

In `README.md`, under `## Commands`, add after the `/price` line:

```markdown
`/how-lucky-am-i` - compares your boss collection log (from TempleOSRS) against osrs wiki drop rates, as a luck ratio and in hours. Takes an optional `username` (defaults to your `/iam` name) and an optional `boss` for a per-item breakdown
```

- [ ] **Step 10: Commit**

`README.md` already has unrelated uncommitted changes from the user. Commit only the code files:

```bash
git add src/commands/how-lucky-am-i/index.ts src/commands/how-lucky-am-i/utils/format.ts src/commands/how-lucky-am-i/utils/format.test.ts src/index.ts src/bot_commands.ts
git commit -m "Add /how-lucky-am-i command"
```

Leave the README edit uncommitted alongside the user's other README changes, and mention it in the handoff.

- [ ] **Step 11: Manual Discord verification (needs the user's `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`)**

Run `pnpm commands`, then `pnpm start`. In Discord:

1. `/how-lucky-am-i`: replies "Pass a `username` or register with `/iam` first."
2. `/iam osrsuser:Mikael`, then `/how-lucky-am-i`: summary embed with overall ratio, hours, lucky hours, and luckiest and unluckiest fields.
3. `/how-lucky-am-i boss:` shows autocomplete suggestions. Choosing `Vorkath` gives the boss embed with item lines and log completion hours.
4. `/how-lucky-am-i username:zzqqxxnotreal123`: replies with the "isn't tracked on TempleOSRS" message.
5. `/how-lucky-am-i boss:Dagannoth Kings username:Mikael`: boss embed combining all three kings.
