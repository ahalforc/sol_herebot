import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPriceList } from "./prices.ts";

const ids = new Map([
  ["twisted bow", 1],
  ["obligator (uncharged)", 2],
  ["scythe of vitur (uncharged)", 3],
]);
const prices = {
  "1": { high: 1_500_000_000, low: 1_400_000_000 },
  "2": { high: null, low: 40_000_000 },
  "3": { high: null, low: null },
};

test("buildPriceList sorts by price, falls back to low and reports unpriced items", () => {
  const items = [
    { name: "Obligator (uncharged)", source: "TFA", oneInPurples: 15 },
    { name: "Twisted bow", source: "CoX", oneInPurples: 30 },
    { name: "Scythe of Vitur (uncharged)", source: "ToB", oneInPurples: 19 },
  ];
  const list = buildPriceList(items, ids, prices);
  assert.deepEqual(list.priced, [
    { ...items[1], price: 1_500_000_000 },
    { ...items[0], price: 40_000_000 },
  ]);
  assert.deepEqual(list.missing, ["Scythe of Vitur (uncharged)"]);
});
