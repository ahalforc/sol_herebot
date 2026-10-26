export type PriceSource = {
  /** Value of the command's `source` option. */
  key: string;
  name: string;
  wikiUrl: string;
  /** Exact osrs item names of the source's uniques. Untradeable uniques are left out. */
  items: string[];
};

/**
 * Sources supported by /prices-bulk.
 */
export const sources: PriceSource[] = [
  {
    key: "tfa",
    name: "The Fractured Archive",
    wikiUrl: "https://oldschool.runescape.wiki/w/The_Fractured_Archive",
    items: [
      "Horn of Bran",
      "Zorya's tome (uncharged)",
      "Rondache",
      "Ascension crossbows",
      "Obligator (uncharged)",
    ],
  },
  {
    key: "toa",
    name: "Tombs of Amascut",
    wikiUrl: "https://oldschool.runescape.wiki/w/Tombs_of_Amascut",
    items: [
      "Tumeken's shadow (uncharged)",
      "Elidinis' ward",
      "Osmumten's fang",
      "Lightbearer",
      "Masori mask",
      "Masori body",
      "Masori chaps",
    ],
  },
  {
    key: "tob",
    name: "Theatre of Blood",
    wikiUrl: "https://oldschool.runescape.wiki/w/Theatre_of_Blood",
    items: [
      "Scythe of Vitur (uncharged)",
      "Ghrazi rapier",
      "Sanguinesti staff (uncharged)",
      "Justiciar faceguard",
      "Justiciar chestguard",
      "Justiciar legguards",
      "Avernic defender hilt",
    ],
  },
  {
    key: "cox",
    name: "Chambers of Xeric",
    wikiUrl: "https://oldschool.runescape.wiki/w/Chambers_of_Xeric",
    items: [
      "Twisted bow",
      "Elder maul",
      "Kodai insignia",
      "Dragon claws",
      "Ancestral hat",
      "Ancestral robe top",
      "Ancestral robe bottom",
      "Dragon hunter crossbow",
      "Dinh's bulwark",
      "Dexterous prayer scroll",
      "Arcane prayer scroll",
      "Twisted buckler",
    ],
  },
];

export function findSource(key: string): PriceSource | undefined {
  return sources.find((source) => source.key === key);
}
