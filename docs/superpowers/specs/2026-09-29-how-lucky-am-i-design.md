# `/how-lucky-am-i` design

## Goal

Tell an OSRS player how lucky they have been at bosses, by comparing their collection log against drop rates, both as a count ratio and in hours.

## Scope

- v1 covers standard bosses only. Raids (CoX, ToB, ToA), clue scrolls, and minigames are out of scope.
- `/iam` is changed to store registrations in memory so `/how-lucky-am-i` can default to the caller's registered name. Registrations are lost on restart; that is accepted for v1.

## Data sources

| Source | Endpoint | Used for |
| --- | --- | --- |
| TempleOSRS | `api/player_stats.php?player=<rsn>&bosses=1` | Boss kill counts, player game mode |
| TempleOSRS | `api/collection-log/player_collection_log.php?player=<rsn>&categories=<keys>&includenames=1&includemissingitems=1` | Collection log items (obtained and missing) with counts, sync timestamps |
| TempleOSRS | `api/rates/ehb_rates.php?rate=<main\|im\|uim>` | Kills per hour per boss |
| OSRS Wiki | `api.php?action=bucket&query=bucket('dropsline')...` | Item drop rarity, rolls, quantity per monster page |

Temple data is fetched fresh on every invocation. Wiki drop data is fetched just in time per wiki page and cached in memory (a `Map`) until the process restarts. Failed wiki fetches are not cached.

Game mode maps to the rate set: `0` → `main`, `1` and `3` → `im`, `2` → `uim`.

## Files

```
src/
  registry.ts
  commands/
    iam/index.ts
    how-lucky-am-i/
      index.ts
      utils/
        bosses.ts
        temple.ts
        wiki.ts
        luck.ts
        format.ts
```

- `src/registry.ts`: in-memory `Map<discordId, osrsName>` with `setOsrsName(discordId, osrsName)` and `getOsrsName(discordId)`. It lives at the top level because two commands use it (repo rule: shared helpers do not belong in a command slice).
- `src/commands/iam/index.ts`: calls `setOsrsName` instead of the commented-out `addIamEntry`.
- `how-lucky-am-i/index.ts`: `createCommand` and `execute`, plus the autocomplete handler for the `boss` option. It defers the reply, resolves the player, and dispatches to the summary or boss view.
- `utils/bosses.ts`: hand-written list of supported bosses. Each entry has the Temple boss name (e.g. `"KreeArra"`), the Temple collection log category key (e.g. `"kreearra"`), the wiki page name (e.g. `"Kree'arra"`), a display name, and optional `overrides` (item name → per-kill rate) and `exclude` (item names treated as trivial).
- `utils/temple.ts`: typed fetchers for the three Temple endpoints.
- `utils/wiki.ts`: batched `dropsline` fetch for a list of wiki pages, the in-memory cache, and rarity parsing.
- `utils/luck.ts`: pure math, with no network or Discord code.
- `utils/format.ts`: builds the summary and boss embeds.
- `src/index.ts` and `src/bot_commands.ts`: wiring only. `src/index.ts` also routes autocomplete interactions for this command.

## Command

`/how-lucky-am-i [username] [boss]`

- `username` (optional string): OSRS name. Falls back to the caller's `/iam` registration.
- `boss` (optional string, autocomplete from `bosses.ts` display names): shows the per-boss view. Omitting it shows the account-wide summary.

## Rarity parsing (`wiki.ts`)

- `"a/b"` (commas allowed, e.g. `"1/5,000"`) → `a / b` per roll.
- `"Always"` → `1`.
- Per-kill probability: `p = 1 - (1 - p_roll)^rolls`, where `rolls` comes from `drop_json.Rolls` (default 1).
- Average quantity `q = (Quantity Low + Quantity High) / 2`.
- If one item has several `dropsline` rows on the same page, their per-kill probabilities are combined as `1 - Π(1 - p_row)` and `q` is taken from the most likely row.
- Anything else (e.g. text with notes, conditional rates) is unparseable. A `bosses.ts` override takes precedence; without one, the item is "rate unknown".

## Luck math (`luck.ts`)

Per item, with kill count `KC`, per-kill probability `p`, average quantity `q`, and kills per hour `kph`:

- Expected count: `E = KC × p × q`.
- Item ratio: `actual / E`.
- Hours spent at boss: `KC / kph`.
- Hours the item's drops are worth: `actual / (p × q × kph)`. Item ratio equals hours worth ÷ hours spent.
- Average hours to obtain a missing item: `1 / (p × kph)`.

An item is excluded from the math and marked trivial if `actual ≥ 256`, `E ≥ 256`, or it is in the boss's `exclude` list. Items with unknown rates are also excluded. Excluded items are still listed in the boss view.

Per boss:

- Boss ratio: arithmetic mean of included item ratios. Rare hits are intentionally allowed to dominate.
- Lucky hours: `(boss ratio − 1) × hours spent`.
- Expected kills to finish the log: `∫₀^∞ (1 − Π_i (1 − e^(−p_i t))) dt`, integrated numerically over the included items. Reported from zero (all items) and remaining (only items with `actual = 0`), converted to hours by dividing by `kph`.
- If `kph` is `0` (e.g. Bryophyta, Obor, Hespori), count ratios are shown and all hours values are omitted.

Account-wide:

- Only bosses with `KC > 0` and at least one included item.
- Overall ratio: boss ratios averaged, weighted by hours spent. Bosses with `kph = 0` are weighted by `KC / 60` so they are not dropped.
- Total hours spent and total lucky hours are sums over bosses with `kph > 0`.
- Luckiest and unluckiest top 3 are drawn from bosses with at least 1 hour spent.

## Data flow

1. `deferReply()`.
2. Resolve username from the option or `getOsrsName(interaction.user.id)`. If neither exists, reply: "Pass a `username` or register with `/iam` first."
3. In parallel, fetch Temple player stats, the collection log (all mapped categories for the summary, or one for the boss view), and the kills-per-hour rates for the player's game mode.
4. Keep bosses with `KC > 0`. Fetch uncached wiki pages for those bosses in one batched `dropsline` query and cache the results.
5. Compute with `luck.ts`, render with `format.ts`, `editReply`.

## Errors

- Player not on Temple, or collection log never synced: explain and tell the player to sync with the TempleOSRS RuneLite plugin.
- Temple request fails: "Temple is unavailable, try again later."
- Wiki request fails: affected bosses show "rate unknown"; the rest still render.
- `boss` value not in `bosses.ts`: "Unknown boss".
- Every embed shows "Log last synced: <date>" from Temple's `last_checked`.

## Output

Summary embed: overall ratio with a lucky/unlucky label, total hours spent, total lucky hours, top 3 luckiest and unluckiest bosses with ratios, number of bosses analyzed, last sync date.

Boss embed: KC, hours spent, boss ratio, lucky hours; one line per item with actual vs expected and ratio; missing items show average hours to obtain; trivial and unknown-rate items are marked; expected hours to finish the log from zero and remaining; last sync date.

## Testing

Add `node:test` (built into Node, no new dependencies) and a `test` script in `package.json`.

- `luck.ts`: expected counts, ratios, hours, the 256 exclusion, `kph = 0` handling, and the coupon-collector integral (single item gives `1/p`; two equal items give `1.5/p`).
- `wiki.ts` rarity parsing: `"2/150"`, `"1/5,000"`, `"Always"`, multiple rolls, multiple rows for one item, unparseable text.

Temple, wiki, and Discord integration are verified manually against a real synced player.
