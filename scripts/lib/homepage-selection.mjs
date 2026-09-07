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

export function selectHomepageOffers(offers, { now = new Date(), score = () => 0 } = {}) {
  const day = now.toISOString().slice(0, 10);
  const ranked = [...offers].sort((a, b) =>
    score(b) - score(a) ||
    stableDailyValue(b.id || b.slug, day) - stableDailyValue(a.id || a.slug, day) ||
    timestamp(b) - timestamp(a)
  );
  const age = offer => now.getTime() - timestamp(offer);
  const recent = days => ranked.filter(offer => timestamp(offer) && age(offer) >= 0 && age(offer) <= days * 86400000);
  const newest = [...offers].sort((a, b) => timestamp(b) - timestamp(a));

  return {
    dailyDeal: ranked[0] || null,
    dailyHighlights: ranked.slice(0, 5),
    weekDeals: recent(7).slice(0, 5),
    monthHighlights: recent(30).slice(0, 5),
    newest: newest.slice(0, 10)
  };
}
