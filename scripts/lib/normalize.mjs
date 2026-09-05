import crypto from "node:crypto";

const text = (value, max = 2000) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const safeHttpUrl = value => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
};
const amount = value => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const slugify = value => text(value, 120).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function categoryFor(value, categories) {
  const source = text(value).toLowerCase();
  return Object.entries(categories).find(([key, words]) => key !== "sonstiges" && words.some(word => source.includes(word)))?.[0] ?? "sonstiges";
}

export function normalizeOffer(raw, config, now = new Date()) {
  const title = text(raw.title, 180);
  const trackingUrl = safeHttpUrl(raw.urlTracking ?? raw.trackingUrl);
  const destinationUrl = safeHttpUrl(raw.url);
  const endDate = raw.endDate ? new Date(raw.endDate) : null;
  const startDate = raw.startDate ? new Date(raw.startDate) : null;
  const regions = raw.regions?.all ? ["ALL"] : (raw.regions?.list ?? []).map(r => text(r.countryCode, 2).toUpperCase());
  if (!title || !trackingUrl || !destinationUrl) return null;
  if (raw.advertiser?.joined === false) return null;
  if (endDate && (!Number.isFinite(endDate.valueOf()) || endDate < now)) return null;
  if (startDate && Number.isFinite(startDate.valueOf()) && startDate > now) return null;
  if (regions.length && !regions.includes("ALL") && !regions.includes(config.marketCountry)) return null;
  const advertiser = text(raw.advertiser?.name ?? raw.advertiserName, 120);
  const sourceId = text(raw.promotionId ?? raw.id, 120);
  const source = text(raw.source || "awin", 30).toLowerCase();
  const currentPrice = amount(raw.currentPrice ?? raw.price ?? raw.salePrice);
  const previousPrice = amount(raw.previousPrice ?? raw.originalPrice ?? raw.retailPrice);
  const gtin = text(raw.gtin, 32) || null, ean = text(raw.ean, 32) || null, mpn = text(raw.mpn, 80) || null, sku = text(raw.sku, 80) || null;
  const id = crypto.createHash("sha256").update(`${source}:${sourceId}:${trackingUrl}`).digest("hex").slice(0, 16);
  return {
    id, slug: `${slugify(title) || "angebot"}-${id.slice(0, 8)}`, source, sourceId, title,
    description: text(raw.description, 600), terms: text(raw.terms, 1200), advertiser,
    advertiserId: Number(raw.advertiser?.id ?? raw.advertiserId) || null,
    type: raw.type === "voucher" ? "voucher" : "promotion",
    voucherCode: raw.voucher?.code ? text(raw.voucher.code, 100) : null,
    trackingUrl, destinationUrl, startDate: startDate?.toISOString() ?? null,
    endDate: endDate?.toISOString() ?? null, category: raw.category && config.categories[raw.category] ? raw.category : categoryFor(`${raw.title} ${raw.description}`, config.categories),
    dateAdded: raw.dateAdded ? new Date(raw.dateAdded).toISOString() : null,
    updatedAt: now.toISOString(),
    imageUrl: safeHttpUrl(raw.imageUrl ?? raw.image ?? raw.imageUri),
    imageAlt: text(raw.imageAlt, 220) || null,
    imageSource: text(raw.imageSource, 120) || null,
    imageRightsNote: text(raw.imageRightsNote, 300) || null,
    mediaType: raw.mediaType === "video" ? "video" : "image",
    videoUrl: safeHttpUrl(raw.videoUrl),
    videoPoster: safeHttpUrl(raw.videoPoster),
    videoProvider: text(raw.videoProvider, 80) || null,
    videoTitle: text(raw.videoTitle, 220) || null,
    videoEmbedType: ["html5","youtube","vimeo"].includes(raw.videoEmbedType) ? raw.videoEmbedType : null,
    currentPrice,
    previousPrice: previousPrice !== null && currentPrice !== null && previousPrice > currentPrice ? previousPrice : null,
    currency: text(raw.currency || config.currency, 3).toUpperCase(),
    platform: text(raw.platform, 80) || null,
    productId: text(raw.productId ?? ean ?? gtin ?? mpn ?? sku, 120) || null,
    merchantId: Number(raw.advertiser?.id ?? raw.advertiserId) || null,
    merchantName: advertiser,
    brand: text(raw.brand ?? raw.manufacturer, 120) || null,
    gtin, ean, mpn, sku,
    productUrl: destinationUrl,
    affiliateUrl: trackingUrl,
    originalPrice: previousPrice !== null && currentPrice !== null && previousPrice > currentPrice ? previousPrice : null,
    discountPercent: previousPrice !== null && currentPrice !== null && previousPrice > currentPrice ? Math.round((1-currentPrice/previousPrice)*100) : null,
    couponCode: raw.voucher?.code ? text(raw.voucher.code, 100) : null,
    validFrom: startDate?.toISOString() ?? null,
    validUntil: endDate?.toISOString() ?? null,
    firstSeen: raw.firstSeen ?? raw.dateAdded ? new Date(raw.firstSeen ?? raw.dateAdded).toISOString() : now.toISOString(),
    lastSeen: now.toISOString(),
    lastPriceChange: raw.lastPriceChange ? new Date(raw.lastPriceChange).toISOString() : null,
    availability: text(raw.availability ?? raw.stockAvailability, 40) || null,
    isPermanentOffer: !endDate && source === "direct"
  };
}

export function normalizeAndDedupe(rows, config, now = new Date()) {
  const byKey = new Map();
  for (const raw of rows) {
    const offer = normalizeOffer(raw, config, now);
    if (!offer) continue;
    const key = offer.destinationUrl.replace(/[?#].*$/, "").toLowerCase() || `${offer.source}:${offer.sourceId}`;
    if (!byKey.has(key) || (offer.description.length > byKey.get(key).description.length)) byKey.set(key, offer);
  }
  return [...byKey.values()].sort((a, b) => (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999")).slice(0, config.maxOffers);
}
