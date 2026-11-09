import fs from "node:fs/promises";
const status = JSON.parse(await fs.readFile("data/status.json", "utf8"));
const sources = Object.entries(status.sources ?? {});
function issueClass(value) {
  const error = String(value ?? "").toLowerCase();
  if (!error) return "none";
  if (/\b(?:401|403)\b|unauthorized|forbidden|permission|invalid token/.test(error)) return "authorization";
  if (/\b429\b|rate.limit|too many requests/.test(error)) return "rate-limit";
  if (/timeout|timed out|abort/.test(error)) return "timeout";
  if (/\b5\d\d\b|server error/.test(error)) return "upstream-server";
  if (/network|fetch failed|econnreset|enotfound|eai_again/.test(error)) return "network";
  return "other";
}
const lines = ["status=" + (status.state ?? "unknown") + "; publishable=" + Number(status.publishableOffers ?? status.activeOffers ?? 0) + "; lastUpdate=" + (status.lastSuccessfulUpdate ?? "none")];
for (const [key, source] of sources) {
  const name = key.replace(/[^a-z0-9_-]/gi, "_");
  const state = String(source.state ?? "unknown").replace(/[^a-z0-9_-]/gi, "_");
  lines.push(name + ": " + state + "; count=" + Number(source.count ?? 0) + "; errorCategory=" + issueClass(source.error));
}
console.log(lines.map(line => "[source-health] " + line).join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, "\n### Quellenstatus (ohne Secrets)\n\n" + lines.map(x => "- " + x).join("\n") + "\n");
}
