import test from "node:test";
import assert from "node:assert/strict";
import {fetchAwinProductFeeds} from "../scripts/lib/awin-product-feeds.mjs";

const officialDownload="https://datafeed.api.productserve.com/datafeed/download/apikey/not-a-real-key/fid/9/format/csv";
const officialList="https://productdata.awin.com/datafeed/list/apikey/not-a-real-key";
const productCsv="aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,currency,large_image,aw_product_id,brand_name\nhttps://awin.example/t,https://shop.example/p,Echter Monitor,Shop,9,199.95,EUR,https://img.example/p.jpg,SKU9,Marke";
const makeFetch=(listedCsv)=>async url=>({
  ok:true,status:200,text:async()=>listedCsv,arrayBuffer:async()=>Buffer.from(productCsv)
});

test("Awin accepts a full official legacy download URL only for joined merchants",async()=>{
  const rows=await fetchAwinProductFeeds({
    feedUrls:officialDownload,joinedAdvertiserIds:[9],fetchImpl:makeFetch(""),maxProducts:10
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].title,"Echter Monitor");
  assert.equal(rows[0].advertiserId,"9");
});
test("Awin will not publish legacy items from unjoined merchants",async()=>{
  const rows=await fetchAwinProductFeeds({
    feedUrls:officialDownload,joinedAdvertiserIds:[11],fetchImpl:makeFetch("")
  });
  assert.equal(rows.length,0);
});
test("Awin rejects untrusted credential-containing feed URLs before network call",async()=>{
  let called=false;
  await assert.rejects(()=>fetchAwinProductFeeds({
    feedUrls:"https://attacker.example/datafeed/download/apikey/not-a-real-key/fid/9",
    joinedAdvertiserIds:[9],fetchImpl:async()=>{called=true;return{ok:true}}
  }),/Untrusted/);
  assert.equal(called,false);
});
test("Awin list download excludes Not Joined feeds despite containing the word Joined",async()=>{
  const list="Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,Vertical,Last Imported,URL\n"+
    "9,Shop,DE,Not Joined,9,Default,German,,2026-10-13,"+officialDownload;
  const rows=await fetchAwinProductFeeds({feedListUrl:officialList,fetchImpl:makeFetch(list)});
  assert.equal(rows.length,0);
});
test("Awin list download accepts explicitly joined German advertisers",async()=>{
  const list="Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,Vertical,Last Imported,URL\n"+
    "9,Shop,DE,Joined,9,Default,German,,2026-10-13,"+officialDownload;
  const rows=await fetchAwinProductFeeds({feedListUrl:officialList,joinedAdvertiserIds:[9],fetchImpl:makeFetch(list)});
  assert.equal(rows.length,1);
});
