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
