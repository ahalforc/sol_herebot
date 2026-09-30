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
    row({
      itemName: "Zulrah's scales",
      rarity: "5/249",
      rolls: 2,
      quantityLow: 500,
      quantityHigh: 500,
    }),
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
