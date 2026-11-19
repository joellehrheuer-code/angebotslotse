import test from "node:test";
import assert from "node:assert/strict";
import {fetchImpactOffers} from "../scripts/lib/impact.mjs";

async function audit({itemUrl, officialUrl="https://track.example/c/12345/50/3770",blocked=false}) {
  const fetchImpl=async url=>{
    const path=new URL(url).pathname;
    const payload={"@numpages":1};
    if(path.endsWith("/Campaigns"))payload.Campaigns=[{
      CampaignId:"3770",AdvertiserId:"8",AdvertiserName:"Sample",
      CampaignName:"Sample",ContractStatus:"Active",ShippingRegions:["GERMANY"],
      AdvertiserUrl:"https://shop.example",AllowsDeeplinking:true,TrackingLink:officialUrl
    }];
    else if(path.endsWith("/Catalogs/ItemSearch"))payload.Items=[{
      CatalogId:"7",CatalogItemId:"14",CampaignId:"3770",
      Name:"Sample Product",Url:itemUrl,ImageUrl:"https://shop.example/item.jpg",
      CurrentPrice:"39.99",Currency:"EUR",StockAvailability:"InStock"
    }];
    else if(path.endsWith("/Ads"))payload.Ads=[];
    else if(path.endsWith("/Promotions"))payload.Promotions=[];
    else if(path.endsWith("/Catalogs"))payload.Catalogs=[];
    else if(path.endsWith("/Deals"))payload.Deals=[];
    else if(path.endsWith("/Stores"))payload.Stores=[];
    return {ok:true,json:async()=>payload};
  };
  const linkPolicy=blocked?{quarantinedAdvertisers:[{advertiserId:"8",blockedTrackingHosts:["track.example"]}]}:{};
  return fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl,linkPolicy});
}

test("Impact classifies catalog tracking-identity defects without URL leakage",async()=>{
  const cases=[
    ["https://other.example/c/12345/77/3770","tracking-host-mismatch"],
    ["https://track.example/c/99999/77/3770","publisher-id-mismatch"],
    ["https://track.example/c/12345/77/5555","campaign-id-mismatch"],
    ["https://track.example/product/sku","catalog-link-not-full-identity"]
  ];
  for(const [itemUrl,reason] of cases){
    const rows=await audit({itemUrl});
    assert.equal(rows.some(x=>x.id==="product-7-14"),false);
    assert.deepEqual(rows.audit.productDiagnostics.catalogIdentityReasons,{[reason]:1});
    assert.equal(rows.audit.productDiagnostics.missingTrackingLink,1);
    const json=JSON.stringify(rows.audit.productDiagnostics);
    assert.equal(json.includes("https://"),false);
    assert.equal(json.includes("/c/12345"),false);
  }
});

test("Impact identifies invalid official link shape and keeps catalog items blocked",async()=>{
  const rows=await audit({itemUrl:"https://track.example/c/12345/77/3770",officialUrl:"https://track.example/vanity"});
  assert.deepEqual(rows.audit.productDiagnostics.catalogIdentityReasons,{"program-link-not-full-identity":1});
  assert.equal(rows.some(x=>x.id==="product-7-14"),false);
});

test("Impact records policy-blocked identity without lifting quarantine",async()=>{
  const rows=await audit({itemUrl:"https://track.example/c/12345/77/3770",blocked:true});
  assert.deepEqual(rows.audit.productDiagnostics.catalogIdentityReasons,{"blocked-tracking-host":1});
  assert.equal(rows.some(x=>x.id==="product-7-14"),false);
});
