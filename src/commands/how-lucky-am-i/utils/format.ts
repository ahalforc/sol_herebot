import { EmbedBuilder } from "discord.js";
import type { AccountResult, BossResult, ItemResult } from "./luck.ts";

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}×`;
}

export function luckLabel(ratio: number): string {
  if (ratio >= 1.05) {
    return "lucky";
  }
  if (ratio <= 0.95) {
    return "unlucky";
  }
  return "about average";
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export function formatSignedHours(hours: number): string {
  return `${hours >= 0 ? "+" : "-"}${formatHours(Math.abs(hours))}`;
}

function formatExpected(expected: number): string {
  return expected < 10 ? expected.toFixed(2) : expected.toFixed(0);
}

function syncFooter(lastChecked: string | null): string {
  return `Log last synced: ${lastChecked ?? "never"}`;
}

function itemLine(item: ItemResult): string {
  switch (item.status) {
    case "unknown":
      return `${item.name}: ${item.actual} (rate unknown)`;
    case "trivial":
      return `~~${item.name}: ${item.actual}~~ (trivial)`;
    case "counted": {
      const line = `${item.name}: ${item.actual} / ${formatExpected(item.expected ?? 0)} expected (${formatRatio(item.ratio ?? 0)})`;
      return item.hoursToObtain == null
        ? line
        : `${line}, ~${formatHours(item.hoursToObtain)} on average`;
    }
  }
}

export function bossEmbed(
  player: string,
  result: BossResult,
  lastChecked: string | null,
): EmbedBuilder {
  const summary = [
    `Kills: ${result.kills}`,
    result.hours == null
      ? "Hours spent: unknown (no Temple rate)"
      : `Hours spent: ${formatHours(result.hours)}`,
    result.ratio == null
      ? "Luck: not enough known drop rates"
      : `Luck: ${formatRatio(result.ratio)} (${luckLabel(result.ratio)})`,
  ];
  if (result.luckyHours != null) {
    summary.push(`Lucky hours: ${formatSignedHours(result.luckyHours)}`);
  }
  if (result.hoursToFinishFromZero != null && result.hoursToFinishRemaining != null) {
    summary.push(
      `Log completion: ~${formatHours(result.hoursToFinishFromZero)} from zero, ` +
        `~${formatHours(result.hoursToFinishRemaining)} remaining`,
    );
  }

  const description = `${summary.join("\n")}\n\n${result.items.map(itemLine).join("\n")}`;
  return new EmbedBuilder()
    .setTitle(`How lucky is ${player} at ${result.name}?`)
    .setDescription(description.slice(0, 4096))
    .setFooter({ text: syncFooter(lastChecked) });
}

export function summaryEmbed(
  player: string,
  account: AccountResult,
  lastChecked: string | null,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`How lucky is ${player}?`)
    .setFooter({ text: syncFooter(lastChecked) });

  if (account.ratio == null) {
    return embed.setDescription("No bosses with known drop rates to analyze.");
  }

  embed.setDescription(
    [
      `Overall: ${formatRatio(account.ratio)} (${luckLabel(account.ratio)})`,
      `Hours spent: ${formatHours(account.hours)}`,
      `Lucky hours: ${formatSignedHours(account.luckyHours)}`,
      `Bosses analyzed: ${account.analyzed}`,
    ].join("\n"),
  );

  const rankLine = (result: BossResult): string =>
    `${result.name}: ${formatRatio(result.ratio ?? 0)}`;
  if (account.luckiest.length > 0) {
    embed.addFields({
      name: "Luckiest",
      value: account.luckiest.map(rankLine).join("\n"),
      inline: true,
    });
  }
  if (account.unluckiest.length > 0) {
    embed.addFields({
      name: "Unluckiest",
      value: account.unluckiest.map(rankLine).join("\n"),
      inline: true,
    });
  }
  return embed;
}
