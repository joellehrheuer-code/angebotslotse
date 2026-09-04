const API = "https://api.impact.com";
const VERSION = "16";
const PAGE_SIZE = 100;

const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const first = (payload, keys) => keys.map(key => payload?.[key]).find(Array.isArray) ?? [];
const cleanDate = value => value && Number.isFinite(new Date(value).valueOf()) ? value : undefined;
const activeForGermany = program => {
  if (String(program.ContractStatus ?? "Active").toLowerCase() !== "active") return false;
  const raw = program.ShippingRegions?.ShippingRegion ?? program.ShippingRegions;
  const regions = list(raw).map(value => String(value).toUpperCase());
  return !regions.length || regions.includes("GERMANY") || regions.includes("ALL");
};

function client(accountSid, authToken, fetchImpl) {
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json", "IR-Version": VERSION };
  const request = async (pathname, params = {}) => {
    const url = new URL(`${API}${pathname}`);
    for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, { headers });
    if (!response.ok) throw new Error(`Impact API ${pathname}: HTTP ${response.status}`);
    return response.json();
  };
  const pages = async (pathname, keys, params = {}) => {
    const rows = [];
    for (let page = 1; page <= 20; page += 1) {
      const payload = await request(pathname, { ...params, Page: page, PageSize: PAGE_SIZE });
      rows.push(...first(payload, keys));
      const total = Number(payload?.["@numpages"] ?? payload?.TotalPages ?? 1);
      if (page >= total) break;
    }
    return rows;
  };
  return { request, pages };
}

const trackingUrlAllowed = (value, policy, rule = null) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (policy.blockedTrackingUrls ?? []).includes(url.href)) return false;
    return !(rule?.blockedTrackingHosts ?? []).some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
};

const quarantineFor = (program, policy) => (policy.quarantinedAdvertisers ?? []).find(rule =>
  (rule.advertiserId && String(rule.advertiserId) === String(program.AdvertiserId)) ||
  (rule.advertiserName && String(rule.advertiserName).toLowerCase() === String(program.AdvertiserName).toLowerCase()));

async function resolveAdTrackingLink(ad, program, api, policy) {
  const sourceId = `ad-${ad.Id}`;
  const rule = quarantineFor(program, policy);
  const current = ad.TrackingLink;
  const requiresDedicatedCheck = (policy.reviewSourceIds ?? []).includes(sourceId) || rule?.requireDedicatedAdLink;
  if (!requiresDedicatedCheck) return trackingUrlAllowed(current, policy, rule) ? current : null;
  try {
    const payload = await api.request(`/Mediapartners/${policy.account}/Ads/${encodeURIComponent(ad.Id)}/TrackingLink`);
    const alternate = payload.TrackingLink ?? payload.TrackingURL;
    return alternate !== current && trackingUrlAllowed(alternate, policy, rule) ? alternate : null;
  } catch {
    return null;
  }
}

const common = (program, row = {}) => ({
  advertiserName: row.AdvertiserName ?? program.AdvertiserName ?? program.CampaignName,
  advertiserId: row.AdvertiserId ?? program.AdvertiserId,
  regions: { list: [{ countryCode: "DE" }] },
  source: "impact"
});

export async function fetchImpactOffers({ accountSid, authToken, fetchImpl = fetch, linkPolicy = {} }) {
  if (!accountSid || !authToken) return [];
  const api = client(accountSid, authToken, fetchImpl);
  const account = encodeURIComponent(accountSid);
  const policy = { ...linkPolicy, account };
  const programs = (await api.pages(`/Mediapartners/${account}/Campaigns`, ["Campaigns", "Programs"])).filter(activeForGermany);
  const byCampaign = new Map(programs.map(row => [String(row.CampaignId), row]));
  const byAdvertiser = new Map(programs.map(row => [String(row.AdvertiserId), row]));
  const rows = [];

  for (const program of programs) {
    const rule = quarantineFor(program, policy);
    if (!trackingUrlAllowed(program.TrackingLink, policy, rule)) continue;
    rows.push({ ...common(program), id: `program-${program.CampaignId}`, title: program.CampaignName,
      description: program.CampaignDescription || `Partnerprogramm von ${program.AdvertiserName}.`,
      url: program.AdvertiserUrl || program.CampaignUrl || program.TrackingLink, urlTracking: program.TrackingLink,
      category: "sonstiges", type: "promotion" });
  }

  const ads = await api.pages(`/Mediapartners/${account}/Ads`, ["Ads"]);
  for (const ad of ads) {
    const program = byCampaign.get(String(ad.CampaignId));
    if (!program || !ad.Name) continue;
    const trackingUrl = await resolveAdTrackingLink(ad, program, api, policy);
    if (!trackingUrl) continue;
    rows.push({ ...common(program, ad), id: `ad-${ad.Id}`, title: ad.Name, description: ad.Description,
      url: ad.LandingPageUrl || program.AdvertiserUrl || trackingUrl, urlTracking: trackingUrl,
      type: String(ad.Type).toUpperCase() === "COUPON" ? "voucher" : "promotion",
      voucher: ad.DealDefaultPromoCode ? { code: ad.DealDefaultPromoCode } : undefined });
  }

  const promotions = await api.pages(`/Mediapartners/${account}/Promotions`, ["Promotions"]);
  for (const promotion of promotions) {
    const program = byAdvertiser.get(String(promotion.AdvertiserId));
    const trackingUrl = promotion.TrackingLink || program?.TrackingLink;
    if (!program || !promotion.PromotionTitle || !trackingUrlAllowed(trackingUrl, policy, quarantineFor(program, policy))) continue;
    const [startDate, endDate] = String(promotion.PromotionEffectiveDates ?? "").split("/");
    rows.push({ ...common(program, promotion), id: `promotion-${promotion.PromotionIds}`, title: promotion.PromotionTitle,
      description: promotion.PromotionDescription, terms: promotion.Terms,
      url: promotion.LandingPageUrl || program.AdvertiserUrl || trackingUrl, urlTracking: trackingUrl,
      startDate: cleanDate(startDate), endDate: cleanDate(endDate), type: promotion.GenericRedemptionCode ? "voucher" : "promotion",
      voucher: promotion.GenericRedemptionCode ? { code: promotion.GenericRedemptionCode } : undefined });
  }

  for (const program of programs) {
    if (!trackingUrlAllowed(program.TrackingLink, policy, quarantineFor(program, policy))) continue;
    const deals = await api.pages(`/Mediapartners/${account}/Campaigns/${encodeURIComponent(program.CampaignId)}/Deals`, ["Deals"], { State: "ACTIVE" });
    for (const deal of deals) {
      if (String(deal.State).toUpperCase() !== "ACTIVE" || !deal.Name) continue;
      rows.push({ ...common(program), id: `deal-${program.CampaignId}-${deal.Id}`, title: deal.Name, description: deal.Description,
        terms: deal.OfferInstructions, url: program.AdvertiserUrl || program.TrackingLink, urlTracking: program.TrackingLink,
        startDate: cleanDate(deal.StartDate), endDate: cleanDate(deal.EndDate), type: deal.DefaultPromoCode ? "voucher" : "promotion",
        voucher: deal.DefaultPromoCode ? { code: deal.DefaultPromoCode } : undefined });
    }
  }

  const products = await api.pages(`/Mediapartners/${account}/Catalogs/ItemSearch`, ["Items", "CatalogItems", "Records"]);
  for (const product of products) {
    const program = byCampaign.get(String(product.CampaignId));
    const trackingUrl = product.TrackingLink || product.UrlTracking;
    if (!program || !trackingUrlAllowed(trackingUrl, policy, quarantineFor(program, policy)) || !product.Name || String(product.StockAvailability).toLowerCase() === "outofstock") continue;
    rows.push({ ...common(program), id: `product-${product.CatalogId}-${product.CatalogItemId}`, title: product.Name,
      description: product.Description, url: product.Url || trackingUrl, urlTracking: trackingUrl, type: "promotion",
      imageUrl: product.ImageUrl || product.ImageURL || product.ImageUri,
      currentPrice: product.CurrentPrice ?? product.Price ?? product.SalePrice,
      previousPrice: product.OriginalPrice ?? product.RetailPrice ?? product.MSRP,
      currency: product.Currency || product.CurrencyCode,
      productId: product.Gtin ?? product.GTIN ?? product.Ean ?? product.EAN ?? product.Mpn ?? product.CatalogItemId });
  }

  return rows;
}

export { VERSION as IMPACT_API_VERSION };
