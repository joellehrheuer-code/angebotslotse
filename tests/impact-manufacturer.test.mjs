import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fetchImpactOffers} from "../scripts/lib/impact.mjs";
import {normalizeOffer} from "../scripts/lib/normalize.mjs";

test("Impact catalog Manufacturer survives normalization as product brand",async()=>{
  const fetchImpl=async url=>{
    const path=new URL(url).pathname;
    const payload={"@numpages":1};
    if(path.endsWith("/Campaigns"))payload.Campaigns=[{
      CampaignId:"4482",AdvertiserId:"255547",AdvertiserName:"Martinic Audio",
      CampaignName:"Martinic Audio",ContractStatus:"Active",ShippingRegions:["GERMANY"],
      TrackingLink:"https://martinic.evyy.net/c/7662895/1234/4482",
      AdvertiserUrl:"https://www.martinic.com",AllowsDeeplinking:true
    }];
    else if(path.endsWith("/Catalogs/ItemSearch"))payload.Items=[{
      CatalogId:"11",CatalogItemId:"22",CampaignId:"4482",
      Name:"Audio Plugin",Manufacturer:"Martinic",
      Url:"https://martinic.evyy.net/c/7662895/9876/4482?u=https%3A%2F%2Fwww.martinic.com%2Fproducts%2Fplugin",
      ImageUrl:"https://cdn.example/plugin.jpg",CurrentPrice:"49.99",Currency:"EUR",StockAvailability:"InStock"
    }];
    else if(path.endsWith("/Ads"))payload.Ads=[];
    else if(path.endsWith("/Promotions"))payload.Promotions=[];
    else if(path.endsWith("/Catalogs"))payload.Catalogs=[];
    else if(path.endsWith("/Deals"))payload.Deals=[];
    else if(path.endsWith("/Stores"))payload.Stores=[];
    return {ok:true,json:async()=>payload};
  };
  const rows=await fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl});
  const raw=rows.find(x=>x.id==="product-11-22");
  assert.ok(raw);
  assert.equal(raw.manufacturer,"Martinic");
  const config=JSON.parse(fs.readFileSync("config.json","utf8"));
  const offer=normalizeOffer(raw,config,new Date("2026-11-19T12:00:00Z"));
  assert.ok(offer);
  assert.equal(offer.brand,"Martinic");
  assert.equal(offer.source,"impact");
});
