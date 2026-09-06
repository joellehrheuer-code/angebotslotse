import { fetchAwinOffers, fetchAwinPrograms } from "./awin.mjs";
import { fetchAwinProductFeeds, fetchAwinEnhancedFeeds } from "./awin-product-feeds.mjs";
import { fetchImpactOffers } from "./impact.mjs";
import { fetchDirectOffers } from "./direct.mjs";
import fs from "node:fs/promises";

export async function collectSources(env = process.env) {
  const impactLinkPolicy = JSON.parse(await fs.readFile("data/impact-link-policy.json", "utf8").catch(() => "{}"));
  let awinPrograms=null;
  if(env.AWIN_PUBLISHER_ID&&env.AWIN_API_TOKEN) try{awinPrograms=await fetchAwinPrograms({publisherId:env.AWIN_PUBLISHER_ID,token:env.AWIN_API_TOKEN});}catch{}
  const joined=(awinPrograms?.joined??[]).map(row=>({id:row.id??row.advertiserId,name:row.name??row.advertiserName})).filter(row=>row.id);
  const definitions = [
    ["awin", () => fetchAwinOffers({ publisherId: env.AWIN_PUBLISHER_ID, token: env.AWIN_API_TOKEN })],
    ["awin-enhanced-feeds", async()=>{const result=await fetchAwinEnhancedFeeds({publisherId:env.AWIN_PUBLISHER_ID,token:env.AWIN_API_TOKEN,advertisers:joined,maxProducts:500});const rows=result.products;Object.defineProperty(rows,"audit",{value:{feeds:result.feeds},enumerable:false});return rows;}],
    ["awin-product-feeds", () => fetchAwinProductFeeds({ apiKey: env.AWIN_DATAFEED_API_KEY, maxProducts: 500 })],
    ["direct", () => fetchDirectOffers()],
    ["impact", () => fetchImpactOffers({ accountSid: env.IMPACT_ACCOUNT_SID, authToken: env.IMPACT_AUTH_TOKEN, linkPolicy: impactLinkPolicy })]
  ];
  const results = await Promise.all(definitions.map(async ([name, run]) => {
    if (name === "impact" && (!env.IMPACT_ACCOUNT_SID || !env.IMPACT_AUTH_TOKEN)) return { name, state: "disabled", rows: [] };
    if (name === "awin-product-feeds" && !env.AWIN_DATAFEED_API_KEY) return { name, state: "disabled", rows: [], audit:{reason:"AWIN_DATAFEED_API_KEY fehlt"} };
    if (name === "awin-enhanced-feeds" && (!env.AWIN_API_TOKEN||!joined.length)) return {name,state:"disabled",rows:[],audit:{reason:"Keine Awin-Zugangsdaten oder beigetretenen Programme"}};
    try { const rows=await run(); return { name, state: "ok", rows, audit:rows.audit??null }; }
    catch (error) { return { name, state: "error", rows: [], error: String(error.message).slice(0, 160) }; }
  }));
  return {sources:results,awinPrograms};
}
