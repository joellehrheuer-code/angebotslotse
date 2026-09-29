import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { isPublicationReady, isBlockedNonMerchandiseOffer, isSuppressedAdvertiserOffer } from "../scripts/lib/normalize.mjs";

const siteConfig = JSON.parse(fs.readFileSync("config.json", "utf8"));
const isSitePublishable = offer => isPublicationReady(offer) && !isBlockedNonMerchandiseOffer(offer) && !isSuppressedAdvertiserOffer(offer, siteConfig);
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
  assert.match(html, /class="category-tile"/);
  assert.match(html, /class="category-art"/);
  assert.match(html, /cdn\.shopify\.com|imageUrl/);
  assert.doesNotMatch(html, /GearUP/i);
  assert.match(css, /--magenta:#ff3fa8/);
  assert.match(css, /\.deal-card\{background:var\(--soft-card\)/);
  assert.match(css, /\.creator-visual img\{position:absolute/);
});

test("V7 build report records the real publishable inventory", () => {
  const report = JSON.parse(fs.readFileSync("dist/build-report.json", "utf8"));
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  assert.equal(report.version, "V8-premium-dark-commerce");
  assert.equal(report.offers, report.productCards);
  assert.ok(report.offers > 0);
  assert.equal(report.images, offers.filter(isSitePublishable).filter((offer) => offer.imageUrl).length);
  assert.ok(report.discounts >= 0 && report.discounts <= report.offers);
  assert.ok(report.dailyDeal);
  const home = fs.readFileSync("dist/index.html", "utf8");
  assert.doesNotMatch(home, /Shipping Protection|Differenzgebühr|Worry-Free Purchase/i);
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
  const target = offers.find((offer) => isSitePublishable(offer) && offer.productId && Number(offer.currentPrice) > 0 && offer.slug);
  assert.ok(target, "Mindestens ein Produkt mit Preis wird für den Canonical-Test benötigt.");
  const canonicalUrl = siteUrl + "/angebote/" + target.slug + ".html";
  const offerHtml = fs.readFileSync("dist/angebote/" + target.slug + ".html", "utf8");
  const legacyHtml = fs.readFileSync("dist/produkt/" + target.slug + ".html", "utf8");
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  assert.ok(offerHtml.includes('rel="canonical" href="' + canonicalUrl + '"'));
  assert.match(offerHtml, /class="deal-check"/);
  assert.match(offerHtml, /Daten statt Werbeversprechen/);
  assert.match(offerHtml, /class="price-history"/);
  if (target.imageUrl && target.imageSource) assert.match(offerHtml, /Offizielles Partnerbild/);
  assert.ok(legacyHtml.includes('rel="canonical" href="' + canonicalUrl + '"'));
  assert.ok(sitemap.includes("/angebote/" + target.slug + ".html"));
  assert.doesNotMatch(sitemap, /\/produkt\//);
});


test("aktive Kategorie-Seiten bieten datenbasierten Mehrwert", () => {
  build();
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  const target = offers.find((offer) => isSitePublishable(offer) && offer.category && offer.category !== "sonstiges");
  assert.ok(target);
  const html = fs.readFileSync("dist/" + target.category + ".html", "utf8");
  assert.match(html, /class="category-guide"/);
  assert.match(html, /class="category-live-stats"/);
  assert.match(html, /Besser vergleichen/);
  assert.match(html, /Mit Preisverlauf/);
});


test("Angebotsseiten verlinken passende Alternativen intern", () => {
  build();
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  const publishable = offers.filter(isSitePublishable);
  const counts = new Map();
  for (const offer of publishable) counts.set(offer.category, (counts.get(offer.category) || 0) + 1);
  const target = publishable.find((offer) => (counts.get(offer.category) || 0) > 1);
  assert.ok(target);
  const html = fs.readFileSync("dist/angebote/" + target.slug + ".html", "utf8");
  assert.match(html, /Ähnliche Angebote/);
  assert.match(html, /Andere Marken vergleichen/);
  assert.match(html, /class="related-offers deal-section"/);
});

test("V8 Merkliste und Wunschpreise werden lokal bereitgestellt", () => {
  build();
  const watchlist = fs.readFileSync("dist/merkliste.html", "utf8");
  const app = fs.readFileSync("dist/app.js", "utf8");
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  const target = offers.find((offer) => isSitePublishable(offer) && offer.slug);
  assert.ok(target);
  const offerHtml = fs.readFileSync("dist/angebote/" + target.slug + ".html", "utf8");
  assert.match(watchlist, /Merkliste & Wunschpreise/);
  assert.match(watchlist, /id="watch-catalog"/);
  assert.match(watchlist, /content="noindex,follow"/);
  assert.match(app, /angebotslotse-watchlist-v1/);
  assert.match(app, /Wunschpreis erreicht/);
  assert.match(offerHtml, /data-watch-panel/);
  assert.match(offerHtml, /data-watch-save/);
});

test("Shops und Suche werden nicht durch alte Fallback-Blöcke überschrieben", () => {
  build();
  const shops = fs.readFileSync("dist/shops.html", "utf8");
  const search = fs.readFileSync("dist/suche.html", "utf8");
  assert.match(shops, /Shops & Händler/);
  assert.match(shops, /mindestens drei veröffentlichungsfähigen Angeboten/);
  assert.match(search, /data-offer-sort/);
  assert.match(search, /veröffentlichte Angebote/);
  assert.match(search, /content="noindex,follow"/);
});

test("Amazon-Buchseite bleibt ohne Live-API ehrlich und ist für Live-Daten vorbereitet", () => {
  build();
  const books = fs.readFileSync("dist/buecher.html", "utf8");
  const source = fs.readFileSync("scripts/build.mjs", "utf8");
  assert.match(books, /Preis, Format und Verfügbarkeit werden direkt bei Amazon geprüft|Live-Preis und Bild stammen aus der Amazon Creators API/);
  assert.match(source, /amazonOfferByAsin/);
  assert.match(source, /owned-project-price/);
  assert.doesNotMatch(books, />0,00\s*€/);
});


test("Sitemap enthält nur indexierbare Discovery-Seiten", () => {
  build();
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  const search = fs.readFileSync("dist/suche.html", "utf8");
  const watchlist = fs.readFileSync("dist/merkliste.html", "utf8");
  assert.match(search, /content="noindex,follow"/);
  assert.match(watchlist, /content="noindex,follow"/);
  assert.doesNotMatch(sitemap, /\/suche\.html/);
  assert.doesNotMatch(sitemap, /\/merkliste\.html/);
});


test("eigene Bücher haben indexierbare Detailseiten mit Book-Markup", () => {
  build();
  const catalog = JSON.parse(fs.readFileSync("data/amazon-products.json", "utf8"));
  const books = (catalog.items || []).filter((item) => item.ownedProject);
  assert.ok(books.length >= 1);
  const slug = String(books[0].title).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80) || "shop";
  const html = fs.readFileSync("dist/buecher/" + slug + ".html", "utf8");
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  assert.match(html, /"@type":"Book"/);
  assert.match(html, new RegExp(books[0].asin));
  assert.ok(sitemap.includes("/buecher/" + slug + ".html"));
  assert.match(html, /Bei Amazon ansehen/);
});

test("Sitemap nutzt belastbare lastmod-Werte nur für dynamische Inhalte", () => {
  build();
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  assert.match(sitemap, /<lastmod>[^<]+<\/lastmod>/);
  assert.match(sitemap, /<url><loc>[^<]*\/angebote\/[^<]+<\/loc><lastmod>[^<]+<\/lastmod><\/url>/);
  assert.match(sitemap, /<url><loc>[^<]*\/impressum\.html<\/loc><\/url>/);
});
