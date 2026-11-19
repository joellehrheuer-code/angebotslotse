import test from "node:test";
import assert from "node:assert/strict";
import { fetchAwinProductFeeds } from "../scripts/lib/awin-product-feeds.mjs";

const officialList="https://ui.awin.com/productdata-darwin-download/publisher/3045061/fake-test-feed-key/1/feedList";
const csvList="Advertiser ID,Advertiser Name,Primary Region,Membership Status,Feed ID,Feed Name,Language,URL\n14172,EMP DE,DE,active,9,Default,German,https://productdata.awin.com/datafeed/download/apikey/fake-test-feed-key/fid/9/format/csv";
const csvProducts="aw_deep_link,merchant_deep_link,product_name,merchant_name,merchant_id,search_price,aw_product_id\nhttps://track.example/a,https://shop.example/item,Verified product,EMP DE,14172,89.99,sku-test";

test("official 2026 Awin feed-list URL imports only confirmed joined products",async()=>{
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url:String(url),redirect:options?.redirect});
    return String(url)===officialList
      ? {ok:true,text:async()=>csvList}
      : {ok:true,arrayBuffer:async()=>Buffer.from(csvProducts)};
  };
  const rows=await fetchAwinProductFeeds({publisherId:"3045061",feedListUrl:officialList,joinedAdvertiserIds:["14172"],fetchImpl});
  assert.equal(rows.length,1);
  assert.equal(rows[0].advertiserId,"14172");
  assert.equal(calls.length,2);
  assert.ok(calls.every(call=>call.redirect==="error"),"secret-containing feed requests must not follow redirects");
});
test("official 2026 Awin feed-list URL rejects wrong publisher, fake host, altered path and query",async()=>{
  const bad=[
    officialList.replace("3045061","9999999"),
    officialList.replace("ui.awin.com","ui.awin.com.evil.example"),
    officialList.replace("/1/feedList","/1/notFeedList"),
    officialList+"?next=https://evil.example",
    officialList.replace("https:","http:")
  ];
  for(const url of bad){
    let calls=0;
    await assert.rejects(()=>fetchAwinProductFeeds({publisherId:"3045061",feedListUrl:url,joinedAdvertiserIds:["14172"],fetchImpl:async()=>{calls++;throw Error("not allowed")}}),/Untrusted Awin feed-list URL/);
    assert.equal(calls,0);
  }
});
test("Awin official feed list still requires a verified joined merchant and makes no requests on 401",async()=>{
  let calls=0;
  const rows=await fetchAwinProductFeeds({publisherId:"3045061",feedListUrl:officialList,joinedAdvertiserIds:[],fetchImpl:async()=>{calls++;throw Error("must remain offline")}});
  assert.deepEqual(rows,[]);
  assert.equal(calls,0);
});
