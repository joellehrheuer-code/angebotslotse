import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

test("Lighthouse-Fixes reduzieren Hero-Asset und benennen Creator-Links", () => {
  execFileSync(process.execPath, ["scripts/build-account-client.mjs"], { stdio: "pipe" });
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    stdio: "pipe",
    env: { ...process.env, SITE_URL: "https://joellehrheuer-code.github.io/angebotslotse" }
  });

  const home = fs.readFileSync("dist/index.html", "utf8");
  const app = fs.readFileSync("dist/app.js", "utf8");
  const css = fs.readFileSync("dist/site.css", "utf8");
  const sourceCss = `${fs.readFileSync("public/styles.css", "utf8")}\n\n${fs.readFileSync("public/enhancements.css", "utf8")}\n\n${fs.readFileSync("public/v13.css", "utf8")}`;
  const sourceApp = fs.readFileSync("public/app.js", "utf8");
  const privacy = fs.readFileSync("dist/datenschutz.html", "utf8");
  assert.doesNotMatch(home, /hero-logo-stage[^>]*>[\s\S]*?brand-hero\.jpg/);
  assert.match(home, /hero-logo-stage/);
  assert.match(home, /joel-logo\.svg\?v=4/);
  assert.match(home, /header-brand-picture/);
  assert.match(home, /creator-profile-image/);
  assert.doesNotMatch(home, /hero-logo-stage[^>]*>[\s\S]*?width="720" height="378"/);
  assert.doesNotMatch(home, /<img[^>]+src="[^"]*\/og\.png"/);
  assert.match(home, /creator-video-media[^>]+aria-label=/);
  assert.match(home, /data-ig-banner-load/);
  assert.doesNotMatch(home, /<script[^>]+instant-gaming\.com\/api\/banner\/partner\/loader\.js/);
  assert.match(app, /data-ig-banner-load/);
  assert.match(app, /instant-gaming\.com\/api\/banner\/partner\/loader\.js/);
  assert.match(privacy, /Instant Gaming: Der direkte Affiliate-Link ist ohne zusätzlichen Fremdcode nutzbar/);
  assert.match(css, /content-visibility:auto/);
  assert.match(css, /instant-gaming-module \.button\.primary/);
  assert.ok(css.length < sourceCss.length, "Produktions-CSS muss kleiner als die lesbare Quelle sein.");
  assert.ok(app.length < sourceApp.length, "Produktions-JS muss kleiner als die lesbare Quelle sein.");
  assert.doesNotMatch(css, /\/\* V12 NIGHT MARKET/);
  assert.equal((home.match(/rel="stylesheet"/g) || []).length, 1);
  assert.match(home, /site\.css\?v=48/);
  assert.match(home, /app\.js\?v=24/);
  assert.doesNotMatch(home, /styles\.css\?v=8|enhancements\.css\?v=8/);
  assert.match(home, /cdn\.shopify\.com[^"]*width=640|cdn\.shopify\.com[^"]*width%3D640/);
});

test("Brand-Links und Instant-Gaming-Loader bleiben zugänglich", () => {
  const build = fs.readFileSync("scripts/build.mjs", "utf8");
  assert.match(build, /aria-label="Angebotslotse Startseite"/);
  assert.match(build, /Partnerbanner laden/);
  assert.match(build, /Externer Inhalt bleibt bis zum Klick deaktiviert/);
});
