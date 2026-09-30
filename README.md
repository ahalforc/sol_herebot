# sol_herebot

![sol heredit](assets/smol_heredit.png)

Sol Herebot is the champion of OSRS Discord Bots!

> [!IMPORTANT]
> This is very much a work in progress, and I'm only working on this in my free time.
> If you have any feature requests, feel free to open an issue.

## Requirements

- [Node.js](https://nodejs.org/) 22 or newer
- [pnpm](https://pnpm.io/) 12 (via [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`)

## Commands

Here are all of the supported commands:

`/iam` - registers your discord user id with the given osrs name (to be used in other commands)

`/randomraid` - returns a random raid

`/price` - returns the current price for the item that best matches the provided name

## API integrations

This bot is only possible due to the generosity of the OSRS team and the OSRS wiki team.

## Development

Install dependencies:

```bash
pnpm install
```

Register slash commands with Discord (requires `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`):

```bash
pnpm commands
```

Run the bot:

```bash
pnpm start
```

Typecheck, lint, and format:

```bash
pnpm typecheck
pnpm lint
pnpm format
```

Or use the Makefile targets `make run` and `make commands`.
