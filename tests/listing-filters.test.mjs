import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Kategorie- und Suchseiten bieten kombinierbare Deal-Filter", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });

  const search = fs.readFileSync("dist/suche.html", "utf8");
  const app = fs.readFileSync("dist/app.js", "utf8");
  const categoryFiles = ["technik","computer","zubehoer","audio-musik","haushalt","werkzeug","mode","freizeit","gaming"];
  const categoryHtml = categoryFiles
    .map(name => fs.readFileSync("dist/" + name + ".html", "utf8"))
    .find(html => html.includes("data-listing-filters"));
  assert.ok(categoryHtml, "Mindestens eine aktive Kategorie mit Filtern wird benötigt.");

  for (const html of [search, categoryHtml]) {
    assert.match(html, /data-listing-filters/);
    assert.match(html, /data-filter-reset/);
    assert.match(html, /data-filter-count/);
    assert.match(html, /data-filter-max-price/);
    assert.match(html, /data-active-filters/);
    assert.match(html, /data-active-filter-chips/);
    assert.match(html, /data-filter-clear-all/);
  }
  assert.match(search, /data-filter-merchant/);
  assert.match(app, /data-filter-brand/);
  assert.match(app, /data-filter-merchant/);
  assert.match(app, /data-filter-discount/);
  assert.match(app, /maxPriceValue/);
  assert.match(app, /row\.dataset\.merchant/);
  assert.match(app, /row\.dataset\.brand/);
  assert.match(app, /syncActiveFilterChips/);
  assert.match(app, /data-clear-filter/);
  assert.match(app, /replaceChildren/);
  const css = fs.readFileSync("dist/site.css", "utf8");
  assert.match(css, /\.active-filter-chip/);
  assert.match(css, /--portal-blue/);
});
