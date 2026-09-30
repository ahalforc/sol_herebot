import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

const raids = [
  "Chambers of Xeric (Regular)",
  "Chambers of Xeric (Challenge Mode)",
  "Theater of Blood (Regular)",
  "Theater of Blood (Hard Mode)",
  "Tombs of Amascut",
  "Nex",
  "Nightmare",
];

export function createCommand(): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName("randomraid")
    .setDescription("Gives you a random raid (or group boss)");
}

/**
 * Gives you a random raid (or group boss).
 *
 * /randomraid
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const discordId = interaction.member?.user.id;
  if (discordId == null) {
    throw Error();
  }

  const raid = raids[Math.floor(Math.random() * raids.length)];
  await interaction.reply(`Filthy peasant. I challenge you to ${raid}!`);
}
