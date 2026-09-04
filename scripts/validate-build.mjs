import fs from "node:fs";
import path from "node:path";

const required = ["index.html","impressum.html","datenschutz.html","affiliate.html","status.html","sitemap.xml","robots.txt","styles.css","app.js","og.png"];
const errors = [];
for (const file of required) if (!fs.existsSync(path.join("dist",file))) errors.push(`Fehlt: ${file}`);
const htmlFiles = [];
const siteUrl = new URL(process.env.SITE_URL || "https://example.github.io/angebotslotse");
function walk(dir) { for (const entry of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,entry.name); if(entry.isDirectory()) walk(p); else if(p.endsWith(".html")) htmlFiles.push(p); } }
walk("dist");
for (const file of htmlFiles) {
  const html = fs.readFileSync(file,"utf8");
  if (!html.includes('<meta name="viewport"')) errors.push(`Viewport fehlt: ${file}`);
  if (!html.includes('<link rel="canonical"')) errors.push(`Canonical fehlt: ${file}`);
  if (!html.includes('<meta property="og:title"') || !html.includes('<meta name="twitter:title"')) errors.push(`Social-Metadaten fehlen: ${file}`);
  const isOfferDetail = file.includes(`${path.sep}angebote${path.sep}`);
  if (isOfferDetail && (html.includes('<meta property="og:image"') || html.includes('<meta name="twitter:image"'))) errors.push(`Unpassendes allgemeines Social-Bild: ${file}`);
  if (/\[(?:E-MAIL|VOLLSTÄNDIG|JOEL:)/i.test(html)) errors.push(`Rechts-Platzhalter: ${file}`);
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:mailto:|#)/.test(href)) continue;
    let target;
    try {
      const url = new URL(href, siteUrl);
      if (url.origin !== siteUrl.origin || !url.pathname.startsWith(siteUrl.pathname)) continue;
      target = url.pathname.slice(siteUrl.pathname.replace(/\/$/, "").length).replace(/^\//, "") || "index.html";
    } catch { errors.push(`Ungültiger Link in ${file}`); continue; }
    if (!fs.existsSync(path.join("dist",target))) errors.push(`Toter interner Link in ${file}: ${href}`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Build validiert: ${htmlFiles.length} HTML-Seiten und alle Pflichtseiten vorhanden.`);
