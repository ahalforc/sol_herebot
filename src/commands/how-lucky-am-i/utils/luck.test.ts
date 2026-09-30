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
    Object.entries(rates).map(([name, p]) => [
      name.toLowerCase(),
      { probability: p, expectedPerKill: p },
    ]),
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
        table: table({
          "Skeletal visage": 1 / 5000,
          "Draconic visage": 1 / 5000,
          "Superior dragon bones": 1,
        }),
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
  const entry: BossEntry = {
    ...vorkath,
    exclude: ["Jar of Decay"],
    overrides: { Vorki: 1 / 3000 },
  };
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

function boss(
  name: string,
  ratio: number | undefined,
  hours: number | undefined,
  kills = 100,
): BossResult {
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
  assert.deepEqual(
    account.luckiest.map((result) => result.name),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    account.unluckiest.map((result) => result.name),
    [],
  );

  const larger = analyzeAccount(
    ["A", "B", "C", "D", "E", "F", "G"].map((name, i) => boss(name, i + 1, 2)),
  );
  assert.deepEqual(
    larger.luckiest.map((result) => result.name),
    ["G", "F", "E"],
  );
  assert.deepEqual(
    larger.unluckiest.map((result) => result.name),
    ["A", "B", "C"],
  );
});
