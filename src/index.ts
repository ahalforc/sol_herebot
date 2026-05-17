import {
  ApplicationCommand,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  type CacheType,
  type Interaction,
} from "discord.js";
import * as fs from "fs";
import Fuse from "fuse.js";
import {
  addIamEntry,
  addObtainedPetEntry,
  getAllObtainedPetEntries,
  getIamEntry,
  openDatabase,
  removeObtainedPetEntry,
} from "./db/db";

/**
 * User agent used to provide context to the osrs wiki.
 *
 * todo In the future this should include a discord contact.
 */
const userAgent = "sol_herebot - experimental osrs discord bot";

/** Ollama system prompt: replies stay in character as Sol Heredit (Fortis Colosseum). */
const SOL_HEREDIT_SYSTEM_PROMPT = `You are Sol Heredit, final boss of the Fortis Colosseum in Old School RuneScape.
You speak as the arrogant overseer of the arena: imperial, theatrical, and dismissive of weak challengers, but grudgingly respectful when someone proves themselves.
Stay in character at all times. Never mention being an AI, a language model, or a bot.

Voice and manner:
- You may reference the Colosseum, glory, combat, footwork, worthy challengers, and the god Ralos when it fits naturally.
- You may echo your in-game lines in spirit (e.g. "By Ralos", "a worthy challenger", "let's see how you handle a real foe", "filthy peasant" for the unregistered or unimpressive).
- Boast about your strength; mock poor coordination or cowardice; offer backhanded compliments when impressed.
- Never mention the word "AI" or "language model" or "bot".
- You are concise and to the point.

Context:
- You are replying in a Discord server via the sol_herebot slash command /chat.
- Players may ask about OSRS (bosses, raids, gear, pets, prices, grind) or anything else; answer helpfully but always through Sol Heredit's voice.
- Keep answers concise (a few short paragraphs at most) so they fit Discord message limits.`;

/**
 * The discord client.
 *
 * Upon script start, this client will:
 * 1. Fetch data that needs to be cached
 * 2. Listen to interaction events (slash commands) and reply to them
 * 3. Log in
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`${c.user.tag} is online.`);

  // Fetch and cache all osrs items (to be used as reference later).
  try {
    console.log(`Fetching all osrs items...`);
    await loadAllItems();
    console.log(`Fetched all items.`);
  } catch (error) {
    console.log(
      `Failed to fetch all items, terminating early. Error: ${error}`,
    );
    await client.destroy();
    return;
  }

  // Spin up and cache local data files.
  try {
    console.log(`Opening data files...`);
    loadAllDataFiles();
    console.log(`Opened data files.`);
  } catch (error) {
    console.log(
      `Failed to open data files, terminating early. Error: ${error}`,
    );
    await client.destroy();
    return;
  }

  // Spin up the database.
  //
  // Note that the database is automatically closed.
  try {
    console.log(`Opening database...`);
    openDatabase();
    console.log(`Opened database.`);
  } catch (error) {
    console.log(`Failed to open database, terminating early. Error: ${error}`);
    await client.destroy();
    return;
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    console.log(`Running ${interaction.commandName}...`);
    if (interaction.commandName === "iam") {
      await iam(interaction);
    } else if (interaction.commandName === "viewallpets") {
      await viewallpets(interaction);
    } else if (interaction.commandName === "obtainedpets") {
      await obtainedpets(interaction);
    } else if (interaction.commandName === "addobtainedpets") {
      await addobtainedpets(interaction);
    } else if (interaction.commandName === "removeobtainedpets") {
      await removeobtainedpets(interaction);
    } else if (interaction.commandName === "randompet") {
      await randompet(interaction);
    } else if (interaction.commandName === "randomraid") {
      await randomraid(interaction);
    } else if (interaction.commandName === "price") {
      await price(interaction);
    } else if (interaction.commandName === "chat") {
      await chat(interaction);
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
 * Cached osrs items.
 *
 * (item id to osrs item)
 */
const items = new Map<number, OsrsItem>();

class OsrsItem {
  id: number;
  name: string;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

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

  constructor(
    id: number,
    name: string,
    activity: string,
    dropRate: string,
    releaseDate: string,
  ) {
    this.id = id;
    this.name = name;
    this.activity = activity;
    this.dropRate = dropRate;
    this.releaseDate = releaseDate;
  }
}

/**
 * Loads all items from the osrs wiki and caches them locally for a quick lookup.
 */
async function loadAllItems(): Promise<any> {
  class ResponseItem {
    id: number;
    name: string;

    constructor(id: number, name: string) {
      this.id = id;
      this.name = name;
    }
  }

  class Response {
    items: Array<ResponseItem>;

    constructor(items: Array<ResponseItem>) {
      this.items = items;
    }
  }

  const response = await fetch(
    `https://prices.runescape.wiki/api/v1/osrs/mapping`,
    {
      headers: {
        "User-Agent": userAgent,
      },
    },
  );

  for (const item of (await response.json()) as ResponseItem[]) {
    items.set(item.id, new OsrsItem(item.id, item.name));
  }
}

/**
 * Loads all data files from the ./assets/data package and caches them locally for a quick lookup.
 */
async function loadAllDataFiles(): Promise<any> {
  const path = "./assets/data";

  const petsJsonFile = fs.readFileSync(`${path}/pets.json`);
  (JSON.parse(petsJsonFile.toString()) as Array<OsrsPet>).forEach((element) => {
    pets.set(element.id, element);
  });
}

/**
 * Tries to find the best matching osrs item's id for the given name.
 *
 * @param name - the osrs item name (or rough variation of the osrs item name)
 * @returns the best match osrs item's id
 */
function fuzzySearchItemId(name: string): number | undefined {
  if (items.size == 0) {
    throw Error("no items to search");
  }

  const fuse = new Fuse(Array.from(items.values()), {
    // Includes the proximity score in the result objects.
    includeScore: true,
    // Sorts the result objects by their score (with the first being the closest).
    shouldSort: true,
    // Defines the minimum score a result object needs to be included.
    // 0.0 is a perfect match, and 1.0 is the opposite.
    threshold: 0.5,
    // What object field names to use for the search.
    keys: ["name"],
  });
  const result = fuse.search(name);

  if (result.length == 0) {
    throw Error(`no items for ${name}`);
  }

  return result[0].item.id;
}

/**
 * slash-command
 *
 * Registers your discord user with the given osrs user.
 *
 * /iam "a half orc"
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function iam(interaction: ChatInputCommandInteraction): Promise<any> {
  const discordId = interaction.member?.user.id;
  const discordName = interaction.member?.user.username;
  const osrsName = interaction.options.getString("osrsuser");

  if (discordId == null || discordName == null || osrsName == null) {
    throw Error();
  }

  addIamEntry(discordId, osrsName);

  await interaction.reply(
    `\`${discordName}\` has been registered as \`${osrsName}\``,
  );
}

/**
 * slash-command
 *
 * Spews out a response of all pets in osrs
 *
 * /viewallpets
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function viewallpets(
  interaction: ChatInputCommandInteraction,
): Promise<any> {
  class Pet {
    id: number;
    name: string;

    constructor(id: number, name: string) {
      this.id = id;
      this.name = name;
    }
  }

  const result = [];
  for (const [key, value] of pets) {
    result.push(new Pet(value.id, value.name));
  }
  result.sort((a, b) => (a.id < b.id ? -1 : 1));

  const buffer = result.map((r) => `${r.id}: ${r.name}`);

  await interaction.reply({
    content: "```\n" + buffer.join("\n") + "\n```",
    ephemeral: true,
  });
}

/**
 * slash-command
 *
 * Spews out a response of all pets you have acquired
 *
 * /obtainedpets
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function obtainedpets(
  interaction: ChatInputCommandInteraction,
): Promise<any> {
  class Pet {
    id: number;
    name: string;

    constructor(id: number, name: string) {
      this.id = id;
      this.name = name;
    }
  }

  const discordId = interaction.member?.user.id;
  if (discordId == null) {
    throw Error();
  }

  const obtainedPets = new Set<number>();
  for (const pet of getAllObtainedPetEntries(discordId)) {
    obtainedPets.add(pet.petId);
  }

  const result = [];
  for (const [key, value] of pets) {
    if (obtainedPets.has(key)) {
      result.push(new Pet(value.id, value.name));
    }
  }
  result.sort((a, b) => (a.id < b.id ? -1 : 1));

  if (result.length == 0) {
    await interaction.reply("You have not obtained any pets (that I know of).");
    return;
  }

  const buffer = result.map((r) => `${r.id}: ${r.name}`);

  await interaction.reply("```\n" + buffer.join("\n") + "\n```");
}

/**
 * slash-command
 *
 * Registers your discord user with the given pet ids (comma separated list of ids)
 *
 * (see /viewallpets for the list of pet ids)
 *
 * /addobtainedpets "1, 2, 3, 4, 10, 11, 12, 13"
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function addobtainedpets(
  interaction: ChatInputCommandInteraction,
): Promise<any> {
  const discordId = interaction.member?.user.id;
  if (discordId == null) {
    throw Error();
  }

  const petIdsStr = interaction.options.getString("petids");
  if (petIdsStr == null) {
    throw Error();
  }

  const petIds = petIdsStr
    .replaceAll(" ", "")
    .split(",")
    .map((s) => parseInt(s));
  for (const petId of petIds) {
    if (pets.has(petId)) {
      addObtainedPetEntry(discordId, petId);
    }
  }

  const osrsName = getIamEntry(discordId)?.osrsName;
  if (osrsName != null) {
    await interaction.reply({
      content: `\`${osrsName}\`, I have recorded these pet entries for you.`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `I have recorded these pet entries for you.`,
      ephemeral: true,
    });
  }
}

/**
 * slash-command
 *
 * Un-registers your discord user with the given pet ids (comma separated list of ids)
 *
 * (see /viewallpets for the list of pet ids)
 *
 * /removeobtainedpets "1, 2, 3, 4, 10, 11, 12, 13"
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function removeobtainedpets(
  interaction: ChatInputCommandInteraction,
): Promise<any> {
  const discordId = interaction.member?.user.id;
  if (discordId == null) {
    throw Error();
  }

  const petIdsStr = interaction.options.getString("petids");
  if (petIdsStr == null) {
    throw Error();
  }

  const petIds = petIdsStr
    .replaceAll(" ", "")
    .split(",")
    .map((s) => parseInt(s));
  for (const petId of petIds) {
    removeObtainedPetEntry(discordId, petId);
  }

  const osrsName = getIamEntry(discordId)?.osrsName;
  if (osrsName != null) {
    await interaction.reply({
      content: `\`${osrsName}\`, I have un-recorded these pet entries for you.`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `I have un-recorded these pet entries for you.`,
      ephemeral: true,
    });
  }
}

/**
 * slash-command
 *
 * Gives you a random pet to hunt for (filters out obtained pets)
 *
 * (see /addobtainedpets for filtering out already-obtained pets)
 *
 * /randompet
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function randompet(
  interaction: ChatInputCommandInteraction,
): Promise<any> {
  const discordId = interaction.member?.user.id;
  if (discordId == null) {
    throw Error();
  }

  const obtainedPets = new Set<number>();
  for (const pet of getAllObtainedPetEntries(discordId)) {
    obtainedPets.add(pet.petId);
  }

  const filteredPets = new Array<OsrsPet>();
  for (const [key, value] of pets) {
    if (!obtainedPets.has(key)) {
      filteredPets.push(value);
    }
  }

  if (filteredPets.length == 0) {
    await interaction.reply(
      `You've already gotten all pets. There's nothing more for you to do.`,
    );
    return;
  }

  const pet = filteredPets[Math.floor(Math.random() * filteredPets.length)];

  const osrsName = getIamEntry(discordId)?.osrsName;
  if (osrsName != null) {
    await interaction.reply(
      `\`${osrsName}\`, hunt ${pet.name}. It has a ${pet.dropRate} drop rate from ${pet.activity}.`,
    );
  } else {
    await interaction.reply(
      `Hunt ${pet.name}. It has a ${pet.dropRate} drop rate from ${pet.activity}.`,
    );
  }
}

/**
 * slash-command
 *
 * Gives you a random raid (or group boss)
 *
 * /randomraid
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function randomraid(
  interaction: ChatInputCommandInteraction,
): Promise<any> {
  const raids = [
    "Chambers of Xeric (Regular)",
    "Chambers of Xeric (Challenge Mode)",
    "Theater of Blood (Regular)",
    "Theater of Blood (Hard Mode)",
    "Tombs of Amascut",
    "Nex",
    "Nightmare",
  ];

  const discordId = interaction.member?.user.id;
  if (discordId == null) {
    throw Error();
  }

  const raid = raids[Math.floor(Math.random() * raids.length)];

  const osrsName = getIamEntry(discordId)?.osrsName;
  if (osrsName != null) {
    await interaction.reply(`\`${osrsName}\`, I challenge you to ${raid}!`);
  } else {
    await interaction.reply(`Filthy peasant. I challenge you to ${raid}!`);
  }
}

/**
 * slash-command
 *
 * Returns the current estimated price of an item
 *
 * /price "tumekens shadow"
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function price(interaction: ChatInputCommandInteraction): Promise<any> {
  const itemName = interaction.options.getString("itemname");

  if (itemName == null) {
    throw Error();
  }

  const itemId = fuzzySearchItemId(itemName);

  if (itemId == null) {
    throw Error();
  }

  const actualItemName = items.get(itemId)?.name;

  if (actualItemName == null) {
    throw Error();
  }

  const response = await fetch(
    `https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=5m&id=${itemId}`,
    {
      headers: {
        "User-Agent": userAgent,
      },
    },
  );

  class TimeSeriesEntry {
    timestamp: number;
    avgHighPrice: number | undefined;
    avgLowPrice: number | undefined;
    highPriceVolumne: number | undefined;
    lowPriceVolumne: number | undefined;

    constructor(
      timestamp: number,
      avgHighPrice: number | undefined,
      avgLowPrice: number | undefined,
      highPriceVolume: number | undefined,
      lowPriceVolumne: number | undefined,
    ) {
      this.timestamp = timestamp;
      this.avgHighPrice = avgHighPrice;
      this.avgLowPrice = avgLowPrice;
      this.highPriceVolumne = highPriceVolume;
      this.lowPriceVolumne = lowPriceVolumne;
    }
  }

  class TimeSeriesResponse {
    data: Array<TimeSeriesEntry>;

    constructor(data: Array<TimeSeriesEntry>) {
      this.data = data;
    }
  }

  const data = ((await response.json()) as TimeSeriesResponse).data.sort(
    (a, b) => (a.timestamp > b.timestamp ? -1 : 1),
  );

  const price = data.find((entry) => entry.avgHighPrice != null)?.avgHighPrice;

  if (price == null) {
    throw Error(`no valid price for ${itemName}`);
  }

  const formattedPrice = Intl.NumberFormat().format(price);

  await interaction.reply(
    `\`${itemName}\` -> \`${actualItemName}\` is roughly ${formattedPrice}gp`,
  );
}

/**
 * Helper to send a long message in chunks within Discord's 2000 char limit.
 * Uses editReply when the interaction was already acknowledged (e.g. deferReply).
 *
 * @param prefix - Optional text prepended to the first chunk (e.g. the user's question).
 */
async function sendChunkedReply(
  interaction: ChatInputCommandInteraction,
  content: string,
  prefix?: string,
): Promise<void> {
  const acknowledged = interaction.deferred || interaction.replied;
  const header = prefix ? `${prefix}\n\n` : "";

  const sendFirst = async (text: string): Promise<void> => {
    if (acknowledged) {
      await interaction.editReply({ content: text });
    } else {
      await interaction.reply({ content: text, ephemeral: false });
    }
  };

  const sendMore = async (text: string): Promise<void> => {
    await interaction.followUp({ content: text, ephemeral: false });
  };

  const full = header + content;
  if (full.length <= 2000) {
    await sendFirst(full);
    return;
  }

  const codeBlock = `\`\`\n${content}\n\`\`\``;
  if (header.length + codeBlock.length <= 2000) {
    await sendFirst(header + codeBlock);
    return;
  }

  const chunks = splitForDiscord(content, 1950);
  const firstChunkLimit = Math.max(200, 2000 - header.length);

  await sendFirst(
    header +
      chunks[0].slice(0, firstChunkLimit) +
      (chunks.length > 1 ? "\n\n*(continued…)*" : ""),
  );
  for (let i = 1; i < chunks.length; i++) {
    const fencePrefix = i === 1 ? "```\n" : "";
    const fenceSuffix = i === chunks.length - 1 ? "\n```" : "";
    await sendMore(fencePrefix + chunks[i] + fenceSuffix);
  }
}

function splitForDiscord(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let chunk = remaining.slice(0, maxChunkSize);
    const breakIndex = chunk.lastIndexOf(" ", chunk.length - 50);
    if (breakIndex > 500) {
      chunk = chunk.slice(0, breakIndex);
    }
    chunks.push(chunk);
    remaining = remaining.slice(chunk.length).trimStart();
  }
  return chunks;
}

function formatChatUserMessage(
  interaction: ChatInputCommandInteraction,
  message: string,
): string {
  const member = interaction.member;
  const name =
    member && "displayName" in member
      ? member.displayName
      : (member?.nick ??
        interaction.user.globalName ??
        interaction.user.username);
  return `**${name}:** ${message}`;
}

/**
 * slash-command
 *
 * Chat with Sol Heredit (Qwen via local Ollama)
 *
 * /chat "hello how are you"
 *
 * @param interaction - the discord interaction for configuration and replying
 */
async function chat(interaction: ChatInputCommandInteraction): Promise<void> {
  const message = interaction.options.getString("message");

  if (message == null) {
    throw Error();
  }

  await interaction.deferReply();

  try {
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const modelName = process.env.OLLAMA_MODEL || "qwen3.6:latest";

    console.log(`Sending message to Ollama: ${message}`);

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: SOL_HEREDIT_SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw Error(`Ollama API returned ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const reply = data.message?.content || "No response from Ollama.";
    const userMessage = formatChatUserMessage(interaction, message);

    await sendChunkedReply(interaction, reply, userMessage);
  } catch (error) {
    console.log(`chat failed with error: ${error}`);
    const userMessage = formatChatUserMessage(interaction, message);
    await interaction.editReply({
      content: `${userMessage}\n\nError contacting Ollama: ${error}`,
    });
  }
}
