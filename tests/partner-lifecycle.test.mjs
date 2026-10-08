import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPartnerOutreachQueue } from "../scripts/lib/outreach-queue.mjs";

test("verifizierte Partner-Lifecycle-Stati verhindern doppelten Erstkontakt", () => {
  const lifecycle=JSON.parse(fs.readFileSync("data/partner-lifecycle.json","utf8"));
  const update=fs.readFileSync("scripts/update.mjs","utf8");

  assert.ok(Array.isArray(lifecycle.partners));
  assert.ok(lifecycle.partners.some(row=>row.brand==="EMP DE"&&row.status==="approved"));
  assert.ok(lifecycle.partners.some(row=>row.brand==="Chime Mattress"&&row.status==="declined"));
  assert.ok(lifecycle.partners.some(row=>row.brand==="Hey Happiness"&&row.status==="invited"&&row.outreachSentAt));
  assert.ok(lifecycle.partners.some(row=>row.brand==="ProtoArc"&&row.campaignStatus==="expired"));

  assert.match(update,/partner-lifecycle\.json/);
  assert.match(update,/lifecycleStatusRows/);
  assert.match(update,/row\.status === "declined" \? "rejected"/);

  const statuses=[
    {brand:"EMP DE",status:"approved"},
    {brand:"Chime Mattress",status:"rejected"},
    {brand:"Alternate DE",status:"contacted"}
  ];
  const queue=buildPartnerOutreachQueue({
    opportunities:[
      {brand:"EMP DE",network:"Awin",score:90,applicationPossible:true},
      {brand:"Chime Mattress",network:"Impact",score:80,applicationPossible:true},
      {brand:"Alternate DE",network:"Awin",score:70,applicationPossible:true},
      {brand:"Fresh Partner DE",network:"Awin",score:60,applicationPossible:true}
    ],
    statusRows:statuses,
    contactDirectory:[]
  });
  assert.deepEqual(queue.nextBatch.map(row=>row.brand),["Fresh Partner DE"]);
  assert.ok(queue.excluded.some(row=>row.brand==="EMP DE"&&row.reason.includes("approved")));
  assert.ok(queue.excluded.some(row=>row.brand==="Chime Mattress"&&row.reason.includes("rejected")));
  assert.ok(queue.excluded.some(row=>row.brand==="Alternate DE"&&row.reason.includes("contacted")));
});


test("terminaler Netzwerkstatus gewinnt gegen späteren Direktkontakt", () => {
  const queue=buildPartnerOutreachQueue({
    opportunities:[{brand:"Alternate DE",network:"Awin",score:90,applicationPossible:true}],
    statusRows:[
      {brand:"Alternate DE",status:"rejected",lastContactAt:"2026-10-01T00:00:00Z"},
      {brand:"Alternate DE",status:"contacted",lastContactAt:"2026-10-08T00:00:00Z"}
    ],
    contactDirectory:[]
  });
  assert.equal(queue.nextBatch.length,0);
  assert.equal(queue.excluded[0].status,"rejected");
});
