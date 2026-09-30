/**
 * OSRS names registered with /iam, keyed by Discord user id.
 *
 * Held in memory only, so registrations are lost when the bot restarts.
 */
const osrsNames = new Map<string, string>();

export function setOsrsName(discordId: string, osrsName: string): void {
  osrsNames.set(discordId, osrsName);
}

export function getOsrsName(discordId: string): string | undefined {
  return osrsNames.get(discordId);
}
