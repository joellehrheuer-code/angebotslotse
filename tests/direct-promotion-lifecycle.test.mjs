import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fetchDirectOffers } from "../scripts/lib/direct.mjs";
import { normalizeOffer } from "../scripts/lib/normalize.mjs";

const config=JSON.parse(fs.readFileSync("config.json","utf8"));

test("Direct-Promos geben Laufzeit, Bedingungen und Gutscheincode weiter", async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"angebotslotse-direct-"));
  const file=path.join(dir,"direct.json");
  fs.writeFileSync(file,JSON.stringify([{
    id:"promo",name:"Shop DE",title:"10% Aktion",description:"Test",category:"haushalt",
    trackingUrl:"https://track.example/deal",destinationUrl:"https://shop.example/deal",
    voucherCode:"SAVE10",startDate:"2026-10-08T00:00:00+02:00",endDate:"2026-10-13T23:59:59+02:00",
    terms:"Nur im Aktionszeitraum.",enabled:true
  }]));
  const [raw]=await fetchDirectOffers(file);
  assert.equal(raw.voucher.code,"SAVE10");
  assert.equal(raw.startDate,"2026-10-08T00:00:00+02:00");
  assert.equal(raw.endDate,"2026-10-13T23:59:59+02:00");
  assert.equal(raw.terms,"Nur im Aktionszeitraum.");
  const active=normalizeOffer(raw,config,new Date("2026-10-10T12:00:00+02:00"));
  assert.equal(active.voucherCode,"SAVE10");
  assert.equal(normalizeOffer(raw,config,new Date("2026-10-14T12:00:00+02:00")),null);
});

test("aktuelle Mail-Promos sind belegt und alte Partneraktionen deaktiviert", () => {
  const rows=JSON.parse(fs.readFileSync("data/direct-partners.json","utf8"));
  const byId=new Map(rows.map(row=>[row.id,row]));
  assert.equal(byId.get("razer-impact")?.enabled,false);
  assert.equal(byId.get("awin-outin-kruve-creative")?.enabled,false);
  assert.equal(byId.get("awin-outin-nano-traveler-creative")?.enabled,false);
  assert.equal(byId.get("awin-emp-dark-season-15off")?.voucherCode,"15OFF");
  assert.equal(byId.get("awin-emp-dark-season-15off")?.endDate,"2026-10-13T23:59:59+02:00");
  assert.equal(byId.get("awin-emp-shirts-1499")?.currentPrice,14.99);
  assert.equal(byId.get("awin-imou-aff5")?.voucherCode,"IMOUAFF5");
});

test("Update-Commitjob setzt generierte Daten auf den neuesten main-Stand", () => {
  const workflow=fs.readFileSync(".github/workflows/update.yml","utf8");
  assert.match(workflow,/ref: main/);
  assert.match(workflow,/fetch-depth: 0/);
  assert.match(workflow,/git rebase origin\/main/);
  assert.match(workflow,/git push origin HEAD:main/);
  assert.doesNotMatch(workflow,/stefanzweifel\/git-auto-commit-action@v5/);
});
