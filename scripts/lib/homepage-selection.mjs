const timestamp = offer => {
  const value = Date.parse(offer.firstSeen || offer.importTimestamp || offer.dateAdded || offer.updatedAt || "");
  return Number.isFinite(value) ? value : 0;
};

const stableDailyValue = (id, day) => {
  let hash = 2166136261;
  for (const character of `${day}:${id}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const diversify = (rows, limit) => {
  const selected = [], usedMerchants = new Set(), usedCategories = new Set();
  for (const row of rows) {
    if (selected.length >= limit) break;
    const merchant = String(row.advertiser || "").toLowerCase();
    const category = String(row.category || "").toLowerCase();
    if (!usedMerchants.has(merchant) || !usedCategories.has(category)) {
      selected.push(row); usedMerchants.add(merchant); usedCategories.add(category);
    }
  }
  for (const row of rows) if (selected.length < limit && !selected.includes(row)) selected.push(row);
  return selected;
};

export function selectHomepageOffers(offers, { now = new Date(), score = () => 0 } = {}) {
  const day = now.toISOString().slice(0, 10);
  const ranked = [...offers].sort((a, b) =>
    score(b) - score(a) || timestamp(b) - timestamp(a) || String(a.id || a.slug).localeCompare(String(b.id || b.slug))
  );
  const age = offer => now.getTime() - timestamp(offer);
  const recent = days => ranked.filter(offer => timestamp(offer) && age(offer) >= 0 && age(offer) <= days * 86400000);
  const newest = [...offers].sort((a, b) => timestamp(b) - timestamp(a));
  const dailyPool = ranked.slice(0, Math.min(12, ranked.length));
  const dailyDeal = dailyPool.length ? dailyPool[stableDailyValue("daily-deal", day) % dailyPool.length] : null;
  const highlightPool = ranked.slice(0, Math.min(40, ranked.length))
    .sort((a, b) => stableDailyValue(b.id || b.slug, day) - stableDailyValue(a.id || a.slug, day));
  const dailyHighlights = diversify([
    ...(dailyDeal ? [dailyDeal] : []),
    ...highlightPool.filter(row => row !== dailyDeal)
  ], 5);
  return {
    dailyDeal,
    dailyHighlights,
    weekDeals: diversify(recent(7), 5),
    monthHighlights: diversify(recent(30), 5),
    newest: diversify(newest, 10)
  };
}
