import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAndDedupe } from "../scripts/lib/normalize.mjs";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const config = { marketCountry: "DE", maxOffers: 100, categories: { technik: ["audio"], sonstiges: [] } };
const base = { title: "Studio Kopfhörer", description: "Echte Produktbeschreibung", url: "https://shop.example/headphones", urlTracking: "https://track.example/headphones", advertiser: { id: 1, name: "Shop", joined: true }, regions: { list: [{ countryCode: "DE" }] }, imageUrl: "https://cdn.example/headphones-main.jpg", additionalImageUrls: ["https://cdn.example/headphones-main.jpg", "https://cdn.example/headphones-side.jpg"], currentPrice: 99, currency: "EUR", brand: "Audio Brand", gtin: "04012345678901", mpn: "AB-1" };

test("keeps the same GTIN as separate offers for different merchants", () => {
  const rows = normalizeAndDedupe([
    base,
    { ...base, promotionId: 2, url: "https://shop.example/headphones-variant", urlTracking: "https://track.example/headphones-variant", advertiser: { id: 2, name: "Second Shop", joined: true }, imageUrl: "https://cdn.example/headphones-alt.jpg", additionalImageUrls: ["https://cdn.example/headphones-side.jpg", "https://cdn.example/headphones-alt.jpg"], currentPrice: 89 },
  ], config, new Date("2026-09-15"));
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => row.gtin === "04012345678901"));
});

test("quality report exposes source, identity and gallery counters", () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, SITE_URL: "https://example.github.io/angebotslotse" },
    stdio: "ignore",
  });
  const report = JSON.parse(fs.readFileSync("dist/build-report.json", "utf8"));
  assert.equal(report.version, "V6-premium-dark-commerce");
  assert.equal(typeof report.rawRecords, "number");
  assert.equal(typeof report.uniqueProducts, "number");
  assert.equal(typeof report.multiImageProducts, "number");
  assert.equal(typeof report.offersWithMultipleMerchants, "number");
});
