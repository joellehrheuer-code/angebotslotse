import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const site = "https://example.test/angebotslotse";
const productImage = "https://cdn.example.test/official-product.jpg?width=1200&format=jpg";
const escapedImage = productImage.replaceAll("&", "&amp;");

test("product social images are rendered and only the site fallback is rejected", async t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "angebotslotse-social-"));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  for (const entry of ["scripts", "public", "data", "config.json"]) fs.cpSync(path.join(root, entry), path.join(cwd, entry), { recursive: true });
  const offer = {
    id: "social-image-test", slug: "official-product", source: "awin", productId: "product-1",
    title: "Official product", description: "Product image regression fixture",
    advertiser: "Test merchant", category: "technik", currentPrice: 99, currency: "EUR",
    trackingUrl: "https://merchant.example/product", destinationUrl: "https://merchant.example/product",
    imageUrl: productImage, imageAlt: 'Product "photo"', updatedAt: "2026-09-14T00:00:00Z"
  };
  fs.writeFileSync(path.join(cwd, "data/offers.json"), JSON.stringify([
    offer, { ...offer, id: "video-test", slug: "video-only", productId: "product-2", imageUrl: null, videoUrl: "https://merchant.example/video.mp4" }
  ]));
  const run = script => spawnSync(process.execPath, [path.join(cwd, "scripts", script)], { cwd, env: { ...process.env, SITE_URL: site }, encoding: "utf8" });
  const build = run("build.mjs");
  assert.equal(build.status, 0, build.stderr);
  const detail = path.join(cwd, "dist/angebote/official-product.html");
  const original = fs.readFileSync(detail, "utf8");
  for (const route of ["angebote/official-product.html", "produkt/official-product.html"]) {
    const html = fs.readFileSync(path.join(cwd, "dist", route), "utf8");
    assert.ok(html.includes('<meta property="og:image" content="' + escapedImage + '">'));
    assert.ok(html.includes('<meta name="twitter:image" content="' + escapedImage + '">'));
    assert.ok(html.includes('content="Product &quot;photo&quot;"'));
  }
  assert.doesNotMatch(fs.readFileSync(path.join(cwd, "dist/angebote/video-only.html"), "utf8"), /(?:property="og:image"|name="twitter:image")/);
  assert.ok(fs.readFileSync(path.join(cwd, "dist/index.html"), "utf8").includes('content="' + site + '/og.png"'));
  await t.test("official images pass all build checks", () => {
    const result = run("validate-build.mjs");
    assert.equal(result.status, 0, result.stderr);
  });
  for (const attribute of ['property="og:image"', 'name="twitter:image"']) {
    for (const fallback of [site + "/og.png", "../og.png?version=1#preview"]) {
      await t.test(attribute + " rejects " + fallback, () => {
        fs.writeFileSync(detail, original.replace(attribute + ' content="' + escapedImage + '"', attribute + ' content="' + fallback + '"'));
        const result = run("validate-build.mjs");
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Unpassendes allgemeines Social-Bild/);
      });
    }
  }
  await t.test("an external image named og.png is not the site fallback", () => {
    fs.writeFileSync(detail, original.replaceAll(escapedImage, "https://cdn.example.test/og.png"));
    const result = run("validate-build.mjs");
    assert.equal(result.status, 0, result.stderr);
  });
  await t.test("other quality checks remain active", () => {
    fs.writeFileSync(detail, original.replace('<meta name="viewport"', '<meta name="removed-viewport"'));
    const result = run("validate-build.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Viewport fehlt/);
  });
  await t.test("product pages also reject the generic fallback", () => {
    fs.writeFileSync(detail, original);
    const product = path.join(cwd, "dist/produkt/official-product.html");
    const html = fs.readFileSync(product, "utf8");
    for (const attribute of ['property="og:image"', 'name="twitter:image"']) {
      fs.writeFileSync(product, html.replace(attribute + ' content="' + escapedImage + '"', attribute + ' content="' + site + '/og.png"'));
      const result = run("validate-build.mjs");
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Unpassendes allgemeines Social-Bild/);
    }
  });
});
