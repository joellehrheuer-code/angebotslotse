import { fetchAwinOffers } from "./awin.mjs";
import { fetchImpactOffers } from "./impact.mjs";
import { fetchDirectOffers } from "./direct.mjs";

export async function collectSources(env = process.env) {
  const definitions = [
    ["awin", () => fetchAwinOffers({ publisherId: env.AWIN_PUBLISHER_ID, token: env.AWIN_API_TOKEN })],
    ["direct", () => fetchDirectOffers()],
    ["impact", () => fetchImpactOffers({ accountSid: env.IMPACT_ACCOUNT_SID, authToken: env.IMPACT_AUTH_TOKEN })]
  ];
  const results = await Promise.all(definitions.map(async ([name, run]) => {
    if (name === "impact" && (!env.IMPACT_ACCOUNT_SID || !env.IMPACT_AUTH_TOKEN)) return { name, state: "disabled", rows: [] };
    try { return { name, state: "ok", rows: await run() }; }
    catch (error) { return { name, state: "error", rows: [], error: String(error.message).slice(0, 160) }; }
  }));
  return results;
}
