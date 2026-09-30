import { REST, Routes } from "discord.js";
import { createCommand as createIamCommand } from "./commands/iam/index.ts";
import { createCommand as createPriceCommand } from "./commands/price/index.ts";
import { createCommand as createRandomraidCommand } from "./commands/randomraid/index.ts";

/**
 * The source-of-truth list of commands that this bot supports.
 *
 * Idea: /loadout "araxxor" -> uses your /iam registered osrs user to compute best loadout
 * Idea: /hiscores "araxxor" -> uses your /iam registered osrs user to do a hiscore lookup
 * Idea: /randompvp "options as plain text?" -> generates a random pvp challenge
 */
const commands = [
  createIamCommand().toJSON(),
  createRandomraidCommand().toJSON(),
  createPriceCommand().toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

try {
  console.log("Started refreshing application (/) commands.");

  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
    body: commands,
  });

  console.log("Successfully reloaded application (/) commands.");
} catch (error) {
  console.error(error);
}
