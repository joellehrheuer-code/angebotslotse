const API = "https://api.impact.com";
const VERSION = "16";
const PAGE_SIZE = 100;
const MAX_RETRIES = 1;
const MAX_ENDPOINT_PAGES = Math.min(10,Math.max(1,Number(process.env.IMPACT_MAX_ENDPOINT_PAGES)||3));
const MAX_DEAL_CAMPAIGNS = Math.min(30,Math.max(1,Number(process.env.IMPACT_MAX_DEAL_CAMPAIGNS)||8));
const HTTP_TIMEOUT_MS = Math.min(60_000, Math.max(5_000, Number(process.env.SOURCE_HTTP_TIMEOUT_MS) || 12_000));

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
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
      if (response.ok) return response.json();
      if (response.status !== 429 || attempt === MAX_RETRIES) throw new Error(`Impact API ${pathname}: HTTP ${response.status}`);
      const retryAfter = response.headers?.get?.("retry-after") ?? response.headers?.["retry-after"];
      const parsed = Number(retryAfter);
      const waitMs = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed * 1000, 30_000) : Math.min(1000 * (2 ** attempt), 30_000);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  };
  const pages = async (pathname, keys, params = {}) => {
    const rows = [];
    for (let page = 1; page <= MAX_ENDPOINT_PAGES; page += 1) {
      let payload;
      try { payload = await request(pathname, { ...params, Page: page, PageSize: PAGE_SIZE }); }
      catch(error) { if(rows.length)break; throw error; }
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
  const programSignals = new Map(programs.map(program => [String(program.CampaignId), {
    name: program.CampaignName,
    advertiserName: program.AdvertiserName,
    advertiserId: program.AdvertiserId,
    campaignId: program.CampaignId,
    deeplinks: Boolean(program.AllowsDeeplinking),
    trackingLinkAvailable: Boolean(program.TrackingLink),
    logoAvailable: Boolean(program.CampaignLogoUri),
    publicTermsAvailable: Boolean(program.PublicTermsUri),
    ads: 0,
    promotions: 0,
    deals: 0,
    products: 0
  }]));
  const bump = (program, key) => {
    const signal = program && programSignals.get(String(program.CampaignId));
    if (signal) signal[key] += 1;
  };
  const audit = {apiVersion:VERSION,programs:programs.length,ads:0,promotions:0,deals:0,products:0,catalogs:null,stores:null,errors:{},quarantinedAdvertisers:(policy.quarantinedAdvertisers??[]).length,
    endpointPageLimit:MAX_ENDPOINT_PAGES,dealCampaignLimit:MAX_DEAL_CAMPAIGNS,
    programInventory:programs.map(program=>({name:program.CampaignName,advertiserName:program.AdvertiserName,advertiserId:program.AdvertiserId,campaignId:program.CampaignId,status:program.ContractStatus,countries:list(program.ShippingRegions?.ShippingRegion??program.ShippingRegions),deeplinks:Boolean(program.AllowsDeeplinking),trackingLinkAvailable:Boolean(program.TrackingLink),logoAvailable:Boolean(program.CampaignLogoUri),publicTermsAvailable:Boolean(program.PublicTermsUri)}))};
  const safePages = async (key, pathname, names, params = {}) => {
    try { return await api.pages(pathname, names, params); }
    catch (error) {
      audit.errors[key] = String(error?.message ?? error).slice(0, 180);
      return [];
    }
  };

  for (const program of programs) {
    const rule = quarantineFor(program, policy);
    if (!trackingUrlAllowed(program.TrackingLink, policy, rule)) continue;
    rows.push({ ...common(program), id: `program-${program.CampaignId}`, title: program.CampaignName,
      description: program.CampaignDescription || `Partnerprogramm von ${program.AdvertiserName}.`,
      url: program.AdvertiserUrl || program.CampaignUrl || program.TrackingLink, urlTracking: program.TrackingLink,
      category: "sonstiges", type: "promotion" });
  }

  const eligibleDealPrograms=programs.filter(program=>trackingUrlAllowed(program.TrackingLink,policy,quarantineFor(program,policy)));
  const rotationStart=eligibleDealPrograms.length ? (Math.floor(Date.now()/21600000)*MAX_DEAL_CAMPAIGNS)%eligibleDealPrograms.length : 0;
  const dealBatch=[...eligibleDealPrograms.slice(rotationStart),...eligibleDealPrograms.slice(0,rotationStart)].slice(0,MAX_DEAL_CAMPAIGNS);
  audit.dealBatch={totalEligible:eligibleDealPrograms.length,processed:dealBatch.length,rotationStart};
  const [ads, promotions, products, catalogs, dealGroups] = await Promise.all([
    safePages("ads", `/Mediapartners/${account}/Ads`, ["Ads"]),
    safePages("promotions", `/Mediapartners/${account}/Promotions`, ["Promotions"]),
    safePages("products", `/Mediapartners/${account}/Catalogs/ItemSearch`, ["Items", "CatalogItems", "Records"]),
    safePages("catalogs", `/Mediapartners/${account}/Catalogs`, ["Catalogs"]),
    Promise.all(dealBatch.map(async program => ({
      program,
      deals: await safePages(`deals:${program.CampaignId}`, `/Mediapartners/${account}/Campaigns/${encodeURIComponent(program.CampaignId)}/Deals`, ["Deals"], { State: "ACTIVE" })
    })))
  ]);

  audit.ads=ads.length;
  for (const ad of ads) {
    const program = byCampaign.get(String(ad.CampaignId));
    if (!program || !ad.Name) continue;
    const trackingUrl = await resolveAdTrackingLink(ad, program, api, policy);
    if (!trackingUrl) continue;
    bump(program, "ads");
    rows.push({ ...common(program, ad), id: `ad-${ad.Id}`, title: ad.Name, description: ad.Description,
      url: ad.LandingPageUrl || program.AdvertiserUrl || trackingUrl, urlTracking: trackingUrl,
      type: String(ad.Type).toUpperCase() === "COUPON" ? "voucher" : "promotion",
      voucher: ad.DealDefaultPromoCode ? { code: ad.DealDefaultPromoCode } : undefined });
  }

  audit.promotions=promotions.length;
  for (const promotion of promotions) {
    const program = byAdvertiser.get(String(promotion.AdvertiserId));
    const trackingUrl = promotion.TrackingLink || program?.TrackingLink;
    if (!program || !promotion.PromotionTitle || !trackingUrlAllowed(trackingUrl, policy, quarantineFor(program, policy))) continue;
    bump(program, "promotions");
    const [startDate, endDate] = String(promotion.PromotionEffectiveDates ?? "").split("/");
    rows.push({ ...common(program, promotion), id: `promotion-${promotion.PromotionIds}`, title: promotion.PromotionTitle,
      description: promotion.PromotionDescription, terms: promotion.Terms,
      url: promotion.LandingPageUrl || program.AdvertiserUrl || trackingUrl, urlTracking: trackingUrl,
      startDate: cleanDate(startDate), endDate: cleanDate(endDate), type: promotion.GenericRedemptionCode ? "voucher" : "promotion",
      voucher: promotion.GenericRedemptionCode ? { code: promotion.GenericRedemptionCode } : undefined });
  }

  for (const { program, deals } of dealGroups) {
    audit.deals+=deals.length;
    for (const deal of deals) {
      if (String(deal.State).toUpperCase() !== "ACTIVE" || !deal.Name) continue;
      bump(program, "deals");
      rows.push({ ...common(program), id: `deal-${program.CampaignId}-${deal.Id}`, title: deal.Name, description: deal.Description,
        terms: deal.OfferInstructions, url: program.AdvertiserUrl || program.TrackingLink, urlTracking: program.TrackingLink,
        startDate: cleanDate(deal.StartDate), endDate: cleanDate(deal.EndDate), type: deal.DefaultPromoCode ? "voucher" : "promotion",
        voucher: deal.DefaultPromoCode ? { code: deal.DefaultPromoCode } : undefined });
    }
  }

  audit.catalogs=catalogs.length;
  // The ItemSearch API may identify items solely by CatalogId rather than by
  // advertiser/campaign. Resolve only catalogs owned by actually joined campaigns.
  const programsByCatalog=new Map(catalogs
    .filter(catalog=>!catalog.Status || String(catalog.Status).toUpperCase()==="ACTIVE")
    .map(catalog=>[String(catalog.Id ?? catalog.CatalogId),
      byCampaign.get(String(catalog.CampaignId)) || byAdvertiser.get(String(catalog.AdvertiserId))])
    .filter(([id,program])=>id!=="undefined" && Boolean(program)));
  audit.products=products.length;
  audit.productDiagnostics={
    fields:products[0]&&typeof products[0]==="object"?Object.keys(products[0]).slice(0,35):[],
    missingApprovedProgram:0,matchedViaCatalog:0,missingTrackingLink:0,missingName:0,outOfStock:0,accepted:0
  };
  for (const product of products) {
    const directProgram=byCampaign.get(String(product.CampaignId)) ||
      byAdvertiser.get(String(product.AdvertiserId ?? product.AdvertiserID));
    const program=directProgram || programsByCatalog.get(String(product.CatalogId));
    if(program && !directProgram)audit.productDiagnostics.matchedViaCatalog+=1;
    const trackingUrl = product.TrackingLink || product.TrackingURL || product.UrlTracking;
    if(!program){audit.productDiagnostics.missingApprovedProgram+=1;continue;}
    if(!trackingUrlAllowed(trackingUrl,policy,quarantineFor(program,policy))){audit.productDiagnostics.missingTrackingLink+=1;continue;}
    if(!product.Name){audit.productDiagnostics.missingName+=1;continue;}
    if(String(product.StockAvailability).toLowerCase()==="outofstock"){audit.productDiagnostics.outOfStock+=1;continue;}
    audit.productDiagnostics.accepted+=1;
    bump(program, "products");
    rows.push({ ...common(program), id: `product-${product.CatalogId}-${product.CatalogItemId}`, title: product.Name,
      description: product.Description, url: product.Url || trackingUrl, urlTracking: trackingUrl, type: "promotion",
      imageUrl: product.ImageUrl || product.ImageURL || product.ImageUri,
      additionalImageUrls: list(product.AdditionalImageUrls?.ImageUrl ?? product.AdditionalImageUrls),
      imageAlt: product.Name,
      imageSource: "Impact Catalog API",
      imageRightsNote: "Vom freigegebenen Advertiser im Impact-Produktkatalog bereitgestellt.",
      mediaType: "image",
      currentPrice: product.CurrentPrice ?? product.Price ?? product.SalePrice,
      previousPrice: product.OriginalPrice ?? product.RetailPrice ?? product.MSRP,
      currency: product.Currency || product.CurrencyCode,
      productId: product.Gtin ?? product.GTIN ?? product.Ean ?? product.EAN ?? product.Mpn ?? product.CatalogItemId });
  }

  for(const [key,pathname,names] of [["stores",`/Mediapartners/${account}/Stores`,["Stores"]]]){
    try{audit[key]=(await api.pages(pathname,names)).length;}catch{audit[key]="unavailable";}
  }
  audit.programSignals=[...programSignals.values()].sort((a,b)=>(b.products+b.promotions+b.deals+b.ads)-(a.products+a.promotions+a.deals+a.ads)||String(a.name).localeCompare(String(b.name),"de"));
  Object.defineProperty(rows,"audit",{value:audit,enumerable:false});
  return rows;
}

export { VERSION as IMPACT_API_VERSION };
