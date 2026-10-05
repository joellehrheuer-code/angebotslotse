import fs from "node:fs/promises";
import { isPublicationReady, isAwaitingMediaOffer, isPublisherPromotion } from "./lib/normalize.mjs";
const offers = JSON.parse(await fs.readFile("data/offers.json","utf8"));
const status = JSON.parse(await fs.readFile("data/status.json","utf8"));
const config = JSON.parse(await fs.readFile("config.json","utf8"));
const policy = JSON.parse(await fs.readFile("data/impact-link-policy.json","utf8").catch(()=>"{}"));
const quarantined = offer => (policy.quarantinedAdvertisers ?? []).some(rule => (rule.advertiserId && String(rule.advertiserId) === String(offer.advertiserId)) || (rule.advertiserName && String(rule.advertiserName).toLowerCase() === String(offer.advertiser).toLowerCase()));
const seen = new Set(); const errors = [];
const snapshotTime = new Date(status.lastSuccessfulUpdate);
const integrityTime = Number.isFinite(snapshotTime.valueOf()) ? snapshotTime : new Date();
if (!status.lastSuccessfulUpdate || Date.now() - new Date(status.lastSuccessfulUpdate).getTime() > config.staleAfterHours * 3600000) errors.push("Angebotsdaten sind veraltet.");
for (const o of offers) {
  if (!o.id || !o.title || !o.trackingUrl) errors.push(`Unvollständig: ${o.id ?? "ohne ID"}`);
  if (seen.has(o.id)) errors.push(`Doppelte ID: ${o.id}`); seen.add(o.id);
  try { const u = new URL(o.trackingUrl); if (u.protocol !== "https:") errors.push(`Kein HTTPS: ${o.id}`); } catch { errors.push(`Ungültiger Link: ${o.id}`); }
  // Validate the stored snapshot at the time it was produced. A promotion can
  // legitimately expire between update and integrity runs; the build filters
  // it against the current time before publishing.
  if (o.endDate && new Date(o.endDate) < integrityTime) errors.push(`Im Snapshot abgelaufen: ${o.id}`);
}
const allowed = offers.filter(offer => !quarantined(offer));
const publishable = allowed.filter(isPublicationReady);
const awaitingMedia = allowed.filter(isAwaitingMediaOffer);
const blockedPublisherPromotions = allowed.filter(offer => !offer.isStale && isPublisherPromotion(offer));
const stale = offers.filter(offer => offer.isStale).length;
const quarantinedCount = offers.length - allowed.length;
const checkStatusCount = (key, actual) => {
  if (status[key] != null && Number(status[key]) !== actual) errors.push(`Status ${key} inkonsistent: ${status[key]} statt ${actual}.`);
};
checkStatusCount("activeOffers", publishable.length);
checkStatusCount("storedOffers", offers.length);
checkStatusCount("publishableOffers", publishable.length);
checkStatusCount("awaitingMedia", awaitingMedia.length);
checkStatusCount("blockedPublisherPromotions", blockedPublisherPromotions.length);
checkStatusCount("stale", stale);
checkStatusCount("quarantined", quarantinedCount);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Integritätscheck bestanden: ${publishable.length} veröffentlichungsreife Angebote; ${awaitingMedia.length} echte Medien-Wartefälle; ${blockedPublisherPromotions.length} Publisher-Werbetexte blockiert; ${stale} veraltete Bestandsdatensätze zurückgehalten; ${quarantinedCount} quarantänisiert.`);
