const API = "https://services.daisycon.com";
const MAX_PRODUCT_SCAN = 250;

const rowsOf = payload => Array.isArray(payload)
  ? payload
  : payload?.results ?? payload?.items ?? payload?.products ?? payload?.data ?? [];

const number = value => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const attribute = (product, wanted) => {
  const attrs = product?.attributes;
  if (!attrs) return undefined;
  if (Array.isArray(attrs)) {
    const row = attrs.find(item => String(item?.name ?? item?.key ?? "").toLowerCase() === wanted.toLowerCase());
    const value = row?.value ?? row?.values;
    return Array.isArray(value) ? value[0] : value;
  }
  const key = Object.keys(attrs).find(name => name.toLowerCase() === wanted.toLowerCase());
  const value = key ? attrs[key] : undefined;
  return Array.isArray(value) ? value[0] : value;
};

const productOffer = (product, offer) => {
  const title = offer?.title || product?.title;
  const tracking = offer?.link;
  if (!title || !tracking) return null;
  return {
    id: String(offer.id ?? `${product.id}-${offer.program_id ?? "offer"}`),
    title,
    description: offer.description || product.description || "",
    url: tracking,
    urlTracking: tracking,
    advertiserName: offer.program_name || "Daisycon",
    advertiserId: offer.program_id,
    source: "daisycon",
    type: "promotion",
    imageUrl: offer.image || product.image,
    imageAlt: title,
    imageSource: "Daisycon Product Feed API",
    imageRightsNote: "Vom Advertiser über den offiziellen Daisycon-Produktfeed bereitgestellt.",
    currentPrice: number(offer.price),
    currency: offer.currency_code || product.currency_code || "EUR",
    productId: attribute(product, "gtin") || attribute(product, "ean") || attribute(product, "sku") || product.id,
    gtin: attribute(product, "gtin"),
    ean: attribute(product, "ean"),
    sku: attribute(product, "sku"),
    mpn: attribute(product, "mpn"),
    brand: attribute(product, "brand") || attribute(product, "manufacturer"),
    availability: product.in_stock === false ? "out_of_stock" : "in_stock",
    regions: { list: [{ countryCode: "DE" }] }
  };
};

const requestJson = async (url, accessToken, fetchImpl, label) => {
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  if (response.status === 204) return [];
  if (!response.ok) throw new Error(`Daisycon API ${label}: HTTP ${response.status}`);
  return rowsOf(await response.json());
};

export async function fetchDaisyconOffers({
  publisherId,
  accessToken,
  maxProducts = 100,
  fetchImpl = fetch
}) {
  if (!publisherId || !accessToken) return [];
  const scanLimit = Math.min(MAX_PRODUCT_SCAN, Math.max(1, Number(maxProducts) || 100));
  const products = [];

  for (let page = 1; products.length < scanLimit; page += 1) {
    const per = Math.min(100, scanLimit - products.length);
    const url = new URL(`${API}/publishers/${encodeURIComponent(publisherId)}/material/product-feeds/products`);
    url.searchParams.set("language_code", "de");
    url.searchParams.set("page", String(page));
    url.searchParams.set("per", String(per));
    const batch = await requestJson(url, accessToken, fetchImpl, "products");
    products.push(...batch.filter(product => product?.id && product?.in_stock !== false && Number(product?.offer_count ?? 1) > 0));
    if (batch.length < per) break;
  }

  const rows = [];
  for (const product of products.slice(0, scanLimit)) {
    const url = new URL(`${API}/publishers/${encodeURIComponent(publisherId)}/material/product-feeds/products/${encodeURIComponent(product.id)}/offers`);
    url.searchParams.set("language_code", "de");
    url.searchParams.set("page", "1");
    url.searchParams.set("per", "5");
    const offers = await requestJson(url, accessToken, fetchImpl, "product offers");
    rows.push(...offers.map(offer => productOffer(product, offer)).filter(Boolean));
  }

  Object.defineProperty(rows, "audit", {
    value: {
      api: "publisher-product-feeds",
      productsScanned: Math.min(products.length, scanLimit),
      offers: rows.length,
      maxProductScan: scanLimit
    },
    enumerable: false
  });
  return rows;
}

export async function fetchDaisyconPrograms({ publisherId, accessToken, fetchImpl = fetch }) {
  if (!publisherId || !accessToken) return [];
  const url = new URL(`${API}/publishers/${encodeURIComponent(publisherId)}/programs`);
  url.searchParams.set("page", "1");
  url.searchParams.set("per", "100");
  return requestJson(url, accessToken, fetchImpl, "programs");
}

const requestPayload = async (url, accessToken, fetchImpl, label) => {
  const response = await fetchImpl(url, {
    headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" }
  });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error("Daisycon API " + label + ": HTTP " + response.status);
  return response.json();
};

export async function fetchDaisyconMedia({ publisherId, accessToken, fetchImpl = fetch }) {
  if (!publisherId || !accessToken) return [];
  const url = new URL(API + "/publishers/" + encodeURIComponent(publisherId) + "/media");
  url.searchParams.set("page", "1");
  url.searchParams.set("per", "100");
  const payload = await requestPayload(url, accessToken, fetchImpl, "media");
  return rowsOf(payload);
}

export async function fetchDaisyconProgramReview({
  publisherId,
  accessToken,
  programId,
  mediaId,
  fetchImpl = fetch
}) {
  if (!publisherId || !accessToken || !programId) return null;
  const base = API + "/publishers/" + encodeURIComponent(publisherId) + "/programs/" + encodeURIComponent(programId);
  const subscriptionsUrl = new URL(base + "/subscriptions");
  subscriptionsUrl.searchParams.set("page", "1");
  subscriptionsUrl.searchParams.set("per", "100");
  const termsUrl = new URL(base + "/agreementterms");
  const scoreUrl = new URL(base + "/score");
  const commissionsUrl = new URL(base + "/commissions");
  const accessRulesUrl = new URL(base + "/access-rules");
  const [subscriptionsPayload, agreementTerms, score, commissionsPayload, accessRules] = await Promise.all([
    requestPayload(subscriptionsUrl, accessToken, fetchImpl, "program subscriptions"),
    requestPayload(termsUrl, accessToken, fetchImpl, "program agreement terms"),
    requestPayload(scoreUrl, accessToken, fetchImpl, "program score").catch(() => null),
    requestPayload(commissionsUrl, accessToken, fetchImpl, "program commissions").catch(() => []),
    requestPayload(accessRulesUrl, accessToken, fetchImpl, "program access rules").catch(() => null)
  ]);
  const subscriptions = rowsOf(subscriptionsPayload);
  const commissions = rowsOf(commissionsPayload);
  let questionnaires = [];
  if (mediaId) {
    const questionnairesUrl = new URL(API + "/publishers/" + encodeURIComponent(publisherId) + "/media/" + encodeURIComponent(mediaId) + "/questionnaires");
    questionnairesUrl.searchParams.set("page", "1");
    questionnairesUrl.searchParams.set("per", "100");
    const payload = await requestPayload(questionnairesUrl, accessToken, fetchImpl, "media questionnaires");
    questionnaires = rowsOf(payload).filter(row => {
      const related = row?.program_id ?? row?.programId ?? row?.program?.id;
      return related == null || String(related) === String(programId);
    });
  }
  const subscription = subscriptions.find(row => {
    const rowMediaId = row?.media_id ?? row?.mediaId ?? row?.media?.id;
    return mediaId == null || rowMediaId == null || String(rowMediaId) === String(mediaId);
  }) ?? subscriptions[0] ?? null;
  const relationship = String(
    subscription?.status ??
    subscription?.subscription_status ??
    subscription?.subscriptionStatus ??
    "not-subscribed"
  ).toLowerCase();
  const agreementTermsPresent = Boolean(
    agreementTerms &&
    (Array.isArray(agreementTerms) ? agreementTerms.length : Object.keys(agreementTerms).length)
  );
  return {
    programId,
    mediaId: mediaId ?? null,
    relationship,
    subscriptions: subscriptions.length,
    agreementTermsPresent,
    questionnaires: questionnaires.length,
    score: score ?? null,
    commissions: commissions.length,
    accessRulesPresent: Boolean(accessRules && (Array.isArray(accessRules) ? accessRules.length : Object.keys(accessRules).length)),
    reviewRequired: agreementTermsPresent || questionnaires.length > 0,
    automaticSubmissionAllowed: false
  };
}
