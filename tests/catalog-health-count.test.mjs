import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(new URL("../scripts/catalog-health.mjs", import.meta.url));
const eligible = { source: "impact", id: "verified-1", productId: "sku-1",
  title: "Official product", advertiser: "Verified Shop", advertiserId: "42",
  currentPrice: 79, imageUrl: "https://cdn.example.test/product.jpg", trackingUrl: "https://tracking.example.test/c/1/2/3" };
const run = (offers, publishable, policy = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "angebotslotse-health-"));
  try {
    fs.mkdirSync(path.join(dir, "data"));
    fs.writeFileSync(path.join(dir, "data/offers.json"), JSON.stringify(offers));
    fs.writeFileSync(path.join(dir, "data/status.json"), JSON.stringify({
      state: "ok", publishableOffers: publishable, sources: {}
    }));
    fs.writeFileSync(path.join(dir, "data/impact-link-policy.json"), JSON.stringify(policy));
    return spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8", timeout: 8000 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test("catalog health rejects positive reported count when stored offers are not verified", () => {
  const result = run([{ ...eligible, isStale: true }], 1);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /reported publishable count does not match/);
});

test("catalog health accepts a consistent nonempty verified inventory", () => {
  const result = run([eligible], 1);
  assert.equal(result.status, 0, result.stderr);
});

test("catalog health excludes quarantined advertisers from the verified count", () => {
  const policy = { quarantinedAdvertisers: [{ advertiserId: "42" }] };
  const result = run([eligible], 1, policy);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /reported publishable count does not match/);
});

test("catalog health keeps empty live catalog blocked even with a consistent count", () => {
  const result = run([], 0);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no verified publishable offers/);
});

test("catalog health refuses an expired offer even when the source reports it as verified", () => {
  const expired = { ...eligible, endDate: "2020-01-01T00:00:00Z" };
  const result = run([expired], 1);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no publishable offers remain after the actual site visibility filters/);
});

test("catalog health refuses blocked adult merchandise before saving the import snapshot", () => {
  const blocked = { ...eligible, title: "Adult erotic shop vibrator" };
  const result = run([blocked], 1);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no publishable offers remain after the actual site visibility filters/);
});
