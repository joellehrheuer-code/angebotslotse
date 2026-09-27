import test from "node:test";
import assert from "node:assert/strict";
import { selectHomepageOffers } from "../scripts/lib/homepage-selection.mjs";

test("homepage selection is deterministic, quality-bounded and rotates by day", () => {
  const offers = Array.from({length: 16}, (_, index) => ({
    id: "offer-" + index,
    advertiser: "merchant-" + (index % 5),
    category: "cat-" + (index % 4),
    firstSeen: new Date(Date.UTC(2026, 8, 7 - Math.min(index, 6), 8)).toISOString(),
    quality: 100 - index
  }));
  const dayOne = new Date("2026-09-07T12:00:00Z");
  const dayTwo = new Date("2026-09-08T12:00:00Z");
  const first = selectHomepageOffers(offers, { now: dayOne, score: offer => offer.quality });
  const repeated = selectHomepageOffers(offers, { now: dayOne, score: offer => offer.quality });
  const nextDay = selectHomepageOffers(offers, { now: dayTwo, score: offer => offer.quality });
  assert.deepEqual(first, repeated);
  assert.ok(offers.slice(0, 12).some(row => row.id === first.dailyDeal.id));
  assert.notEqual(first.dailyDeal.id, nextDay.dailyDeal.id);
  assert.equal(first.dailyHighlights.length, 5);
  assert.equal(first.newest.length, 10);
  assert.ok(first.weekDeals.length > 0);
});

test("empty inventory produces no homepage claims", () => {
  const result = selectHomepageOffers([], { now: new Date("2026-09-07T12:00:00Z") });
  assert.equal(result.dailyDeal, null);
  assert.deepEqual(result.dailyHighlights, []);
  assert.deepEqual(result.weekDeals, []);
  assert.deepEqual(result.monthHighlights, []);
  assert.deepEqual(result.newest, []);
});
