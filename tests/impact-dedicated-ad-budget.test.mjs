import test from "node:test";
import assert from "node:assert/strict";
import { fetchImpactOffers } from "../scripts/lib/impact.mjs";

test("many quarantined ads never exhaust source timeout with unbounded verification calls", async () => {
  let dedicatedRequests = 0;
  const ads = Array.from({length: 35}, (_,i) => ({
    Id: String(i+1), CampaignId: "42", AdvertiserId: "7",
    Name: "Ad " + i, TrackingLink: "https://ads.example/c/" + i,
    LandingPageUrl: "https://shop.example/deal/" + i
  }));
  const fetchImpl = async url => {
    const pathname = new URL(url).pathname;
    let payload = {"@numpages":1};
    if(pathname.endsWith("/Campaigns")) payload.Campaigns=[{
      CampaignId:"42",AdvertiserId:"7",AdvertiserName:"Demo",CampaignName:"Demo",
      ContractStatus:"Active",ShippingRegions:["GERMANY"],
      AdvertiserUrl:"https://shop.example",TrackingLink:"https://track.example/p"
    }];
    else if(pathname.endsWith("/Ads")) payload.Ads=ads;
    else if(pathname.endsWith("/TrackingLink")) {
      dedicatedRequests++;
      payload.TrackingLink = "https://ads.example/c/" + pathname.split("/").at(-2);
    }
    else if(pathname.endsWith("/Promotions")) payload.Promotions=[];
    else if(pathname.endsWith("/Catalogs/ItemSearch")) payload.Items=[];
    else if(pathname.endsWith("/Catalogs")) payload.Catalogs=[];
    else if(pathname.endsWith("/Deals")) payload.Deals=[];
    else if(pathname.endsWith("/Stores")) payload.Stores=[];
    return {ok:true,status:200,json:async()=>payload};
  };
  const rows = await fetchImpactOffers({
    accountSid:"SID",authToken:"TOKEN",fetchImpl,
    linkPolicy:{quarantinedAdvertisers:[{advertiserId:"7",requireDedicatedAdLink:true}]}
  });
  assert.equal(dedicatedRequests,12);
  assert.deepEqual(rows.audit.dedicatedAdVerification,{limit:12,attempted:12,skipped:23});
  assert.equal(rows.some(row=>row.id.startsWith("ad-")),false);
});
