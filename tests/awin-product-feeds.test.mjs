import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, fetchAwinProductFeeds, fetchAwinEnhancedFeeds } from "../scripts/lib/awin-product-feeds.mjs";

test("parst korrekt gequotete Feed-CSV-Felder",()=>{const rows=parseCsv('Name,Description\r\n"Produkt, Eins","Text mit ""Zitat"""');assert.equal(rows[0].Name,"Produkt, Eins");assert.equal(rows[0].Description,'Text mit "Zitat"');});

test("importiert nur beigetretene deutsche Awin-Feeds mit offiziellen Medien",async()=>{
  const list='Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,Vertical,Last Imported,URL\n1,Shop,DE,Joined,9,Default,German,,2026-09-01,https://feed.example/9';
  const products='aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id,brand_name\nhttps://awin.example/t,https://shop.example/p,Kopfhörer,Shop,1,99.95,EUR,https://img.example/p.jpg,P1,Marke';
  const fetchImpl=async url=>({ok:true,text:async()=>list,arrayBuffer:async()=>Buffer.from(products)});
  const rows=await fetchAwinProductFeeds({apiKey:"secret",fetchImpl});
  assert.equal(rows.length,1);assert.equal(rows[0].imageSource,"Awin Product Feed");assert.equal(rows[0].currentPrice,"99.95");
});

test("importiert Enhanced-Feed-Produkte nur mit offiziellem Deep Link",async()=>{
  const row={product_basic:{id:"sku-1",title:"Echtes Produkt",description:"Beschreibung",link:"https://shop.example/p",image_link:"https://cdn.example/p.jpg",aw_deep_link:"https://track.example/p"},price_and_availability:{price:"99.00 EUR",sale_price:"79.00 EUR",availability:"in_stock"},product_identifiers:{brand:"Marke",gtin:"123"}};
  const fetchImpl=async()=>({ok:true,status:200,text:async()=>`${JSON.stringify(row)}\n`});
  const result=await fetchAwinEnhancedFeeds({publisherId:"3045061",token:"secret",advertisers:[{id:7,name:"Shop"}],fetchImpl});
  assert.equal(result.products.length,1);assert.equal(result.products[0].currentPrice,"79.00");assert.equal(result.products[0].previousPrice,"99.00");assert.equal(result.products[0].imageSource,"Awin Enhanced Product Feed");
});
