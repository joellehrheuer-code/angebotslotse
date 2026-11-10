import fs from "node:fs/promises";

const status = JSON.parse(await fs.readFile("data/status.json", "utf8"));
const offers = JSON.parse(await fs.readFile("data/offers.json", "utf8"));
const publishable = Number(status.publishableOffers ?? status.activeOffers ?? 0);
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
if (sourceIssues.length) console.warn("[catalog-health] sources: " + sourceIssues.join(", "));
if (!Number.isFinite(publishable) || publishable < 1) {
  console.error("[catalog-health] BLOCKED: no verified publishable offers. The update and deploy must not silently publish an empty or stale catalogue.");
  process.exitCode = 1;
}
