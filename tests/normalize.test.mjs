import test from "node:test"; import assert from "node:assert/strict";
import { normalizeAndDedupe, normalizeOffer, isConcreteOffer, isPublicationReady, isConsumerTextPromotion, dedupeKeyForOffer } from "../scripts/lib/normalize.mjs";
import { fetchAwinOffers, formatAwinDateTime } from "../scripts/lib/awin.mjs";
const config={marketCountry:"DE",maxOffers:100,categories:{elektronik:["audio"],sonstiges:[]}};
const valid={promotionId:1,title:"Audio Aktion",description:"Sachlich",url:"https://shop.example/p",urlTracking:"https://awin1.com/x",advertiser:{id:2,name:"Shop",joined:true},regions:{list:[{countryCode:"DE"}]},endDate:"2099-01-01"};
test("normalisiert aktive DE-Angebote",()=>{const o=normalizeOffer(valid,config,new Date("2026-01-01"));assert.equal(o.category,"elektronik");assert.equal(o.advertiser,"Shop")});
test("filtert abgelaufene und nicht beigetretene Angebote",()=>{assert.equal(normalizeOffer({...valid,endDate:"2020-01-01"},config,new Date("2026-01-01")),null);assert.equal(normalizeOffer({...valid,advertiser:{joined:false}},config),null)});
test("entfernt Dubletten",()=>assert.equal(normalizeAndDedupe([valid,valid],config,new Date("2026-01-01")).length,1));
test("übernimmt offizielle Bild- und Preisdaten ohne falschen Vergleichspreis",()=>{const o=normalizeOffer({...valid,imageUrl:"https://cdn.example/product.jpg",currentPrice:"59.99",previousPrice:"99.99",currency:"EUR",ean:"1234567890123"},config,new Date("2026-01-01"));assert.equal(o.imageUrl,"https://cdn.example/product.jpg");assert.equal(o.currentPrice,59.99);assert.equal(o.previousPrice,99.99);assert.equal(o.productId,"1234567890123");assert.equal(normalizeOffer({...valid,currentPrice:100,previousPrice:90},config,new Date("2026-01-01")).previousPrice,null)});
test("interpretiert fehlende Preise nicht als null-Euro-Angebot",()=>{const o=normalizeOffer(valid,config,new Date("2026-01-01"));assert.equal(o.currentPrice,null);assert.equal(o.previousPrice,null)});
test("bereitet ausschließlich gültige offizielle Medienfelder vor",()=>{const o=normalizeOffer({...valid,imageAlt:"Offizielles Bild",imageSource:"Partnerfeed",videoUrl:"https://cdn.example/demo.mp4",videoPoster:"javascript:alert(1)",videoProvider:"Hersteller",videoTitle:"Produktdemo"},config,new Date("2026-01-01"));assert.equal(o.imageSource,"Partnerfeed");assert.equal(o.videoUrl,"https://cdn.example/demo.mp4");assert.equal(o.videoPoster,null);assert.equal(o.videoProvider,"Hersteller")});
test("Awin-Request nutzt dokumentierte Filter und Bearer-Token",async()=>{let call;const fetchImpl=async(url,options)=>{call={url,options};return{ok:true,json:async()=>({promotions:[],pagination:{totalPages:1}})}};await fetchAwinOffers({publisherId:"42",token:"secret",fetchImpl});const body=JSON.parse(call.options.body);assert.deepEqual(body.filters.regionCodes,["DE"]);assert.equal(body.filters.membership,"joined");assert.equal(call.options.headers.Authorization,"Bearer secret");assert.match(call.url,/publisher\/42\/promotions/)});
test("formatiert Awin-Transaktionszeiträume als erforderliches date-time",()=>assert.equal(formatAwinDateTime("2026-09-05T12:34:56.789Z"),"2026-09-05T12:34:56"));
test("übernimmt eine dokumentierte Videoquelle ohne ausführbaren Inhalt",()=>{const o=normalizeOffer({...valid,videoUrl:"https://cdn.example/demo.mp4",videoSource:"Offizielles Hersteller-Mediakit"},config,new Date("2026-01-01"));assert.equal(o.videoSource,"Offizielles Hersteller-Mediakit");assert.equal(o.videoUrl,"https://cdn.example/demo.mp4")});
test("trennt konkrete Deals von abstrakten Shop-Einstiegen",()=>{assert.equal(isConcreteOffer({source:"direct",title:"Shop"}),false);assert.equal(isConcreteOffer({source:"awin",endDate:"2099-01-01"}),true);assert.equal(isConcreteOffer({source:"impact",productId:"sku-1"}),true)});
test("veröffentlicht frische Produkte mit Medien, Gutscheine und geprüfte Endkundenaktionen",()=>{assert.equal(isPublicationReady({source:"awin",productId:"sku-1"}),false);assert.equal(isPublicationReady({source:"awin",productId:"sku-1",imageUrl:"https://cdn.example/p.jpg"}),true);assert.equal(isPublicationReady({source:"awin",productId:"sku-1",imageUrl:"https://cdn.example/p.jpg",isStale:true}),false);assert.equal(isPublicationReady({source:"impact",productId:"sku-2",videoUrl:"https://cdn.example/p.mp4"}),true);assert.equal(isPublicationReady({source:"tradedoubler",voucherCode:"DEMO20"}),true);assert.equal(isPublicationReady({source:"awin",type:"promotion",endDate:"2099-01-01",trackingUrl:"https://awin.example/deal",title:"Herbst-Aktion",description:"Jetzt Angebote und Flash-Deals entdecken"}),true)});
test("blockiert Publisher-Werbetexte auch bei Deal-Signalen",()=>{const publisher={source:"awin",type:"promotion",endDate:"2099-01-01",trackingUrl:"https://awin.example/publisher",title:"Save with PDF software",description:"Commission up to 50% for publishers and review content"};assert.equal(isConsumerTextPromotion(publisher),false);assert.equal(isPublicationReady(publisher),false)});
test("berechnet Ersparnis ausschließlich aus echtem currentPrice und oldPrice",()=>{const o=normalizeOffer({...valid,currentPrice:"799",previousPrice:"1000",priceSource:"official-feed"},config,new Date("2026-01-01"));assert.equal(o.currentPrice,799);assert.equal(o.oldPrice,1000);assert.equal(o.discountAmount,201);assert.equal(o.discountPercent,20);assert.equal(o.priceSource,"official-feed");assert.ok(o.priceCheckedAt)});
test("verwirft keinen fehlenden oder nicht niedrigeren Vergleichspreis als Fake-Rabatt",()=>{const missing=normalizeOffer({...valid,currentPrice:799},config,new Date("2026-01-01"));const higher=normalizeOffer({...valid,currentPrice:799,previousPrice:700},config,new Date("2026-01-01"));assert.equal(missing.discountAmount,null);assert.equal(higher.discountAmount,null);assert.equal(higher.oldPrice,null)});
test("bewahrt Partner-Creatives ohne Produktpreis getrennt auf",()=>{const o=normalizeOffer({...valid,source:"direct",contentType:"partner-creative",creativeUrl:"https://cdn.example/banner.png"},config,new Date("2026-01-01"));assert.equal(o.contentType,"partner-creative");assert.equal(o.creativeUrl,"https://cdn.example/banner.png");assert.equal(o.currentPrice,null);assert.equal(isConcreteOffer(o),false)});
test("gleiche SKU bei zwei Händlern bleibt als zwei Offers erhalten",()=>{const rows=[{...valid,id:"a",advertiser:{id:1,name:"ANTHBOT",joined:true},sku:"same",title:"Produkt A"},{...valid,id:"b",advertiser:{id:2,name:"OutIn",joined:true},sku:"same",title:"Produkt B",urlTracking:"https://awin1.com/y"}];assert.equal(normalizeAndDedupe(rows,config,new Date("2026-01-01")).length,2)});
test("leere Identifier erzeugen keine gemeinsame Identität",()=>{const rows=[{...valid,id:"a",promotionId:"a",advertiserId:1,advertiserName:"Shop A",title:"A",gtin:"",sku:""},{...valid,id:"b",promotionId:"b",advertiserId:1,advertiserName:"Shop A",title:"B",gtin:"",sku:"",urlTracking:"https://awin1.com/y"}];assert.equal(normalizeAndDedupe(rows,config,new Date("2026-01-01")).length,2)});
test("gleiche GTIN dedupliziert beim selben Händler, aber nicht händlerübergreifend",()=>{const base={...valid,gtin:"4006381333931",currentPrice:10,imageUrl:"https://img.example/p.jpg"};const sameMerchant=[base,{...base,id:"b",urlTracking:"https://awin1.com/y"}];const otherMerchant=[base,{...base,id:"c",advertiser:{id:3,name:"Hollyland",joined:true},urlTracking:"https://awin1.com/z"}];assert.equal(normalizeAndDedupe(sameMerchant,config,new Date("2026-01-01")).length,1);assert.equal(normalizeAndDedupe(otherMerchant,config,new Date("2026-01-01")).length,2)});
test("Dedupe-Key enthält Händler und nutzt keine leeren Identifier",()=>{const offer={source:"awin",sourceId:"sku",advertiserId:7,advertiser:"Shop",title:"Produkt",gtin:"",ean:"",mpn:"",brand:""};assert.equal(dedupeKeyForOffer(offer),"source:awin|7|sku");assert.notEqual(dedupeKeyForOffer({...offer,advertiserId:8,advertiser:"Other"}),dedupeKeyForOffer(offer))});

test("Awin-Discovery kann aktive Angebote nicht beigetretener Programme getrennt abrufen",async()=>{
  let body;
  const fetchImpl=async(url,options)=>{body=JSON.parse(options.body);return{ok:true,json:async()=>({promotions:[],pagination:{totalPages:1}})}};
  await fetchAwinOffers({publisherId:"42",token:"secret",membership:"notJoined",fetchImpl});
  assert.equal(body.filters.membership,"notJoined");
  assert.deepEqual(body.filters.regionCodes,["DE"]);
});


test("explizite fremde Locale-Varianten werden trotz DE-Region verworfen",()=>{
  const cfg={marketCountry:"DE",maxOffers:100,categories:{gaming:["gaming"],sonstiges:[]}};
  const base={...valid,source:"impact",title:"(Local: DE) Razer Gaming Mouse",url:"https://razer.example/de",urlTracking:"https://track.example/de",regions:{list:[{countryCode:"DE"}]}};
  assert.ok(normalizeOffer(base,cfg,new Date("2026-01-01")));
  assert.ok(normalizeOffer({...base,title:"(Local: EU) Razer Gaming Mouse"},cfg,new Date("2026-01-01")));
  assert.equal(normalizeOffer({...base,title:"(Local: US) Razer Gaming Mouse"},cfg,new Date("2026-01-01")),null);
  assert.equal(normalizeOffer({...base,title:"INDEPENDENT (UK) - Razer Gaming Mouse"},cfg,new Date("2026-01-01")),null);
  assert.equal(normalizeOffer({...base,title:"US: Razer Gaming Mouse"},cfg,new Date("2026-01-01")),null);
});

test("Händler-Fallback kategorisiert echte Sortimente nur in vorhandene Kategorien",()=>{
  const cfg={marketCountry:"DE",maxOffers:100,categories:{
    technik:["kamera"],gaming:["gaming"],"audio-musik":["mikrofon"],computer:["laptop"],zubehoer:["cable"],haushalt:["kaffee"],werkzeug:["mähroboter"],sonstiges:[]
  }};
  const raw=(merchant,title,brand="")=>({...valid,title,description:"",advertiser:{id:9,name:merchant,joined:true},brand,urlTracking:"https://track.example/"+encodeURIComponent(title),url:"https://shop.example/"+encodeURIComponent(title)});
  assert.equal(normalizeOffer(raw("ANTHBOT DE","ANTHBOT N8","ANTHBOT-DE"),cfg,new Date("2026-01-01")).category,"werkzeug");
  assert.equal(normalizeOffer(raw("Outin Germany","OutIn Pin-Nano","OutIn"),cfg,new Date("2026-01-01")).category,"haushalt");
  assert.equal(normalizeOffer(raw("Hollyland DE","Pyro S","Hollyland"),cfg,new Date("2026-01-01")).category,"audio-musik");
  assert.equal(normalizeOffer(raw("Imou DE","Ranger 2","Imou"),cfg,new Date("2026-01-01")).category,"technik");
  assert.equal(normalizeOffer(raw("Razer Store","Quartz Collection","Razer"),cfg,new Date("2026-01-01")).category,"gaming");
  assert.equal(normalizeOffer(raw("Hollyland DE","HDMI Cable","Hollyland"),cfg,new Date("2026-01-01")).category,"zubehoer");
});

test("Händler-Fallback erfindet keine Kategorie außerhalb der Config",()=>{
  const cfg={marketCountry:"DE",maxOffers:100,categories:{sonstiges:[]}};
  const row={...valid,title:"ANTHBOT N8",advertiser:{id:9,name:"ANTHBOT DE",joined:true},urlTracking:"https://track.example/a",url:"https://shop.example/a"};
  assert.equal(normalizeOffer(row,cfg,new Date("2026-01-01")).category,"sonstiges");
});
