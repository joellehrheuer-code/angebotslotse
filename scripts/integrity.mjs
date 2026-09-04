import fs from "node:fs/promises";
const offers = JSON.parse(await fs.readFile("data/offers.json","utf8"));
const status = JSON.parse(await fs.readFile("data/status.json","utf8"));
const config = JSON.parse(await fs.readFile("config.json","utf8"));
const seen = new Set(); const errors = [];
if (!status.lastSuccessfulUpdate || Date.now() - new Date(status.lastSuccessfulUpdate).getTime() > config.staleAfterHours * 3600000) errors.push("Angebotsdaten sind veraltet.");
for (const o of offers) {
  if (!o.id || !o.title || !o.trackingUrl) errors.push(`Unvollständig: ${o.id ?? "ohne ID"}`);
  if (seen.has(o.id)) errors.push(`Doppelte ID: ${o.id}`); seen.add(o.id);
  try { const u = new URL(o.trackingUrl); if (u.protocol !== "https:") errors.push(`Kein HTTPS: ${o.id}`); } catch { errors.push(`Ungültiger Link: ${o.id}`); }
  if (o.endDate && new Date(o.endDate) < new Date()) errors.push(`Abgelaufen: ${o.id}`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Integritätscheck bestanden: ${offers.length} aktive Angebote.`);
