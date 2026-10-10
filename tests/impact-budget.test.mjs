import test from "node:test";
import assert from "node:assert/strict";
import { fetchImpactOffers } from "../scripts/lib/impact.mjs";

test("Impact paginates within bounded batches while preserving audit", async () => {
  const calls=[];
  const fetchImpl=async input=>{
    const url=new URL(input.toString());
    calls.push(url);
    const page=Number(url.searchParams.get("Page")||1);
    const endpoint=url.pathname;
    let data={"@numpages":1};
    if(endpoint.endsWith("/Campaigns")) data={Campaigns:[{CampaignId:"17",AdvertiserId:"5",AdvertiserName:"Test Electronics",CampaignName:"Test Electronics",ContractStatus:"Active",TrackingLink:"https://track.example/test",ShippingRegions:{ShippingRegion:["GERMANY"]}}],"@numpages":1};
    else if(endpoint.endsWith("/Ads")) data={Ads:[{Id:page,Name:"Approved creative "+page,CampaignId:"17",TrackingLink:"https://track.example/creative"+page}],"@numpages":20};
    else if(endpoint.endsWith("/Promotions")) data={Promotions:[],"@numpages":20};
    else if(endpoint.endsWith("/ItemSearch")) data={Items:page===1?[{CatalogId:"1",CatalogItemId:"42",Name:"Approved device",TrackingURL:"https://track.example/product",ImageUrl:"https://img.example/device.jpg",CurrentPrice:39,Currency:"EUR",StockAvailability:"InStock"},{CatalogId:"999",CatalogItemId:"99",Name:"Unknown advertiser item",TrackingURL:"https://track.example/unknown",CurrentPrice:20}]:[],"@numpages":20};
    else if(endpoint.endsWith("/Catalogs")) data={Catalogs:[{Id:"1",CampaignId:"17",Status:"ACTIVE"}],"@numpages":1};
    else if(endpoint.endsWith("/Deals")) data={Deals:[],"@numpages":20};
    return {ok:true,status:200,json:async()=>data};
  };
  const rows=await fetchImpactOffers({accountSid:"test",authToken:"test",fetchImpl});
  const ads=calls.filter(url=>url.pathname.endsWith("/Ads"));
  assert.ok(ads.length>=1 && ads.length<=10);
  assert.equal(rows.audit.programs,1);
  assert.equal(rows.audit.dealBatch.processed,1);
  assert.equal(rows.audit.productDiagnostics.accepted,1);
  assert.equal(rows.audit.productDiagnostics.matchedViaCatalog,1);
  assert.equal(rows.audit.productDiagnostics.missingApprovedProgram,1);
  assert.equal(rows.audit.catalogs,1);
  assert.equal(rows.some(row=>row.id==="product-999-99"),false);
  assert.ok(rows.some(row=>row.id==="product-1-42"));
  assert.ok(rows.filter(row=>String(row.id).startsWith("ad-")).length<=ads.length);
});
