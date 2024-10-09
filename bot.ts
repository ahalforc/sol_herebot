import { ApplicationCommand, ChatInputCommandInteraction, Client, Events, GatewayIntentBits, type CacheType, type Interaction } from "discord.js";
import Fuse from "fuse.js";

/**
 * User agent used to provide context to the osrs wiki.
 * 
 * todo In the future this should include a discord contact.
 */
const userAgent = 'sol_herebot - experimental osrs discord bot';

/**
 * The discord client.
 * 
 * Upon script start, this client will:
 * 1. Fetch data that needs to be cached
 * 2. Listen to interaction events (slash commands) and reply to them
 * 3. Log in
 */
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, async c => {
    console.log(`${c.user.tag} is online.`);

    try {
        console.log(`Fetching all osrs items...`);
        await loadAllItems();
        console.log(`Fetched all items.`);
    } catch (error) {
        console.log(`Failed to fetch all items, terminating early. Error: ${error}`);
        await client.destroy();
    }
})

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        console.log(`Running ${interaction.commandName}...`);
        if (interaction.commandName === 'iam') {
            await iam(interaction);
        } else if (interaction.commandName === 'randomraid') {
            await randomraid(interaction);
        } else if (interaction.commandName === 'price') {
            await price(interaction);
        } else {
            console.log(`${interaction.commandName} unknown.`);
        }
    } catch (error) {
        console.log(`${interaction.commandName} failed with error ${error}.`);
        await interaction.reply(`Failed to process command ${interaction.commandName}.`);
    }
});

client.login(process.env.DISCORD_TOKEN);

/**
 * Cached osrs users.
 * 
 * (discord user id to osrs name)
 */
const users = new Map<string, string>();

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
                'User-Agent': userAgent,
            },
        },
    );

    for (const item of ((await response.json()) as ResponseItem[])) {
        items.set(
            item.id,
            new OsrsItem(item.id, item.name),
        );
    }
}

/**
 * Tries to find the best matching osrs item's id for the given name.
 * 
 * @param name - the osrs item name (or rough variation of the osrs item name)
 * @returns the best match osrs item's id
 */
function fuzzySearchItemId(name: string): number | undefined {
    if (items.size == 0) {
        throw Error('no items to search');
    }

    const fuse = new Fuse(
        Array.from(items.values()),
        {
            // Includes the proximity score in the result objects.
            includeScore: true,
            // Sorts the result objects by their score (with the first being the closest).
            shouldSort: true,
            // Defines the minimum score a result object needs to be included.
            // 0.0 is a perfect match, and 1.0 is the opposite.
            threshold: 0.5,
            // What object field names to use for the search.
            keys: ['name'],
        },
    );
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
    const osrsName = interaction.options.getString('osrsuser');

    if (discordId == null || discordName == null || osrsName == null) {
        throw Error();
    }

    users.set(discordId, osrsName);

    await interaction.reply(`\`${discordName}\` has been registered as \`${osrsName}\``);
}

/**
 * slash-command
 * 
 * Gives you a random raid (or group boss)
 * 
 * @param interaction - the discord interaction for configuration and replying
 */
async function randomraid(interaction: ChatInputCommandInteraction): Promise<any> {
    const raids = [
        'Chambers of Xeric (Regular)',
        'Chambers of Xeric (Challenge Mode)',
        'Theater of Blood (Regular)',
        'Theater of Blood (Hard Mode)',
        'Tombs of Amascut',
        'Nex',
    ]

    const raid = raids[Math.floor(Math.random() * raids.length)];

    const discordId = interaction.member?.user.id;
    if (discordId != null) {
        const osrsName = users.get(discordId);
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
 * @param interaction - the discord interaction for configuration and replying
 */
async function price(interaction: ChatInputCommandInteraction): Promise<any> {
    const itemName = interaction.options.getString('itemname');

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
                'User-Agent': userAgent,
            }
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

    const data = ((await response.json()) as TimeSeriesResponse).data.sort((a, b) => a.timestamp > b.timestamp ? -1 : 1);

    const price = data.find(entry => entry.avgHighPrice != null)?.avgHighPrice;

    if (price == null) {
        throw Error(`no valid price for ${itemName}`);
    }

    const formattedPrice = Intl.NumberFormat().format(price);

    await interaction.reply(`\`${itemName}\` -> \`${actualItemName}\` is roughly ${formattedPrice}gp`);
}
