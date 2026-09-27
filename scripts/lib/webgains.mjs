const asUrls = value => String(value ?? "").split(/[\n,]+/).map(v => v.trim()).filter(Boolean);
const pick = (row, keys) => keys.map(key => row?.[key]).find(value => value !== undefined && value !== null && value !== "");
const price = value => {
  const n = Number(String(value ?? "").replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function parseDelimited(text, delimiter = ",") {
  const records = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === delimiter && !quoted) { row.push(cell); cell = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some(value => value !== "")) records.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell || row.length) { row.push(cell); records.push(row); }
  if (records.length < 2) return [];
  const headers = records[0].map(value => value.trim().replace(/^\uFEFF/, ""));
  return records.slice(1).map(values => Object.fromEntries(headers.map((header,index) => [header, values[index] ?? ""])));
}

function mapProduct(row, index) {
  const title = pick(row, ["title","name","product_name"]);
  const link = pick(row, ["link","product_url","url"]);
  if (!title || !link) return null;
  const sale = price(pick(row, ["sale_price","salePrice"]));
  const regular = price(pick(row, ["price","regular_price","regularPrice"]));
  return {
    id: String(pick(row, ["id","sku","product_id"]) ?? index),
    title,
    description: pick(row, ["description","short_description"]) ?? "",
    url: link,
    urlTracking: link,
    advertiserName: pick(row, ["program_name","merchant_name","advertiser_name"]) ?? "Webgains",
    advertiserId: pick(row, ["program_id","campaign_id","merchant_id"]),
    source: "webgains",
    type: "promotion",
    imageUrl: pick(row, ["image_link","image_url","image"]),
    additionalImageUrls: String(pick(row, ["additional_image_link"]) ?? "").split(",").map(v=>v.trim()).filter(Boolean),
    imageAlt: title,
    imageSource: "Webgains Product Feed",
    imageRightsNote: "Vom Advertiser über einen offiziellen Webgains-Produktfeed bereitgestellt.",
    currentPrice: sale ?? regular,
    previousPrice: sale && regular && regular > sale ? regular : undefined,
    currency: pick(row, ["currency","currency_code"]) ?? "EUR",
    category: pick(row, ["google_product_category","product_type","category"]),
    brand: pick(row, ["brand","manufacturer"]),
    gtin: pick(row, ["gtin"]),
    ean: pick(row, ["ean"]),
    mpn: pick(row, ["mpn"]),
    sku: pick(row, ["id","sku","product_id"]),
    productId: pick(row, ["gtin","ean","mpn","id","sku","product_id"]),
    availability: pick(row, ["availability","stock_status"]),
    regions: { list: [{ countryCode: "DE" }] }
  };
}

async function rowsForResponse(response, url) {
  const type = String(response.headers?.get?.("content-type") ?? "").toLowerCase();
  if (type.includes("json") || url.pathname.endsWith(".json")) {
    const payload = await response.json();
    return Array.isArray(payload) ? payload : payload?.products ?? payload?.items ?? payload?.data ?? [];
  }
  const text = await response.text();
  if (type.includes("xml") || url.pathname.endsWith(".xml") || /^\s*</.test(text)) throw new Error("Webgains XML feed not enabled; export CSV/TSV or JSON");
  const firstLine = text.split(/\r?\n/,1)[0] ?? "";
  const delimiter = url.pathname.endsWith(".tsv") || type.includes("tab-separated")
    ? "\t"
    : (firstLine.split(";").length > firstLine.split(",").length ? ";" : ",");
  return parseDelimited(text, delimiter);
}

export async function fetchWebgainsOffers({ feedUrls, maxProducts = 1000, fetchImpl = fetch }) {
  const urls = asUrls(feedUrls);
  if (!urls.length) return [];
  const rows = [];
  for (const rawUrl of urls) {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !/(^|\.)webgains\.(com|io)$/.test(url.hostname)) throw new Error("Webgains feed URL must use official HTTPS host");
    const response = await fetchImpl(url, { headers: { Accept: "application/json,text/csv,text/tab-separated-values;q=0.9,*/*;q=0.5" } });
    if (!response.ok) throw new Error(`Webgains product feed: HTTP ${response.status}`);
    const batch = await rowsForResponse(response,url);
    rows.push(...batch.map((row,index)=>mapProduct(row,index)).filter(Boolean));
    if (rows.length >= maxProducts) break;
  }
  const limited = rows.slice(0,maxProducts);
  Object.defineProperty(limited,"audit",{value:{feeds:urls.length,products:limited.length,mode:"official-export-feed"},enumerable:false});
  return limited;
}
