import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { isPublicationReady, isBlockedNonMerchandiseOffer, isSuppressedAdvertiserOffer } from "../scripts/lib/normalize.mjs";

const config = JSON.parse(fs.readFileSync("config.json","utf8"));
const buildSite = () => execFileSync(process.execPath,["scripts/build.mjs"],{
  cwd:process.cwd(),
  env:{...process.env,SITE_URL:"https://joellehrheuer-code.github.io/angebotslotse",CONTACT_EMAIL:"joellehrheuer@gmail.com",LEGAL_NAME:"Joel Leroy Lehrheuer",LEGAL_ADDRESS:"Rathausstraße 4, 52072 Aachen, Deutschland"},
  stdio:"ignore",
});

test("V12 homepage keeps live connected stats and premium shopping hierarchy",()=>{
  buildSite();
  const html=fs.readFileSync("dist/index.html","utf8");
  const css=fs.readFileSync("dist/enhancements.css","utf8");
  assert.match(html,/AKTUELL ANGEBUNDEN/);
  assert.match(html,/Aktive Angebote/);
  assert.match(html,/Stores/);
  assert.match(html,/Partnerlinks/);
  assert.match(html,/Gerade sichtbar/);
  assert.match(html,/Aktuelle Top-Deals/);
  assert.match(html,/Deal des Tages/);
  assert.match(html,/Gute Angebote/);
  assert.match(html,/Klar gefunden/);
  assert.ok(html.indexOf("AKTUELL ANGEBUNDEN") < html.indexOf("Aktuelle Top-Deals"));
  assert.match(css,/V12 NIGHT MARKET/);
  assert.match(css,/--nm-pink:#ff3fa8/);
  assert.match(css,/--nm-violet:#985dff/);
  assert.match(css,/\.daily-deal\{[\s\S]*?min-height:min\(720px,82vh\)/);
});

test("V12 smart search exposes grouped real products shops and categories",()=>{
  buildSite();
  const html=fs.readFileSync("dist/index.html","utf8");
  const app=fs.readFileSync("public/app.js","utf8");
  assert.match(html,/id="quick-search-data"/);
  assert.match(html,/data-smart-search/);
  assert.match(html,/data-search-panel/);
  assert.match(app,/addGroup\("Produkte"/);
  assert.match(app,/addGroup\("Shops"/);
  assert.match(app,/addGroup\("Kategorien"/);
  assert.match(app,/searchMatches\(/);
});

test("V12 offer detail has factual deal check and sticky provider CTA",()=>{
  buildSite();
  const offers=JSON.parse(fs.readFileSync("data/offers.json","utf8"));
  const publishable=o=>isPublicationReady(o)&&!isBlockedNonMerchandiseOffer(o)&&!isSuppressedAdvertiserOffer(o,config);
  const target=offers.find(o=>publishable(o)&&o.slug&&fs.existsSync("dist/angebote/"+o.slug+".html"));
  assert.ok(target,"A built offer detail page is required.");
  const html=fs.readFileSync("dist/angebote/"+target.slug+".html","utf8");
  const app=fs.readFileSync("dist/app.js","utf8");
  assert.match(html,/Warum ist dieser Deal interessant\?/);
  assert.match(html,/data-sticky-offer-bar/);
  assert.match(html,/Zum Anbieter/);
  assert.match(app,/stickyOfferBar/);
  assert.doesNotMatch(html,/sofort verfügbar|kostenloser Versand/i);
});

test("V12 footer and cache version are aligned",()=>{
  buildSite();
  const html=fs.readFileSync("dist/index.html","utf8");
  const sw=fs.readFileSync("public/sw.js","utf8");
  assert.match(html,/<summary>Deals<\/summary>/);
  assert.match(html,/<summary>Service<\/summary>/);
  assert.match(html,/<summary>Rechtliches<\/summary>/);
  assert.match(sw,/angebotslotse-shell-v17/);
});
