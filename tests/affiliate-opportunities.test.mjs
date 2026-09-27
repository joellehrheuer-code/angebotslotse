import test from "node:test";
import assert from "node:assert/strict";
import { buildAffiliateOpportunityReport } from "../scripts/lib/affiliate-opportunities.mjs";

test("zentraler Affiliate-Report sortiert netzwerkübergreifend nach Priorität", () => {
  const report=buildAffiliateOpportunityReport({
    generatedAt:"2026-09-27T13:00:00.000Z",
    awin:[{brand:"Tech Brand",category:"Technik & Computer",priority:"hoch",score:88,status:"notjoined",applicationRequired:true,applicationDraft:"Draft",nextAction:"Prüfen",reasons:["Feed"]}],
    impact:[{brand:"Audio Brand",category:"Audio & Musik",priority:"mittel",score:44,nextAction:"Feed ausbauen",reasons:["2 Produkte"],campaignId:"i1"}],
    daisycon:[{brand:"Gaming Brand",category:"Gaming",priority:"hoch",score:60,status:"available",applicationPossible:true,applicationDraft:"Daisy Draft",nextAction:"Bedingungen prüfen",reasons:["passt"]}],
    networkSearches:{
      webgains:[{network:"Webgains",category:"Haushalt & Alltag",siteOffers:25,priority:"mittel",searchTerms:["home"],connected:false,action:"Zugang verbinden"}]
    }
  });
  assert.equal(report.highPriority,2);
  assert.equal(report.opportunities[0].priority,"hoch");
  assert.equal(report.safeguards.autoContractAcceptance,false);
  assert.equal(report.safeguards.autoApplicationSubmission,false);
  assert.ok(report.byNetwork.Awin >= 1);
  assert.ok(report.byNetwork.Daisycon >= 1);
  assert.ok(report.byNetwork.Webgains >= 1);
});

test("Marketplace-Suchpläne bleiben von echten Bewerbungen getrennt", () => {
  const report=buildAffiliateOpportunityReport({
    networkSearches:{
      tradedoubler:[{category:"Gaming",siteOffers:40,priority:"mittel",searchTerms:["gaming","games"],connected:true,action:"Programme prüfen"}]
    }
  });
  const row=report.opportunities[0];
  assert.equal(row.kind,"marketplace-search");
  assert.equal(row.network,"Tradedoubler");
  assert.equal(row.applicationDraft,null);
  assert.match(row.reason,/40 veröffentlichte/);
});
