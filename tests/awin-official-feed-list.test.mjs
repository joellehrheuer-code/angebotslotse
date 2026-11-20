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

test("six feed slots prioritize six distinct approved advertisers over duplicate shop feeds", async () => {
  const entries = [
    ["14172", "9"], ["14172", "10"], ["128051", "11"],
    ["125144", "12"], ["127821", "13"], ["14336", "14"], ["125816", "15"]
  ];
  const feedList = [
    "Advertiser ID,Advertiser Name,Primary Region,Membership Status,Datafeed Format,Feed ID,Feed Name,Language,URL",
    ...entries.map(([id, feed]) =>
      id + ",Approved,DE,Joined,Awin," + feed + ",Products,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/" + feed + "/format/csv")
  ].join("\n");
  const advertiserByFeed = new Map(entries.map(([id, feed]) => [feed, id]));
  const requests = [];
  const fetchImpl = async url => {
    const u = String(url);
    requests.push(u);
    if (u === feedListUrl) return { ok: true, status: 200, text: async () => feedList };
    const feed = /\/fid\/(\d+)\//.exec(u)?.[1];
    const advertiser = advertiserByFeed.get(feed);
    assert.ok(advertiser, "unexpected feed");
    return {
      ok: true, status: 200,
      arrayBuffer: async () => Buffer.from([
        "aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id",
        "https://track.example/" + feed + ",https://shop.example/" + feed + ",Product " + feed + ",Approved," + advertiser + ",25,EUR,https://img.example/" + feed + ".jpg,sku-" + feed
      ].join("\n"))
    };
  };
  const result = await fetchAwinProductFeeds({
    publisherId, feedListUrl, joinedAdvertiserIds: [...new Set(entries.map(([id]) => id))],
    fetchImpl, maxFeeds: 6
  });
  assert.deepEqual(requests.slice(1).map(u => /\/fid\/(\d+)\//.exec(u)?.[1]), ["9", "11", "12", "13", "14", "15"]);
  assert.equal(result.length, 6);
  assert.equal(new Set(result.map(product => product.advertiserId)).size, 6);
});

test("large first advertiser feed cannot exhaust the shared product limit", async () => {
  const feedList = [
    "Advertiser ID,Advertiser Name,Primary Region,Membership Status,Datafeed Format,Feed ID,Feed Name,Language,URL",
    "14172,First shop,DE,Joined,Awin,9,Products,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/9/format/csv",
    "128051,Second shop,DE,Joined,Awin,11,Products,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/11/format/csv"
  ].join("\n");
  const header = "aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id";
  const makeRow = (id, n) => [
    "https://track.example/" + id + "-" + n,
    "https://shop.example/" + id + "-" + n,
    "Product " + id + "-" + n, "Approved", id, "25", "EUR",
    "https://img.example/" + id + "-" + n + ".jpg", "sku-" + id + "-" + n
  ].join(",");
  const requested = [];
  const fetchImpl = async url => {
    const value = String(url);
    requested.push(value);
    if (value === feedListUrl) return {ok: true, status: 200, text: async () => feedList};
    const first = value.includes("/fid/9/");
    const rows = first
      ? Array.from({length: 6}, (_, index) => makeRow("14172", index + 1))
      : [makeRow("128051", 1)];
    return {ok: true, status: 200, arrayBuffer: async () => Buffer.from([header, ...rows].join("\n"))};
  };
  const offers = await fetchAwinProductFeeds({
    publisherId, feedListUrl, joinedAdvertiserIds: ["14172", "128051"],
    fetchImpl, maxFeeds: 2, maxProducts: 4
  });
  assert.equal(requested.length, 3);
  assert.equal(offers.length, 4);
  assert.deepEqual(offers.map(item => item.advertiserId), ["14172", "128051", "14172", "14172"]);
  assert.equal(new Set(offers.map(item => item.advertiserId)).size, 2);
});

test("a feed cannot inject products attributed to another joined advertiser", async () => {
  const list = [
    "Advertiser ID,Advertiser Name,Primary Region,Membership Status,Datafeed Format,Feed ID,Feed Name,Language,URL",
    "14172,Shop A,DE,active,Awin,9,Products,German,https://productdata.awin.com/datafeed/download/apikey/mock/fid/9/format/csv"
  ].join("\n");
  const header = "aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id";
  const product = (id, item) => [
    "https://track.example/" + item, "https://shop.example/" + item,
    "Verified " + item, "Merchant " + id, id, "25", "EUR",
    "https://img.example/" + item + ".jpg", item
  ].join(",");
  const fetchImpl = async url => String(url) === feedListUrl
    ? {ok: true, status: 200, text: async () => list}
    : {ok: true, status: 200, arrayBuffer: async () => Buffer.from([
        header, product("128051", "foreign-joined"), product("14172", "own")
      ].join("\n"))};
  const items = await fetchAwinProductFeeds({
    publisherId, feedListUrl, joinedAdvertiserIds: ["14172", "128051"],
    fetchImpl
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].advertiserId, "14172");
  assert.match(items[0].id, /own$/);
});
