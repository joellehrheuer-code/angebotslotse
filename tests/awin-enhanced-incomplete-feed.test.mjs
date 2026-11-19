import test from "node:test";
import assert from "node:assert/strict";
import { fetchAwinEnhancedFeeds } from "../scripts/lib/awin-product-feeds.mjs";

const product = (id) => ({
  product_basic: {
    id, title: "Gültiges Testprodukt", link: "https://shop.example/item",
    image_link: "https://shop.example/image.jpg", aw_deep_link: "https://track.example/item"
  },
  price_and_availability: { price: "29.00 EUR", availability: "in_stock" }
});
const advertiser = [{ id: 7, name: "Freigegebener Testhändler" }];
const base = { publisherId: "3045061", token: "mock-test-only", advertisers: advertiser };

test("Awin enhanced feed discards partial products when HTTP 200 JSONL ends with an error", async () => {
  const rows = [JSON.stringify(product("p1")), JSON.stringify({ error: 500, message: "Internal server error" })].join("\n");
  const fetchImpl = async (url) => url.includes("de_DE")
    ? { ok: true, status: 200, text: async () => rows }
    : { ok: false, status: 404 };
  const result = await fetchAwinEnhancedFeeds({ ...base, fetchImpl, maxProducts: 1 });
  assert.equal(result.products.length, 0, "even a product cap must not hide a terminal feed error");
  assert.equal(result.feeds[0].state, "incomplete");
  assert.equal(result.feeds[0].products, 0);
});

test("Awin enhanced importer retries the second locale after rejecting a partial first locale", async () => {
  const fetchImpl = async (url) => ({
    ok: true, status: 200,
    text: async () => url.includes("de_DE")
      ? [JSON.stringify(product("partial")), JSON.stringify({ error: 500 })].join("\n")
      : JSON.stringify(product("complete"))
  });
  const result = await fetchAwinEnhancedFeeds({ ...base, fetchImpl });
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].productId, "complete");
  assert.equal(result.feeds[0].state, "incomplete");
  assert.equal(result.feeds[1].state, "available");
});
