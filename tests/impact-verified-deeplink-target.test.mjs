import test from "node:test";
import assert from "node:assert/strict";
import {fetchImpactOffers} from "../scripts/lib/impact.mjs";

async function run({destination="https://www.martinic.com/products/",permitted=true,
  merchantUrl="https://www.martinic.com",policy={},duplicateU=false}={}){
  const official="https://martinic.evyy.net/c/7662895/1234/4482";
  const candidate=new URL("https://martinic.evyy.net/c/7662895/9876/4482");
  candidate.searchParams.append("u",destination);
  if(duplicateU)candidate.searchParams.append("u","https://attacker.example");
  const fetchImpl=async url=>{
    const path=new URL(url).pathname;
    const payload={"@numpages":1};
    if(path.endsWith("/Campaigns"))payload.Campaigns=[{
      CampaignId:"4482",AdvertiserId:"255547",AdvertiserName:"Martin ic",CampaignName:"Martin ic",
      ContractStatus:"Active",ShippingRegions:["GERMANY"],TrackingLink:official,
      AdvertiserUrl:merchantUrl,AllowsDeeplinking:permitted
    }];
    else if(path.endsWith("/Catalogs/ItemSearch"))payload.Items=[{
      CatalogId:"11",CatalogItemId:"22",CampaignId:"4482",
      Name:"Plugin",Url:candidate.href,
      ImageUrl:"https://cdn.example/plugin.jpg",CurrentPrice:"49.99",
      Currency:"EUR",StockAvailability:"InStock"
    }];
    else if(path.endsWith("/Ads"))payload.Ads=[];
    else if(path.endsWith("/Promotions"))payload.Promotions=[];
    else if(path.endsWith("/Catalogs"))payload.Catalogs=[];
    else if(path.endsWith("/Deals"))payload.Deals=[];
    else if(path.endsWith("/Stores"))payload.Stores=[];
    return {ok:true,json:async()=>payload};
  };
  return fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl,linkPolicy:policy});
}

test("approved Impact deep link retains original product tracking with official host, publisher and campaign",async()=>{
  const rows=await run();
  const offer=rows.find(x=>x.id==="product-11-22");
  assert.ok(offer);
  assert.equal(new URL(offer.urlTracking).searchParams.get("u"),"https://www.martinic.com/products/");
  assert.equal(rows.audit.productDiagnostics.verifiedCatalogTrackingLinks,1);
});

test("foreign, insecure, multiple or unapproved product destinations remain blocked",async()=>{
  const cases=[
    {destination:"https://other.example/product"},
    {destination:"http://www.martinic.com/product"},
    {duplicateU:true},
    {permitted:false},
    {merchantUrl:null}
  ];
  for(const item of cases) {
    const rows=await run(item);
    assert.equal(rows.some(x=>x.id==="product-11-22"),false,JSON.stringify(item));
    assert.equal(rows.audit.productDiagnostics.verifiedCatalogTrackingLinks,0);
  }
});

test("existing Impact publisher quarantine always wins even with verified deeplink",async()=>{
  const rows=await run({policy:{quarantinedAdvertisers:[{
    advertiserId:"255547",blockedTrackingHosts:["martinic.evyy.net"],requireDedicatedAdLink:true
  }]}});
  assert.equal(rows.some(x=>x.id==="product-11-22"),false);
});
