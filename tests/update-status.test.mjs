import test from "node:test";
import assert from "node:assert/strict";
import { buildFailureStatus } from "../scripts/lib/update-status.mjs";

test("Fehlerstatus bewahrt letzten geprüften Bestand und zählt Schutzklassen korrekt", () => {
  const oldStatus = { lastSuccessfulUpdate:"2026-09-28T17:00:00Z", archivedTotal:330, invalidLinks:2, apiErrors:0, sources:{awin:{state:"ok"}}, creatorFeed:{state:"ok"} };
  const oldOffers = [
    {id:"live",source:"awin",productId:"p1",imageUrl:"https://img.example/1.jpg"},
    {id:"media",source:"awin",productId:"p2"},
    {id:"publisher",source:"awin",type:"promotion",endDate:"2099-01-01",trackingUrl:"https://track.example/p",title:"Save now",description:"Commission for publishers"},
    {id:"stale",source:"awin",productId:"p3",imageUrl:"https://img.example/3.jpg",isStale:true},
    {id:"blocked",source:"awin",productId:"p4",imageUrl:"https://img.example/4.jpg",advertiser:"Bad"}
  ];
  const status = buildFailureStatus({oldStatus,oldOffers,isQuarantined:offer=>offer.advertiser==="Bad",error:new Error("upstream unavailable")});
  assert.equal(status.state,"error");
  assert.equal(status.activeOffers,1);
  assert.equal(status.storedOffers,5);
  assert.equal(status.publishableOffers,1);
  assert.equal(status.awaitingMedia,1);
  assert.equal(status.blockedPublisherPromotions,1);
  assert.equal(status.quarantined,1);
  assert.equal(status.stale,1);
  assert.equal(status.archivedTotal,330);
  assert.deepEqual(status.sources,oldStatus.sources);
  assert.deepEqual(status.creatorFeed,oldStatus.creatorFeed);
  assert.equal(status.invalidLinks,2);
  assert.equal(status.apiErrors,1);
  assert.match(status.message,/letzter geprüfter Bestand bleibt erhalten/);
});
