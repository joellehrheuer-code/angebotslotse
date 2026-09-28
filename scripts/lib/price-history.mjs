const DAY = 86400000;

const legacyKey = (productId, merchant, currency = "EUR") => `product:${productId}:${merchant}:${currency}`;
const rowKey = row => row.offerId ? `offer:${row.offerId}` : legacyKey(row.productId, row.merchant, row.currency);
const offerKey = offer => offer.id ? `offer:${offer.id}` : legacyKey(offer.productId, offer.advertiser, offer.currency || "EUR");

export function updatePriceHistory(previous, offers, now = new Date()) {
  const cutoff = now.getTime() - 365 * DAY;
  const valid = previous.filter(row => Number.isFinite(new Date(row.timestamp).getTime()) && new Date(row.timestamp).getTime() >= cutoff && Number.isFinite(row.price) && row.price > 0);
  const day = now.toISOString().slice(0,10);
  for (const offer of offers) {
    if (offer?.isStale || !offer.productId || !Number.isFinite(offer.currentPrice) || offer.currentPrice <= 0) continue;
    const key = offerKey(offer);
    const last = [...valid].reverse().find(row => rowKey(row) === key);
    if (!last || last.price !== offer.currentPrice || !last.timestamp.startsWith(day)) valid.push({offerId:offer.id || null,productId:offer.productId,merchant:offer.advertiser,timestamp:now.toISOString(),price:offer.currentPrice,currency:offer.currency || "EUR"});
  }
  return valid.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}

export function historyFor(history, offer, days = 30, now = new Date()) {
  if (!offer.productId) return [];
  const cutoff = now.getTime() - days * DAY;
  const inWindow = history.filter(row => row.currency === (offer.currency || "EUR") && new Date(row.timestamp).getTime() >= cutoff);
  if (offer.id) {
    const exact = inWindow.filter(row => row.offerId === offer.id);
    if (exact.length) return exact.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  }
  return inWindow.filter(row => !row.offerId && row.productId === offer.productId && row.merchant === offer.advertiser).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}
