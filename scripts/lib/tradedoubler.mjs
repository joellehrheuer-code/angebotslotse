const API = "https://api.tradedoubler.com/1.0";
const asUrls = value => String(value ?? "").split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
const pick = (row, keys) => keys.map(key => row?.[key]).find(value => value !== undefined && value !== null && value !== "");

const price = value => {
  const raw = value && typeof value === "object" ? (value.value ?? value.amount) : value;
  const n = Number(String(raw ?? "").replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const imageUrl = row => {
  const value = pick(row, ["productImage","imageURL","imageUrl","image_url","image"]);
  return value && typeof value === "object" ? value.url : value;
};

const currencyOf = row => {
  const value = row?.price;
  return (value && typeof value === "object" ? value.currency : null)
    ?? pick(row, ["currency","currencyCode","currencyISOCode"])
    ?? "EUR";
};

const identifiers = row => row?.identifiers && typeof row.identifiers === "object" ? row.identifiers : {};
const categoryName = row => {
  const first = Array.isArray(row?.categories) ? row.categories[0] : row?.categories;
  return first?.tdCategoryName ?? first?.name ?? pick(row, ["category","productCategory"]);
};

function mapProduct(row, index) {
  const ids = identifiers(row);
  const title = pick(row, ["name","productName","title"]);
  const tracked = pick(row, ["productUrl","productURL","trackingUrl","trackingURL","affiliateUrl"]);
  const destination = pick(row, ["sourceProductUrl","source_product_url","productUrl","productURL"]);
  if (!title || !tracked) return null;
  return {
    id: String(pick(row, ["id","productId","productID","sourceProductId","sku"]) ?? index),
    title,
    description: pick(row, ["description","shortDescription","promoText"]) ?? "",
    url: destination || tracked,
    urlTracking: tracked,
    advertiserName: pick(row, ["programName","merchantName","advertiserName"]) ?? "Tradedoubler",
    advertiserId: pick(row, ["programId","merchantId","advertiserId"]),
    source: "tradedoubler",
    type: "promotion",
    imageUrl: imageUrl(row),
    imageAlt: title,
    imageSource: "Tradedoubler Products API",
    imageRightsNote: "Vom Advertiser über die offizielle Tradedoubler Products API bereitgestellt.",
    currentPrice: price(row.price ?? row.salePrice ?? row.sale_price),
    previousPrice: price(pick(row, ["oldPrice","previousPrice","regularPrice","originalPrice"])),
    currency: currencyOf(row),
    category: categoryName(row),
    brand: pick(row, ["brand","manufacturer"]),
    gtin: pick(row, ["gtin"]) ?? ids.gtin,
    ean: pick(row, ["ean"]) ?? ids.ean,
    mpn: pick(row, ["mpn"]) ?? ids.mpn,
    sku: pick(row, ["sku"]) ?? ids.sku ?? row.sourceProductId,
    productId: pick(row, ["ean","gtin","mpn","sku","sourceProductId","id"]) ?? ids.ean ?? ids.gtin ?? ids.mpn ?? ids.sku,
    availability: pick(row, ["availability","stock","inStock"]),
    regions: { list: [{ countryCode: "DE" }] }
  };
}

const productRows = payload => {
  const direct = Array.isArray(payload) ? payload : payload?.products ?? payload?.items ?? payload?.data ?? payload?.result?.products ?? [];
  const rows = [];
  for (const product of direct) {
    if (Array.isArray(product?.offers) && product.offers.length) {
      for (const offer of product.offers) rows.push({ ...product, ...offer, identifiers: product.identifiers ?? offer.identifiers });
    } else rows.push(product);
  }
  return rows;
};

const feedRows = payload => Array.isArray(payload) ? payload : payload?.feeds ?? payload?.productFeeds ?? payload?.data ?? [];

async function getJson(url, fetchImpl, label) {
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Tradedoubler ${label}: HTTP ${response.status}`);
  return response.json();
}

export async function fetchTradedoublerFeedInventory({ token, fetchImpl = fetch }) {
  if (!token) return [];
  const url = new URL(API + "/productFeeds.json");
  url.searchParams.set("token", token);
  const payload = await getJson(url, fetchImpl, "productFeeds");
  return feedRows(payload).filter(feed => feed?.active !== false && feed?.visible !== false);
}

async function fetchFromToken({ token, maxProducts, maxFeeds, fetchImpl }) {
  const feeds = await fetchTradedoublerFeedInventory({ token, fetchImpl });
  const preferred = [...feeds].sort((a,b) => {
    const deA = String(a.languageISOCode ?? "").toLowerCase() === "de" ? 1 : 0;
    const deB = String(b.languageISOCode ?? "").toLowerCase() === "de" ? 1 : 0;
    const eurA = String(a.currencyISOCode ?? "").toUpperCase() === "EUR" ? 1 : 0;
    const eurB = String(b.currencyISOCode ?? "").toUpperCase() === "EUR" ? 1 : 0;
    return (deB + eurB) - (deA + eurA) || Number(b.numberOfProducts ?? 0) - Number(a.numberOfProducts ?? 0);
  }).slice(0, Math.max(1, maxFeeds));

  const rows = [];
  for (const feed of preferred) {
    const feedId = feed.feedId ?? feed.id;
    if (!feedId) continue;
    const remaining = Math.max(1, maxProducts - rows.length);
    const limit = Math.min(100, remaining);
    const url = new URL(API + "/products.json;fid=" + encodeURIComponent(feedId) + ";limit=" + limit + ";dateOutputFormat=iso8601");
    url.searchParams.set("token", token);
    const payload = await getJson(url, fetchImpl, "products");
    rows.push(...productRows(payload).map((row,index) => mapProduct(row,index)).filter(Boolean));
    if (rows.length >= maxProducts) break;
  }
  const limited = rows.slice(0,maxProducts);
  Object.defineProperty(limited,"audit",{value:{mode:"products-api",feedsAvailable:feeds.length,feedsScanned:preferred.length,products:limited.length},enumerable:false});
  return limited;
}

async function fetchFromUrls({ feedUrls, maxProducts, fetchImpl }) {
  const urls = asUrls(feedUrls);
  if (!urls.length) return [];
  const rows = [];
  for (const rawUrl of urls) {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith("tradedoubler.com")) throw new Error("Tradedoubler feed URL must use official HTTPS host");
    const payload = await getJson(url, fetchImpl, "product feed");
    rows.push(...productRows(payload).map((row,index) => mapProduct(row,index)).filter(Boolean));
    if (rows.length >= maxProducts) break;
  }
  const limited = rows.slice(0,maxProducts);
  Object.defineProperty(limited,"audit",{value:{feeds:urls.length,products:limited.length,mode:"official-json-feed"},enumerable:false});
  return limited;
}

export async function fetchTradedoublerOffers({ token, feedUrls, maxProducts = 1000, maxFeeds = 8, fetchImpl = fetch }) {
  if (token) return fetchFromToken({ token, maxProducts, maxFeeds, fetchImpl });
  return fetchFromUrls({ feedUrls, maxProducts, fetchImpl });
}

const validHttps = value => {
  try { const url = new URL(String(value ?? "")); return url.protocol === "https:" ? url.href : null; }
  catch { return null; }
};

const dateValue = value => {
  if (value === null || value === undefined || value === "") return undefined;
  if (/^\d+$/.test(String(value))) {
    const date = new Date(Number(value));
    return Number.isFinite(date.valueOf()) ? date.toISOString() : undefined;
  }
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : undefined;
};

export async function fetchTradedoublerVouchers({ token, maxVouchers = 1000, fetchImpl = fetch }) {
  if (!token) return [];
  const rows = [];
  const pageSize = Math.min(250, Math.max(1, Number(maxVouchers) || 1000));
  for (let page = 0; rows.length < maxVouchers; page += 1) {
    const url = new URL(API + "/vouchers.json;dateOutputFormat=iso8601;languageId=de;pageSize=" + pageSize + ";page=" + page);
    url.searchParams.set("token", token);
    const payload = await getJson(url, fetchImpl, "vouchers");
    const batch = Array.isArray(payload) ? payload : payload?.vouchers ?? payload?.data ?? [];
    for (const voucher of batch) {
      const tracking = validHttps(voucher.defaultTrackUri);
      if (!tracking || !voucher.title) continue;
      const code = String(voucher.code ?? "").trim();
      const typeId = Number(voucher.voucherTypeId);
      rows.push({
        id: "voucher-" + String(voucher.id ?? rows.length),
        title: voucher.title,
        description: voucher.description || voucher.shortDescription || "",
        terms: voucher.publisherInformation || "",
        url: validHttps(voucher.landingUrl) || tracking,
        urlTracking: tracking,
        advertiserName: voucher.programName || "Tradedoubler",
        advertiserId: voucher.programId,
        source: "tradedoubler",
        type: code ? "voucher" : "promotion",
        voucher: code ? { code } : undefined,
        startDate: dateValue(voucher.startDate),
        endDate: dateValue(voucher.endDate),
        category: "sonstiges",
        imageUrl: validHttps(voucher.logoPath),
        imageAlt: voucher.programName ? voucher.programName + " Gutschein" : voucher.title,
        imageSource: voucher.logoPath ? "Tradedoubler Vouchers API" : undefined,
        imageRightsNote: voucher.logoPath ? "Vom Advertiser über die offizielle Tradedoubler Vouchers API bereitgestellt." : undefined,
        discountValue: Number(voucher.discountAmount) || undefined,
        discountIsPercentage: voucher.isPercentage === true,
        isExclusiveVoucher: voucher.exclusive === true || voucher.siteSpecific === true,
        regions: { list: [{ countryCode: "DE" }] },
        voucherTypeId: Number.isFinite(typeId) ? typeId : undefined
      });
    }
    if (batch.length < pageSize) break;
  }
  const limited = rows.slice(0,maxVouchers);
  Object.defineProperty(limited,"audit",{value:{mode:"vouchers-api",vouchers:limited.length},enumerable:false});
  return limited;
}
