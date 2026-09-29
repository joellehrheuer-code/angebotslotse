import crypto from "node:crypto";

const text = (value, max = 2000) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const identityText = value => text(value, 180).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const safeHttpUrl = value => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
};
const amount = value => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
};
const slugify = value => text(value, 120).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const merchantIdentity = offer => identityText(offer.advertiserId || offer.advertiser) || "unknown-merchant";
const blockedAdultSignal = /\b(?:adult|erotic|erotik|sexshop|sexspielzeug|sex\s?toy|vibrator(?:en)?|dildo(?:s)?|masturbator|analplug|butt\s?plug|penisring|cock\s?ring|porn(?:o|ografie|ography)?|erotikshop|bdsm\s?gear|lovense|satisfyer)\b/i;
export const isBlockedAdultOffer = raw => blockedAdultSignal.test(`${raw?.title??""} ${raw?.description??""} ${raw?.terms??""} ${raw?.advertiserName??raw?.advertiser?.name??raw?.advertiser??""} ${raw?.brand??raw?.manufacturer??""}`);
const nonMerchandiseTitleSignal = /\b(?:shipping protection|shipping insurance|package protection|parcel protection|worry[- ]free purchase|difference fee|differenzgeb(?:ühr|uehr)|bestelldifferenz)\b/i;
const nonMerchandiseDescriptionSignal = /(?:protect your package against damage,? loss|full refund if your order doesn.?t arrive|difference (?:of|for) your order|differenz (?:ihrer|der) bestellung)/i;
export const isBlockedNonMerchandiseOffer = raw => {
  const title = text(raw?.title, 240);
  const description = text(raw?.description, 800);
  if (nonMerchandiseTitleSignal.test(title)) return true;
  const price = amount(raw?.currentPrice ?? raw?.price ?? raw?.salePrice);
  return price !== null && price <= 2 && nonMerchandiseDescriptionSignal.test(description);
};
export const isSuppressedAdvertiserOffer = (raw, config = {}) => {
  const advertiserId = Number(raw?.advertiser?.id ?? raw?.advertiserId ?? raw?.merchantId);
  if (!Number.isFinite(advertiserId)) return false;
  return (config.suppressedAdvertiserIds ?? []).some(value => Number(value) === advertiserId);
};

export function dedupeKeyForOffer(offer) {
  const merchant = merchantIdentity(offer);
  const gtin = identityText(offer.gtin || offer.ean);
  const mpnBrand = `${identityText(offer.mpn)}|${identityText(offer.brand)}`;
  const sourceProduct = `${offer.source}|${merchant}|${identityText(offer.sourceId)}`;
  const fallback = `${identityText(offer.title)}|${identityText(offer.brand)}`;
  if (gtin && !["unknown", "undefined", "null"].includes(gtin)) return `gtin:${merchant}:${gtin}`;
  if (offer.mpn && offer.brand) return `mpn:${merchant}:${mpnBrand}`;
  if (identityText(offer.sourceId)) return `source:${sourceProduct}`;
  return `name:${offer.source}:${merchant}:${fallback}`;
}

export const isConcreteOffer = offer => offer.source !== "direct" && Boolean(offer.productId || offer.voucherCode || offer.endDate || (Number.isFinite(offer.currentPrice) && offer.currentPrice > 0));

const consumerPromotionSignal = /%|sale|rabatt|aktion|angebot|deal|save|sparen|\boff\b|flash/i;
const publisherPromotionSignal = /commission|publishers?|affiliate|cashback|purchase intent|\bblogs?\b|\byoutube\b|tutorial|review content/i;
export const isPublisherPromotion = offer => {
  if (offer?.type !== "promotion") return false;
  const copy = `${offer.title ?? ""} ${offer.description ?? ""} ${offer.terms ?? ""}`;
  return publisherPromotionSignal.test(copy);
};
export const isConsumerTextPromotion = offer => {
  if (offer?.type !== "promotion" || !offer?.endDate || !offer?.trackingUrl) return false;
  const copy = `${offer.title ?? ""} ${offer.description ?? ""} ${offer.terms ?? ""}`;
  return consumerPromotionSignal.test(copy) && !isPublisherPromotion(offer);
};
export const isPublicationReady = offer => !offer?.isStale && isConcreteOffer(offer) && !isPublisherPromotion(offer) && Boolean(offer.imageUrl || offer.videoUrl || offer.voucherCode || isConsumerTextPromotion(offer));
export const isAwaitingMediaOffer = offer => !offer?.isStale && isConcreteOffer(offer) && !isPublicationReady(offer) && !isPublisherPromotion(offer);

const categoryKeywordMatches = (source, value) => {
  const word = text(value, 80).toLowerCase();
  if (!word) return false;
  if (/\s/.test(word)) return source.includes(word);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu").test(source);
};

export function categoryFor(value, categories) {
  const source = text(value).toLowerCase();
  let best = "sonstiges", bestScore = 0;
  for (const [key, words] of Object.entries(categories)) {
    if (key === "sonstiges") continue;
    const score = words.reduce((sum, word) => sum + Number(categoryKeywordMatches(source, word)), 0);
    if (score > bestScore) { best = key; bestScore = score; }
  }
  return best;
}

const explicitMarketFromTitle = value => {
  const source = text(value, 180);
  const patterns = [
    /^\s*\(local:\s*([a-z]{2})\)/i,
    /^\s*\(([a-z]{2})\)/i,
    /^\s*independent\s*\(([a-z]{2})\)/i,
    /^\s*([a-z]{2}):\s/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
};

const merchantCategoryFallback = value => {
  const source = text(value, 300).toLowerCase();
  if (/\brazer\b/.test(source)) return "gaming";
  if (/\banthbot\b/.test(source)) return "garten";
  if (/\bimou\b/.test(source)) return "smart-home";
  if (/\bhollyland\b/.test(source)) return "audio-musik";
  if (/\bout\s*in\b|\boutin\b/.test(source)) return "haushalt";
  return "sonstiges";
};

const categoryForOffer = (raw, advertiser, config) => {
  const scores = new Map();
  let strongSignal = false;
  const addMatches = (value, weight) => {
    const source = text(value).toLowerCase();
    if (!source) return;
    for (const [key, words] of Object.entries(config.categories)) {
      if (key === "sonstiges") continue;
      let matches = 0;
      for (const word of words) if (categoryKeywordMatches(source, word)) matches += 1;
      if (matches) {
        scores.set(key, (scores.get(key) || 0) + matches * weight);
        if (weight >= 5) strongSignal = true;
      }
    }
  };
  addMatches(raw.title, 8);
  addMatches(raw.brand ?? raw.manufacturer, 5);
  if (!strongSignal) {
    addMatches(raw.description, 2);
    addMatches(raw.terms, 1);
  }

  if (!strongSignal && raw.category && raw.category !== "sonstiges" && config.categories[raw.category]) {
    scores.set(raw.category, (scores.get(raw.category) || 0) + 2);
  }

  const fallback = merchantCategoryFallback(`${advertiser} ${raw.brand ?? raw.manufacturer ?? ""}`);
  if (fallback !== "sonstiges" && config.categories[fallback]) {
    scores.set(fallback, (scores.get(fallback) || 0) + 5);
  }

  let best = "sonstiges", bestScore = 0;
  for (const [key, score] of scores) {
    if (score > bestScore) { best = key; bestScore = score; }
  }
  return best;
};

export const isMarketCompatibleTitle = (value, marketCountry = "DE") => {
  const explicitMarket = explicitMarketFromTitle(value);
  return !explicitMarket || [String(marketCountry || "DE").toUpperCase(), "EU"].includes(explicitMarket);
};

export const refineOfferCategory = (raw, config) => {
  const advertiser = text(raw.advertiser?.name ?? raw.advertiserName ?? raw.advertiser, 120);
  return categoryForOffer(raw, advertiser, config);
};

export function normalizeOffer(raw, config, now = new Date()) {
  const title = text(raw.title, 180);
  if (isBlockedAdultOffer(raw) || isBlockedNonMerchandiseOffer(raw) || isSuppressedAdvertiserOffer(raw, config)) return null;
  const trackingUrl = safeHttpUrl(raw.urlTracking ?? raw.trackingUrl);
  const destinationUrl = safeHttpUrl(raw.url ?? raw.destinationUrl ?? raw.productUrl);
  const endDate = raw.endDate ? new Date(raw.endDate) : null;
  const startDate = raw.startDate ? new Date(raw.startDate) : null;
  const regions = raw.regions?.all ? ["ALL"] : (raw.regions?.list ?? []).map(r => text(r.countryCode, 2).toUpperCase());
  if (!title || !trackingUrl || !destinationUrl) return null;
  if (raw.advertiser?.joined === false) return null;
  if (!isMarketCompatibleTitle(title, config.marketCountry)) return null;
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
    contentType: text(raw.contentType, 40) || (source === "direct" ? "partner-entry" : "product-offer"),
    creativeUrl: safeHttpUrl(raw.creativeUrl),
    advertiserId: Number(raw.advertiser?.id ?? raw.advertiserId) || null,
    type: raw.type === "voucher" ? "voucher" : "promotion",
    voucherCode: raw.voucher?.code ? text(raw.voucher.code, 100) : null,
    trackingUrl, destinationUrl, startDate: startDate?.toISOString() ?? null,
    endDate: endDate?.toISOString() ?? null, category: categoryForOffer(raw, advertiser, config),
    dateAdded: raw.dateAdded ? new Date(raw.dateAdded).toISOString() : null,
    updatedAt: now.toISOString(),
    imageUrl: safeHttpUrl(raw.imageUrl ?? raw.image ?? raw.imageUri),
    additionalImageUrls: [...new Set((Array.isArray(raw.additionalImageUrls) ? raw.additionalImageUrls : []).map(safeHttpUrl).filter(Boolean))].slice(0, 10),
    imageAlt: text(raw.imageAlt, 220) || null,
    imageSource: text(raw.imageSource, 120) || null,
    imageRightsNote: text(raw.imageRightsNote, 300) || null,
    mediaType: raw.mediaType === "video" ? "video" : "image",
    videoUrl: safeHttpUrl(raw.videoUrl),
    videoPoster: safeHttpUrl(raw.videoPoster),
    videoProvider: text(raw.videoProvider, 80) || null,
    videoSource: text(raw.videoSource, 200) || null,
    videoTitle: text(raw.videoTitle, 220) || null,
    videoEmbedType: ["html5","youtube","vimeo"].includes(raw.videoEmbedType) ? raw.videoEmbedType : null,
    currentPrice,
    previousPrice: previousPrice !== null && currentPrice !== null && previousPrice > currentPrice ? previousPrice : null,
    oldPrice: previousPrice !== null && currentPrice !== null && previousPrice > currentPrice ? previousPrice : null,
    discountAmount: previousPrice !== null && currentPrice !== null && previousPrice > currentPrice ? Number((previousPrice - currentPrice).toFixed(2)) : null,
    currency: text(raw.currency || config.currency, 3).toUpperCase(),
    priceSource: text(raw.priceSource, 120) || (currentPrice !== null ? source : null),
    priceCheckedAt: raw.priceCheckedAt ? new Date(raw.priceCheckedAt).toISOString() : (currentPrice !== null ? now.toISOString() : null),
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
    const key = dedupeKeyForOffer(offer);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, offer);
      continue;
    }
    const images = [...new Set([current.imageUrl, ...(current.additionalImageUrls || []), offer.imageUrl, ...(offer.additionalImageUrls || [])].filter(Boolean))];
    const richer = [current, offer].sort((a, b) => Number(Boolean(b.imageUrl)) + Number(Boolean(b.currentPrice)) + b.description.length - (Number(Boolean(a.imageUrl)) + Number(Boolean(a.currentPrice)) + a.description.length))[0];
    byKey.set(key, { ...richer, imageUrl: images[0] || null, additionalImageUrls: images.slice(1, 11), alternateTrackingUrls: [...new Set([...(current.alternateTrackingUrls || []), ...(offer.alternateTrackingUrls || []), current.trackingUrl, offer.trackingUrl])].filter(Boolean).slice(0, 10) });
  }
  return [...byKey.values()].sort((a, b) => (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999")).slice(0, config.maxOffers);
}
