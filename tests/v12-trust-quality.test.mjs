import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const build = () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });
};

test("V12.5 zeigt belegbare Vertrauenssignale statt erfundener Bewertungen", () => {
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  assert.match(html,/id="vertrauen"/);
  assert.match(html,/TRANSPARENZ STATT MARKETINGTRICKS/);
  assert.match(html,/veröffentlichte Angebote/);
  assert.match(html,/Nur belegbare Vorteile/);
  assert.match(html,/Affiliate-Transparenz/);
  assert.match(html,/Community-Kontrolle/);
  assert.match(html,/Keine erfundenen Sterne/);
  assert.match(html,/keine künstlichen Durchschnittsnoten oder angeblichen Besucherzahlen/);
  assert.match(html,/data-report-open/);
  assert.match(html,/hero-product-card[\s\S]*?data-fallback-src=/);
  assert.match(app,/querySelectorAll\("\[data-report-open\]"\)/);
  assert.doesNotMatch(html,/aggregateRating|ratingValue|bestRating/i);
  assert.doesNotMatch(html,/\b4[,.][7-9]\s*\/\s*5\b/);
});

test("V12.5 Startseite hält grundlegende Interaktions- und Medienverträge ein", () => {
  build();
  const html=fs.readFileSync("dist/index.html","utf8");
  const buttons=[...html.matchAll(/<button\b[^>]*>/gi)].map(match=>match[0]);
  assert.ok(buttons.length>0);
  for(const button of buttons)assert.match(button,/\btype=(["'])(?:button|submit|reset)\1/i,`Button ohne definierten Typ: ${button}`);

  const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(match=>match[0]);
  assert.ok(images.length>0);
  for(const image of images){
    assert.match(image,/\balt=(["']).*?\1/i,`Bild ohne alt: ${image}`);
    assert.match(image,/\bsrc=(["']).+?\1/i,`Bild ohne src: ${image}`);
  }

  const links=[...html.matchAll(/<a\b[^>]*>/gi)].map(match=>match[0]);
  for(const link of links)assert.match(link,/\bhref=(["']).+?\1/i,`Link ohne Ziel: ${link}`);
});

test("V12.5 Qualitätsgates prüfen lokale Assets und Live-Kernressourcen", () => {
  const validator=fs.readFileSync("scripts/validate-build.mjs","utf8");
  const smoke=fs.readFileSync("scripts/live-smoke.mjs","utf8");
  assert.match(validator,/Fehlendes lokales/);
  assert.match(validator,/Alt-Attribut fehlt/);
  assert.match(smoke,/criticalAssets/);
  assert.match(smoke,/site\.css\?v=33/);
  assert.match(smoke,/app\.js\?v=18/);
  assert.match(smoke,/id="vertrauen"/);
});
