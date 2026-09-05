import fs from "node:fs/promises";
import { collectSources } from "./lib/source-manager.mjs";
import { normalizeAndDedupe } from "./lib/normalize.mjs";
import { updatePriceHistory } from "./lib/price-history.mjs";

const config = JSON.parse(await fs.readFile("config.json", "utf8"));
const oldOffers = JSON.parse(await fs.readFile("data/offers.json", "utf8").catch(() => "[]"));
const oldStatus = JSON.parse(await fs.readFile("data/status.json", "utf8").catch(() => "{}"));
const oldHistory = JSON.parse(await fs.readFile("data/price-history.json", "utf8").catch(() => "[]"));
const oldIds = new Set(oldOffers.map(o => o.id));
let status;
try {
  const sources = await collectSources();
  const failed = new Set(sources.filter(s => s.state === "error").map(s => s.name));
  const fresh = sources.flatMap(s => s.rows);
  const fallback = oldOffers.filter(o => failed.has(o.source));
  const offers = normalizeAndDedupe([...fresh, ...fallback], config);
  const newIds = new Set(offers.map(o => o.id));
  status = { state: "ok", lastSuccessfulUpdate: new Date().toISOString(), activeOffers: offers.length,
    added: offers.filter(o => !oldIds.has(o.id)).length, removed: oldOffers.filter(o => !newIds.has(o.id)).length,
    invalidLinks: 0, apiErrors: failed.size, sources: Object.fromEntries(sources.map(s => [s.name, { state: s.state, count: s.rows.length, error: s.error ?? null }])),
    message: failed.size ? "Aktualisierung mit zwischengespeicherten Quelldaten abgeschlossen." : "Aktualisierung erfolgreich." };
  await fs.writeFile("data/offers.json", `${JSON.stringify(offers, null, 2)}\n`);
  await fs.writeFile("data/price-history.json", `${JSON.stringify(updatePriceHistory(oldHistory, offers), null, 2)}\n`);
  const coupons = offers.filter(offer => offer.voucherCode && (!offer.endDate || new Date(offer.endDate) > new Date())).map(offer => ({code:offer.voucherCode,discountText:offer.description || null,discountPercent:null,validFrom:offer.startDate,validUntil:offer.endDate,merchant:offer.advertiser,landingUrl:offer.trackingUrl,terms:offer.terms || null,source:offer.source,isCommunityExclusive:false,creatorCode:null,creatorBenefit:null}));
  await fs.writeFile("data/coupons.json", `${JSON.stringify(coupons, null, 2)}\n`);
} catch (error) {
  status = { state: "error", lastSuccessfulUpdate: oldStatus.lastSuccessfulUpdate ?? null, activeOffers: oldOffers.length, added: 0, removed: 0,
    invalidLinks: 0, apiErrors: 1, message: String(error.message).slice(0, 250) };
  await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
  throw error;
}
await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
