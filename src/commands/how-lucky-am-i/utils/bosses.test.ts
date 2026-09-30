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

test("pages with several drop tables pick one by Dropped from", () => {
  for (const [name, droppedFrom] of [
    ["Yama", "Yama"],
    ["Scurrius", "Scurrius#MVP"],
    ["Maggot King", "Maggot King"],
  ]) {
    assert.deepEqual(
      findBoss(name)?.sources.map((source) => source.droppedFrom),
      [droppedFrom],
    );
  }
});

test("searchBosses filters by substring and caps at 25", () => {
  assert.deepEqual(
    searchBosses("dagannoth").map((boss) => boss.name),
    ["Dagannoth Kings"],
  );
  assert.equal(searchBosses("").length, 25);
});
