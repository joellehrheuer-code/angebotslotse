import { fetchAwinOffers } from "./awin.mjs";
import { fetchAwinProductFeeds } from "./awin-product-feeds.mjs";
import { fetchImpactOffers } from "./impact.mjs";
import { fetchDirectOffers } from "./direct.mjs";
import fs from "node:fs/promises";

export async function collectSources(env = process.env) {
  const impactLinkPolicy = JSON.parse(await fs.readFile("data/impact-link-policy.json", "utf8").catch(() => "{}"));
  const definitions = [
    ["awin", () => fetchAwinOffers({ publisherId: env.AWIN_PUBLISHER_ID, token: env.AWIN_API_TOKEN })],
    ["awin-product-feeds", () => fetchAwinProductFeeds({ apiKey: env.AWIN_DATAFEED_API_KEY, maxProducts: 500 })],
    ["direct", () => fetchDirectOffers()],
    ["impact", () => fetchImpactOffers({ accountSid: env.IMPACT_ACCOUNT_SID, authToken: env.IMPACT_AUTH_TOKEN, linkPolicy: impactLinkPolicy })]
  ];
  const results = await Promise.all(definitions.map(async ([name, run]) => {
    if (name === "impact" && (!env.IMPACT_ACCOUNT_SID || !env.IMPACT_AUTH_TOKEN)) return { name, state: "disabled", rows: [] };
    if (name === "awin-product-feeds" && !env.AWIN_DATAFEED_API_KEY) return { name, state: "disabled", rows: [] };
    try { return { name, state: "ok", rows: await run() }; }
    catch (error) { return { name, state: "error", rows: [], error: String(error.message).slice(0, 160) }; }
  }));
  return results;
}
