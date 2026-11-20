import fs from "node:fs/promises";
import { isPublicationReady, isBlockedAdultOffer, isBlockedNonMerchandiseOffer, isSuppressedAdvertiserOffer, isMarketCompatibleTitle } from "./lib/normalize.mjs";

const status = JSON.parse(await fs.readFile("data/status.json", "utf8"));
const config = JSON.parse(await fs.readFile("config.json", "utf8").catch(() => "{}"));
const offers = JSON.parse(await fs.readFile("data/offers.json", "utf8"));
const publishable = Number(status.publishableOffers ?? status.activeOffers ?? 0);
const policy = JSON.parse(await fs.readFile("data/impact-link-policy.json", "utf8").catch(() => "{}"));
const quarantined = offer => (policy.quarantinedAdvertisers ?? []).some(rule =>
  (rule.advertiserId && String(rule.advertiserId) === String(offer.advertiserId)) ||
  (rule.advertiserName && String(rule.advertiserName).toLowerCase() === String(offer.advertiser).toLowerCase()));
const verifiedCount = offers.filter(offer => !quarantined(offer) && isPublicationReady(offer)).length;
const now = new Date();
const visibleCount = offers.filter(offer => !quarantined(offer) && !isBlockedAdultOffer(offer) && !isBlockedNonMerchandiseOffer(offer) && !isSuppressedAdvertiserOffer(offer, config) && isMarketCompatibleTitle(offer.title, config.marketCountry) && (!offer.endDate || new Date(offer.endDate) > now) && isPublicationReady(offer)).length;
const sourceIssues = Object.entries(status.sources ?? {})
  .filter(([, source]) => source?.state === "error")
  .map(([name, source]) => {
    const message = String(source?.error ?? "");
    const category = /401|403|unauthorized|forbidden/i.test(message) ? "AUTHORIZATION"
      : /429|rate.limit/i.test(message) ? "RATE_LIMIT"
      : /timeout|abort/i.test(message) ? "TIMEOUT" : "SOURCE_ERROR";
    return `${name}=${category}`;
  });

console.log(`[catalog-health] stored=${offers.length}; publishable=${publishable}; state=${status.state ?? "unknown"}`);
if (!Number.isInteger(publishable) || publishable !== verifiedCount) {
  console.error(`[catalog-health] BLOCKED: reported publishable count does not match verified stored offers (reported=${publishable}, actual=${verifiedCount}).`);
  process.exitCode = 1;
}
if (visibleCount < 1) {
  console.error("[catalog-health] BLOCKED: no publishable offers remain after the actual site visibility filters.");
  process.exitCode = 1;
}
if (sourceIssues.length) console.warn("[catalog-health] sources: " + sourceIssues.join(", "));
if (!Number.isFinite(publishable) || publishable < 1) {
  console.error("[catalog-health] BLOCKED: no verified publishable offers. The update and deploy must not silently publish an empty or stale catalogue.");
  process.exitCode = 1;
}
