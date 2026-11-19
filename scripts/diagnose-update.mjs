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
  // Only known machine-generated categories and bounded integer counters may enter the summary.
  // Never interpolate arbitrary API responses, URLs, product names or credential values.
  const impactReasons = sources.impact?.audit?.productDiagnostics?.linkFailureReasons;
  const knownImpactReasons = [
    ["product-link-not-allowed", "Produkt-Trackinglink nicht erlaubt"],
    ["deeplinking-not-approved", "Deeplinking nicht freigegeben"],
    ["invalid-product-url", "Produkt-Zieladresse ungültig"],
    ["unverified-merchant-domain", "Händlerdomain nicht bestätigt"],
    ["program-link-not-allowed", "Programm-Trackinglink nicht erlaubt"],
    ["program-link-already-deeplinked", "Programm-Link enthält bereits Deeplink"],
    ["unresolved-link", "Trackinglink anderweitig ungeklärt"]
  ];
  if (impactReasons && typeof impactReasons === "object" && !Array.isArray(impactReasons)) {
    const impactRows = knownImpactReasons
      .map(([key, label]) => ({label, count: Number(impactReasons[key])}))
      .filter(item => Number.isSafeInteger(item.count) && item.count > 0 && item.count <= 1_000_000);
    if (impactRows.length) {
      rows.push("", "### Impact: Produkt-Trackinglinks (aggregierte Ablehnungsgründe)", "");
      for (const item of impactRows) rows.push(`- ${item.label}: **${item.count}**`);
      rows.push("- Nur durch offiziell freigegebene Produktlinks oder erlaubtes Händler-Deeplinking beheben; niemals durch ungetrackte Shoplinks ersetzen.");
    }
  }
  const trackingReasons=sources.impact?.audit?.productDiagnostics?.catalogIdentityReasons;
  const knownTrackingReasons=[
    ["invalid-catalog-url","Katalog-Link ungültig"],
    ["invalid-program-tracking-url","Offizieller Programm-Link ungültig"],
    ["catalog-link-not-full-identity","Kataloglink ohne vollständige Tracking-ID"],
    ["program-link-not-full-identity","Programm-Link ohne vollständige Tracking-ID"],
    ["publisher-id-mismatch","Publisher-ID nicht identisch"],
    ["campaign-id-mismatch","Kampagnen-ID nicht identisch"],
    ["tracking-host-mismatch","Trackingdomain unterschiedlich"],
    ["blocked-tracking-host","Trackingdomain durch Sicherheitsregel gesperrt"],
    ["catalog-destination-override","Nicht bestätigte Ziel-Weiterleitung"],
    ["other-unverified-link","Link trotz Identität nicht bestätigt"]
  ];
  if(trackingReasons && typeof trackingReasons==="object" && !Array.isArray(trackingReasons)){
    const visible=knownTrackingReasons.map(([reason,label])=>({label,count:Number(trackingReasons[reason])}))
      .filter(x=>Number.isSafeInteger(x.count)&&x.count>0&&x.count<=1_000_000);
    if(visible.length){
      rows.push("","### Impact: Warum Produkt- und Programm-Tracking nicht übereinstimmen","");
      for(const item of visible)rows.push(`- ${item.label}: **${item.count}**`);
      rows.push("- Keine automatische Freigabe: offizielle Partnerlink-Identität oder Freigabe separat nachweisen.");
    }
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
