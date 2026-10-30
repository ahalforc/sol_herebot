import assert from "node:assert/strict";
import { test } from "node:test";
import { averagePurple, buildPriceList } from "./prices.ts";

const ids = new Map([
  ["twisted bow", 1],
  ["elder maul", 2],
  ["dragon claws", 3],
]);
const prices = {
  "1": { high: 1_500_000_000, low: 1_400_000_000 },
  "2": { high: null, low: 40_000_000 },
  "3": { high: null, low: null },
};

test("buildPriceList sorts by price, falls back to low and reports unpriced items", () => {
  const list = buildPriceList(
    [
      { name: "Elder maul", weight: 2 },
      { name: "Twisted bow", weight: 1 },
      { name: "Dragon claws", weight: 3 },
      { name: "Nope", weight: 1 },
    ],
    ids,
    prices,
  );
  assert.deepEqual(list.priced, [
    { name: "Twisted bow", price: 1_500_000_000, weight: 1 },
    { name: "Elder maul", price: 40_000_000, weight: 2 },
  ]);
  assert.deepEqual(list.missing, ["Dragon claws", "Nope"]);
});

test("averagePurple weights prices and ignores nothing-priced lists", () => {
  assert.equal(
    averagePurple([
      { name: "a", price: 100, weight: 1 },
      { name: "b", price: 400, weight: 3 },
    ]),
    325,
  );
  assert.equal(averagePurple([]), undefined);
});
