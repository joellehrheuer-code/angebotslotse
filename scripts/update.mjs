import fs from "node:fs/promises";
import { fetchAwinOffers } from "./lib/awin.mjs";
import { normalizeAndDedupe } from "./lib/normalize.mjs";

const config = JSON.parse(await fs.readFile("config.json", "utf8"));
const oldOffers = JSON.parse(await fs.readFile("data/offers.json", "utf8").catch(() => "[]"));
const oldStatus = JSON.parse(await fs.readFile("data/status.json", "utf8").catch(() => "{}"));
const oldIds = new Set(oldOffers.map(o => o.id));
let status;
try {
  const raw = await fetchAwinOffers({ publisherId: process.env.AWIN_PUBLISHER_ID, token: process.env.AWIN_API_TOKEN });
  const offers = normalizeAndDedupe(raw, config);
  const newIds = new Set(offers.map(o => o.id));
  status = { state: "ok", lastSuccessfulUpdate: new Date().toISOString(), activeOffers: offers.length,
    added: offers.filter(o => !oldIds.has(o.id)).length, removed: oldOffers.filter(o => !newIds.has(o.id)).length,
    invalidLinks: 0, apiErrors: 0, message: "Aktualisierung erfolgreich." };
  await fs.writeFile("data/offers.json", `${JSON.stringify(offers, null, 2)}\n`);
} catch (error) {
  status = { state: "error", lastSuccessfulUpdate: oldStatus.lastSuccessfulUpdate ?? null, activeOffers: oldOffers.length, added: 0, removed: 0,
    invalidLinks: 0, apiErrors: 1, message: String(error.message).slice(0, 250) };
  await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
  throw error;
}
await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
