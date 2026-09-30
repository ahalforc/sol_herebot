import {
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { getOsrsName } from "../../registry.ts";
import { bosses, findBoss, searchBosses, type BossEntry } from "./utils/bosses.ts";
import { bossEmbed, summaryEmbed } from "./utils/format.ts";
import { analyzeAccount, analyzeBoss, type SourceInput } from "./utils/luck.ts";
import {
  fetchCollectionLog,
  fetchKillsPerHour,
  fetchPlayerStats,
  TempleError,
  type PlayerStats,
  type TempleErrorKind,
} from "./utils/temple.ts";
import { buildDropTable, getDropRows, type DropRow } from "./utils/wiki.ts";

export function createCommand(): SlashCommandOptionsOnlyBuilder {
  return new SlashCommandBuilder()
    .setName("how-lucky-am-i")
    .setDescription("Compares your boss collection log against drop rates")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("What is your osrs username? Defaults to your /iam name")
        .setMaxLength(12),
    )
    .addStringOption((option) =>
      option.setName("boss").setDescription("Show a single boss").setAutocomplete(true),
    );
}

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const query = interaction.options.getFocused();
  await interaction.respond(
    searchBosses(query).map((boss) => ({ name: boss.name, value: boss.name })),
  );
}

const templeErrorMessages: Record<TempleErrorKind, string> = {
  not_found:
    "That player isn't tracked on TempleOSRS. Look them up on https://templeosrs.com first.",
  not_synced:
    "That player hasn't synced their collection log. Sync it with the TempleOSRS RuneLite plugin, then try again.",
  unavailable: "Temple is unavailable, try again later.",
};

function killsAt(stats: PlayerStats, templeBoss: string): number {
  return stats.kills.get(templeBoss) ?? 0;
}

function totalKills(entry: BossEntry, stats: PlayerStats): number {
  return entry.sources.reduce((sum, source) => sum + killsAt(stats, source.templeBoss), 0);
}

function sourceInputs(
  entry: BossEntry,
  stats: PlayerStats,
  killsPerHour: Map<string, number>,
  rows: Map<string, DropRow[]>,
): SourceInput[] {
  return entry.sources.map((source) => {
    const pageRows = rows.get(source.wikiPage);
    const sourceRows =
      pageRows == null || source.droppedFrom == null
        ? pageRows
        : pageRows.filter((row) => row.droppedFrom === source.droppedFrom);
    return {
      kills: killsAt(stats, source.templeBoss),
      killsPerHour: killsPerHour.get(source.templeBoss),
      table: sourceRows == null ? undefined : buildDropTable(sourceRows),
    };
  });
}

/**
 * Compares a player's boss collection log against osrs wiki drop rates.
 *
 * /how-lucky-am-i
 * /how-lucky-am-i username:"a half orc" boss:"Vorkath"
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const player = interaction.options.getString("username") ?? getOsrsName(interaction.user.id);
  if (player == null) {
    await interaction.editReply("Pass a `username` or register with `/iam` first.");
    return;
  }

  const bossName = interaction.options.getString("boss");
  const boss = bossName == null ? undefined : findBoss(bossName);
  if (bossName != null && boss == null) {
    await interaction.editReply(`Unknown boss \`${bossName}\`.`);
    return;
  }
  const entries = boss == null ? bosses : [boss];

  try {
    const [stats, log] = await Promise.all([
      fetchPlayerStats(player),
      fetchCollectionLog(
        player,
        entries.map((entry) => entry.category),
      ),
    ]);
    const killsPerHour = await fetchKillsPerHour(stats.gameMode);

    const played = entries.filter((entry) => totalKills(entry, stats) > 0);
    if (played.length === 0) {
      await interaction.editReply(
        boss == null
          ? `\`${player}\` has no kills at supported bosses.`
          : `\`${player}\` has no ${boss.name} kills.`,
      );
      return;
    }

    const pages = played.flatMap((entry) =>
      entry.sources
        .filter((source) => killsAt(stats, source.templeBoss) > 0)
        .map((source) => source.wikiPage),
    );
    const rows = await getDropRows(pages);

    const results = played.map((entry) =>
      analyzeBoss(
        entry,
        log.categories.get(entry.category) ?? [],
        sourceInputs(entry, stats, killsPerHour, rows),
      ),
    );
    const embed =
      boss == null
        ? summaryEmbed(player, analyzeAccount(results), log.lastChecked)
        : bossEmbed(player, results[0], log.lastChecked);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof TempleError) {
      await interaction.editReply(templeErrorMessages[error.kind]);
      return;
    }
    throw error;
  }
}
