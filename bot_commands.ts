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
