import test from "node:test";
import assert from "node:assert/strict";
import { rankDaisyconPrograms, buildNetworkMarketplaceSearches, buildNetworkApplicationDraft } from "../scripts/lib/network-growth.mjs";

test("Daisycon-Ranking markiert nur klar erkennbare offene Programme als bewerbbar", () => {
  const rows = rankDaisyconPrograms([
    { id: 1, name: "Gaming Hardware Shop", status: "available", category: "electronics" },
    { id: 2, name: "Home Store", status: "joined", category: "home" },
    { id: 3, name: "Unklar", status: "unknown" }
  ]);
  const gaming = rows.find(row => row.programId === 1);
  const joined = rows.find(row => row.programId === 2);
  const unknown = rows.find(row => row.programId === 3);
  assert.equal(gaming.applicationPossible, true);
  assert.equal(joined.applicationPossible, false);
  assert.equal(unknown.applicationPossible, false);
  assert.ok(gaming.score > unknown.score);
});

test("Netzwerk-Suche priorisiert Kategorien anhand echter Angebotsabdeckung", () => {
  const rows = buildNetworkMarketplaceSearches({
    network: "Webgains",
    connected: true,
    siteCategoryStats: { technik: 50, computer: 25, zubehoer: 10, gaming: 12, mode: 3 }
  });
  assert.equal(rows[0].category, "Technik & Computer");
  assert.equal(rows[0].siteOffers, 85);
  assert.equal(rows[0].priority, "hoch");
  assert.match(rows[0].action, /Bedingungen vor Beitritt bestätigen/);
});

test("Bewerbungsentwurf bleibt sachlich und erfindet keine Reichweitenzahlen", () => {
  const draft = buildNetworkApplicationDraft({ network: "Daisycon", brand: "Demo Brand", category: "Gaming" });
  assert.match(draft, /Demo Brand/);
  assert.match(draft, /Daisycon/);
  assert.doesNotMatch(draft, /\d+[.,]?\d*\s*(Follower|Besucher|Views|Reichweite)/i);
});


test("Daisycon-Review erzwingt manuelle Prüfung bei Terms oder Fragebogen", () => {
  const programs=[
    {id:1,name:"Gaming Hardware Shop",status:"available",category:"electronics"},
    {id:2,name:"Samsung Partner",status:"available",category:"electronics"},
    {id:3,name:"Home Store",status:"available",category:"home"},
    {id:4,name:"Joined Shop",status:"available",category:"electronics"}
  ];
  const rows=rankDaisyconPrograms(programs,{
    "1":{relationship:"not-subscribed",agreementTermsPresent:true,questionnaires:0,reviewRequired:true,automaticSubmissionAllowed:false},
    "2":{relationship:"not-subscribed",agreementTermsPresent:false,questionnaires:2,reviewRequired:true,automaticSubmissionAllowed:false},
    "3":{relationship:"not-subscribed",agreementTermsPresent:false,questionnaires:0,reviewRequired:false,automaticSubmissionAllowed:false},
    "4":{relationship:"approved",agreementTermsPresent:false,questionnaires:0,reviewRequired:false,automaticSubmissionAllowed:false}
  });
  const terms=rows.find(row=>row.programId===1);
  const questionnaire=rows.find(row=>row.programId===2);
  const ready=rows.find(row=>row.programId===3);
  const joined=rows.find(row=>row.programId===4);
  assert.equal(terms.automationState,"terms-review-required");
  assert.equal(questionnaire.automationState,"questionnaire-review-required");
  assert.equal(ready.automationState,"ready-for-review");
  assert.equal(joined.automationState,"joined");
  assert.equal(joined.applicationPossible,false);
  assert.ok(rows.every(row=>row.automaticSubmissionAllowed===false));
});


test("Daisycon-KPIs und Provisionen erhöhen die Priorität ohne Auto-Beitritt", () => {
  const rows=rankDaisyconPrograms([
    {id:10,name:"Gaming Demo",status:"available",category:"electronics"},
    {id:11,name:"Gaming Demo 2",status:"available",category:"electronics"}
  ],{
    "10":{relationship:"not-subscribed",score:{score:70},commissions:3,accessRulesPresent:true,agreementTermsPresent:false,questionnaires:0},
    "11":{relationship:"not-subscribed",score:null,commissions:0,accessRulesPresent:false,agreementTermsPresent:false,questionnaires:0}
  });
  const enriched=rows.find(row=>row.programId===10);
  const plain=rows.find(row=>row.programId===11);
  assert.ok(enriched.score>plain.score);
  assert.equal(enriched.metrics.networkScore,70);
  assert.equal(enriched.metrics.commissionEntries,3);
  assert.equal(enriched.automaticSubmissionAllowed,false);
});
