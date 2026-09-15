import test from "node:test";
import assert from "node:assert/strict";
import { mergeOfferInventory } from "../scripts/lib/offer-merge.mjs";

const offer = (id, source = "awin", title = id) => ({
  id, source, title, endDate: null, firstSeen: "2026-01-01T00:00:00.000Z", lastSeen: "2026-09-01T00:00:00.000Z"
});

test("preserves offers when a source is disabled and marks them stale", () => {
  const result = mergeOfferInventory({
    freshOffers: [offer("direct-1", "direct")],
    oldOffers: [offer("awin-1"), offer("direct-1", "direct")],
    sources: [
      { name: "awin", state: "ok", rows: [] },
      { name: "awin-enhanced-feeds", state: "disabled", rows: [] },
      { name: "direct", state: "ok", rows: [{}] }
    ],
    now: "2026-09-15T12:00:00.000Z",
    maxOffers: 10
  });
  const preserved = result.find(row => row.id === "awin-1");
  assert.ok(preserved);
  assert.equal(preserved.isStale, true);
  assert.equal(preserved.staleReason, "source-awin+awin-enhanced-feeds-disabled");
  assert.equal(result.find(row => row.id === "direct-1").isStale, false);
});

test("trips a circuit breaker on a suspiciously small successful response", () => {
  const oldOffers = Array.from({ length: 10 }, (_, index) => offer(`awin-${index}`));
  const result = mergeOfferInventory({
    freshOffers: [offer("awin-0")],
    oldOffers,
    sources: [{ name: "awin", state: "ok", rows: [{}] }],
    now: "2026-09-15T12:00:00.000Z",
    maxOffers: 20,
    circuitBreakerRatio: 0.5
  });
  assert.equal(result.length, 10);
  assert.equal(result.filter(row => row.isStale).length, 9);
});

test("does not preserve an expired source when its inventory is healthy", () => {
  const result = mergeOfferInventory({
    freshOffers: [offer("awin-new")],
    oldOffers: [offer("awin-old")],
    sources: [{ name: "awin", state: "ok", rows: [{}] }],
    maxOffers: 10
  });
  assert.deepEqual(result.map(row => row.id), ["awin-new"]);
});
