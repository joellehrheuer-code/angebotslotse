import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { isPublicationReady, isBlockedNonMerchandiseOffer, isSuppressedAdvertiserOffer } from "../scripts/lib/normalize.mjs";

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const publishable = offer => isPublicationReady(offer) && !isBlockedNonMerchandiseOffer(offer) && !isSuppressedAdvertiserOffer(offer, config);

test("V9 offer detail uses a clear media and purchase hierarchy", () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], {
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
  const offers = JSON.parse(fs.readFileSync("data/offers.json", "utf8"));
  const target = offers.find(o => publishable(o) && o.slug && fs.existsSync("dist/angebote/" + o.slug + ".html"));
  assert.ok(target, "A built offer detail page is required.");
  const html = fs.readFileSync("dist/angebote/" + target.slug + ".html", "utf8");
  const css = fs.readFileSync("dist/enhancements.css", "utf8");
  assert.match(html, /class="detail-media"/);
  assert.match(html, /class="detail-summary"/);
  assert.match(html, /class="button primary offer-primary-action"/);
  assert.match(html, /Preis & Verfügbarkeit beim Anbieter prüfen/);
  assert.match(html, /detail-cta-note/);
  assert.match(css, /V9 product detail hierarchy/);
  assert.match(css, /\.detail h1\{[\s\S]*?color:var\(--portal-ink\)!important/);
  assert.match(css, /\.offer-primary-action\{[\s\S]*?min-height:54px/);
  assert.match(css, /\.detail \.comparison>div>a\{[\s\S]*?min-height:54px/);
  assert.match(html, /site\.css\?v=\d+/);
});
