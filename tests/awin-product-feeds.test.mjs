import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, fetchAwinProductFeeds, fetchAwinEnhancedFeeds } from "../scripts/lib/awin-product-feeds.mjs";

test("parst korrekt gequotete Feed-CSV-Felder",()=>{const rows=parseCsv('Name,Description\r\n"Produkt, Eins","Text mit ""Zitat"""');assert.equal(rows[0].Name,"Produkt, Eins");assert.equal(rows[0].Description,'Text mit "Zitat"');});

test("importiert nur beigetretene deutsche Awin-Feeds mit offiziellen Medien",async()=>{
  const list='Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,Vertical,Last Imported,URL\n1,Shop,DE,Joined,9,Default,German,,2026-09-01,https://datafeed.api.productserve.com/datafeed/download/apikey/fixture-token/fid/9/format/csv';
  const products='aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id,brand_name\nhttps://awin.example/t,https://shop.example/p,Kopfhörer,Shop,1,99.95,EUR,https://img.example/p.jpg,P1,Marke';
  const fetchImpl=async url=>({ok:true,text:async()=>list,arrayBuffer:async()=>Buffer.from(products)});
  const rows=await fetchAwinProductFeeds({apiKey:"secret",joinedAdvertiserIds:["1"],fetchImpl});
  assert.equal(rows.length,1);assert.equal(rows[0].imageSource,"Awin Product Feed");assert.equal(rows[0].currentPrice,"99.95");
});

test("importiert Enhanced-Feed-Produkte nur mit offiziellem Deep Link",async()=>{
  const row={product_basic:{id:"sku-1",title:"Echtes Produkt",description:"Beschreibung",link:"https://shop.example/p",image_link:"https://cdn.example/p.jpg",aw_deep_link:"https://track.example/p"},price_and_availability:{price:"99.00 EUR",sale_price:"79.00 EUR",availability:"in_stock"},product_identifiers:{brand:"Marke",gtin:"123"}};
  const fetchImpl=async()=>({ok:true,status:200,text:async()=>`${JSON.stringify(row)}\n`});
  const result=await fetchAwinEnhancedFeeds({publisherId:"3045061",token:"secret",advertisers:[{id:7,name:"Shop"}],fetchImpl});
  assert.equal(result.products.length,1);assert.equal(result.products[0].currentPrice,"79.00");assert.equal(result.products[0].previousPrice,"99.00");assert.equal(result.products[0].imageSource,"Awin Enhanced Product Feed");
});

test("importiert Enhanced-Feeds fair von allen Advertisern",async()=>{
  const advertisers=[1,2,3].map(id=>({id,name:`Shop ${id}`}));
  const fetchImpl=async url=>({ok:true,status:200,text:async()=>Array.from({length:4},(_,index)=>JSON.stringify({product_basic:{id:`${url}-${index}`,title:`Produkt ${url}-${index}`,link:"https://shop.example/p",image_link:"https://img.example/p.jpg",aw_deep_link:"https://track.example/p"}})).join("\n")});
  const result=await fetchAwinEnhancedFeeds({publisherId:"3045061",token:"secret",advertisers,fetchImpl,maxProducts:6});
  assert.equal(result.products.length,6);
  assert.deepEqual([...new Set(result.products.map(product=>product.advertiserId))].sort(),[1,2,3]);
});


test("bevorzugt Awins offiziellen Bild-Cache vor Merchant-Bildern",async()=>{
  const list='Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,Vertical,Last Imported,URL\n1,Shop,DE,Joined,9,Default,German,,2026-09-01,https://datafeed.api.productserve.com/datafeed/download/apikey/fixture-token/fid/9/format/csv';
  const products='aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,aw_image_url,large_image,merchant_image_url,aw_product_id\nhttps://awin.example/t,https://shop.example/p,Monitor,Shop,1,199.95,EUR,https://images.awin.com/cache.jpg,https://merchant.example/large.jpg,https://merchant.example/raw.jpg,P2';
  const fetchImpl=async()=>({ok:true,text:async()=>list,arrayBuffer:async()=>Buffer.from(products)});
  const rows=await fetchAwinProductFeeds({apiKey:"secret",joinedAdvertiserIds:["1"],fetchImpl});
  assert.equal(rows[0].imageUrl,"https://images.awin.com/cache.jpg");
  assert.equal(rows[0].imageSource,"Awin Image Resize & Caching");
});


test("Enhanced-Feed-Parser vermischt Shipping- oder Checkout-Nebenobjekte nicht mit Produktdaten",async()=>{
  const row={
    product_basic:{id:"robot-1",title:"ANTHBOT Genie Mähroboter",description:"Mähroboter für den Garten",link:"https://shop.example/robot",image_link:"https://cdn.example/robot.jpg",aw_deep_link:"https://track.example/robot"},
    price_and_availability:{price:"999.00 EUR",availability:"in_stock"},
    product_identifiers:{brand:"ANTHBOT",mpn:"GENIE-1000"},
    shipping:{service:"Shipping Protection",price:"0.99 EUR"},
    checkout_offer:{title:"Shipping Protection",description:"Protect your package against damage, loss",price:"0.99 EUR"}
  };
  const fetchImpl=async()=>({ok:true,status:200,text:async()=>JSON.stringify(row)});
  const result=await fetchAwinEnhancedFeeds({publisherId:"3045061",token:"secret",advertisers:[{id:7,name:"ANTHBOT DE"}],fetchImpl});
  assert.equal(result.products.length,1);
  assert.equal(result.products[0].title,"ANTHBOT Genie Mähroboter");
  assert.equal(result.products[0].description,"Mähroboter für den Garten");
  assert.equal(result.products[0].currentPrice,"999.00");
  assert.equal(result.products[0].brand,"ANTHBOT");
  assert.equal(result.products[0].mpn,"GENIE-1000");
});


test("Awin legacy feed never downloads or publishes without confirmed joined programmes",async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls+=1;throw new Error("unapproved feed must not be fetched");};
  const result=await fetchAwinProductFeeds({apiKey:"mock-datafeed-key",feedListUrl:"https://productdata.awin.com/datafeed/list/apikey/mock-key",joinedAdvertiserIds:[],fetchImpl});
  assert.deepEqual(result,[]);
  assert.equal(calls,0);
});

test("Awin legacy feed list and products stay confined to joined advertiser IDs",async()=>{
  const list='Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,URL\n1,Approved,DE,Joined,9,Products,German,https://datafeed.api.productserve.com/datafeed/download/apikey/mock-key/fid/9/format/csv\n2,NotJoined,DE,Joined,10,Products,German,https://datafeed.api.productserve.com/datafeed/download/apikey/mock-key/fid/10/format/csv';
  const data='aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,aw_product_id\nhttps://awin.example/approved,https://shop.example/item,Valid product,Approved,1,20,P1\nhttps://awin.example/unapproved,https://unapproved.example/item,Unapproved product,NotJoined,2,30,P2';
  const urls=[];
  const fetchImpl=async(url)=>{urls.push(String(url));return String(url).includes("/list/")?{ok:true,text:async()=>list}:{ok:true,arrayBuffer:async()=>Buffer.from(data)};};
  const result=await fetchAwinProductFeeds({apiKey:"mock-key",joinedAdvertiserIds:["1"],fetchImpl});
  assert.equal(urls.length,2,"only approved advertiser feed is downloaded");
  assert.equal(result.length,1);
  assert.equal(result[0].advertiserId,"1");
});


test("Awin legacy product limit counts only accepted joined-advertiser products",async()=>{
  const list=`Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,URL
1,Approved,DE,Joined,9,Products,German,https://datafeed.api.productserve.com/datafeed/download/apikey/mock/fid/9/format/csv`;
  const rows=`aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,aw_product_id
https://awin.example/unapproved,https://shop.example/foreign,Foreign,Foreign,2,25,foreign
https://awin.example/approved,https://shop.example/approved,Allowed,Approved,1,30,approved
https://awin.example/second,https://shop.example/second,Second,Approved,1,35,second`;
  const fetchImpl=async url=>String(url).includes("/list/")
    ?{ok:true,text:async()=>list}
    :{ok:true,arrayBuffer:async()=>Buffer.from(rows)};
  const result=await fetchAwinProductFeeds({apiKey:"mock",joinedAdvertiserIds:["1"],maxProducts:1,fetchImpl});
  assert.equal(result.length,1);
  assert.equal(result[0].productId,"approved");
  assert.equal(result[0].advertiserId,"1");
});

test("unterminated CSV quotes are rejected instead of publishing truncated product rows", () => {
  assert.throws(
    () => parseCsv('product_name,price\n"Truncated product,99'),
    /Malformed Awin CSV: unterminated quoted field/
  );
});

test("unquoted CSV fields with stray quotes are rejected instead of misparsing the product feed", () => {
  assert.throws(
    () => parseCsv('product_name,price\nBad"quoted product,99'),
    /Malformed Awin CSV: unexpected quote inside unquoted field/
  );
});
