import test from "node:test";
import assert from "node:assert/strict";
import { buildApplicationDraft, categoryForProgram, rankAwinOpportunities } from "../scripts/lib/program-growth.mjs";

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

test("ausstehende Bewerbungen werden nicht erneut als sendefertig markiert", () => {
  const [row]=rankAwinOpportunities({programs:[{relationship:"pending",advertiserId:1,name:"Audio Shop",primarySector:"Audio"}]});
  assert.equal(row.applicationRequired,false);
  assert.equal(row.applicationDraft,null);
  assert.equal(row.automationState,"pending");
});

test("Bewerbungsentwurf erfindet keine Reichweitenzahlen", () => {
  const draft=buildApplicationDraft({name:"Shop",primarySector:"Gaming",activeOffers:1});
  assert.match(draft,/Reichweitenangaben werden nicht erfunden/);
  assert.doesNotMatch(draft,/\b\d+[.,]?\d*\s*(Follower|Views|Abonnenten)/i);
});
