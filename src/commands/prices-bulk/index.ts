import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { priceEmbed } from "./utils/format.ts";
import { priceItems } from "./utils/prices.ts";
import { findSource, sources } from "./utils/sources.ts";

export function createCommand(): SlashCommandOptionsOnlyBuilder {
  return new SlashCommandBuilder()
    .setName("prices-bulk")
    .setDescription("Returns the current prices of a source's tradeable uniques")
    .addStringOption((option) =>
      option
        .setName("source")
        .setDescription("Where do the uniques drop from?")
        .setRequired(true)
        .addChoices(...sources.map((source) => ({ name: source.name, value: source.key }))),
    );
}

/**
 * Returns the current prices of a source's tradeable uniques, most expensive first.
 *
 * /prices-bulk source:tfa
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const key = interaction.options.getString("source", true);
  const source = findSource(key);
  if (source == null) {
    await interaction.reply({ content: `Unknown source \`${key}\`.`, ephemeral: true });
    return;
  }

  await interaction.deferReply();
  try {
    const list = await priceItems(source.items);
    await interaction.editReply({ embeds: [priceEmbed(source, list)] });
  } catch (error) {
    console.log(`prices-bulk failed to fetch prices for ${source.key}. Error: ${error}`);
    await interaction.editReply("The wiki price api is unavailable, try again later.");
  }
}
