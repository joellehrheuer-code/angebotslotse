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

test("Impact veröffentlicht quarantänisierte Ads nicht ohne abweichenden offiziellen Trackinglink", async () => {
  const fetchImpl = async url => {
    const pathname = new URL(url).pathname;
    let payload = {"@numpages":1};
    if (pathname.endsWith("/Campaigns")) payload.Campaigns=[{CampaignId:"42",CampaignName:"Gaming",AdvertiserId:"7",AdvertiserName:"Shop",AdvertiserUrl:"https://shop.example",ContractStatus:"Active",ShippingRegions:["GERMANY"],TrackingLink:"https://track.example/program"}];
    else if (pathname.endsWith("/Ads")) payload.Ads=[{Id:"3227040",Name:"GearUP for League of Legends",CampaignId:"42",AdvertiserId:"7",TrackingLink:"https://gearup.sjv.io/c/7662895/3227040/40222",LandingPageUrl:"https://www.gearupbooster.com/camp/lol/"}];
    else if (pathname.endsWith("/TrackingLink")) payload.TrackingLink="https://gearup.sjv.io/c/7662895/3227040/40222";
    else if (pathname.endsWith("/Promotions")) payload.Promotions=[];
    else if (pathname.endsWith("/Deals")) payload.Deals=[];
    else payload.Items=[];
    return {ok:true,json:async()=>payload};
  };
  const rows = await fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl,linkPolicy:{reviewSourceIds:["ad-3227040"],blockedTrackingUrls:["https://gearup.sjv.io/c/7662895/3227040/40222"]}});
  assert.equal(rows.some(row => row.id === "ad-3227040"), false);
});

test("Impact akzeptiert für eine geprüfte Ad nur eine abweichende offizielle Alternative", async () => {
  const alternate="https://gearup.sjv.io/c/7662895/alternate/40222";
  const fetchImpl = async url => {
    const pathname = new URL(url).pathname;
    let payload = {"@numpages":1};
    if (pathname.endsWith("/Campaigns")) payload.Campaigns=[{CampaignId:"42",CampaignName:"Gaming",AdvertiserId:"7",AdvertiserName:"Shop",AdvertiserUrl:"https://shop.example",ContractStatus:"Active",ShippingRegions:["GERMANY"],TrackingLink:"https://track.example/program"}];
    else if (pathname.endsWith("/Ads")) payload.Ads=[{Id:"3227040",Name:"GearUP for League of Legends",CampaignId:"42",AdvertiserId:"7",TrackingLink:"https://gearup.sjv.io/c/7662895/3227040/40222",LandingPageUrl:"https://www.gearupbooster.com/camp/lol/"}];
    else if (pathname.endsWith("/TrackingLink")) payload.TrackingURL=alternate;
    else if (pathname.endsWith("/Promotions")) payload.Promotions=[];
    else if (pathname.endsWith("/Deals")) payload.Deals=[];
    else payload.Items=[];
    return {ok:true,json:async()=>payload};
  };
  const rows = await fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl,linkPolicy:{reviewSourceIds:["ad-3227040"],blockedTrackingUrls:["https://gearup.sjv.io/c/7662895/3227040/40222"]}});
  assert.equal(rows.find(row => row.id === "ad-3227040")?.urlTracking, alternate);
});

test("Impact quarantänisiert einen problematischen Advertiser vollständig und lässt andere unverändert", async () => {
  const dedicatedChecks=[];
  const fetchImpl = async url => {
    const pathname = new URL(url).pathname;
    let payload = {"@numpages":1};
    if (pathname.endsWith("/Campaigns")) payload.Campaigns=[
      {CampaignId:"40222",CampaignName:"GearUP",AdvertiserId:"6117213",AdvertiserName:"GearUP Portal Pte Ltd",AdvertiserUrl:"https://gearup.example",ContractStatus:"Active",ShippingRegions:["GERMANY"],TrackingLink:"https://gearup.sjv.io/c/program"},
      {CampaignId:"88",CampaignName:"Other",AdvertiserId:"8",AdvertiserName:"Other Shop",AdvertiserUrl:"https://other.example",ContractStatus:"Active",ShippingRegions:["GERMANY"],TrackingLink:"https://other.sjv.io/c/program"}
    ];
    else if (pathname.endsWith("/Ads")) payload.Ads=[
      {Id:"1",Name:"Gear One",CampaignId:"40222",AdvertiserId:"6117213",TrackingLink:"https://gearup.sjv.io/c/one",LandingPageUrl:"https://gearup.example/one"},
      {Id:"2",Name:"Gear Two",CampaignId:"40222",AdvertiserId:"6117213",TrackingLink:"https://gearup.sjv.io/c/two",LandingPageUrl:"https://gearup.example/two"},
      {Id:"3",Name:"Other Ad",CampaignId:"88",AdvertiserId:"8",TrackingLink:"https://other.sjv.io/c/ad",LandingPageUrl:"https://other.example/ad"}
    ];
    else if (pathname.endsWith("/TrackingLink")) { dedicatedChecks.push(pathname); payload.TrackingURL=`https://gearup.sjv.io/c/alternate-${pathname.split("/").at(-2)}`; }
    else if (pathname.endsWith("/Promotions")) payload.Promotions=[];
    else if (pathname.endsWith("/Deals")) payload.Deals=[];
    else payload.Items=[];
    return {ok:true,json:async()=>payload};
  };
  const rows = await fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl,linkPolicy:{quarantinedAdvertisers:[{advertiserId:"6117213",blockedTrackingHosts:["gearup.sjv.io"],requireDedicatedAdLink:true}]}});
  assert.equal(dedicatedChecks.length, 2);
  assert.equal(rows.some(row => row.advertiserId === "6117213" || row.advertiserName === "GearUP Portal Pte Ltd"), false);
  assert.deepEqual(rows.filter(row => row.advertiserId === "8").map(row => row.id), ["program-88","ad-3"]);
});
