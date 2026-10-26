import assert from "node:assert/strict";
import { test } from "node:test";
import { formatGp } from "./format.ts";

test("formatGp uses compact units", () => {
  assert.equal(formatGp(1_250_000_000), "1.25b");
  assert.equal(formatGp(34_500_000), "34.5m");
  assert.equal(formatGp(120_000), "120k");
  assert.equal(formatGp(950), "950");
});
