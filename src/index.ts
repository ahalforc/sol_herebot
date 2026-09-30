import { Client, Events, GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";
import * as fs from "fs";
import { execute as iam } from "./commands/iam/index.ts";
import { execute as price, loadAllItems } from "./commands/price/index.ts";
import { execute as randomraid } from "./commands/randomraid/index.ts";

const executors: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
  iam,
  randomraid,
  price,
};

/**
 * The discord client.
 *
 * Upon script start, this client will:
 * 1. Fetch data that needs to be cached
 * 2. Listen to interaction events (slash commands) and @mentions, and reply
 * 3. Log in
 *
 * @mentions require GuildMessages + MessageContent intents and the
 * "Message Content Intent" toggle in the Discord Developer Portal.
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`${c.user.tag} is online.`);

  // Fetch and cache all osrs items (to be used as reference later).
  try {
    console.log(`Fetching all osrs items...`);
    await loadAllItems();
    console.log(`Fetched all items.`);
  } catch (error) {
    console.log(`Failed to fetch all items, terminating early. Error: ${error}`);
    await client.destroy();
    return;
  }

  // Spin up and cache local data files.
  try {
    console.log(`Opening data files...`);
    loadAllDataFiles();
    console.log(`Opened data files.`);
  } catch (error) {
    console.log(`Failed to open data files, terminating early. Error: ${error}`);
    await client.destroy();
    return;
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    console.log(`Running ${interaction.commandName}...`);
    const execute = executors[interaction.commandName];
    if (execute) {
      await execute(interaction);
    } else {
      console.log(`${interaction.commandName} unknown.`);
    }
  } catch (error) {
    console.log(`${interaction.commandName} failed with error ${error}.`);
    await interaction.reply({
      content: `Failed to process command ${interaction.commandName}.`,
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

/**
 * Cached osrs pets.
 *
 * (pet id to osrs pet)
 */
const pets = new Map<number, OsrsPet>();

class OsrsPet {
  id: number;
  name: string;
  activity: string;
  dropRate: string;
  releaseDate: string;

  constructor(id: number, name: string, activity: string, dropRate: string, releaseDate: string) {
    this.id = id;
    this.name = name;
    this.activity = activity;
    this.dropRate = dropRate;
    this.releaseDate = releaseDate;
  }
}

/**
 * Loads all data files from the ./assets/data package and caches them locally for a quick lookup.
 */
function loadAllDataFiles(): void {
  const path = "./assets/data";

  const petsJsonFile = fs.readFileSync(`${path}/pets.json`);
  (JSON.parse(petsJsonFile.toString()) as Array<OsrsPet>).forEach((element) => {
    pets.set(element.id, element);
  });
}
