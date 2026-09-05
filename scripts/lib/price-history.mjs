const DAY = 86400000;

export function updatePriceHistory(previous, offers, now = new Date()) {
  const cutoff = now.getTime() - 365 * DAY;
  const valid = previous.filter(row => Number.isFinite(new Date(row.timestamp).getTime()) && new Date(row.timestamp).getTime() >= cutoff && Number.isFinite(row.price) && row.price > 0);
  const day = now.toISOString().slice(0,10);
  for (const offer of offers) {
    if (!offer.productId || !Number.isFinite(offer.currentPrice) || offer.currentPrice <= 0) continue;
    const key = `${offer.productId}:${offer.advertiser}:${offer.currency || "EUR"}`;
    const last = [...valid].reverse().find(row => `${row.productId}:${row.merchant}:${row.currency}` === key);
    if (!last || last.price !== offer.currentPrice || !last.timestamp.startsWith(day)) valid.push({productId:offer.productId,merchant:offer.advertiser,timestamp:now.toISOString(),price:offer.currentPrice,currency:offer.currency || "EUR"});
  }
  return valid.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}

export function historyFor(history, offer, days = 30, now = new Date()) {
  if (!offer.productId) return [];
  const cutoff = now.getTime() - days * DAY;
  return history.filter(row => row.productId === offer.productId && row.currency === (offer.currency || "EUR") && new Date(row.timestamp).getTime() >= cutoff).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}
