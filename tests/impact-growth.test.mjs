import test from "node:test";
import assert from "node:assert/strict";
import { buildImpactContactDraft, buildImpactMarketplaceSearches, rankImpactPrograms } from "../scripts/lib/impact-growth.mjs";

test("rankt Impact-Programme nach echten Assets und Fähigkeiten", () => {
  const rows=rankImpactPrograms([
    {name:"Gaming Brand",advertiserName:"Gaming Brand",campaignId:"1",advertiserId:"a",products:12,promotions:2,deals:1,ads:3,deeplinks:true,trackingLinkAvailable:true,publicTermsAvailable:true,logoAvailable:true},
    {name:"Other",advertiserName:"Other",campaignId:"2",advertiserId:"b",products:0,promotions:0,deals:0,ads:0,deeplinks:false,trackingLinkAvailable:true,publicTermsAvailable:false,logoAvailable:false}
  ]);
  assert.equal(rows[0].campaignId,"1");
  assert.equal(rows[0].priority,"hoch");
  assert.ok(rows[0].score > rows[1].score);
  assert.equal(rows[0].assets.products,12);
  assert.match(rows[0].nextAction,/Produktkatalog/);
});

test("erstellt Kontaktentwurf ohne erfundene Reichweitenwerte", () => {
  const draft=buildImpactContactDraft({name:"Audio Brand",advertiserName:"Audio Brand"});
  assert.match(draft,/impact\.com/);
  assert.match(draft,/Produktkataloge/);
  assert.doesNotMatch(draft,/\b\d+[.,]?\d*\s*(Follower|Views|Abonnenten)/i);
});

test("erkennt Marketplace-Lücken aus realer Kategorieabdeckung", () => {
  const rows=buildImpactMarketplaceSearches({
    siteCategoryStats:{gaming:30,technik:20,computer:10,"audio-musik":8},
    signals:[{name:"Audio Brand",advertiserName:"Audio Brand",campaignId:"1"}]
  });
  assert.ok(rows.length>0);
  assert.equal(rows[0].category,"Gaming");
  assert.equal(rows[0].siteOffers,30);
  assert.equal(rows[0].joinedPrograms,0);
  assert.ok(rows[0].searchTerms.includes("gaming"));
});
