---
name: repo-architecture
description: Enforces sol_herebot's flat vertical-slice layout for Discord slash commands. Use whenever adding, editing, moving, reviewing, or wiring code in this repository, including commands, handlers, utilities, registration, and bot startup.
---

# Repo architecture

sol_herebot uses a flat, vertical slice architecture. One directory per slash command. No feature grouping, no shared command layer.

```
src/commands/
  <command name>/
    utils/
    index.ts
```

`utils` holds utils for that single command.

`index.ts` holds the function for creating the bot command, and holds the code for executing on that command.

`<command name>` is the Discord slash command name (`iam`, `price`, `chat`). Commands are siblings. Do not nest them (`src/commands/pets/randompet`).

## `index.ts`

Export both of these from the command's `index.ts`. Do not split creation or execution into other files.

```ts
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export function createCommand(): SlashCommandBuilder {
  return new SlashCommandBuilder()
    .setName("price")
    .setDescription("Returns the current estimated price of an item")
    .addStringOption((option) =>
      option
        .setName("itemname")
        .setDescription("What is the item name?")
        .setRequired(true),
    );
}

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // handle this command only
}
```

Imports use the `.ts` extension (`verbatimModuleSyntax` and `allowImportingTsExtensions` are on).

## `utils/`

Put helpers used only by this command in `utils/`. Import them from this command's `index.ts`.

Do not import another command's `utils/`. If a helper is used by more than one command, it does not belong in a command slice. Shared persistence stays in `src/db`.

Do not add an empty `utils/` directory or a placeholder file. Add files there when the command has helpers.

## Wiring

`src/index.ts` and `src/bot_commands.ts` only compose slices. They do not define command options or command behavior.

- `src/bot_commands.ts` imports each `createCommand`, calls `.toJSON()`, and registers that list.
- `src/index.ts` imports each `execute` and dispatches `interaction.commandName` to it.

```ts
import { createCommand as createPriceCommand } from "./commands/price/index.ts";
import { execute as price } from "./commands/price/index.ts";
```

Client setup, intents, ready-time loading, and @mention handling stay in `src/index.ts`.

## When changing a command

If the command still lives inline in `src/index.ts` or `src/bot_commands.ts`, move its builder into `createCommand` and its handler into `execute` in `src/commands/<command name>/index.ts`. Move helpers used only by that command into its `utils/`. Leave the old files as wiring.

Do not add a new command body, option, or helper to `src/index.ts` or `src/bot_commands.ts`.
