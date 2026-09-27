import test from "node:test";
import assert from "node:assert/strict";
import { fetchDirectOffers } from "../scripts/lib/direct.mjs";
import { fetchImpactOffers, IMPACT_API_VERSION } from "../scripts/lib/impact.mjs";
import { fetchAwinPrograms, fetchAwinProgramDetails } from "../scripts/lib/awin.mjs";
import { fetchDaisyconOffers } from "../scripts/lib/daisycon.mjs";
import { fetchTradedoublerOffers } from "../scripts/lib/tradedoubler.mjs";
import { fetchWebgainsOffers } from "../scripts/lib/webgains.mjs";

test("Awin-Programminventar trennt alle offiziellen Beziehungszustände",async()=>{
  const calls=[];const fetchImpl=async url=>{calls.push(String(url));return{ok:true,json:async()=>[{id:1,name:"Programm"}]};};
  const result=await fetchAwinPrograms({publisherId:"3045061",token:"secret",fetchImpl});
  assert.deepEqual(Object.keys(result),["joined","pending","suspended","rejected","notjoined"]);assert.equal(calls.length,5);assert.ok(calls.every(url=>url.includes("countryCode=DE")));
});

test("Awin-Programmdetails liefern KPI- und Provisionsdaten",async()=>{
  let called="";
  const fetchImpl=async url=>{called=String(url);return{ok:true,json:async()=>({kpi:{awinIndex:82,approvalPercentage:91,epc:0.42,conversionRate:3.4,validationDays:18},commissionRange:[{min:3,max:8,type:"percentage"}]})};};
  const result=await fetchAwinProgramDetails({publisherId:"3045061",token:"secret",advertiserId:14815,relationship:"notjoined",fetchImpl});
  assert.equal(result.kpi.awinIndex,82);
  assert.match(called,/programmedetails/);
  assert.match(called,/advertiserId=14815/);
  assert.match(called,/relationship=notjoined/);
});

test("direkte Partner liefern nur aktivierte HTTPS-Angebote", async () => {
  const rows = await fetchDirectOffers();
  assert.equal(rows.length, 16);
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
  assert.equal(rows.audit.programSignals[0].campaignId, "42");
  assert.equal(rows.audit.programSignals[0].ads, 1);
  assert.equal(rows.audit.programSignals[0].products, 0);
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

test("Impact respektiert Retry-After bei HTTP 429 und versucht begrenzt erneut", async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 429, headers: { get: name => name === "retry-after" ? "0" : null } };
    const pathname = new URL(url).pathname;
    const payload = pathname.endsWith("/Campaigns") ? { Campaigns: [] } : pathname.endsWith("/Ads") ? { Ads: [] } : pathname.endsWith("/Promotions") ? { Promotions: [] } : pathname.endsWith("/Deals") ? { Deals: [] } : { Items: [] };
    return { ok: true, json: async () => ({ ...payload, "@numpages": 1 }) };
  };
  const rows = await fetchImpactOffers({ accountSid: "SID", authToken: "TOKEN", fetchImpl });
  assert.deepEqual(rows, []);
  assert.ok(calls > 1);
});


test("Daisycon kombiniert Produktliste mit offiziellen Offers und echtem Trackinglink", async () => {
  const calls=[];
  const fetchImpl=async (url,options)=>{
    const href=String(url); calls.push({url:href,options});
    if (/\/products\/dc-1\/offers/.test(href)) return {ok:true,status:200,json:async()=>({results:[{
      id:"offer-1",product_id:"dc-1",title:"Gaming Headset",description:"USB Headset",
      link:"https://track.example/dc-1",price:49.99,currency_code:"EUR",
      program_id:77,program_name:"Demo Shop",image:"https://img.example/headset.jpg"
    }]})};
    return {ok:true,status:200,json:async()=>({results:[{
      id:"dc-1",title:"Gaming Headset",description:"USB Headset",image:"https://img.example/headset.jpg",
      in_stock:true,offer_count:1,currency_code:"EUR",attributes:{ean:["1234567890123"],brand:["Demo"]}
    }]})};
  };
  const rows=await fetchDaisyconOffers({publisherId:"42",accessToken:"TOKEN",fetchImpl,maxProducts:10});
  assert.equal(rows.length,1); assert.equal(rows[0].source,"daisycon");
  assert.equal(rows[0].currentPrice,49.99); assert.equal(rows[0].ean,"1234567890123");
  assert.equal(rows[0].urlTracking,"https://track.example/dc-1"); assert.equal(rows[0].advertiserName,"Demo Shop");
  assert.equal(calls.length,2);
  assert.match(calls[0].url,/services\.daisycon\.com\/publishers\/42\/material\/product-feeds\/products/);
  assert.match(calls[1].url,/\/products\/dc-1\/offers/);
  assert.ok(calls.every(call=>call.options.headers.Authorization==="Bearer TOKEN"));
});

test("Tradedoubler importiert nur offizielle JSON-Produktfeed-URLs", async () => {
  const feed="https://api.tradedoubler.com/1.0/products.json?token=hidden";
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>[{productId:"td-1",name:"Notebook",productURL:"https://clk.tradedoubler.com/x",imageURL:"https://img.example/notebook.jpg",price:"799.00",brand:"Demo"}]});
  const rows=await fetchTradedoublerOffers({feedUrls:feed,fetchImpl});
  assert.equal(rows.length,1);
  assert.equal(rows[0].source,"tradedoubler");
  assert.equal(rows[0].currentPrice,799);
  await assert.rejects(()=>fetchTradedoublerOffers({feedUrls:"https://example.com/feed.json",fetchImpl}),/official HTTPS host/);
});

test("Webgains liest offiziellen CSV-Produktfeed im Google-Shopping-Schema", async () => {
  const csv="id,title,description,link,image_link,availability,price,sale_price,brand,gtin\nwg-1,Monitor,Fast display,https://track.webgains.com/wg-1,https://img.example/monitor.jpg,in_stock,299.99 EUR,249.99 EUR,Demo,9876543210987\n";
  const fetchImpl=async()=>({ok:true,status:200,headers:{get:name=>name==="content-type"?"text/csv":null},text:async()=>csv});
  const rows=await fetchWebgainsOffers({feedUrls:"https://platform-api.webgains.com/export/feed.csv",fetchImpl});
  assert.equal(rows.length,1);
  assert.equal(rows[0].source,"webgains");
  assert.equal(rows[0].currentPrice,249.99);
  assert.equal(rows[0].previousPrice,299.99);
  assert.equal(rows[0].gtin,"9876543210987");
});


test("Webgains erkennt Semikolon-Feeds automatisch", async () => {
  const csv="id;title;link;image_link;availability;price;brand\nwg-2;Keyboard;https://track.webgains.com/wg-2;https://img.example/keyboard.jpg;in_stock;89.90 EUR;Demo\n";
  const fetchImpl=async()=>({
    ok:true,status:200,
    headers:{get:name=>name==="content-type"?"text/csv":null},
    text:async()=>csv
  });
  const rows=await fetchWebgainsOffers({
    feedUrls:"https://platform-api.webgains.com/export/feed.csv",
    fetchImpl
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].title,"Keyboard");
  assert.equal(rows[0].currentPrice,89.9);
});
