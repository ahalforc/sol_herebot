import { EmbedBuilder } from "discord.js";
import { averagePurple, type PriceList } from "./prices.ts";
import type { PriceSource } from "./sources.ts";

/**
 * Formats a gp amount compactly, e.g. 1,250,000,000 -> "1.25b".
 */
export function formatGp(amount: number): string {
  const units: [number, string][] = [
    [1_000_000_000, "b"],
    [1_000_000, "m"],
    [1_000, "k"],
  ];
  for (const [size, suffix] of units) {
    if (amount >= size) {
      return `${Number((amount / size).toFixed(2))}${suffix}`;
    }
  }
  return String(amount);
}

export function priceEmbed(source: PriceSource, list: PriceList): EmbedBuilder {
  const lines = list.priced.map(
    (item) => `${item.name}: ${formatGp(item.price)} (${Intl.NumberFormat().format(item.price)}gp)`,
  );
  const embed = new EmbedBuilder()
    .setTitle(`${source.name} uniques`)
    .setURL(source.wikiUrl)
    .setDescription(lines.length > 0 ? lines.join("\n") : "No prices available right now.");
  const average = averagePurple(list.priced);
  if (average != null) {
    const rounded = Math.round(average);
    embed.addFields({
      name: "Average payout per purple",
      value: `${formatGp(rounded)} (${Intl.NumberFormat().format(rounded)}gp)`,
    });
  }
  if (list.missing.length > 0) {
    embed.setFooter({ text: `No recent price: ${list.missing.join(", ")}` });
  }
  return embed;
}
