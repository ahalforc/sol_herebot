import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { priceEmbed } from "./utils/format.ts";
import { megaRares } from "./utils/mega-rares.ts";
import { priceItems } from "./utils/prices.ts";

export function createCommand(): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName("prices-mega-rares")
    .setDescription("Returns the current prices and drop rates of the mega-rares");
}

/**
 * Returns the current prices and per-purple drop rates of the mega-rares, most expensive first.
 *
 * /prices-mega-rares
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const list = await priceItems(megaRares);
    await interaction.editReply({ embeds: [priceEmbed(list)] });
  } catch (error) {
    console.log(`prices-mega-rares failed to fetch prices. Error: ${error}`);
    await interaction.editReply("The wiki price api is unavailable, try again later.");
  }
}
