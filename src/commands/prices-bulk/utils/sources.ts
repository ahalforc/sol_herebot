export type Unique = {
  /** Exact osrs item name. */
  name: string;
  /** Relative chance of being the item given by a purple, only meaningful against its source's other weights. */
  weight: number;
};

export type PriceSource = {
  /** Value of the command's `source` option. */
  key: string;
  name: string;
  wikiUrl: string;
  /** The source's uniques with their purple weightings. Untradeable uniques are left out. */
  items: Unique[];
};

/**
 * Sources supported by /prices-bulk.
 *
 * Weights come from the wiki's unique tables: tfa (approximate, from observed drops), toa (raid
 * levels 150-300, in 24ths), tob (normal mode) and cox (normal mode).
 */
export const sources: PriceSource[] = [
  {
    key: "tfa",
    name: "The Fractured Archive",
    wikiUrl: "https://oldschool.runescape.wiki/w/The_Fractured_Archive",
    items: [
      { name: "Horn of Bran", weight: 3 },
      { name: "Zorya's tome (uncharged)", weight: 4 },
      { name: "Rondache", weight: 5 },
      { name: "Ascension crossbows", weight: 2 },
      { name: "Obligator (uncharged)", weight: 1 },
    ],
  },
  {
    key: "toa",
    name: "Tombs of Amascut",
    wikiUrl: "https://oldschool.runescape.wiki/w/Tombs_of_Amascut",
    items: [
      { name: "Tumeken's shadow (uncharged)", weight: 1 },
      { name: "Elidinis' ward", weight: 3 },
      { name: "Osmumten's fang", weight: 7 },
      { name: "Lightbearer", weight: 7 },
      { name: "Masori mask", weight: 2 },
      { name: "Masori body", weight: 2 },
      { name: "Masori chaps", weight: 2 },
    ],
  },
  {
    key: "tob",
    name: "Theatre of Blood",
    wikiUrl: "https://oldschool.runescape.wiki/w/Theatre_of_Blood",
    items: [
      { name: "Scythe of Vitur (uncharged)", weight: 1 },
      { name: "Ghrazi rapier", weight: 2 },
      { name: "Sanguinesti staff (uncharged)", weight: 2 },
      { name: "Justiciar faceguard", weight: 2 },
      { name: "Justiciar chestguard", weight: 2 },
      { name: "Justiciar legguards", weight: 2 },
      { name: "Avernic defender hilt", weight: 8 },
    ],
  },
  {
    key: "cox",
    name: "Chambers of Xeric",
    wikiUrl: "https://oldschool.runescape.wiki/w/Chambers_of_Xeric",
    items: [
      { name: "Twisted bow", weight: 2 },
      { name: "Elder maul", weight: 2 },
      { name: "Kodai insignia", weight: 2 },
      { name: "Dragon claws", weight: 3 },
      { name: "Ancestral hat", weight: 4 },
      { name: "Ancestral robe top", weight: 4 },
      { name: "Ancestral robe bottom", weight: 4 },
      { name: "Dragon hunter crossbow", weight: 4 },
      { name: "Dinh's bulwark", weight: 3 },
      { name: "Dexterous prayer scroll", weight: 14 },
      { name: "Arcane prayer scroll", weight: 14 },
      { name: "Twisted buckler", weight: 4 },
    ],
  },
];

export function findSource(key: string): PriceSource | undefined {
  return sources.find((source) => source.key === key);
}
