import Fuse from "fuse.js";

/**
 * User agent used to provide context to the osrs wiki.
 *
 * todo In the future this should include a discord contact.
 */
export const userAgent = "sol_herebot - experimental osrs discord bot";

/**
 * Cached osrs items.
 *
 * (item id to osrs item)
 */
const items = new Map<number, OsrsItem>();

class OsrsItem {
  id: number;
  name: string;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

export function getItem(id: number): OsrsItem | undefined {
  return items.get(id);
}

/**
 * Loads all items from the osrs wiki and caches them locally for a quick lookup.
 */
export async function loadAllItems(): Promise<void> {
  class ResponseItem {
    id: number;
    name: string;

    constructor(id: number, name: string) {
      this.id = id;
      this.name = name;
    }
  }

  const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/mapping`, {
    headers: {
      "User-Agent": userAgent,
    },
  });

  for (const item of (await response.json()) as ResponseItem[]) {
    items.set(item.id, new OsrsItem(item.id, item.name));
  }
}

/**
 * Tries to find the best matching osrs item's id for the given name.
 *
 * @param name - the osrs item name (or rough variation of the osrs item name)
 * @returns the best match osrs item's id
 */
export function fuzzySearchItemId(name: string): number | undefined {
  if (items.size == 0) {
    throw Error("no items to search");
  }

  const fuse = new Fuse(Array.from(items.values()), {
    // Includes the proximity score in the result objects.
    includeScore: true,
    // Sorts the result objects by their score (with the first being the closest).
    shouldSort: true,
    // Defines the minimum score a result object needs to be included.
    // 0.0 is a perfect match, and 1.0 is the opposite.
    threshold: 0.5,
    // What object field names to use for the search.
    keys: ["name"],
  });
  const result = fuse.search(name);

  if (result.length == 0) {
    throw Error(`no items for ${name}`);
  }

  return result[0].item.id;
}
