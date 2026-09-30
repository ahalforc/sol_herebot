/**
 * User agent used to provide context to the osrs wiki and TempleOSRS.
 */
export const userAgent = "sol_herebot - experimental osrs discord bot";

export async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) {
    throw Error(`${url} responded with ${response.status}`);
  }
  return await response.json();
}
