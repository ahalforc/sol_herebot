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
