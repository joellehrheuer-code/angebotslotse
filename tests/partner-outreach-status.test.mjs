import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPartnerOutreachQueue } from "../scripts/lib/outreach-queue.mjs";

const raw=fs.readFileSync("report/partner-outreach-status.json","utf8").replace(/^\uFEFF/,"");
const data=JSON.parse(raw);

test("Partnerstatus bleibt UTF-8-sauber und enthält keine Mojibake-Marker",()=>{
  assert.doesNotMatch(raw,/Ã|Â|�|Ǭ|ausdr\?ck|Programm\?nder|Pr\?fung/);
  assert.ok(data.statuses.some(row=>row.brand==="Bosch Hausgeräte DE"));
  assert.ok(data.statuses.some(row=>row.brand==="Chime Mattress"&&/ausdrückliche Einladung/.test(row.nextAction)));
});

test("Bosch Hausgeräte wird trotz Umlaut gegen bestehenden Pending-Status dedupliziert",()=>{
  const q=buildPartnerOutreachQueue({
    opportunities:[{network:"Awin",brand:"Bosch Hausgeräte DE",category:"Haushalt & Küche",priority:"mittel",score:70,status:"notjoined",applicationRequired:true,applicationPossible:true}],
    statusRows:data.statuses
  });
  assert.equal(q.nextBatch.length,0);
  assert.equal(q.excluded[0]?.reason,"existing-status:pending");
});
