import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPriceList } from "./prices.ts";

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
  const list = buildPriceList(["Elder maul", "Twisted bow", "Dragon claws", "Nope"], ids, prices);
  assert.deepEqual(list.priced, [
    { name: "Twisted bow", price: 1_500_000_000 },
    { name: "Elder maul", price: 40_000_000 },
  ]);
  assert.deepEqual(list.missing, ["Dragon claws", "Nope"]);
});
