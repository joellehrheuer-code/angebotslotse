import test from "node:test";
import assert from "node:assert/strict";
import { fetchDirectOffers } from "../scripts/lib/direct.mjs";
import { fetchImpactOffers, IMPACT_API_VERSION } from "../scripts/lib/impact.mjs";

test("direkte Partner liefern nur aktivierte HTTPS-Angebote", async () => {
  const rows = await fetchDirectOffers();
  assert.equal(rows.length, 4);
  assert.ok(rows.every(r => r.source === "direct" && r.urlTracking.startsWith("https://")));
});
test("Impact bleibt ohne Zugangsdaten deaktiviert", async () => assert.deepEqual(await fetchImpactOffers({}), []));
test("Impact nutzt Media-Partner-API und Basic Auth", async () => {
  const calls=[];
  const fetchImpl = async (url, options) => {
    calls.push({url:String(url),options});
    const pathname = new URL(url).pathname;
    const payload = pathname.endsWith("/Campaigns") ? {Campaigns:[{CampaignId:"42",CampaignName:"Gaming",AdvertiserId:"7",AdvertiserName:"Shop",AdvertiserUrl:"https://shop.example",ContractStatus:"Active",ShippingRegions:["GERMANY"],TrackingLink:"https://track.example/x"}]} :
      pathname.endsWith("/Ads") ? {Ads:[{Id:"9",Name:"Gaming Aktion",CampaignId:"42",AdvertiserId:"7",TrackingLink:"https://track.example/ad",LandingPageUrl:"https://shop.example/deal"}]} :
      pathname.endsWith("/Promotions") ? {Promotions:[]} : pathname.endsWith("/Deals") ? {Deals:[]} : {Items:[]};
    return {ok:true,json:async()=>({...payload,"@numpages":1})};
  };
  const rows = await fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl});
  assert.ok(calls.some(call => /\/Mediapartners\/SID\/Campaigns/.test(call.url)));
  assert.ok(calls.some(call => /\/Mediapartners\/SID\/Ads/.test(call.url)));
  assert.ok(calls.some(call => /\/Mediapartners\/SID\/Promotions/.test(call.url)));
  assert.ok(calls.some(call => /\/Catalogs\/ItemSearch/.test(call.url)));
  assert.ok(calls.every(call => /^Basic /.test(call.options.headers.Authorization)));
  assert.ok(calls.every(call => call.options.headers["IR-Version"] === IMPACT_API_VERSION));
  assert.equal(rows.length, 2);
});
