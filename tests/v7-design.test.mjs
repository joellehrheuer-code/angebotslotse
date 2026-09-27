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

test("V7 homepage keeps premium dark commerce composition and real data", () => {
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

test("V7 build report records the real publishable inventory", () => {
  const report = JSON.parse(fs.readFileSync("dist/build-report.json", "utf8"));
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  assert.equal(report.version, "V7-premium-dark-commerce");
  assert.equal(report.offers, report.productCards);
  assert.ok(report.offers > 0);
  assert.equal(report.images, offers.filter((offer) => offer.imageUrl).length);
  assert.ok(report.discounts >= 0 && report.discounts <= report.offers);
  assert.ok(report.dailyDeal);
});

test("homepage price-drop copy never corrupts valid currency values", () => {
  build();
  const html = fs.readFileSync("dist/index.html", "utf8");
  assert.doesNotMatch(html, /\dPreis beim Anbieter prüfen in 30 Tagen/);
  assert.doesNotMatch(html, /↓\s*\d+Preis beim Anbieter prüfen/);
});


test("V7 erstellt eigene Buch- und datenschutzfreundliche Merch-Seiten", () => {
  build();
  const books = fs.readFileSync("dist/buecher.html", "utf8");
  const merch = fs.readFileSync("dist/merch.html", "utf8");
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  assert.match(books, /B0H6SZ6WCD/);
  assert.match(books, /B0HJ5LGHM5/);
  assert.match(books, /Bücher von Joel/);
  assert.match(merch, /data-load-spreadshop/);
  assert.match(merch, /data-shop-script="https:\/\/joel271997\.myspreadshop\.net\/js\/shopclient\.nocache\.js"/);
  assert.doesNotMatch(merch, /<script[^>]+myspreadshop\.net\/js\/shopclient\.nocache\.js/);
  assert.match(sitemap, /\/buecher\.html/);
  assert.match(sitemap, /\/merch\.html/);
});

test("V7 Build-Report erfasst eigene Bücher und Merch", () => {
  build();
  const report = JSON.parse(fs.readFileSync("dist/build-report.json", "utf8"));
  assert.equal(report.ownedBooks, 2);
  assert.equal(report.merchPage, true);
});


test("SEO konsolidiert Produktvarianten auf eine Angebots-URL", () => {
  build();
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  const target = offers.find((offer) => offer.productId && Number(offer.currentPrice) > 0 && offer.slug);
  assert.ok(target, "Mindestens ein Produkt mit Preis wird für den Canonical-Test benötigt.");
  const canonicalUrl = siteUrl + "/angebote/" + target.slug + ".html";
  const offerHtml = fs.readFileSync("dist/angebote/" + target.slug + ".html", "utf8");
  const legacyHtml = fs.readFileSync("dist/produkt/" + target.slug + ".html", "utf8");
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  assert.ok(offerHtml.includes('rel="canonical" href="' + canonicalUrl + '"'));
  assert.match(offerHtml, /class="price-history"/);
  assert.ok(legacyHtml.includes('rel="canonical" href="' + canonicalUrl + '"'));
  assert.ok(sitemap.includes("/angebote/" + target.slug + ".html"));
  assert.doesNotMatch(sitemap, /\/produkt\//);
});
