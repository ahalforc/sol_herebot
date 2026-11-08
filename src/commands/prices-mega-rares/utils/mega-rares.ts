export type MegaRare = {
  /** Exact osrs item name. */
  name: string;
  /** Where it drops from. */
  source: string;
  /** The item is 1 in this many purples from its source. */
  oneInPurples: number;
};

/**
 * The current mega-rares.
 *
 * Odds are per purple (derived from each source's unique weightings: toa 1/24, tob 1/19,
 * tfa 1/15, cox 2/60), not per kill or raid.
 */
export const megaRares: MegaRare[] = [
  { name: "Tumeken's shadow (uncharged)", source: "Tombs of Amascut", oneInPurples: 24 },
  { name: "Scythe of Vitur (uncharged)", source: "Theatre of Blood", oneInPurples: 19 },
  { name: "Obligator (uncharged)", source: "The Fractured Archive", oneInPurples: 15 },
  { name: "Twisted bow", source: "Chambers of Xeric", oneInPurples: 30 },
];
