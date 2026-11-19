import test from "node:test";
import assert from "node:assert/strict";
import { fetchImpactOffers } from "../scripts/lib/impact.mjs";

async function run({productTracking, officialTracking="https://belkinde.evyy.net/c/7662895/1234/3770",policy={}}) {
  const fetchImpl = async url => {
    const path = new URL(url).pathname;
    const payload = {"@numpages":1};
    if(path.endsWith("/Campaigns")) payload.Campaigns=[{
      CampaignId:"3770",AdvertiserId:"165682",AdvertiserName:"Belkin DE",
      CampaignName:"Belkin DE",ContractStatus:"Active",ShippingRegions:["GERMANY"],
      AdvertiserUrl:"https://www.belkin.com",TrackingLink:officialTracking,AllowsDeeplinking:false
    }];
    else if(path.endsWith("/Catalogs/ItemSearch")) payload.Items=[{
      CatalogId:"100",CampaignId:"3770",CatalogItemId:"1",Name:"USB Adapter",
      Url:productTracking,ImageUrl:"https://cdn.example/adapter.jpg",
      CurrentPrice:"19.99",Currency:"EUR",StockAvailability:"InStock"
    }];
    else if(path.endsWith("/Ads")) payload.Ads=[];
    else if(path.endsWith("/Promotions")) payload.Promotions=[];
    else if(path.endsWith("/Catalogs")) payload.Catalogs=[];
    else if(path.endsWith("/Deals")) payload.Deals=[];
    else if(path.endsWith("/Stores")) payload.Stores=[];
    return {ok:true,json:async()=>payload};
  };
  return fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl,linkPolicy:policy});
}

test("catalog link is accepted only when official publisher/campaign identity and host match",async()=>{
  const link="https://belkinde.evyy.net/c/7662895/9999/3770?prodsku=ADAPTER";
  const rows=await run({productTracking:link});
  const product=rows.find(x=>x.id==="product-100-1");
  assert.ok(product);
  assert.equal(product.urlTracking,link);
  assert.equal(rows.audit.productDiagnostics.verifiedCatalogTrackingLinks,1);
});

test("catalog link with mismatched publisher or campaign remains rejected",async()=>{
  for(const link of [
    "https://belkinde.evyy.net/c/OTHER/9999/3770",
    "https://belkinde.evyy.net/c/9999999/9999/3770",
    "https://belkinde.evyy.net/c/7662895/9999/7777",
    "https://other.example/c/7662895/9999/3770",
    "https://belkinde.evyy.net/c/7662895/9999/3770?u=https%3A%2F%2Fother.example"
  ]) {
    const rows=await run({productTracking:link});
    assert.equal(rows.some(x=>x.id==="product-100-1"),false,link);
  }
});

test("quarantined tracking hosts remain blocked even with matching account identity",async()=>{
  const host="razer.a9yw.net";
  const rows=await run({
    productTracking:`https://${host}/c/7662895/9999/3770`,
    officialTracking:`https://${host}/c/7662895/1234/3770`,
    policy:{quarantinedAdvertisers:[{advertiserId:"165682",blockedTrackingHosts:[host],requireDedicatedAdLink:true}]}
  });
  assert.equal(rows.some(x=>x.id==="product-100-1"),false);
  assert.equal(rows.audit.productDiagnostics.verifiedCatalogTrackingLinks,0);
});
