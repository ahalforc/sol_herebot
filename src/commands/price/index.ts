import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { fuzzySearchItemId, getItem, userAgent } from "./utils/items.ts";

export function createCommand(): SlashCommandOptionsOnlyBuilder {
  return new SlashCommandBuilder()
    .setName("price")
    .setDescription("Returns the current estimated price of an item")
    .addStringOption((option) =>
      option.setName("itemname").setDescription("What is the item name?").setRequired(true),
    );
}

/**
 * Returns the current estimated price of an item.
 *
 * /price "tumekens shadow"
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const itemName = interaction.options.getString("itemname");

  if (itemName == null) {
    throw Error();
  }

  const itemId = fuzzySearchItemId(itemName);

  if (itemId == null) {
    throw Error();
  }

  const actualItemName = getItem(itemId)?.name;

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

  const data = ((await response.json()) as TimeSeriesResponse).data.sort((a, b) =>
    a.timestamp > b.timestamp ? -1 : 1,
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

export { loadAllItems } from "./utils/items.ts";
