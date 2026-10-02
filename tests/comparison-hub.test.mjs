import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const siteUrl = "https://joellehrheuer-code.github.io/angebotslotse";

function build() {
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SITE_URL: siteUrl,
      CONTACT_EMAIL: "joellehrheuer@gmail.com",
      LEGAL_NAME: "Joel Leroy Lehrheuer",
      LEGAL_ADDRESS: "Rathausstraße 4, 52072 Aachen, Deutschland",
    },
    stdio: "ignore",
  });
}

test("Vergleichsbereich ist auf Startseite, Navigation und eigener Seite erreichbar", () => {
  build();
  const home = fs.readFileSync("dist/index.html", "utf8");
  const compare = fs.readFileSync("dist/vergleiche.html", "utf8");
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");

  assert.match(home, /class="comparison-hub/);
  assert.match(home, />Vergleiche</);
  assert.match(home, /Tarife & Versicherungen vergleichen/);
  assert.match(compare, /Strom & Energie/);
  assert.match(compare, /Internet & DSL/);
  assert.match(compare, /Mobilfunk/);
  assert.match(compare, /Versicherungen/);
  assert.match(compare, /Kfz-Versicherung/);
  assert.match(compare, /Kredite/);
  assert.match(compare, /verivox\.de\/stromvergleich/);
  assert.match(sitemap, /\/vergleiche\.html/);
});

test("Startseite priorisiert Shopping und Vergleiche vor Creator-Inhalten", () => {
  build();
  const home = fs.readFileSync("dist/index.html", "utf8");
  const comparisonIndex = home.indexOf('class="comparison-hub');
  const creatorIndex = home.indexOf('class="creator-promo');
  assert.ok(comparisonIndex >= 0);
  assert.ok(creatorIndex === -1 || comparisonIndex < creatorIndex);
});

test("V13 nutzt die grün-limette Angebotslotse-Marke und zugängliche Bewegung", () => {
  build();
  const css = fs.readFileSync("dist/enhancements.css", "utf8");
  const home = fs.readFileSync("dist/index.html", "utf8");
  assert.match(css, /V13 BRAND COMMERCE/);
  assert.match(css, /--v13-forest:#0d5f49/);
  assert.match(css, /--v13-lime:#cdeb3f/);
  assert.match(css, /backdrop-filter:blur\(18px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(home, /app-icon-192\.png/);
  assert.match(home, /Finden\. Vergleichen\./);
});
