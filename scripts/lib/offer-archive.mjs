const clean = value => value == null ? null : String(value);

export function archiveRemovedOffers(existing = { items: [] }, removedOffers = [], archivedAt = new Date().toISOString(), limit = 2000) {
  const current = Array.isArray(existing) ? existing : Array.isArray(existing?.items) ? existing.items : [];
  const byId = new Map(current.filter(row => row?.id).map(row => [String(row.id), row]));
  const now = new Date(archivedAt);
  for (const offer of removedOffers) {
    if (!offer?.id) continue;
    const expired = offer.endDate && Number.isFinite(new Date(offer.endDate).valueOf()) && new Date(offer.endDate) <= now;
    byId.set(String(offer.id), {
      id: String(offer.id),
      slug: clean(offer.slug),
      title: clean(offer.title),
      advertiser: clean(offer.advertiser),
      source: clean(offer.source),
      productId: clean(offer.productId),
      category: clean(offer.category),
      lastPrice: Number.isFinite(Number(offer.currentPrice)) && Number(offer.currentPrice) > 0 ? Number(offer.currentPrice) : null,
      currency: clean(offer.currency || "EUR"),
      firstSeen: clean(offer.firstSeen || offer.dateAdded),
      lastSeen: clean(offer.lastSeen || offer.updatedAt),
      endDate: clean(offer.endDate),
      archivedAt,
      reason: expired ? "expired" : "removed-from-source"
    });
  }
  const items = [...byId.values()]
    .sort((a,b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")))
    .slice(0, Math.max(1, Number(limit) || 2000));
  return { updatedAt: archivedAt, items };
}
