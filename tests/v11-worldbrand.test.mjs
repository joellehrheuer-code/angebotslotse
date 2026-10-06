import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { isPublicationReady, isBlockedNonMerchandiseOffer, isSuppressedAdvertiserOffer } from "../scripts/lib/normalize.mjs";

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const build = () => execFileSync(process.execPath, ["scripts/build.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse",
    CONTACT_EMAIL: "joellehrheuer@gmail.com",
    LEGAL_NAME: "Joel Leroy Lehrheuer",
    LEGAL_ADDRESS: "Rathausstraße 4, 52072 Aachen, Deutschland",
  },
  stdio: "ignore",
});

test("V11 premium system keeps the real brand, search and footer architecture", () => {
  build();
  const html = fs.readFileSync("dist/index.html", "utf8");
  const css = fs.readFileSync("dist/enhancements.css", "utf8");
  const app = fs.readFileSync("public/app.js", "utf8");
  assert.match(html, /class="hero-logo-stage"/);
  assert.match(html, /joel-logo\.svg\?v=4/);
  assert.match(html, /global-search-suggestions/);
  assert.match(html, /data-footer-group/);
  assert.match(html, /Joel271997 \/ J0JOEL/);
  assert.doesNotMatch(html, /class="portal-social-links"/);
  assert.match(css, /V11 COMPLETE WORLD-BRAND SYSTEM/);
  assert.match(css, /\.site-footer/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(app, /function searchMatches\(/);
  assert.match(app, /syncFooterGroups/);
  assert.match(app, /image-lightbox-dialog/);
});

test("V11 detail pages expose transparent provider facts", () => {
  build();
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  const publishable = offer => isPublicationReady(offer) && !isBlockedNonMerchandiseOffer(offer) && !isSuppressedAdvertiserOffer(offer, config);
  const target = offers.find(o => publishable(o) && o.slug && fs.existsSync("dist/angebote/" + o.slug + ".html"));
  assert.ok(target, "A built offer detail page is required.");
  const html = fs.readFileSync("dist/angebote/" + target.slug + ".html", "utf8");
  assert.match(html, /detail-commerce-facts/);
  assert.match(html, /Versand/);
  assert.match(html, /Lieferzeit/);
  assert.match(html, /Rückgabe & Garantie/);
  assert.match(html, /Händlerbedingungen gelten/);
});

test("V11 tracks the complete 20 plus 180 point audit and rotates the PWA cache", () => {
  const audit = fs.readFileSync("docs/WELTMARKE-200-AUDIT.md", "utf8");
  const sw = fs.readFileSync("public/sw.js", "utf8");
  assert.match(audit, /20-Punkte-Premium-Masterplan/);
  assert.match(audit, /Erweiterter 180-Punkte-Katalog/);
  assert.ok((audit.match(/^\d+\./gm) || []).length >= 200, "Audit must contain at least 200 numbered entries.");
  assert.match(sw, /angebotslotse-shell-v17/);
});
