import test from "node:test";
import assert from "node:assert/strict";
import { selectHomepageOffers } from "../scripts/lib/homepage-selection.mjs";

test("homepage selection is deterministic and never fabricates rows", () => {
  const now = new Date("2026-09-07T12:00:00Z");
  const offers = [
    { id: "old", firstSeen: "2026-07-01T00:00:00Z", quality: 9 },
    { id: "week", firstSeen: "2026-09-03T00:00:00Z", quality: 7 },
    { id: "today", firstSeen: "2026-09-07T08:00:00Z", quality: 8 }
  ];
  const first = selectHomepageOffers(offers, { now, score: offer => offer.quality });
  const second = selectHomepageOffers(offers, { now, score: offer => offer.quality });
  assert.equal(first.dailyDeal.id, "old");
  assert.deepEqual(first, second);
  assert.deepEqual(first.weekDeals.map(item => item.id).sort(), ["today", "week"]);
  assert.equal(first.monthHighlights.length, 2);
  assert.equal(first.dailyHighlights.length, 3);
  assert.equal(first.newest[0].id, "today");
});

test("empty inventory produces no homepage claims", () => {
  const result = selectHomepageOffers([], { now: new Date("2026-09-07T12:00:00Z") });
  assert.equal(result.dailyDeal, null);
  assert.deepEqual(result.dailyHighlights, []);
  assert.deepEqual(result.weekDeals, []);
  assert.deepEqual(result.monthHighlights, []);
  assert.deepEqual(result.newest, []);
});
