import fs from "node:fs";
import path from "node:path";

const dist = "dist";
const reportDir = "report";
const base = new URL((process.env.SITE_URL || "https://example.github.io/angebotslotse").replace(/\/$/, "") + "/");
const errors = [];
const warnings = [];
const pages = [];

const decode = value => String(value ?? "")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith(".html")) inspect(target);
  }
}

function attr(html, selectorPattern, attribute = "content") {
  const tag = html.match(selectorPattern)?.[0] || "";
  const match = tag.match(new RegExp(attribute + '=([\\x22\\x27])(.*?)\\1', "i"));
  return decode(match?.[2] || "");
}

function inspect(file) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(dist, file).split(path.sep).join("/");
  const publicPath = relative === "index.html" ? "" : relative.endsWith("/index.html") ? relative.slice(0, -"index.html".length) : relative;
  const pageUrl = new URL(publicPath, base).href;
  const title = decode(html.match(/<title>(.*?)<\/title>/is)?.[1] || "").trim();
  const description = attr(html, /<meta\b[^>]*name=["']description["'][^>]*>/i);
  const robots = attr(html, /<meta\b[^>]*name=["']robots["'][^>]*>/i);
  const canonical = attr(html, /<link\b[^>]*rel=["']canonical["'][^>]*>/i, "href");
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const indexable = !/\bnoindex\b/i.test(robots);
  const selfCanonical = canonical === pageUrl;
  const schemas = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  if (!title) errors.push({ type: "missing-title", page: relative });
  if (!description) errors.push({ type: "missing-description", page: relative });
  if (!canonical) errors.push({ type: "missing-canonical", page: relative });
  if (indexable && selfCanonical && h1Count !== 1) errors.push({ type: "invalid-h1-count", page: relative, value: h1Count });

  for (const schema of schemas) {
    try { JSON.parse(schema[1]); }
    catch { errors.push({ type: "invalid-jsonld", page: relative }); }
  }

  if (indexable && selfCanonical) {
    if (title.length < 20 || title.length > 75) warnings.push({ type: "title-length", page: relative, value: title.length });
    if (description.length < 70 || description.length > 180) warnings.push({ type: "description-length", page: relative, value: description.length });
  }

  if (relative.startsWith("angebote/")) {
    if (!html.includes('class="deal-check"')) errors.push({ type: "offer-missing-deal-check", page: relative });
    if (!html.includes('rel="sponsored noopener"')) errors.push({ type: "offer-missing-sponsored-link", page: relative });
    if (!schemas.length) errors.push({ type: "offer-missing-jsonld", page: relative });
  }

  pages.push({ relative, pageUrl, title, description, robots, canonical, h1Count, indexable, selfCanonical, schemaCount: schemas.length });
}

walk(dist);

const sitemapPath = path.join(dist, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) errors.push({ type: "missing-sitemap", page: "sitemap.xml" });
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1])));

for (const page of pages) {
  if (page.indexable && page.selfCanonical && page.relative !== "404.html" && !sitemapUrls.has(page.pageUrl)) {
    errors.push({ type: "indexable-page-missing-from-sitemap", page: page.relative });
  }
  if (!page.indexable && sitemapUrls.has(page.pageUrl)) {
    errors.push({ type: "noindex-page-in-sitemap", page: page.relative });
  }
}

const canonicalOwners = new Map();
for (const page of pages.filter(page => page.indexable && page.selfCanonical)) {
  const existing = canonicalOwners.get(page.canonical);
  if (existing) errors.push({ type: "duplicate-self-canonical", page: page.relative, other: existing });
  else canonicalOwners.set(page.canonical, page.relative);
}

const titleOwners = new Map();
for (const page of pages.filter(page => page.indexable && page.selfCanonical)) {
  if (!page.title) continue;
  const existing = titleOwners.get(page.title);
  if (existing) warnings.push({ type: "duplicate-title", page: page.relative, other: existing });
  else titleOwners.set(page.title, page.relative);
}

const report = {
  generatedAt: new Date().toISOString(),
  siteUrl: base.href.replace(/\/$/, ""),
  summary: {
    htmlPages: pages.length,
    indexableSelfCanonical: pages.filter(page => page.indexable && page.selfCanonical).length,
    canonicalizedDuplicates: pages.filter(page => page.indexable && !page.selfCanonical).length,
    noindexPages: pages.filter(page => !page.indexable).length,
    sitemapUrls: sitemapUrls.size,
    pagesWithStructuredData: pages.filter(page => page.schemaCount > 0).length,
    errors: errors.length,
    warnings: warnings.length
  },
  errors,
  warnings
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "seo-report.json"), JSON.stringify(report, null, 2) + "\n");

if (errors.length) {
  console.error(`SEO-Audit fehlgeschlagen: ${errors.length} Fehler, ${warnings.length} Hinweise.`);
  for (const error of errors.slice(0, 25)) console.error(`- ${error.type}: ${error.page}`);
  process.exit(1);
}
console.log(`SEO-Audit bestanden: ${report.summary.indexableSelfCanonical} indexierbare Hauptseiten, ${report.summary.sitemapUrls} Sitemap-URLs, ${warnings.length} Hinweise.`);
