import test from "node:test";
import assert from "node:assert/strict";
import { fetchImpactOffers } from "../scripts/lib/impact.mjs";

const campaign = {
  CampaignId: "42", CampaignName: "Demo Shop", AdvertiserId: "7",
  AdvertiserName: "Demo Shop", AdvertiserUrl: "https://shop.example",
  ContractStatus: "Active", ShippingRegions: ["GERMANY"],
  TrackingLink: "https://track.example/program"
};

async function runProductCheck({ allowsDeeplinking, productUrl, trackingLink, policy = {} }) {
  const fetchImpl = async url => {
    const path = new URL(url).pathname;
    let payload = { "@numpages": 1 };
    if (path.endsWith("/Campaigns")) payload.Campaigns = [{ ...campaign, AllowsDeeplinking: allowsDeeplinking }];
    else if (path.endsWith("/Catalogs/ItemSearch")) payload.Items = [{
      CatalogId: "100", CampaignId: "42", CatalogItemId: "1", Name: "Demo Mouse",
      Url: productUrl, TrackingLink: trackingLink, ImageUrl: "https://shop.example/mouse.jpg",
      CurrentPrice: "29.90", Currency: "EUR", StockAvailability: "InStock"
    }];
    else if (path.endsWith("/Ads")) payload.Ads = [];
    else if (path.endsWith("/Promotions")) payload.Promotions = [];
    else if (path.endsWith("/Catalogs")) payload.Catalogs = [];
    else if (path.endsWith("/Deals")) payload.Deals = [];
    else if (path.endsWith("/Stores")) payload.Stores = [];
    return { ok: true, json: async () => payload };
  };
  return fetchImpactOffers({ accountSid: "SID", authToken: "TOKEN", fetchImpl, linkPolicy: policy });
}

test("Impact diagnoses disallowed deeplinks without leaking any URL", async () => {
  const rows = await runProductCheck({
    allowsDeeplinking: false, productUrl: "https://shop.example/mouse"
  });
  assert.equal(rows.audit.productDiagnostics.missingTrackingLink, 1);
  assert.deepEqual(rows.audit.productDiagnostics.linkFailureReasons, { "deeplinking-not-approved": 1 });
  assert.doesNotMatch(JSON.stringify(rows.audit.productDiagnostics), /https?:|TOKEN|SID/);
  assert.equal(rows.some(row => row.id === "product-100-1"), false);
});

test("Impact rejects unverified merchant domains even when deeplinking is allowed", async () => {
  const rows = await runProductCheck({
    allowsDeeplinking: true, productUrl: "https://unrelated.example/mouse"
  });
  assert.deepEqual(rows.audit.productDiagnostics.linkFailureReasons, { "unverified-merchant-domain": 1 });
  assert.equal(rows.some(row => row.id === "product-100-1"), false);
});

test("Impact accepts approved merchant deeplinks without weakening source checks", async () => {
  const rows = await runProductCheck({
    allowsDeeplinking: true, productUrl: "https://shop.example/mouse"
  });
  const product = rows.find(row => row.id === "product-100-1");
  assert.ok(product);
  assert.equal(new URL(product.urlTracking).searchParams.get("u"), "https://shop.example/mouse");
  assert.deepEqual(rows.audit.productDiagnostics.linkFailureReasons, {});
  assert.equal(rows.audit.productDiagnostics.deeplinkFromApprovedProgram, 1);
});

test("Impact reports only host-level domain review candidates without auto-approving them", async () => {
  const rows = await runProductCheck({
    allowsDeeplinking: true,
    productUrl: "https://unrelated.example/private/path?token=DO_NOT_EXPOSE"
  });
  assert.equal(rows.audit.productDiagnostics.missingTrackingLink, 1);
  assert.equal(rows.audit.productDiagnostics.domainReviewCount, 1);
  assert.deepEqual(rows.audit.productDiagnostics.domainReviewCandidates, [{
    campaignId: "42",
    advertiserId: "7",
    productHost: "unrelated.example",
    expectedHosts: ["shop.example"],
    count: 1
  }]);
  const audit = JSON.stringify(rows.audit.productDiagnostics);
  for (const forbidden of ["DO_NOT_EXPOSE", "private/path", "https://", "http://"]) assert.equal(audit.includes(forbidden), false);
  assert.equal(rows.some(row => row.id === "product-100-1"), false);
});
