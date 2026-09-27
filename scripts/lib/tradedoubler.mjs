const asUrls = value => String(value ?? "").split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
const payloadRows = payload => Array.isArray(payload) ? payload : payload?.products ?? payload?.product ?? payload?.items ?? payload?.data ?? [];

const pick = (row, keys) => keys.map(key => row?.[key]).find(value => value !== undefined && value !== null && value !== "");
const price = value => {
  const n = Number(String(value ?? "").replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function mapProduct(row, index) {
  const title = pick(row, ["name","productName","title"]);
  const productUrl = pick(row, ["productURL","productUrl","product_url","url"]);
  const trackingUrl = pick(row, ["trackingUrl","trackingURL","affiliateUrl","productURL","productUrl","product_url"]);
  if (!title || !productUrl || !trackingUrl) return null;
  return {
    id: String(pick(row, ["productId","productID","id","sku"]) ?? index),
    title,
    description: pick(row, ["description","shortDescription"]) ?? "",
    url: productUrl,
    urlTracking: trackingUrl,
    advertiserName: pick(row, ["programName","merchantName","advertiserName"]) ?? "Tradedoubler",
    advertiserId: pick(row, ["programId","merchantId","advertiserId"]),
    source: "tradedoubler",
    type: "promotion",
    imageUrl: pick(row, ["imageURL","imageUrl","image_url","image"]),
    imageAlt: title,
    imageSource: "Tradedoubler Product Feed",
    imageRightsNote: "Vom Advertiser über einen offiziellen Tradedoubler-Produktfeed bereitgestellt.",
    currentPrice: price(pick(row, ["price","salePrice","sale_price"])),
    previousPrice: price(pick(row, ["oldPrice","previousPrice","regularPrice","originalPrice"])),
    currency: pick(row, ["currency","currencyCode"]) ?? "EUR",
    category: pick(row, ["category","productCategory"]),
    brand: pick(row, ["brand","manufacturer"]),
    gtin: pick(row, ["gtin"]),
    ean: pick(row, ["ean"]),
    mpn: pick(row, ["mpn"]),
    sku: pick(row, ["sku","productId","productID"]),
    productId: pick(row, ["ean","gtin","mpn","sku","productId","productID"]),
    availability: pick(row, ["availability","stock","inStock"]),
    regions: { list: [{ countryCode: "DE" }] }
  };
}

export async function fetchTradedoublerOffers({ feedUrls, maxProducts = 1000, fetchImpl = fetch }) {
  const urls = asUrls(feedUrls);
  if (!urls.length) return [];
  const rows = [];
  for (const rawUrl of urls) {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith("tradedoubler.com")) throw new Error("Tradedoubler feed URL must use official HTTPS host");
    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Tradedoubler product feed: HTTP ${response.status}`);
    const payload = await response.json();
    rows.push(...payloadRows(payload).map((row,index) => mapProduct(row,index)).filter(Boolean));
    if (rows.length >= maxProducts) break;
  }
  const limited = rows.slice(0,maxProducts);
  Object.defineProperty(limited,"audit",{value:{feeds:urls.length,products:limited.length,mode:"official-json-feed"},enumerable:false});
  return limited;
}
