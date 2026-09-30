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
  assert.equal(
    kindOf(() => unwrap({ error: { Code: 402, Message: "User not found in database" } })),
    "not_found",
  );
  assert.equal(
    kindOf(() =>
      unwrap({
        error: {
          Code: 402,
          Message: "Player has not synced their collection log on TempleOSRS yet.",
        },
      }),
    ),
    "not_synced",
  );
  assert.equal(
    kindOf(() => unwrap({ error: { Code: 500, Message: "Something broke" } })),
    "unavailable",
  );
  assert.equal(
    kindOf(() => unwrap({})),
    "unavailable",
  );
});

test("parsePlayerStats reads game mode and positive kill counts", () => {
  const stats = parsePlayerStats({
    info: { Username: "Mikael", "Game mode": 1 },
    Vorkath: 300,
    Vorkath_ehb: 8.8,
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
