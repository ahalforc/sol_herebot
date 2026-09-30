import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export function createCommand(): SlashCommandOptionsOnlyBuilder {
  return new SlashCommandBuilder()
    .setName("iam")
    .setDescription("Registers your discord user with the given osrs user")
    .addStringOption((option) =>
      option.setName("osrsuser").setDescription("What is your osrs username?").setRequired(true),
    );
}

/**
 * Registers your discord user with the given osrs user.
 *
 * /iam "a half orc"
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const discordId = interaction.member?.user.id;
  const discordName = interaction.member?.user.username;
  const osrsName = interaction.options.getString("osrsuser");

  if (discordId == null || discordName == null || osrsName == null) {
    throw Error();
  }

  // addIamEntry(discordId, osrsName);

  await interaction.reply(`\`${discordName}\` has been registered as \`${osrsName}\``);
}
