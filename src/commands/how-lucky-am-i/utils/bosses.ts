export type BossSource = {
  /** Boss name in Temple's player stats and kills-per-hour rates. */
  templeBoss: string;
  /** Wiki page holding the boss's drop table. */
  wikiPage: string;
  /** Only use drop rows with this exact "Dropped from" value. */
  droppedFrom?: string;
};

export type BossEntry = {
  name: string;
  /** Temple collection log category key. */
  category: string;
  sources: BossSource[];
  /** Per-kill probability by exact collection log item name, used instead of the wiki. */
  overrides?: Record<string, number>;
  /** Collection log item names that are always treated as trivial. */
  exclude?: string[];
};

function single(name: string, category: string, templeBoss: string, wikiPage: string): BossEntry {
  return { name, category, sources: [{ templeBoss, wikiPage }] };
}

const gauntletChest = "Reward Chest (The Gauntlet)";

/**
 * Standard bosses supported by /how-lucky-am-i, one entry per collection log category.
 */
export const bosses: BossEntry[] = [
  single("Abyssal Sire", "abyssal_sire", "Abyssal Sire", "Abyssal Sire"),
  single("Alchemical Hydra", "alchemical_hydra", "Alchemical Hydra", "Alchemical Hydra"),
  single("Amoxliatl", "amoxliatl", "Amoxliatl", "Amoxliatl"),
  single("Araxxor", "araxxor", "Araxxor", "Araxxor"),
  single("Brutus", "brutus", "Brutus", "Brutus"),
  single("Bryophyta", "bryophyta", "Bryophyta", "Bryophyta"),
  {
    name: "Callisto and Artio",
    category: "callisto_and_artio",
    sources: [
      { templeBoss: "Callisto", wikiPage: "Callisto" },
      { templeBoss: "Artio", wikiPage: "Artio" },
    ],
  },
  single("Cerberus", "cerberus", "Cerberus", "Cerberus"),
  single("Chaos Elemental", "chaos_elemental", "Chaos Elemental", "Chaos Elemental"),
  single("Chaos Fanatic", "chaos_fanatic", "Chaos Fanatic", "Chaos Fanatic"),
  single("Commander Zilyana", "commander_zilyana", "Commander Zilyana", "Commander Zilyana"),
  single("Corporeal Beast", "corporeal_beast", "Corporeal Beast", "Corporeal Beast"),
  single(
    "Crazy Archaeologist",
    "crazy_archaeologist",
    "Crazy Archaeologist",
    "Crazy archaeologist",
  ),
  {
    name: "Dagannoth Kings",
    category: "dagannoth_kings",
    sources: [
      { templeBoss: "Dagannoth Prime", wikiPage: "Dagannoth Prime" },
      { templeBoss: "Dagannoth Rex", wikiPage: "Dagannoth Rex" },
      { templeBoss: "Dagannoth Supreme", wikiPage: "Dagannoth Supreme" },
    ],
  },
  single(
    "Deranged Archaeologist",
    "deranged_archaeologist",
    "Deranged Archaeologist",
    "Deranged archaeologist",
  ),
  single("Doom of Mokhaiotl", "doom_of_mokhaiotl", "Doom of Mokhaiotl", "Doom of Mokhaiotl"),
  single("Duke Sucellus", "duke_sucellus", "Duke Sucellus", "Duke Sucellus"),
  single("The Fight Caves", "the_fight_caves", "TzTok-Jad", "TzTok-Jad"),
  {
    name: "The Gauntlet",
    category: "the_gauntlet",
    sources: [
      {
        templeBoss: "The Gauntlet",
        wikiPage: gauntletChest,
        droppedFrom: `${gauntletChest}#Regular`,
      },
      {
        templeBoss: "The Corrupted Gauntlet",
        wikiPage: gauntletChest,
        droppedFrom: `${gauntletChest}#Corrupted`,
      },
    ],
  },
  single("General Graardor", "general_graardor", "General Graardor", "General Graardor"),
  single("Giant Mole", "giant_mole", "Giant Mole", "Giant Mole"),
  single(
    "Grotesque Guardians",
    "grotesque_guardians",
    "Grotesque Guardians",
    "Grotesque Guardians",
  ),
  single("Hespori", "hespori", "Hespori", "Hespori"),
  single("The Hueycoatl", "hueycoatl", "Hueycoatl", "The Hueycoatl"),
  single("The Inferno", "the_inferno", "TzKal-Zuk", "TzKal-Zuk"),
  single("Kalphite Queen", "kalphite_queen", "Kalphite Queen", "Kalphite Queen"),
  single("King Black Dragon", "king_black_dragon", "King Black Dragon", "King Black Dragon"),
  single("Kraken", "kraken", "Kraken", "Kraken"),
  single("Kree'arra", "kree_arra", "KreeArra", "Kree'arra"),
  single("K'ril Tsutsaroth", "kril_tsutsaroth", "Kril Tsutsaroth", "K'ril Tsutsaroth"),
  single("The Leviathan", "the_leviathan", "The Leviathan", "The Leviathan"),
  single("The Mad Angel", "the_mad_angel", "Mad Angel", "Mad Angel"),
  {
    name: "Maggot King",
    category: "maggot_king",
    sources: [{ templeBoss: "Maggot King", wikiPage: "Maggot King", droppedFrom: "Maggot King" }],
  },
  single("Nex", "nex", "Nex", "Nex"),
  {
    name: "The Nightmare",
    category: "the_nightmare",
    sources: [
      { templeBoss: "The Nightmare", wikiPage: "The Nightmare" },
      { templeBoss: "Phosanis Nightmare", wikiPage: "Phosani's Nightmare" },
    ],
  },
  single("Obor", "obor", "Obor", "Obor"),
  single("Phantom Muspah", "phantom_muspah", "Phantom Muspah", "Phantom Muspah"),
  single("Sarachnis", "sarachnis", "Sarachnis", "Sarachnis"),
  single("Scorpia", "scorpia", "Scorpia", "Scorpia"),
  {
    name: "Scurrius",
    category: "scurrius",
    sources: [{ templeBoss: "Scurrius", wikiPage: "Scurrius", droppedFrom: "Scurrius#MVP" }],
  },
  single("Shellbane Gryphon", "shellbane_gryphon", "Shellbane Gryphon", "Shellbane gryphon"),
  single("Skotizo", "skotizo", "Skotizo", "Skotizo"),
  single(
    "Thermonuclear Smoke Devil",
    "thermonuclear_smoke_devil",
    "Thermonuclear Smoke Devil",
    "Thermonuclear smoke devil",
  ),
  single("Vardorvis", "vardorvis", "Vardorvis", "Vardorvis"),
  {
    name: "Venenatis and Spindel",
    category: "venenatis_and_spindel",
    sources: [
      { templeBoss: "Venenatis", wikiPage: "Venenatis" },
      { templeBoss: "Spindel", wikiPage: "Spindel" },
    ],
  },
  {
    name: "Vet'ion and Calvar'ion",
    category: "vetion_and_calvarion",
    sources: [
      { templeBoss: "Vetion", wikiPage: "Vet'ion" },
      { templeBoss: "Calvarion", wikiPage: "Calvar'ion" },
    ],
  },
  single("Vorkath", "vorkath", "Vorkath", "Vorkath"),
  single("The Whisperer", "the_whisperer", "The Whisperer", "The Whisperer"),
  {
    name: "Yama",
    category: "yama",
    sources: [{ templeBoss: "Yama", wikiPage: "Yama", droppedFrom: "Yama" }],
  },
  single("Zulrah", "zulrah", "Zulrah", "Zulrah"),
];

export function findBoss(name: string): BossEntry | undefined {
  const query = name.trim().toLowerCase();
  return bosses.find((boss) => boss.name.toLowerCase() === query);
}

export function searchBosses(query: string): BossEntry[] {
  const lowered = query.trim().toLowerCase();
  return bosses.filter((boss) => boss.name.toLowerCase().includes(lowered)).slice(0, 25);
}
