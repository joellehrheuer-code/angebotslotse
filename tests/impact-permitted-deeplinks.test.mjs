import test from "node:test";
import assert from "node:assert/strict";
import {fetchImpactOffers} from "../scripts/lib/impact.mjs";

function makeCatalogFetch({allow=true,productUrl="https://shop.vendor.example/de/device",trackingUrl=null}={}){
  const requests=[];
  const fetchImpl=async target=>{
    const url=new URL(target.toString());
    requests.push(url.pathname);
    let data={"@numpages":1};
    if(url.pathname.endsWith("/Campaigns"))
      data={Campaigns:[{CampaignId:"27",AdvertiserId:"8",AdvertiserName:"Vendor",CampaignName:"Vendor",
        ContractStatus:"Active",ShippingRegions:{ShippingRegion:["GERMANY"]},
        AdvertiserUrl:"https://shop.vendor.example/",AllowsDeeplinking:allow,
        TrackingLink:"https://vendor.sjv.io/c/123/456/789"}],"@numpages":1};
    if(url.pathname.endsWith("/ItemSearch"))
      data={Items:[{CampaignId:"27",CatalogId:"1",CatalogItemId:"9",Name:"Vendor product",
        Url:productUrl,TrackingURL:trackingUrl,ImageUrl:"https://shop.vendor.example/image.jpg",
        CurrentPrice:49,Currency:"EUR",StockAvailability:"InStock"}],"@numpages":1};
    if(url.pathname.endsWith("/Catalogs"))data={Catalogs:[{Id:"1",CampaignId:"27",Status:"ACTIVE"}],"@numpages":1};
    if(url.pathname.endsWith("/Ads"))data={Ads:[],"@numpages":1};
    if(url.pathname.endsWith("/Promotions"))data={Promotions:[],"@numpages":1};
    if(url.pathname.endsWith("/Deals"))data={Deals:[],"@numpages":1};
    return {ok:true,status:200,json:async()=>data};
  };
  return {requests,fetchImpl};
}

test("Impact creates encoded product deep link only under explicit joined-program permission",async()=>{
  const mock=makeCatalogFetch();
  const rows=await fetchImpactOffers({accountSid:"test",authToken:"test",fetchImpl:mock.fetchImpl});
  const item=rows.find(x=>x.id==="product-1-9");
  assert.ok(item);
  const link=new URL(item.urlTracking);
  assert.equal(link.hostname,"vendor.sjv.io");
  assert.equal(link.searchParams.get("u"),"https://shop.vendor.example/de/device");
  assert.equal(item.url,"https://shop.vendor.example/de/device");
  assert.equal(rows.audit.productDiagnostics.deeplinkFromApprovedProgram,1);
  assert.equal(rows.audit.productDiagnostics.missingTrackingLink,0);
});

test("Impact refuses deep links for partners that do not permit deep linking",async()=>{
  const mock=makeCatalogFetch({allow:false});
  const rows=await fetchImpactOffers({accountSid:"test",authToken:"test",fetchImpl:mock.fetchImpl});
  assert.ok(!rows.some(x=>x.id==="product-1-9"));
  assert.equal(rows.audit.productDiagnostics.missingTrackingLink,1);
});

test("Impact refuses catalog URL pointing outside official joined merchant's host",async()=>{
  const mock=makeCatalogFetch({productUrl:"https://vendor.example.attacker.invalid/offer"});
  const rows=await fetchImpactOffers({accountSid:"test",authToken:"test",fetchImpl:mock.fetchImpl});
  assert.ok(!rows.some(x=>x.id==="product-1-9"));
  assert.equal(rows.audit.productDiagnostics.missingTrackingLink,1);
});

test("Impact can still use a valid product-owned tracking URL if program's deep linking is disabled",async()=>{
  const mock=makeCatalogFetch({allow:false,trackingUrl:"https://vendor.sjv.io/official-product"});
  const rows=await fetchImpactOffers({accountSid:"test",authToken:"test",fetchImpl:mock.fetchImpl});
  const item=rows.find(x=>x.id==="product-1-9");
  assert.equal(item?.urlTracking,"https://vendor.sjv.io/official-product");
  assert.equal(rows.audit.productDiagnostics.deeplinkFromApprovedProgram,0);
});

test("Impact keeps quarantined domains blocked even with deeplink permission",async()=>{
  const mock=makeCatalogFetch({allow:true});
  const rows=await fetchImpactOffers({accountSid:"test",authToken:"test",fetchImpl:mock.fetchImpl,
    linkPolicy:{quarantinedAdvertisers:[{advertiserId:"8",blockedTrackingHosts:["vendor.sjv.io"]}]}});
  assert.ok(!rows.some(x=>x.id==="product-1-9"));
  assert.equal(rows.audit.productDiagnostics.missingTrackingLink,1);
});
