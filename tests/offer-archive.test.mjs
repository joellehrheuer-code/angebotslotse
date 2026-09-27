import test from "node:test";
import assert from "node:assert/strict";
import { archiveRemovedOffers } from "../scripts/lib/offer-archive.mjs";

test("archiviert entfernte Angebote ohne aktive Trackinglinks", () => {
  const at = "2026-09-27T03:00:00Z";
  const result = archiveRemovedOffers({items:[]}, [{
    id:"x1", slug:"deal-x", title:"Deal X", advertiser:"Shop", source:"awin",
    productId:"123", category:"technik", currentPrice:49.99, currency:"EUR",
    firstSeen:"2026-09-20T00:00:00Z", lastSeen:"2026-09-26T00:00:00Z",
    endDate:"2026-09-26T23:59:00Z", trackingUrl:"https://example.invalid/tracking"
  }], at);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].reason, "expired");
  assert.equal(result.items[0].lastPrice, 49.99);
  assert.equal("trackingUrl" in result.items[0], false);
});

test("aktualisiert denselben Archiveintrag statt Dubletten zu erzeugen", () => {
  const first = archiveRemovedOffers({items:[]}, [{id:"x1",title:"Alt",currentPrice:10}], "2026-09-26T00:00:00Z");
  const second = archiveRemovedOffers(first, [{id:"x1",title:"Neu",currentPrice:9}], "2026-09-27T00:00:00Z");
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].title, "Neu");
  assert.equal(second.items[0].lastPrice, 9);
});
