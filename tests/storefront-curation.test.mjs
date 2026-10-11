import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isSpotlightProduct,selectSpotlightProducts,polishOfferTitle } from "../scripts/lib/storefront-curation.mjs";

const product=(id,title,advertiser,category,price=249)=>({
  id,title,advertiser,category,currentPrice:price,brand:advertiser,
  imageUrl:"https://cdn.example.org/"+id+".jpg",
  trackingUrl:"https://track.example.org/"+id,
  productId:id,type:"product"
});
test("spell-check safe corrections never change IDs, URL or price",()=>{
  assert.equal(polishOfferTitle("Stromapter Verlängerungskabel - M Series"),"Stromadapter Verlängerungskabel - M-Serie");
  assert.equal(polishOfferTitle("  ANTHBOT   N8  "),"ANTHBOT N8");
  assert.equal(polishOfferTitle("Site-wide 5% Off"),"5 % Rabatt auf den Shop – laut Anbieter");
});
test("homepage spotlight excludes small accessories, voucher promotions and unpriced entries",()=>{
  const pin=product("p","OutIn 4. Jubiläum Pin","OutIn","freizeit",3.99);
  const cable=product("c","Stromadapter Verlängerungskabel für Genie","ANTHBOT","garten",49);
  const card=product("g","ANTHBOT Geschenkkarte 699","ANTHBOT","garten",699);
  const normal=product("n","OutIn Nano 2 tragbare Espressomaschine","OutIn","haushalt",129);
  const promo={...normal,id:"sale",type:"promotion",voucherCode:"DEAL10"};
  assert.equal(isSpotlightProduct(pin),false);
  assert.equal(isSpotlightProduct(cable),false);
  assert.equal(isSpotlightProduct(card),false);
  assert.equal(isSpotlightProduct(promo),false);
  assert.equal(isSpotlightProduct({...normal,imageUrl:null}),false);
  assert.equal(isSpotlightProduct(normal),true);
  assert.equal(isSpotlightProduct({...normal,type:"promotion",contentType:"product-offer"}),true,"Real Awin feed goods are normalized as promotion by the existing importer");
  assert.equal(isSpotlightProduct({...normal,productId:null,type:"promotion"}),false,"A text-only promotion must not enter product hero");
});
test("spotlight rotates real hero products across joined merchants",()=>{
  const offers=[
    product("a","ANTHBOT Genie 3000 Mähroboter","ANTHBOT","garten",999),
    product("b","ANTHBOT N8 LiDAR Saugroboter","ANTHBOT","haushalt",699),
    product("c","OutIn Nano tragbare Espressomaschine","OutIn","haushalt",169),
    product("d","Hollyland Lark Funkmikrofon","Hollyland","audio-musik",239),
    product("e","OutIn 4. Jubiläum Pin","OutIn","freizeit",3.99),
    product("f","Stromapter Verlängerungskabel","ANTHBOT","garten",49)
  ];
  const hero=selectSpotlightProducts(offers,3);
  assert.equal(hero.length,3);
  assert.equal(new Set(hero.map(x=>x.advertiser)).size,3);
  assert.ok(hero.every(isSpotlightProduct));
  assert.equal(selectSpotlightProducts(offers,0).length,0);
  assert.deepEqual(selectSpotlightProducts(offers,3).map(x=>x.id),hero.map(x=>x.id));
});
test("build applies safe polish and selected spotlight to the public homepage",()=>{
  const b=fs.readFileSync("scripts/build.mjs","utf8");
  assert.match(b,/title:polishOfferTitle\(o\.title\)/);
  assert.match(b,/spotlightProducts=selectSpotlightProducts\(offers,18\)/);
  assert.match(b,/homeMixedUnique=takeUniqueHomepage\(spotlightProducts,12,0\)/);
  assert.doesNotMatch(b,/homeMixedUnique=takeUniqueHomepage\(homepageMixed,12\)/);
  assert.match(b,/heroSpotlight=selectSpotlightProducts\(offers,3\)/);
});

test("real published Awin inventory supplies three full hero products from distinct merchants",()=>{
  const raw=JSON.parse(fs.readFileSync("data/offers.json","utf8"));
  const config=JSON.parse(fs.readFileSync("config.json","utf8"));
  const {quarantinedAdvertisers=[]}=JSON.parse(fs.readFileSync("data/impact-link-policy.json","utf8"));
  const eligible=raw.filter(o=>{
    if(o.isStale||!o.imageUrl||!o.trackingUrl||!o.productId)return false;
    if(o.endDate && new Date(o.endDate)<=new Date())return false;
    if(quarantinedAdvertisers.some(rule=>
      String(rule.advertiserId||"")===String(o.advertiserId||"")||
      String(rule.advertiserName||"").toLowerCase()===String(o.advertiser||"").toLowerCase()))return false;
    return true;
  });
  const curated=selectSpotlightProducts(eligible,3);
  assert.equal(curated.length,3,"Actual approved Awin feed must contain three complete products for the hero");
  assert.equal(new Set(curated.map(o=>o.advertiser)).size,3);
  assert.ok(curated.every(isSpotlightProduct));
  assert.ok(curated.every(o=>!/(?:geschenkkarte|verlängerungskabel|\bpin\b)/i.test(o.title)));
});
