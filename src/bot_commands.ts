import { REST, Routes, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";

/**
 * The source-of-truth list of commands that this bot supports.
 * 
 * Idea: /loadout "araxxor" -> uses your /iam registered osrs user to compute best loadout
 * Idea: /hiscores "araxxor" -> uses your /iam registered osrs user to do a hiscore lookup
 * Idea: /randompvp "options as plain text?" -> generates a random pvp challenge
 * 
 */
const commands = [
    new SlashCommandBuilder()
        .setName('iam')
        .setDescription('Registers your discord user with the given osrs user')
        .addStringOption(option =>
            option
                .setName('osrsuser')
                .setDescription('What is your osrs username?')
                .setRequired(true),
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('viewallpets')
        .setDescription('Spews out a response of all pets in osrs')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('obtainedpets')
        .setDescription('Spews out a response of all pets you have acquired')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('addobtainedpets')
        .setDescription('Registers your discord user with the given pet ids (comma separated list of ids)')
        .addStringOption(option =>
            option
                .setName('petids')
                .setDescription('What pets did you get?')
                .setRequired(true),
        ),
    new SlashCommandBuilder()
        .setName('removeobtainedpets')
        .setDescription('Un-registers your discord user with the given pet ids (comma separated list of ids)')
        .addStringOption(option =>
            option
                .setName('petids')
                .setDescription('What pets did you actually not get?')
                .setRequired(true),
        ),
    new SlashCommandBuilder()
        .setName('randompet')
        .setDescription('Gives you a random pet to hunt for (filters out obtained pets)'),
    new SlashCommandBuilder()
        .setName('randomraid')
        .setDescription('Gives you a random raid (or group boss)')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('price')
        .setDescription('Returns the current estimated price of an item')
        .addStringOption(option =>
            option
                .setName('itemname')
                .setDescription('What is the item name?')
                .setRequired(true),
        )
        .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
} catch (error) {
    console.error(error);
}
