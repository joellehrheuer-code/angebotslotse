import test from "node:test";
import assert from "node:assert/strict";
import { fetchAwinProductFeeds } from "../scripts/lib/awin-product-feeds.mjs";

const publisherId = "3045061";
const feedListUrl = `https://ui.awin.com/productdata-darwin-download/publisher/${publisherId}/test-datafeed-key/1/feedList`;
const csv = [
  "Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,URL",
  "14172,Approved,DE,Joined,9,Products,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/9/format/csv",
  "99999,Other,DE,Joined,10,Products,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/10/format/csv"
].join("\n");
const products = [
  "aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id",
  "https://track.example/item,https://approved.example/item,Approved item,Approved,14172,25,EUR,https://img.example/item.jpg,sku-1"
].join("\n");

test("official publisher feed-list URL imports only joined approved advertiser products", async () => {
  const requests = [];
  const fetchImpl = async url => {
    requests.push(String(url));
    return String(url) === feedListUrl
      ? { ok: true, status: 200, text: async () => csv }
      : { ok: true, status: 200, arrayBuffer: async () => Buffer.from(products) };
  };
  const result = await fetchAwinProductFeeds({ publisherId, feedListUrl, joinedAdvertiserIds: ["14172"], fetchImpl });
  assert.equal(requests.length, 2);
  assert.equal(requests[0], feedListUrl);
  assert.equal(result.length, 1);
  assert.equal(result[0].advertiserId, "14172");
});

test("feed-list URL for another publisher is rejected before network access", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw Error("must not fetch"); };
  await assert.rejects(
    fetchAwinProductFeeds({ publisherId, feedListUrl: feedListUrl.replace("/3045061/", "/3045062/"), joinedAdvertiserIds: ["14172"], fetchImpl }),
    /Untrusted Awin feed-list URL/
  );
  assert.equal(calls, 0);
});

test("feed-list URL with an untrusted redirect host is rejected before network access", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw Error("must not fetch"); };
  await assert.rejects(
    fetchAwinProductFeeds({ publisherId, feedListUrl: "https://not-awin.example/feedList", joinedAdvertiserIds: ["14172"], fetchImpl }),
    /Untrusted Awin feed-list URL/
  );
  assert.equal(calls, 0);
});

test("official mixed feed list skips Google-format feeds in legacy CSV importer", async () => {
  const list = [
    "Advertiser ID,Advertiser Name,Primary Region,Membership Status,Datafeed Format,Feed ID,Feed Name,Language,URL",
    "14172,Approved,DE,active,Awin,9,Standard,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/9/format/csv",
    "14172,Approved,DE,active,Google,10,Enhanced,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/10/format/csv"
  ].join("\n");
  const requested = [];
  const fetchImpl = async url => {
    requested.push(String(url));
    if (String(url) === feedListUrl) return { ok: true, status: 200, text: async () => list };
    return { ok: true, status: 200, arrayBuffer: async () => Buffer.from(products) };
  };
  const result = await fetchAwinProductFeeds({ publisherId, feedListUrl, joinedAdvertiserIds: ["14172"], fetchImpl });
  assert.equal(requested.length, 2, "the Google-format URL must never be requested by legacy parser");
  assert.match(requested[1], /\/fid\/9\//);
  assert.equal(result.length, 1);
});

test("official feed list with only Google-format feeds is not downloaded by legacy importer", async () => {
  const list = [
    "Advertiser ID,Advertiser Name,Primary Region,Membership Status,Datafeed Format,Feed ID,Feed Name,Language,URL",
    "14172,Approved,DE,active,Google,10,Enhanced,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/10/format/csv"
  ].join("\n");
  let calls = 0;
  const fetchImpl = async url => {
    calls++;
    if (String(url) === feedListUrl) return { ok: true, status: 200, text: async () => list };
    throw new Error("Google-format feed must not be read as legacy CSV");
  };
  const result = await fetchAwinProductFeeds({ publisherId, feedListUrl, joinedAdvertiserIds: ["14172"], fetchImpl });
  assert.equal(calls, 1);
  assert.deepEqual(result, []);
});
