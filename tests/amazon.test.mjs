import test from "node:test";
import assert from "node:assert/strict";
import { AMAZON_CREATORS_API, fetchAmazonCreatorItems, getAmazonAccessToken } from "../scripts/lib/amazon.mjs";

test("Amazon Creators API bleibt ohne Zugangsdaten deaktiviert",async()=>{
  assert.deepEqual(await fetchAmazonCreatorItems({}),[]);
});

test("Amazon Creators API nutzt EU OAuth und deutschen Marketplace",async()=>{
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url:String(url),options});
    if(String(url).includes("/auth/o2/token"))return{ok:true,json:async()=>({access_token:"token"})};
    return{ok:true,json:async()=>({itemsResult:{items:[{
      asin:"B0H6SZ6WCD",
      detailPageURL:"https://www.amazon.de/dp/B0H6SZ6WCD?tag=test-21",
      images:{primary:{large:{url:"https://images.example/book.jpg"}}},
      itemInfo:{title:{displayValue:"Von Liebe bis zur tiefsten Trauer"},byLineInfo:{brand:{displayValue:"Joel Lehrheuer"}}},
      offersV2:{listings:[{merchantInfo:{name:"Amazon.de"},availability:{type:"IN_STOCK"},price:{money:{amount:12.99,currency:"EUR"},savingBasis:{money:{amount:14.99,currency:"EUR"}}}}]}
    }]}})};
  };
  const rows=await fetchAmazonCreatorItems({credentialId:"id",credentialSecret:"secret",partnerTag:"test-21",definitions:[{asin:"B0H6SZ6WCD",category:"sonstiges"}],fetchImpl});
  assert.equal(AMAZON_CREATORS_API.marketplace,"www.amazon.de");
  assert.match(calls[0].url,/api\.amazon\.co\.uk\/auth\/o2\/token/);
  assert.equal(JSON.parse(calls[0].options.body).scope,"creatorsapi::default");
  assert.equal(calls[1].options.headers["x-marketplace"],"www.amazon.de");
  assert.equal(JSON.parse(calls[1].options.body).partnerTag,"test-21");
  assert.equal(rows[0].productId,"B0H6SZ6WCD");
  assert.equal(rows[0].currentPrice,12.99);
  assert.equal(rows[0].previousPrice,14.99);
  assert.equal(rows[0].imageSource,"Amazon Creators API");
});

test("Amazon OAuth schlägt ohne Access-Token geschlossen fehl",async()=>{
  await assert.rejects(()=>getAmazonAccessToken({credentialId:"id",credentialSecret:"secret",fetchImpl:async()=>({ok:true,json:async()=>({})})}),/kein Access-Token/);
});
