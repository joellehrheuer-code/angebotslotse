import test from "node:test";
import assert from "node:assert/strict";
import { auditMedia, probeImage, selectMediaAuditSample } from "../scripts/media-health.mjs";

const response=(status,type)=>({status,headers:{get:key=>key==="content-type"?type:null}});
const product=(id,merchant)=>({id,advertiser:merchant,source:"awin",productId:id,
  imageUrl:"https://images.example.net/"+id+".jpg",currentPrice:15,isStale:false});

test("official image HEAD verification accepts an image response",async()=>{
  const result=await probeImage("https://images.example.net/p.jpg",async()=>response(200,"image/jpeg"));
  assert.equal(result.state,"ok");
  assert.equal(result.method,"HEAD");
});

test("asset 404/410 is missing even when HEAD and GET both reject",async()=>{
  const calls=[];
  const result=await probeImage("https://images.example.net/lost.jpg",async(url,options)=>{
    calls.push(options.method);
    return response(404,"text/html");
  });
  assert.equal(result.state,"missing");
  assert.deepEqual(calls,["HEAD","GET"]);
});

test("anti-bot 403 is restricted, never reported as confirmed broken photo",async()=>{
  const result=await probeImage("https://images.example.net/restricted.jpg",async()=>response(403,"text/html"));
  assert.equal(result.state,"restricted");
});

test("invalid and insecure image URLs are rejected before requesting the network",async()=>{
  let called=false;
  const result=await probeImage("javascript:alert(1)",async()=>{called=true;return response(200,"image/png")});
  assert.equal(result.state,"invalid-url");
  assert.equal(called,false);
});

test("daily audit samples rotate and include more than one advertiser",async()=>{
  const offers=[...Array.from({length:6},(_,i)=>product("a"+i,"Hollyland")),
    ...Array.from({length:6},(_,i)=>product("b"+i,"Outin"))];
  const sample=selectMediaAuditSample(offers,4,0);
  assert.equal(sample.rows.length,4);
  assert.equal(new Set(sample.rows.map(o=>o.advertiser)).size,2);
  const next=selectMediaAuditSample(offers,4,1);
  assert.notDeepEqual(next.rows.map(o=>o.id),sample.rows.map(o=>o.id));
  const report=await auditMedia({offers,limit:4,day:0,fetchImpl:async()=>response(200,"image/webp")});
  assert.equal(report.checked,4);
  assert.equal(report.counts.ok,4);
  assert.equal(report.totalBatches,3);
});
