import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { isPublicationReady } from "./lib/normalize.mjs";

// Probe only the public official image URLs found in published affiliate feeds.
// A 403 or 429 might be anti-bot protection, NOT proof that a browser image is broken.
export async function probeImage(url,fetchImpl=fetch,timeoutMs=8000){
  try{if(new URL(url).protocol!=="https:")return {state:"invalid-url",status:0};}
  catch{return {state:"invalid-url",status:0};}
  const attempt=async method=>{
    const response=await fetchImpl(url,{
      method,redirect:"follow",
      headers:{Accept:"image/avif,image/webp,image/*"},
      signal:AbortSignal.timeout(timeoutMs)
    });
    return {status:response.status,type:String(response.headers?.get?.("content-type")||"").split(";")[0].toLowerCase()};
  };
  let result=null,failed=null;
  for(const method of ["HEAD","GET"]){
    try{
      result=await attempt(method);
      if(result.status>=200&&result.status<300&&result.type.startsWith("image/"))
        return {state:"ok",status:result.status,method};
      if(method==="HEAD")continue;
      if(result.status===404||result.status===410)return {state:"missing",status:result.status,method};
      if([401,403,429].includes(result.status))return {state:"restricted",status:result.status,method};
      return {state:"unverified",status:result.status,method};
    }catch(error){
      failed=String(error?.name||error||"network-error").slice(0,80);
    }
  }
  return {state:"network-error",status:result?.status||0,error:failed};
}

export function selectMediaAuditSample(offers,limit=30,day=Math.floor(Date.now()/86400000)){
  const candidates=offers.filter(o=>isPublicationReady(o)&&o.imageUrl&&
    (()=>{try{return new URL(o.imageUrl).protocol==="https:";}catch{return false;}})());
  const groups=new Map();
  for(const item of candidates){
    const key=String(item.advertiser||item.source||"unknown");
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(item);
  }
  const queues=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b,"de")).map(([,rows])=>rows);
  const diversified=[];
  for(let pos=0;diversified.length<candidates.length;pos++){
    let seen=false;
    for(const queue of queues){
      if(queue[pos]){diversified.push(queue[pos]);seen=true;}
    }
    if(!seen)break;
  }
  const total=diversified.length;
  const batches=Math.max(1,Math.ceil(total/limit));
  const batch=(((day%batches)+batches)%batches);
  return {total,batch,batches,rows:diversified.slice(batch*limit,(batch+1)*limit)};
}

export async function auditMedia({offers,fetchImpl=fetch,limit=30,day}){
  const sample=selectMediaAuditSample(offers,limit,day);
  const results=[];
  // Gentle sequential requests to avoid hammering partner image CDNs.
  for(const offer of sample.rows){
    const outcome=await probeImage(offer.imageUrl,fetchImpl);
    results.push({
      id:offer.id||offer.slug||null,
      merchant:offer.advertiser||null,
      imageHost:(()=>{try{return new URL(offer.imageUrl).hostname;}catch{return null;}})(),
      ...outcome
    });
  }
  const counts=Object.fromEntries(["ok","missing","restricted","unverified","network-error","invalid-url"].map(key=>[key,results.filter(x=>x.state===key).length]));
  return {
    generatedAt:new Date().toISOString(),
    totalEligibleImages:sample.total,checked:results.length,
    batch:sample.batch+1,totalBatches:sample.batches,
    counts,results,
    note:"403/429/restricted or timeouts need browser verification; only 404/410 indicate likely missing assets."
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const offers=JSON.parse(await fs.readFile("data/offers.json","utf8"));
  const policy=JSON.parse(await fs.readFile("data/impact-link-policy.json","utf8").catch(()=>"{}"));
  const allowed=offers.filter(o=>!(policy.quarantinedAdvertisers||[]).some(rule=>
    (rule.advertiserId&&String(rule.advertiserId)===String(o.advertiserId))||
    (rule.advertiserName&&String(rule.advertiserName).toLowerCase()===String(o.advertiser).toLowerCase())));
  const report=await auditMedia({offers:allowed,limit:Math.max(1,Math.min(100,Number(process.env.MEDIA_AUDIT_LIMIT)||30))});
  await fs.mkdir("report",{recursive:true});
  await fs.writeFile("report/media-health.json",JSON.stringify(report,null,2)+"\n");
  console.log("Produktbild-Prüfung:",JSON.stringify({checked:report.checked,batch:report.batch,totalBatches:report.totalBatches,counts:report.counts}));
}
