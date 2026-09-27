const norm = value => String(value ?? "").trim().toLowerCase();
const positive = value => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const discountPercent = offer => {
  const current = positive(offer?.currentPrice);
  const previous = positive(offer?.previousPrice);
  return current && previous && previous > current ? Math.round((1 - current / previous) * 100) : 0;
};

export function matchAlertSubscription(subscription, offer) {
  if (!subscription?.enabled || !offer) return false;
  const type = norm(subscription.alert_type ?? subscription.alertType);
  const title = norm(offer.title);
  const description = norm(offer.description);
  const haystack = [title, description, norm(offer.brand), norm(offer.advertiser), norm(offer.category)].join(" ");
  let identityMatch = false;

  if (type === "product") identityMatch = [offer.id, offer.slug, offer.productId].some(value => norm(value) && norm(value) === norm(subscription.query));
  else if (type === "category") identityMatch = norm(offer.category) === norm(subscription.category ?? subscription.query);
  else if (type === "brand") identityMatch = norm(offer.brand) === norm(subscription.brand ?? subscription.query);
  else if (type === "merchant") identityMatch = norm(offer.advertiser) === norm(subscription.merchant ?? subscription.query);
  else if (type === "search") identityMatch = norm(subscription.query) && haystack.includes(norm(subscription.query));

  if (!identityMatch) return false;
  const maxPrice = positive(subscription.max_price ?? subscription.maxPrice);
  if (maxPrice != null) {
    const current = positive(offer.currentPrice);
    if (current == null || current > maxPrice) return false;
  }
  const minDiscount = positive(subscription.min_discount ?? subscription.minDiscount);
  if (minDiscount != null && discountPercent(offer) < minDiscount) return false;
  return true;
}

export function savedOfferEvents(saved, offer, previousOffer = null) {
  if (!saved || !offer) return [];
  const events = [];
  const current = positive(offer.currentPrice);
  const previous = positive(previousOffer?.currentPrice);
  const target = positive(saved.target_price ?? saved.targetPrice);
  const targetEnabled = saved.alert_on_target ?? saved.alertOnTarget ?? true;
  const dropEnabled = saved.alert_on_price_drop ?? saved.alertOnPriceDrop ?? false;
  const restockEnabled = saved.alert_on_restock ?? saved.alertOnRestock ?? false;

  if (targetEnabled && target != null && current != null && current <= target && (previous == null || previous > target)) {
    events.push({type:"target-price", currentPrice:current, targetPrice:target});
  }
  if (dropEnabled && current != null && previous != null && current < previous) {
    events.push({type:"price-drop", currentPrice:current, previousPrice:previous});
  }
  const wasAvailable = previousOffer ? previousOffer.available !== false : null;
  const isAvailable = offer.available !== false;
  if (restockEnabled && previousOffer && wasAvailable === false && isAvailable) {
    events.push({type:"restock"});
  }
  return events;
}

export function buildNotificationCandidates({
  offers = [],
  previousOffers = [],
  savedOffers = [],
  subscriptions = [],
  now = new Date().toISOString()
} = {}) {
  const currentBySlug = new Map(offers.filter(row => row?.slug).map(row => [String(row.slug), row]));
  const previousBySlug = new Map(previousOffers.filter(row => row?.slug).map(row => [String(row.slug), row]));
  const candidates = [];

  for (const saved of savedOffers) {
    const slug = String(saved.offer_slug ?? saved.offerSlug ?? "");
    const offer = currentBySlug.get(slug);
    if (!offer) continue;
    for (const event of savedOfferEvents(saved, offer, previousBySlug.get(slug))) {
      const userId = String(saved.user_id ?? saved.userId ?? "");
      const offerKey = String(offer.id ?? offer.slug);
      candidates.push({
        userId,
        offerSlug: offer.slug,
        offerId: offer.id ?? null,
        eventType: event.type,
        event,
        createdAt: now,
        dedupeKey: [userId, "saved", offerKey, event.type, String(offer.currentPrice ?? "na")].join(":")
      });
    }
  }

  for (const subscription of subscriptions) {
    if (!subscription?.enabled) continue;
    for (const offer of offers) {
      if (!matchAlertSubscription(subscription, offer)) continue;
      const userId = String(subscription.user_id ?? subscription.userId ?? "");
      const subscriptionId = String(subscription.id ?? "subscription");
      candidates.push({
        userId,
        subscriptionId,
        offerSlug: offer.slug ?? null,
        offerId: offer.id ?? null,
        eventType: "new-match",
        createdAt: now,
        dedupeKey: [userId, "subscription", subscriptionId, String(offer.id ?? offer.slug)].join(":")
      });
    }
  }

  return [...new Map(candidates.map(row => [row.dedupeKey, row])).values()];
}
