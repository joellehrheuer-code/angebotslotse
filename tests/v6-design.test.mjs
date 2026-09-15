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

test("V6 homepage keeps premium dark commerce composition and real data", () => {
  build();
  const html = fs.readFileSync("dist/index.html", "utf8");
  const css = fs.readFileSync("dist/enhancements.css", "utf8");

  assert.match(html, /class="premium-hero/);
  assert.match(html, /class="brand-logo"/);
  assert.match(html, /Original-Branding/);
  assert.match(html, /cdn\.shopify\.com|imageUrl/);
  assert.doesNotMatch(html, /GearUP/i);
  assert.match(css, /--magenta:#ff3fa8/);
  assert.match(css, /\.deal-card\{background:var\(--soft-card\)/);
  assert.match(css, /\.creator-visual img\{position:absolute/);
});

test("V6 build report records the real publishable inventory", () => {
  const report = JSON.parse(fs.readFileSync("dist/build-report.json", "utf8"));
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  assert.equal(report.version, "V6-premium-dark-commerce");
  assert.equal(report.offers, report.productCards);
  assert.ok(report.offers > 0);
  assert.equal(report.images, offers.filter((offer) => offer.imageUrl).length);
  assert.ok(report.discounts >= 0 && report.discounts <= report.offers);
  assert.ok(report.dailyDeal);
});
