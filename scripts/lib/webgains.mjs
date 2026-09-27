import crypto from "node:crypto";

const PLATFORM_API = "https://platform-api.webgains.com";
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


const apiRows = payload => Array.isArray(payload)
  ? payload
  : payload?.data ?? payload?.results ?? payload?.items ?? payload?.program_memberships ?? payload?.programMemberships ?? [];

const webgainsRequest = async ({ path, accessToken, fetchImpl = fetch, method = "GET", body }) => {
  const response = await fetchImpl(new URL(path, PLATFORM_API), {
    method,
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json, application/problem+json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error("Webgains Platform API " + method + " " + path + ": HTTP " + response.status);
  return response.json();
};

export async function fetchWebgainsProgramMemberships({
  publisherId,
  accessToken,
  page = 1,
  size = 100,
  fetchImpl = fetch
}) {
  if (!publisherId || !accessToken) return [];
  const url = new URL(PLATFORM_API + "/publishers/" + encodeURIComponent(publisherId) + "/program_memberships");
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(Math.min(100, Math.max(1, Number(size) || 100))));
  const payload = await webgainsRequest({
    path: url.pathname + url.search,
    accessToken,
    fetchImpl
  });
  return apiRows(payload);
}

export async function fetchWebgainsProgramTerms({
  programId,
  accessToken,
  fetchImpl = fetch
}) {
  if (!programId || !accessToken) return null;
  return webgainsRequest({
    path: "/merchants/programs/" + encodeURIComponent(programId) + "/terms_and_conditions",
    accessToken,
    fetchImpl
  });
}

const stableJson = value => JSON.stringify(value, (_, item) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  return Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]]));
});

export async function fetchWebgainsProgramReview({
  publisherId,
  accessToken,
  membership,
  fetchImpl = fetch
}) {
  if (!publisherId || !accessToken || !membership) return null;
  const program = membership.program && typeof membership.program === "object" ? membership.program : {};
  const campaign = membership.campaign && typeof membership.campaign === "object" ? membership.campaign : {};
  const programId = pick(membership, ["program_id","programId"]) ?? program.id;
  const campaignId = pick(membership, ["campaign_id","campaignId"]) ?? campaign.id;
  if (!programId) return null;
  const terms = await fetchWebgainsProgramTerms({ programId, accessToken, fetchImpl });
  const termsDigest = crypto.createHash("sha256").update(stableJson(terms ?? null)).digest("hex");
  const statusValue = pick(membership, [
    "membership_status_name","membershipStatusName","status_name","statusName",
    "membership_status","membershipStatus","status"
  ]);
  const status = typeof statusValue === "string"
    ? statusValue.trim().toLowerCase()
    : (statusValue == null ? "unknown" : `code:${statusValue}`);
  const joined = /joined|active|approved|accepted/.test(status);
  const explicitOpen = /not.?joined|available|open|new|invitable/.test(status);
  return {
    publisherId,
    programId,
    campaignId: campaignId ?? null,
    status,
    joined,
    applicationPossible: explicitOpen && !joined && Boolean(campaignId),
    termsPresent: terms !== null && (typeof terms !== "object" || Object.keys(terms).length > 0),
    termsDigest,
    terms,
    humanApprovalRequired: true,
    automaticSubmissionAllowed: false,
    submissionReady: false,
    submissionMode: "dashboard-review-required",
    note: typeof statusValue === "number"
      ? "Numerischen Membership-Status nicht automatisch interpretiert."
      : "Programmdaten und Terms können geprüft werden; API-Join bleibt deaktiviert."
  };
}

export async function createWebgainsProgramMembership({
  publisherId,
  accessToken,
  campaignId,
  programId,
  review,
  confirmedTermsDigest,
  confirmedReview = false
}) {
  if (!publisherId || !accessToken || !campaignId || !programId) {
    throw new Error("Webgains membership requires publisherId, accessToken, campaignId and programId");
  }
  if (!confirmedReview) throw new Error("Webgains membership blocked: explicit human review confirmation required");
  if (!review || String(review.programId) !== String(programId) || String(review.campaignId) !== String(campaignId)) {
    throw new Error("Webgains membership blocked: matching program review required");
  }
  if (!confirmedTermsDigest || confirmedTermsDigest !== review.termsDigest) {
    throw new Error("Webgains membership blocked: reviewed terms digest confirmation required");
  }
  throw new Error("Webgains membership submission disabled: exact request schema not verified; complete the reviewed join in the Webgains dashboard.");
}
