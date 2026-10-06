import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("V12.2 applies one premium architecture to the main subpages", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });
  const pages=[
    "dist/kategorien.html","dist/suche.html","dist/merkliste.html","dist/konto.html",
    "dist/shops.html","dist/marken.html","dist/buecher.html","dist/merch.html",
    "dist/methodik.html","dist/status.html","dist/404.html","dist/offline.html"
  ];
  for (const file of pages) {
    assert.ok(fs.existsSync(file), "missing built page: "+file);
    const html=fs.readFileSync(file,"utf8");
    assert.match(html,/class="[^"]*subpage-hero/,"missing premium subpage hero in "+file);
    assert.match(html,/site\.css\?v=41/,"stale CSS cache version in "+file);
  }

  const categoryFiles = [
    "gaming","technik","computer","audio-musik","zubehoer","smart-home","homeoffice",
    "haushalt","garten","werkzeug","mode","sport-fitness","gesundheit","beauty",
    "auto","tierbedarf","freizeit","sonstiges"
  ].map(slug => `dist/${slug}.html`);
  let activeCategoryCount = 0;
  for (const file of categoryFiles) {
    const html = fs.readFileSync(file,"utf8");
    if (/0 aktive Angebote/.test(html)) {
      continue;
    }
    activeCategoryCount += 1;
    assert.match(html,/class="deal-card\b/,"active category misses deal cards in "+file);
    assert.match(html,/listing-filters/,"active category misses listing filters in "+file);
  }
  assert.ok(activeCategoryCount > 0,"expected at least one active category in the current inventory");

  const shops=fs.readFileSync("dist/shops.html","utf8");
  const account=fs.readFileSync("dist/konto.html","utf8");
  const css=fs.readFileSync("public/enhancements.css","utf8");
  const sw=fs.readFileSync("dist/sw.js","utf8");
  assert.match(shops,/class="shop-grid"/);
  assert.match(account,/class="account-grid"/);
  assert.match(css,/V12\.2 SITEWIDE/);
  assert.match(css,/\.subpage-hero/);
  assert.match(css,/\.listing-tools/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(sw,/angebotslotse-shell-v17/);
});
