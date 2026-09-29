import test from "node:test";
import assert from "node:assert/strict";
import { buildApplicationDraft, categoryForProgram, rankAwinOpportunities, isBlockedPartnerProgram, isStrategicProgram } from "../scripts/lib/program-growth.mjs";

test("ordnet Affiliate-Programme passenden Angebotslotse-Kategorien zu", () => {
  assert.equal(categoryForProgram({name:"Samsung Shop DE",primarySector:"Electronic Superstore"}), "Technik & Computer");
  assert.equal(categoryForProgram({name:"DECATHLON DE",primarySector:"Sports Equipment"}), "Mode & Sport");
});

test("rankt nicht beigetretene Programme nach echten Discovery-Signalen", () => {
  const programs=[
    {relationship:"notjoined",advertiserId:10,name:"Samsung Shop DE",primarySector:"Electronic Superstore"},
    {relationship:"notjoined",advertiserId:20,name:"Unbekannt",primarySector:"Other"}
  ];
  const discoveryOffers=[
    {advertiser:{id:10},title:"Galaxy Aktion"},
    {advertiser:{id:10},title:"Monitor Aktion"}
  ];
  const rows=rankAwinOpportunities({programs,discoveryOffers,feedAdvertiserIds:[10]});
  assert.equal(rows[0].advertiserId,10);
  assert.equal(rows[0].activeDiscoveryOffers,2);
  assert.equal(rows[0].productFeed,true);
  assert.equal(rows[0].priority,"hoch");
  assert.match(rows[0].applicationDraft,/2 für Deutschland sichtbare Aktionen/);
  assert.ok(rows[0].score > rows[1].score);
});

test("Awin-KPIs erhöhen die Priorität nachvollziehbar", () => {
  const programs=[{relationship:"notjoined",advertiserId:14815,name:"Samsung Shop DE",primarySector:"Electronic Superstore"}];
  const without=rankAwinOpportunities({programs})[0];
  const withKpis=rankAwinOpportunities({programs,programDetails:{"14815":{kpi:{awinIndex:85,approvalPercentage:92,epc:0.4,conversionRate:2.3,validationDays:12},commissionRange:[{min:3,max:8,type:"percentage"}]}}})[0];
  assert.ok(withKpis.score > without.score);
  assert.equal(withKpis.metrics.awinIndex,85);
  assert.equal(withKpis.metrics.commissionMax,8);
  assert.ok(withKpis.reasons.some(reason=>reason.includes("Awin Index 85")));
});

test("ausstehende Bewerbungen werden nicht erneut als sendefertig markiert", () => {
  const [row]=rankAwinOpportunities({programs:[{relationship:"pending",advertiserId:1,name:"Audio Shop",primarySector:"Audio"}]});
  assert.equal(row.applicationRequired,false);
  assert.equal(row.applicationDraft,null);
  assert.equal(row.automationState,"pending");
});

test("Pet Care wird nicht als Auto klassifiziert", () => {
  assert.equal(categoryForProgram({name:"bosch Tiernahrung DE",primarySector:"Pets & Pet Care"}),"Tierbedarf");
});

test("Adult-Partner landen nicht in der Awin-Akquise-Queue", () => {
  const adult={relationship:"notjoined",advertiserId:99,name:"Example Fashion",primarySector:"Erotic"};
  assert.equal(isBlockedPartnerProgram(adult),true);
  assert.deepEqual(rankAwinOpportunities({programs:[adult]}),[]);
});

test("Bewerbungsentwurf erfindet keine Reichweitenzahlen", () => {
  const draft=buildApplicationDraft({name:"Shop",primarySector:"Gaming",activeOffers:1});
  assert.match(draft,/Reichweitenangaben werden nicht erfunden/);
  assert.doesNotMatch(draft,/\b\d+[.,]?\d*\s*(Follower|Views|Abonnenten)/i);
});

test("INTERSPORT und ONE werden als strategische breite Sortimente erkannt", () => {
  assert.equal(categoryForProgram({name:"INTERSPORT DE",primarySector:"Sports"}),"Mode & Sport");
  assert.equal(categoryForProgram({name:"One DE",primarySector:"Computers"}),"Technik & Computer");
  assert.equal(isStrategicProgram({name:"One DE"}),true);
  assert.equal(isStrategicProgram({name:"LGBTQ Worldwide DE"}),false);
  assert.equal(isStrategicProgram({name:"HER ONE DE"}),false);
  assert.equal(isStrategicProgram({name:"Shop Apotheke DE"}),false);
});

