import test from "node:test";
import assert from "node:assert/strict";
import { buildPartnerOutreachQueue } from "../scripts/lib/outreach-queue.mjs";

const row=(brand,score=50,extra={})=>({network:"Awin",brand,category:"Technik & Computer",priority:"mittel",score,status:"notjoined",applicationRequired:true,applicationPossible:true,advertiserId:score,applicationDraft:`Bewerbung ${brand}`,...extra});

test("Outreach-Queue dedupliziert bekannte Kontakte und hält Tageslimit ein",()=>{
  const opportunities=[row("Acer DE",70),row("Anker DE",90),row("Sony DE",60),row("MSI DE",55),row("DECATHLON DE",50),row("Brand 6",45),row("Brand 7",44),row("Brand 8",43),row("Brand 9",42),row("Brand 10",41)];
  const q=buildPartnerOutreachQueue({opportunities,statusRows:[{brand:"Anker DE",status:"pending",lastContactAt:"2026-09-29T10:00:00Z"}],dailyLimit:8,generatedAt:"2026-09-29T18:00:00Z"});
  assert.equal(q.nextBatch.length,8);
  assert.equal(q.nextBatch.some(x=>x.brand==="Anker DE"),false);
  assert.equal(q.backlog.length,1);
  assert.equal(q.excluded.some(x=>x.brand==="Anker DE"&&/existing-status:pending/.test(x.reason)),true);
  assert.ok(q.nextBatch.every(x=>x.contractualSubmissionAllowed===false));
});

test("Adult-Partner und laufende Netzwerkbewerbungen landen nicht in der Kontaktqueue",()=>{
  const q=buildPartnerOutreachQueue({opportunities:[row("Example Erotic Shop",99,{category:"Adult"}),row("Pending Brand",80,{status:"pending",applicationSent:true}),row("Clean Tech",70)],statusRows:[]});
  assert.deepEqual(q.nextBatch.map(x=>x.brand),["Clean Tech"]);
  assert.equal(q.excluded.some(x=>x.reason==="adult-blocked"),true);
  assert.equal(q.excluded.some(x=>x.reason==="network-application-pending"),true);
});
