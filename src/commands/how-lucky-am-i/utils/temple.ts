import { getJson } from "./http.ts";

const templeApi = "https://templeosrs.com/api";

export type TempleErrorKind = "not_found" | "not_synced" | "unavailable";

export class TempleError extends Error {
  readonly kind: TempleErrorKind;

  constructor(kind: TempleErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export type TempleResponse = {
  data?: unknown;
  error?: { Code?: number; Message?: string };
};

export type PlayerStats = {
  gameMode: number;
  /** Positive stat values keyed by Temple name, e.g. "Vorkath". */
  kills: Map<string, number>;
};

export type ClogItem = {
  id: number;
  name: string;
  count: number;
};

export type CollectionLog = {
  lastChecked: string | null;
  categories: Map<string, ClogItem[]>;
};

export function unwrap(response: TempleResponse): unknown {
  if (response.error != null) {
    const message = response.error.Message ?? "Unknown Temple error";
    if (/synced/i.test(message)) {
      throw new TempleError("not_synced", message);
    }
    if (/not found/i.test(message)) {
      throw new TempleError("not_found", message);
    }
    throw new TempleError("unavailable", message);
  }
  if (response.data == null) {
    throw new TempleError("unavailable", "Temple returned no data");
  }
  return response.data;
}

async function getTemple(path: string, params: Record<string, string>): Promise<unknown> {
  let response: TempleResponse;
  try {
    response = (await getJson(
      `${templeApi}/${path}?${new URLSearchParams(params)}`,
    )) as TempleResponse;
  } catch (error) {
    throw new TempleError("unavailable", `${error}`);
  }
  return unwrap(response);
}

export function parsePlayerStats(data: unknown): PlayerStats {
  const record = data as Record<string, unknown> & { info?: { "Game mode"?: number } };
  const kills = new Map<string, number>();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "number" && value > 0) {
      kills.set(key, value);
    }
  }
  return { gameMode: record.info?.["Game mode"] ?? 0, kills };
}

export function parseCollectionLog(data: unknown): CollectionLog {
  const record = data as { last_checked?: string | null; items?: Record<string, ClogItem[]> };
  return {
    lastChecked: record.last_checked ?? null,
    categories: new Map(Object.entries(record.items ?? {})),
  };
}

export function parseKillsPerHour(data: unknown): Map<string, number> {
  const record = data as { rates?: Record<string, number> };
  return new Map(Object.entries(record.rates ?? {}));
}

export function rateType(gameMode: number): "main" | "im" | "uim" {
  if (gameMode === 2) {
    return "uim";
  }
  if (gameMode === 1 || gameMode === 3) {
    return "im";
  }
  return "main";
}

export async function fetchPlayerStats(player: string): Promise<PlayerStats> {
  return parsePlayerStats(await getTemple("player_stats.php", { player, bosses: "1" }));
}

export async function fetchCollectionLog(
  player: string,
  categories: string[],
): Promise<CollectionLog> {
  return parseCollectionLog(
    await getTemple("collection-log/player_collection_log.php", {
      player,
      categories: categories.join(","),
      includenames: "1",
      includemissingitems: "1",
    }),
  );
}

export async function fetchKillsPerHour(gameMode: number): Promise<Map<string, number>> {
  return parseKillsPerHour(await getTemple("rates/ehb_rates.php", { rate: rateType(gameMode) }));
}
