import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fetchDirectOffers } from "../scripts/lib/direct.mjs";
import { fetchImpactOffers, IMPACT_API_VERSION } from "../scripts/lib/impact.mjs";
import { fetchAwinPrograms, fetchAwinProgramDetails } from "../scripts/lib/awin.mjs";
import { fetchDaisyconOffers, fetchDaisyconProgramReview, subscribeDaisyconProgram } from "../scripts/lib/daisycon.mjs";
import { fetchTradedoublerOffers, fetchTradedoublerVouchers } from "../scripts/lib/tradedoubler.mjs";
import { fetchWebgainsOffers, fetchWebgainsProgramMemberships, fetchWebgainsProgramReview, createWebgainsProgramMembership } from "../scripts/lib/webgains.mjs";

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
  const configured = JSON.parse(fs.readFileSync("data/direct-partners.json", "utf8")).filter(row => row.enabled);
  assert.equal(rows.length, configured.length);
  assert.ok(rows.every(r => r.source === "direct" && r.urlTracking.startsWith("https://")));
  assert.equal(rows.some(r => r.advertiserName === "Coolblue DE"), false);
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

test("Impact behält Teilresultate wenn ein optionaler Endpoint ausfällt", async () => {
  const fetchImpl = async url => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/Catalogs/ItemSearch")) throw new Error("catalog timeout");
    let payload = {"@numpages":1};
    if (pathname.endsWith("/Campaigns")) payload.Campaigns=[{CampaignId:"42",CampaignName:"Gaming",AdvertiserId:"7",AdvertiserName:"Shop",AdvertiserUrl:"https://shop.example",ContractStatus:"Active",ShippingRegions:["GERMANY"],TrackingLink:"https://track.example/program"}];
    else if (pathname.endsWith("/Ads")) payload.Ads=[{Id:"9",Name:"Gaming Aktion",CampaignId:"42",AdvertiserId:"7",TrackingLink:"https://track.example/ad",LandingPageUrl:"https://shop.example/deal"}];
    else if (pathname.endsWith("/Promotions")) payload.Promotions=[];
    else if (pathname.endsWith("/Deals")) payload.Deals=[];
    else if (pathname.endsWith("/Catalogs")) payload.Catalogs=[];
    else if (pathname.endsWith("/Stores")) payload.Stores=[];
    return {ok:true,json:async()=>payload};
  };
  const rows = await fetchImpactOffers({accountSid:"SID",authToken:"TOKEN",fetchImpl});
  assert.deepEqual(rows.map(row=>row.id),["program-42","ad-9"]);
  assert.match(rows.audit.errors.products,/catalog timeout/);
  assert.equal(rows.audit.products,0);
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


test("Daisycon-Review prüft Subscription, Agreement Terms und Fragebogen ohne Auto-Annahme", async () => {
  const calls=[];
  const fetchImpl=async url=>{
    const href=String(url); calls.push(href);
    if(href.includes("/subscriptions")) return {ok:true,status:200,json:async()=>({results:[{media_id:9,status:"not-subscribed"}]})};
    if(href.includes("/agreementterms")) return {ok:true,status:200,json:async()=>({id:11,title:"Terms"})};
    if(href.includes("/questionnaires")) return {ok:true,status:200,json:async()=>({results:[{id:22,program_id:77}]})};
    if(href.includes("/score")) return {ok:true,status:200,json:async()=>({score:72})};
    if(href.includes("/commissions")) return {ok:true,status:200,json:async()=>({results:[{id:1},{id:2}]})};
    if(href.includes("/access-rules")) return {ok:true,status:200,json:async()=>({media_types:["website"]})};
    throw new Error("unexpected URL "+href);
  };
  const review=await fetchDaisyconProgramReview({
    publisherId:"42",accessToken:"TOKEN",programId:77,mediaId:9,fetchImpl
  });
  assert.equal(review.relationship,"not-subscribed");
  assert.equal(review.agreementTermsPresent,true);
  assert.equal(review.questionnaires,1);
  assert.equal(review.reviewRequired,true);
  assert.equal(review.automaticSubmissionAllowed,false);
  assert.equal(review.score.score,72);
  assert.equal(review.commissions,2);
  assert.equal(review.accessRulesPresent,true);
  assert.equal(calls.length,6);
  assert.ok(calls.some(url=>url.includes("/score")));
  assert.ok(calls.some(url=>url.includes("/commissions")));
  assert.ok(calls.some(url=>url.includes("/access-rules")));
});


test("Tradedoubler entdeckt aktive Feeds automatisch über den offiziellen Products-Token", async () => {
  const calls=[];
  const fetchImpl=async url=>{
    const href=String(url); calls.push(href);
    if(href.includes("/productFeeds.json")) return {
      ok:true,status:200,json:async()=>({feeds:[
        {feedId:101,name:"DE Gaming",active:true,visible:true,currencyISOCode:"EUR",languageISOCode:"de",numberOfProducts:50},
        {feedId:202,name:"Hidden",active:false,visible:true,currencyISOCode:"EUR",languageISOCode:"de",numberOfProducts:100}
      ]})
    };
    if(href.includes("products.json;fid=101")) return {
      ok:true,status:200,json:async()=>({products:[{
        id:"td-api-1",name:"Gaming Maus",description:"Wireless",
        productUrl:"https://pdt.tradedoubler.com/click/affiliate",
        sourceProductUrl:"https://merchant.example/mouse",
        productImage:{url:"https://img.example/mouse.jpg"},
        price:59.99,programName:"Demo Gaming",brand:"Demo",
        identifiers:{ean:"1234567890123",sku:"MOUSE-1"},
        availability:"In Stock"
      }]})
    };
    throw new Error("unexpected Tradedoubler URL "+href);
  };
  const rows=await fetchTradedoublerOffers({token:"PRODUCTS_TOKEN",maxProducts:20,maxFeeds:4,fetchImpl});
  assert.equal(rows.length,1);
  assert.equal(rows[0].urlTracking,"https://pdt.tradedoubler.com/click/affiliate");
  assert.equal(rows[0].url,"https://merchant.example/mouse");
  assert.equal(rows[0].currentPrice,59.99);
  assert.equal(rows[0].ean,"1234567890123");
  assert.equal(rows.audit.mode,"products-api");
  assert.equal(rows.audit.feedsAvailable,1);
  assert.equal(calls.length,2);
  assert.ok(calls.every(url=>url.includes("token=PRODUCTS_TOKEN")));
});


test("Tradedoubler Voucher API übernimmt nur offizielle HTTPS-Trackinglinks und Codes", async () => {
  const calls=[];
  const fetchImpl=async url=>{
    const href=String(url); calls.push(href);
    return {ok:true,status:200,json:async()=>({vouchers:[{
      id:555,title:"20 % Rabatt",description:"Nur heute",programName:"Demo Shop",programId:77,
      defaultTrackUri:"https://clk.tradedoubler.com/voucher/555",
      landingUrl:"https://shop.example/sale",
      code:"DEMO20",startDate:"2026-09-27T00:00:00Z",endDate:"2026-10-01T23:59:59Z",
      logoPath:"https://img.example/logo.png",exclusive:true
    }]})};
  };
  const rows=await fetchTradedoublerVouchers({token:"VOUCHER_TOKEN",maxVouchers:10,fetchImpl});
  assert.equal(rows.length,1);
  assert.equal(rows[0].source,"tradedoubler");
  assert.equal(rows[0].type,"voucher");
  assert.equal(rows[0].voucher.code,"DEMO20");
  assert.equal(rows[0].urlTracking,"https://clk.tradedoubler.com/voucher/555");
  assert.equal(rows[0].isExclusiveVoucher,true);
  assert.match(calls[0],/vouchers\.json/);
  assert.match(calls[0],/token=VOUCHER_TOKEN/);
});


test("Daisycon blockiert Subscribe ohne ausdrückliche menschliche Freigabe", async () => {
  const review={programId:99,mediaId:7,reviewRequired:false,agreementTermsPresent:false,questionnaires:0,submissionReady:true};
  await assert.rejects(
    ()=>subscribeDaisyconProgram({
      publisherId:"42",accessToken:"TOKEN",programId:99,mediaId:7,review,confirmedReview:false,
      fetchImpl:async()=>{throw new Error("network must not be called");}
    }),
    /explicit human review confirmation required/
  );
});

test("Daisycon nutzt nach freigegebenem Review nur den dokumentierten Subscribe-Endpunkt", async () => {
  const calls=[];
  const review={programId:99,mediaId:7,reviewRequired:false,agreementTermsPresent:false,questionnaires:0,submissionReady:true};
  const result=await subscribeDaisyconProgram({
    publisherId:"42",accessToken:"TOKEN",programId:99,mediaId:7,review,confirmedReview:true,
    fetchImpl:async(url,options)=>{
      calls.push({url:String(url),options});
      return {ok:true,status:201};
    }
  });
  assert.equal(result.submitted,true);
  assert.equal(result.status,201);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/services\.daisycon\.com\/publishers\/42\/programs\/99\/subscriptions\/7$/);
  assert.equal(calls[0].options.method,"POST");
  assert.equal(calls[0].options.headers.Authorization,"Bearer TOKEN");
});

test("Daisycon blockiert Subscribe sobald Terms oder Fragebogen Review verlangen", async () => {
  for(const review of [
    {programId:99,mediaId:7,reviewRequired:true,agreementTermsPresent:true,questionnaires:0,submissionReady:false},
    {programId:99,mediaId:7,reviewRequired:true,agreementTermsPresent:false,questionnaires:1,submissionReady:false}
  ]){
    await assert.rejects(
      ()=>subscribeDaisyconProgram({publisherId:"42",accessToken:"TOKEN",programId:99,mediaId:7,review,confirmedReview:true}),
      /agreement terms or questionnaire require review/
    );
  }
});


test("Webgains Membership API liest Programme mit Bearer-Token", async () => {
  const calls=[];
  const fetchImpl=async (url,options)=>{
    calls.push({url:String(url),options});
    return {ok:true,status:200,json:async()=>({data:[{
      program:{id:77,name:"Gaming Demo",has_product_feed:true},campaign:{id:88},membership_status_name:"available",commission_rate:8
    }]})};
  };
  const rows=await fetchWebgainsProgramMemberships({publisherId:"42",accessToken:"WG_TOKEN",fetchImpl});
  assert.equal(rows.length,1);
  assert.equal(rows[0].program.id,77);
  assert.match(calls[0].url,/platform-api\.webgains\.com\/publishers\/42\/program_memberships/);
  assert.equal(calls[0].options.headers.Authorization,"Bearer WG_TOKEN");
});

test("Webgains Review erzeugt stabilen Terms-Digest und bleibt freigabepflichtig", async () => {
  const calls=[];
  const membership={
    program:{id:77,name:"Gaming Demo"},campaign:{id:88},membership_status_name:"available"
  };
  const fetchImpl=async (url,options)=>{
    calls.push({url:String(url),options});
    return {ok:true,status:200,json:async()=>({version:"2026-09-27",terms:["No brand bidding","DE traffic only"]})};
  };
  const review=await fetchWebgainsProgramReview({
    publisherId:"42",accessToken:"WG_TOKEN",membership,fetchImpl
  });
  assert.equal(review.applicationPossible,true);
  assert.equal(review.submissionReady,false);
  assert.equal(review.humanApprovalRequired,true);
  assert.equal(review.automaticSubmissionAllowed,false);
  assert.match(review.termsDigest,/^[a-f0-9]{64}$/);
  assert.match(calls[0].url,/\/merchants\/programs\/77\/terms_and_conditions/);
});

test("Webgains Join blockiert ohne bestätigten identischen Terms-Digest", async () => {
  const review={
    programId:77,campaignId:88,joined:false,submissionReady:true,
    termsDigest:"abc123"
  };
  await assert.rejects(
    ()=>createWebgainsProgramMembership({
      publisherId:"42",accessToken:"WG_TOKEN",campaignId:88,programId:77,
      review,confirmedTermsDigest:"abc123",confirmedReview:false,
      fetchImpl:async()=>{throw new Error("network must not be called");}
    }),
    /explicit human review confirmation required/
  );
  await assert.rejects(
    ()=>createWebgainsProgramMembership({
      publisherId:"42",accessToken:"WG_TOKEN",campaignId:88,programId:77,
      review,confirmedTermsDigest:"different",confirmedReview:true,
      fetchImpl:async()=>{throw new Error("network must not be called");}
    }),
    /reviewed terms digest confirmation required/
  );
});

test("Webgains Join bleibt trotz bestätigtem Terms-Stand fail-closed", async () => {
  const review={programId:77,campaignId:88,joined:false,submissionReady:false,termsDigest:"digest-ok"};
  await assert.rejects(
    ()=>createWebgainsProgramMembership({
      publisherId:"42",accessToken:"WG_TOKEN",campaignId:88,programId:77,
      review,confirmedTermsDigest:"digest-ok",confirmedReview:true
    }),
    /submission disabled: exact request schema not verified/
  );
});
