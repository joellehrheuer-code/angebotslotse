/** Source diagnostics for GitHub Actions (no raw API errors, URLs, tokens). */
import fs from "node:fs/promises";

export function diagnostic(status, inventory) {
  const sources = status?.sources && typeof status.sources === "object" ? status.sources : {};
  const offers = Array.isArray(inventory) ? inventory : [];
  const count = Number(status?.publishableOffers ?? status?.activeOffers ?? 0);
  const rows = [
    "## Angebotslotse: Quellendiagnose", "",
    `- Veröffentlichungsfähige Angebote: **${Number.isFinite(count) ? Math.max(0, count) : 0}**`,
    `- Gespeicherte Datensätze (nicht automatisch gültig): **${offers.length}**`,
    "",
    "| Quelle | Status | Datensätze | Fehlerklasse |",
    "| --- | --- | ---: | --- |"
  ];
  let authAwin = false;
  for (const [name, source] of Object.entries(sources)) {
    const safe = name.replace(/[^a-z0-9_-]/gi, "_");
    const state = String(source?.state ?? "unknown").replace(/[^a-z_-]/gi, "_");
    const raw = String(source?.error ?? "");
    const reason = /\b(?:401|403)\b|unauthoriz|forbidden|invalid token/i.test(raw) ? "AUTHORIZATION" :
      /\b429\b|rate.?limit/i.test(raw) ? "RATE_LIMIT" :
      /timeout|abort/i.test(raw) ? "TIMEOUT" :
      /\b5\d\d\b|server error/i.test(raw) ? "UPSTREAM" :
      state === "error" ? "OTHER" : "—";
    if (safe.startsWith("awin") && reason === "AUTHORIZATION") authAwin = true;
    const n = Number(source?.count);
    rows.push(`| ${safe} | ${state} | ${Number.isSafeInteger(n) && n >= 0 ? n : 0} | ${reason} |`);
  }
  rows.push("", "### Nächste Schritte", "");
  if (authAwin) {
    rows.push("- **Awin-Autorisierung:** Den bestehenden API-Zugang im Awin-Publisherkonto prüfen/erneuern und `AWIN_API_TOKEN` in GitHub → Settings → Secrets and variables → Actions aktualisieren. Token niemals in Chat/Logs/Issues veröffentlichen.");
    rows.push("- `AWIN_DATAFEED_API_KEY` ist ein eigener Schlüssel für klassische Produktfeeds. Er ersetzt keinen Awin API-Token.");
  }
  if (!Number.isFinite(count) || count < 1) {
    rows.push("- **Keine gültigen Deals:** Quelle, gültigen Tracking- und Ziellink, Nachweis von Preis/Aktion, Aktualität und gegebenenfalls Produktmedien prüfen. Alte oder unvollständige Einträge bleiben gesperrt.");
  }
  rows.push("- Danach Workflow erneut ausführen. Niemals `catalog:health` abschalten oder Daten künstlich als verifiziert markieren.");
  rows.push("", "*Es werden nur Klassen und Zähler ausgegeben, keine Rohfehler, Tokens oder Produktlinks.*");
  return rows.join("\n") + "\n";
}

const isEntry = process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href;
if (isEntry) {
  const read = async (name, fallback) => {
    try { return JSON.parse(await fs.readFile(name, "utf8")); }
    catch { return fallback; }
  };
  const report = diagnostic(await read("data/status.json", {}), await read("data/offers.json", []));
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, report);
}
