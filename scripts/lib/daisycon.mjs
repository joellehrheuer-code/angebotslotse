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
