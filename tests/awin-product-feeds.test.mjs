import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, fetchAwinProductFeeds } from "../scripts/lib/awin-product-feeds.mjs";

test("parst korrekt gequotete Feed-CSV-Felder",()=>{const rows=parseCsv('Name,Description\r\n"Produkt, Eins","Text mit ""Zitat"""');assert.equal(rows[0].Name,"Produkt, Eins");assert.equal(rows[0].Description,'Text mit "Zitat"');});

test("importiert nur beigetretene deutsche Awin-Feeds mit offiziellen Medien",async()=>{
  const list='Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,Vertical,Last Imported,URL\n1,Shop,DE,Joined,9,Default,German,,2026-09-01,https://feed.example/9';
  const products='aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id,brand_name\nhttps://awin.example/t,https://shop.example/p,Kopfhörer,Shop,1,99.95,EUR,https://img.example/p.jpg,P1,Marke';
  const fetchImpl=async url=>({ok:true,text:async()=>list,arrayBuffer:async()=>Buffer.from(products)});
  const rows=await fetchAwinProductFeeds({apiKey:"secret",fetchImpl});
  assert.equal(rows.length,1);assert.equal(rows[0].imageSource,"Awin Product Feed");assert.equal(rows[0].currentPrice,"99.95");
});
