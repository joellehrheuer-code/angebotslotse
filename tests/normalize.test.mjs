import test from "node:test"; import assert from "node:assert/strict";
import { normalizeAndDedupe, normalizeOffer } from "../scripts/lib/normalize.mjs";
import { fetchAwinOffers } from "../scripts/lib/awin.mjs";
const config={marketCountry:"DE",maxOffers:100,categories:{elektronik:["audio"],sonstiges:[]}};
const valid={promotionId:1,title:"Audio Aktion",description:"Sachlich",url:"https://shop.example/p",urlTracking:"https://awin1.com/x",advertiser:{id:2,name:"Shop",joined:true},regions:{list:[{countryCode:"DE"}]},endDate:"2099-01-01"};
test("normalisiert aktive DE-Angebote",()=>{const o=normalizeOffer(valid,config,new Date("2026-01-01"));assert.equal(o.category,"elektronik");assert.equal(o.advertiser,"Shop")});
test("filtert abgelaufene und nicht beigetretene Angebote",()=>{assert.equal(normalizeOffer({...valid,endDate:"2020-01-01"},config,new Date("2026-01-01")),null);assert.equal(normalizeOffer({...valid,advertiser:{joined:false}},config),null)});
test("entfernt Dubletten",()=>assert.equal(normalizeAndDedupe([valid,valid],config,new Date("2026-01-01")).length,1));
test("Awin-Request nutzt dokumentierte Filter und Bearer-Token",async()=>{let call;const fetchImpl=async(url,options)=>{call={url,options};return{ok:true,json:async()=>({promotions:[],pagination:{totalPages:1}})}};await fetchAwinOffers({publisherId:"42",token:"secret",fetchImpl});const body=JSON.parse(call.options.body);assert.deepEqual(body.filters.regionCodes,["DE"]);assert.equal(body.filters.membership,"joined");assert.equal(call.options.headers.Authorization,"Bearer secret");assert.match(call.url,/publisher\/42\/promotions/)});
