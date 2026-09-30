import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { historyFor } from "./lib/price-history.mjs";
import { isPublicationReady, isAwaitingMediaOffer, isPublisherPromotion, refineOfferCategory, isMarketCompatibleTitle, isBlockedAdultOffer, isBlockedNonMerchandiseOffer, isSuppressedAdvertiserOffer } from "./lib/normalize.mjs";
import { selectHomepageOffers } from "./lib/homepage-selection.mjs";
import { sanitizeCreatorVideos } from "./lib/creator-videos.mjs";
import { sanitizeCreatorFeedItems } from "./lib/creator-feed.mjs";

const readJson = async (file, fallback = "[]") => JSON.parse(await fs.readFile(file, "utf8").catch(() => fallback));
const config = await readJson("config.json", "{}");
const storedOffers = await readJson("data/offers.json");
const status = await readJson("data/status.json", "{}");
const creators = await readJson("data/creators.json", '{"enabled":false,"entries":[]}');
const amazonCatalog = await readJson("data/amazon-products.json", '{"items":[]}');
const creatorVideoFeed = await readJson("data/creator-videos.json", '{"videos":[]}');
const creatorFeed = await readJson("data/creator-feed.json", '{"items":[]}');
const partners = await readJson("data/direct-partners.json");
const linkPolicy = await readJson("data/impact-link-policy.json", "{}");
const priceHistory = await readJson("data/price-history.json");
const creatorItems = sanitizeCreatorFeedItems(creatorFeed.items);
const creatorVideos = sanitizeCreatorVideos(creatorVideoFeed.videos);
const base = (process.env.SITE_URL || "https://example.github.io/angebotslotse").replace(/\/$/, "");
const email = process.env.CONTACT_EMAIL || "joellehrheuer@gmail.com";
const legalName = process.env.LEGAL_NAME || "Joel Leroy Lehrheuer";
const legalAddress = process.env.LEGAL_ADDRESS || "Rathausstraße 4, 52072 Aachen, Deutschland";
const analyticsToken = /^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN ?? "") ? process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN : "";
const googleVerification = /^[A-Za-z0-9_-]+$/.test(process.env.GOOGLE_SITE_VERIFICATION ?? "") ? process.env.GOOGLE_SITE_VERIFICATION : "";
const testBuildCacheEnabled = Boolean(process.env.NODE_TEST_CONTEXT);
const testBuildCacheFile = path.join(os.tmpdir(), `angebotslotse-test-build-${crypto.createHash("sha256").update(process.cwd()).digest("hex").slice(0,16)}.json`);
const testBuildOutputMarker = "dist/.test-build-signature";
const buildInputRoots = ["package.json","package-lock.json","config.json","scripts","src","data","public"];
const buildInputSignature = async () => {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify({base,email,legalName,legalAddress,analyticsToken,googleVerification}));
  const visit = async file => {
    const normalized = file.replaceAll("\\","/");
    if (normalized === "public/account-client.js") return;
    const stat = await fs.stat(file).catch(() => null);
    if (!stat) return;
    if (stat.isDirectory()) {
      for (const name of (await fs.readdir(file)).sort()) await visit(path.join(file,name));
      return;
    }
    if (!stat.isFile()) return;
    hash.update(`${normalized}:${stat.size}:${stat.mtimeMs}`);
  };
  for (const root of buildInputRoots) await visit(root);
  return hash.digest("hex");
};
const testBuildSignature = testBuildCacheEnabled ? await buildInputSignature() : null;
if (testBuildCacheEnabled) {
  const cached = await readJson(testBuildCacheFile, "{}");
  const requiredOutputs = ["dist/index.html","dist/build-report.json","dist/sitemap.xml","dist/app.js"];
  const outputsReady = (await Promise.all(requiredOutputs.map(file => fs.stat(file).then(stat => stat.isFile()).catch(() => false)))).every(Boolean);
  const outputSignature = (await fs.readFile(testBuildOutputMarker, "utf8").catch(() => "")).trim();
  if (outputsReady && cached.signature === testBuildSignature && outputSignature === testBuildSignature) {
    console.log("Test-Build unverändert – vorhandenes dist wird wiederverwendet.");
    process.exit(0);
  }
}
const out = "dist";
const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const json = value => JSON.stringify(value).replace(/</g, "\\u003c");
const labels = {"technik":"Technik","gaming":"Gaming","audio-musik":"Audio & Musik","computer":"Computer","zubehoer":"Zubehör","smart-home":"Smart Home","homeoffice":"Homeoffice","haushalt":"Haushalt","garten":"Garten","werkzeug":"Werkzeug","mode":"Mode","sport-fitness":"Sport & Fitness","gesundheit":"Gesundheit & Wellness","beauty":"Beauty & Pflege","auto":"Auto & Mobilität","tierbedarf":"Tierbedarf","freizeit":"Freizeit & Reisen","sonstiges":"Weitere"};
const categories = ["gaming","technik","computer","audio-musik","zubehoer","smart-home","homeoffice","haushalt","garten","werkzeug","mode","sport-fitness","gesundheit","beauty","auto","tierbedarf","freizeit","sonstiges"];
const categoryIcons = {gaming:"GAME",technik:"TECH",computer:"PC","audio-musik":"AUDIO",zubehoer:"GEAR","smart-home":"SMART",homeoffice:"WORK",haushalt:"HOME",garten:"GARDEN",werkzeug:"TOOLS",mode:"STYLE","sport-fitness":"FIT",gesundheit:"WELL",beauty:"BEAUTY",auto:"AUTO",tierbedarf:"PET",freizeit:"TRAVEL",sonstiges:"DEAL"};
const isQuarantined = offer => (linkPolicy.quarantinedAdvertisers ?? []).some(rule =>
  (rule.advertiserId && String(rule.advertiserId) === String(offer.advertiserId)) ||
  (rule.advertiserName && String(rule.advertiserName).toLowerCase() === String(offer.advertiser).toLowerCase()));
const now = new Date();
const offers = storedOffers
  .filter(o => !isQuarantined(o) && !isBlockedAdultOffer(o) && !isBlockedNonMerchandiseOffer(o) && !isSuppressedAdvertiserOffer(o, config) && isMarketCompatibleTitle(o.title, config.marketCountry) && (!o.endDate || new Date(o.endDate) > now) && isPublicationReady(o))
  .map(o => ({...o,category:refineOfferCategory(o,config)}))
  .map(o => Number.isFinite(o.currentPrice) && o.currentPrice > 0 ? o : {...o,currentPrice:null,previousPrice:null});
const hasPrice = o => Number.isFinite(o.currentPrice) && o.currentPrice > 0;
const isDeal = o => Boolean(o.endDate || o.voucherCode || (hasPrice(o) && o.previousPrice > o.currentPrice) || o.source !== "direct");
const currentDeals = offers.filter(isDeal);
const evergreen = offers.filter(o => !isDeal(o));
const creatorByName = new Map(creators.entries.map(item => [item.name.toLowerCase(), item]));
const url = suffix => `${base}${suffix}`;
const money = (value, currency = "EUR") => { const numeric = Number(value); return Number.isFinite(numeric) && numeric > 0 ? new Intl.NumberFormat("de-DE", {style:"currency",currency:currency || "EUR"}).format(numeric) : "Preis beim Anbieter prüfen"; };
const moneyDelta = (value, currency = "EUR") => { const numeric = Number(value); return Number.isFinite(numeric) ? new Intl.NumberFormat("de-DE", {style:"currency",currency:currency || "EUR"}).format(numeric) : "–"; };
const discount = o => hasPrice(o) && o.previousPrice > o.currentPrice ? Math.round((1-o.currentPrice/o.previousPrice)*100) : null;
const comparisonGroups = new Map();
for (const offer of offers) if (offer.productId && hasPrice(offer)) {
  const key = `${offer.productId}:${offer.currency || "EUR"}`;
  comparisonGroups.set(key, [...(comparisonGroups.get(key) || []), offer].sort((a,b)=>a.currentPrice-b.currentPrice));
}
const comparisonFor = offer => comparisonGroups.get(`${offer.productId}:${offer.currency || "EUR"}`)?.filter(row=>row.id!==offer.id) || [];
const coupons = offers.filter(o=>o.voucherCode && (!o.endDate || new Date(o.endDate)>now));
const newOffers = [...offers].sort((a,b)=>String(b.dateAdded||b.updatedAt||"").localeCompare(String(a.dateAdded||a.updatedAt||"")));
const endingSoon = offers.filter(o=>o.endDate).sort((a,b)=>a.endDate.localeCompare(b.endDate));
const topDiscounts = offers.filter(o=>discount(o)).sort((a,b)=>discount(b)-discount(a));
const dropFor = offer => { const rows=historyFor(priceHistory,offer,30,now); return rows.length>1 && rows.at(-1).price < rows.at(-2).price ? rows.at(-2).price-rows.at(-1).price : 0; };
const priceDrops = offers.filter(o=>dropFor(o)>0).sort((a,b)=>dropFor(b)-dropFor(a));
const shopSlug = value => String(value??"shop").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"shop";
const offersByMerchant = new Map();
for (const offer of offers) offersByMerchant.set(offer.advertiser,[...(offersByMerchant.get(offer.advertiser)||[]),offer]);
const shopGroups=[...offersByMerchant.entries()].filter(([,rows])=>rows.length>=3).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],"de"));
const shopPageByName=new Map(shopGroups.map(([name])=>[name,shopSlug(name)]));
const canonicalBrand=value=>{
  const raw=String(value||"").trim();
  if(/^anthbot(?:-de)?$/i.test(raw))return "ANTHBOT";
  if(/^outin(?:\s+de)?$/i.test(raw))return "OutIn";
  return raw;
};
const offersByBrand=new Map();
for(const offer of offers){
  const brand=canonicalBrand(offer.brand);
  if(!brand)continue;
  offersByBrand.set(brand,[...(offersByBrand.get(brand)||[]),offer]);
}
const brandGroups=[...offersByBrand.entries()].filter(([,rows])=>rows.length>=5).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],"de"));
const brandPageByName=new Map(brandGroups.map(([name])=>[name,shopSlug(name)]));
const brandPageFor=o=>brandPageByName.get(canonicalBrand(o.brand));
const uniqueOfferRows=items=>[...new Map((items||[]).filter(Boolean).map(item=>[item.id,item])).values()];
const diversifyOffers=(items,{limit=12,maxPerBrand=1,maxPerMerchant=2,maxPerCategory=3}={})=>{
  const pool=uniqueOfferRows(items),selected=[],selectedIds=new Set(),brandCounts=new Map(),merchantCounts=new Map(),categoryCounts=new Map();
  const brandKey=item=>String(canonicalBrand(item.brand)||item.advertiser||"ohne-marke").toLowerCase();
  const merchantKey=item=>String(item.advertiser||"ohne-shop").toLowerCase();
  const categoryKey=item=>String(item.category||"sonstiges");
  const take=(item,relaxed=false)=>{
    if(!item||selectedIds.has(item.id))return false;
    const b=brandKey(item),m=merchantKey(item),c=categoryKey(item);
    if(!relaxed&&((brandCounts.get(b)||0)>=maxPerBrand||(merchantCounts.get(m)||0)>=maxPerMerchant||(categoryCounts.get(c)||0)>=maxPerCategory))return false;
    selected.push(item);selectedIds.add(item.id);
    brandCounts.set(b,(brandCounts.get(b)||0)+1);merchantCounts.set(m,(merchantCounts.get(m)||0)+1);categoryCounts.set(c,(categoryCounts.get(c)||0)+1);
    return true;
  };
  for(const item of pool){if(selected.length>=limit)break;take(item,false);}
  if(selected.length<limit)for(const item of pool){if(selected.length>=limit)break;take(item,true);}
  return selected;
};

const socialIconByName={instagram:"instagram.png",tiktok:"tiktok.png",youtube:"youtube.png",twitch:"twitch.png",spotify:"spotify.png",snapchat:"snapchat.png",discord:"discord.png"};
const socialNames=["instagram","youtube","twitch","snapchat","spotify","discord","tiktok"];
const headerSocialEntries=socialNames.map(name=>creatorByName.get(name)).filter(Boolean);
const socialNavLinks=headerSocialEntries.map(entry=>[entry.name,entry.url,true]);
const navGroups = [
  ["Angebote", [["Für dich entdeckt","/#aktuelle-deals"],["Neu","/neu.html"],["Endet bald","/endet-bald.html"],["Top Rabatte","/top-rabatte.html"],["Rabattcodes","/rabattcodes/"],["Weitere Kategorien","/kategorien.html"]]],
  ["Entdecken", [["Kategorien","/kategorien.html"],["Shops","/shops.html"],["Marken","/marken.html"],["Merkliste","/merkliste.html"],["Konto & Alarme","/konto.html"],["Partner","/#partner"],["Newsletter","/#newsletter"]]],
  ["Joel / Community", [...socialNavLinks,["Bücher","/buecher.html"],["Merch","/merch.html"]]],
  ["Service & Rechtliches", [["So prüfen wir Deals","/methodik.html"],["Feedback / Kontakt","/kontakt.html"],["Über Angebotslotse","/ueber.html"],["Status","/status.html"],["Affiliate-Hinweis","/affiliate.html"],["Datenschutz","/datenschutz.html"],["Impressum","/impressum.html"]]]
];
const socialHeaderEntries=headerSocialEntries.filter(c=>socialIconByName[c.name.toLowerCase()]);

const nav = `<header class="site-header"><div class="header-row"><a class="brand" href="${url("/")}" aria-label="Angebotslotse Startseite"><img class="brand-logo" src="${url("/favicon.svg")}" alt=""><b>Angebotslotse</b></a><form class="global-search" action="${url("/suche.html")}" role="search"><label class="sr-only" for="global-search">Produkt, Marke, Spiel oder Shop suchen</label><input id="global-search" name="suche" type="search" placeholder="Produkt, Marke, Spiel oder Shop suchen …" autocomplete="off"><button type="submit" aria-label="Suchen">⌕</button></form><div class="header-links"><a href="${url("/#aktuelle-deals")}">Deals</a><a href="${url("/kategorien.html")}">Kategorien</a><a href="${url("/shops.html")}">Shops</a><a href="${url("/marken.html")}">Marken</a><a href="${url("/merkliste.html")}">Merkliste <span data-watch-count hidden></span></a><a href="${url("/konto.html")}">Konto</a><a href="${url("/#projekte")}">Creator</a><a href="${url("/gaming.html")}">Gaming</a><a href="${url("/top-rabatte.html")}">% Angebote</a></div><div class="header-social" aria-label="Joels echte Kanäle">${socialHeaderEntries.map(c=>`<a href="${esc(c.url)}" rel="me noopener" title="${esc(c.name)}" aria-label="${esc(c.name)}"><img src="${url(`/social/${socialIconByName[c.name.toLowerCase()]}`)}" alt="" width="30" height="30" loading="eager"></a>`).join("")}</div><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span><i class="sr-only">Menü öffnen</i></button></div><nav id="main-nav" aria-label="Hauptnavigation"><form class="mobile-nav-search" action="${url("/suche.html")}" role="search"><label class="sr-only" for="mobile-nav-search">Produkt, Marke, Spiel oder Shop suchen</label><input id="mobile-nav-search" name="suche" type="search" placeholder="Produkt, Marke, Spiel oder Shop suchen …" autocomplete="off"><button type="submit">Suchen</button></form><div class="nav-panel">${navGroups.map(([title,links])=>`<section><strong>${title}</strong>${links.map(([name,href,external])=>`<a href="${external?esc(href):url(href)}"${external?' rel="me noopener"':""}>${esc(name)}</a>`).join("")}</section>`).join("")}</div></nav></header>`;
const footer = `<footer><div><a class="brand footer-brand" href="${url("/")}" aria-label="Angebotslotse Startseite"><img class="brand-logo" src="${url("/favicon.svg")}" alt=""><b>Angebotslotse</b></a><p>Echte Angebote aus erlaubten Quellen. Transparent als Werbung gekennzeichnet.</p></div><nav aria-label="Rechtliches"><a href="${url("/methodik.html")}">So prüfen wir Deals</a><a href="${url("/affiliate.html")}">Affiliate-Hinweis</a><a href="${url("/datenschutz.html")}">Datenschutz</a><a href="${url("/impressum.html")}">Impressum</a><a href="${url("/kontakt.html")}">Kontakt</a><a href="${url("/status.html")}">Status</a><button class="footer-report-link" type="button" data-report-open>Problem melden</button></nav></footer>
<button class="report-fab" type="button" data-report-open aria-label="Fehler oder falsches Angebot melden"><span aria-hidden="true">!</span><b>Problem melden</b></button>
<dialog class="report-dialog" data-report-dialog aria-labelledby="report-title">
  <form class="report-form" data-report-form method="dialog">
    <div class="report-head"><div><span class="eyebrow">Hilf uns, besser zu werden</span><h2 id="report-title">Problem melden</h2></div><button class="report-close" type="button" data-report-close aria-label="Meldung schließen">×</button></div>
    <p>Kaputter Link, falscher Preis, fehlendes Bild oder Darstellungsfehler? Wir speichern die betroffene Seite automatisch mit.</p>
    <label>Was stimmt nicht?
      <select name="reportType" required>
        <option value="broken_link">Link funktioniert nicht</option>
        <option value="wrong_price">Preis / Rabatt stimmt nicht</option>
        <option value="missing_image">Bild fehlt / lädt nicht</option>
        <option value="outdated">Angebot ist veraltet</option>
        <option value="ui_bug">Darstellungsfehler</option>
        <option value="other">Etwas anderes</option>
      </select>
    </label>
    <label>Kurze Beschreibung
      <textarea name="message" rows="4" minlength="3" maxlength="2500" placeholder="Was ist passiert?" required></textarea>
    </label>
    <label>E-Mail für Rückfrage <small>(optional)</small>
      <input name="email" type="email" autocomplete="email" inputmode="email" placeholder="deine@email.de">
    </label>
    <input class="hp-field" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="report-actions"><button class="button primary" type="submit">Report senden</button><button class="button" type="button" data-report-close>Abbrechen</button></div>
    <p class="form-status" data-report-status aria-live="polite"></p>
  </form>
</dialog>`;
function page({title,description,body,canonical="/",schema=null,socialImage=true,socialImageUrl=url("/og.png"),socialImageAlt="Angebotslotse – echte Deals klar eingeordnet",indexable=true}) {
  const clipText=(value,max)=>{const clean=String(value||"").replace(/\s+/g," ").trim();if(clean.length<=max)return clean;const slice=clean.slice(0,max-1);const boundary=slice.lastIndexOf(" ");const clipped=(boundary>=Math.floor(max*.68)?slice.slice(0,boundary):slice).replace(/[\s,;:.-]+$/,"");return clipped+"…";};
  const cleanTitle=String(title||"").replace(/\s+/g," ").trim();
  const compactSeoTitle=(value,max=56)=>{const clean=String(value||"").replace(/\s+/g," ").trim();if(clean.length<=max)return clean;const tailBudget=18,headBudget=max-tailBudget-3;let head=clean.slice(0,headBudget);let tail=clean.slice(-tailBudget);const headBoundary=head.lastIndexOf(" ");if(headBoundary>=Math.floor(headBudget*.65))head=head.slice(0,headBoundary);const tailBoundary=tail.indexOf(" ");if(tailBoundary>=0&&tailBoundary<=Math.floor(tailBudget*.35))tail=tail.slice(tailBoundary+1);return `${head.replace(/[\s,;:.-]+$/,"")} … ${tail.replace(/^[\s,;:.-]+/,"")}`;};
  const seoTitle=compactSeoTitle(cleanTitle);
  const rawDescription=String(description||"").replace(/\s+/g," ").trim();
  const enrichedDescription=rawDescription.length<70?`${rawDescription} Aktuelle Details und geprüfte Informationen auf Angebotslotse.`:rawDescription;
  const cleanDescription=clipText(enrichedDescription,160);
  const analytics=analyticsToken?`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${json({token:analyticsToken})}'></script>`:"";
  const image=socialImage?`<meta property="og:image" content="${esc(socialImageUrl)}"><meta property="og:image:alt" content="${esc(socialImageAlt)}"><meta name="twitter:image" content="${esc(socialImageUrl)}">`:"";
  const pwaRegistration=`<script>if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("${url("/sw.js")}").catch(()=>{}));}<\/script>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(seoTitle)} · Angebotslotse</title><meta name="description" content="${esc(cleanDescription)}"><meta name="robots" content="${indexable?"index,follow,max-image-preview:large":"noindex,follow"}"><link rel="canonical" href="${url(canonical)}"><link rel="icon" href="${url("/favicon.svg")}" type="image/svg+xml"><link rel="apple-touch-icon" sizes="180x180" href="${url("/apple-touch-icon.png")}"><link rel="manifest" href="${url("/manifest.webmanifest")}"><meta name="theme-color" content="#10152a"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">${googleVerification?`<meta name="google-site-verification" content="${esc(googleVerification)}">`:""}<meta property="og:type" content="website"><meta property="og:site_name" content="Angebotslotse"><meta property="og:locale" content="de_DE"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(cleanDescription)}"><meta property="og:url" content="${url(canonical)}">${image}<meta name="twitter:card" content="${socialImage?"summary_large_image":"summary"}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(cleanDescription)}"><link rel="stylesheet" href="${url("/site.css?v=12")}">${schema?`<script type="application/ld+json">${json(schema)}</script>`:""}<script src="${url("/app.js?v=11")}" defer></script>${analytics}</head><body>${nav}<main>${body}</main>${footer}${pwaRegistration}</body></html>`;
}
const placeholder=o=>`<div class="product-image placeholder"><img src="${url(`/placeholders/${o.category||"sonstiges"}.svg`)}" alt="Neutraler ${esc(labels[o.category]||"Angebots")}-Platzhalter – kein Produktfoto" width="640" height="400" loading="lazy"></div>`;
const optimizedImageUrl=(src,width=640)=>{try{const parsed=new URL(src);const shopify=(parsed.hostname==="cdn.shopify.com"||parsed.hostname.endsWith(".myshopify.com"))&&parsed.pathname.includes("/s/files/");if(shopify&&parsed.protocol==="https:"){const raw=parsed.searchParams.get("width");const existing=raw?Number(raw):null;if(existing===null||!Number.isFinite(existing)||existing>width)parsed.searchParams.set("width",String(width));return parsed.toString();}}catch{}return src;};
const imageFor=(o,eager=false,includeGallery=false)=>{const fallback=url(`/placeholders/${o.category||"sonstiges"}.svg`);const main=o.imageUrl?`<div class="product-image has-media"><span class="media-skeleton" aria-hidden="true"></span><img src="${esc(optimizedImageUrl(o.imageUrl,includeGallery?960:640))}" data-fallback-src="${esc(fallback)}" alt="${esc(o.imageAlt||o.title)}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" data-media></div>`:placeholder(o);const credit=includeGallery&&o.imageUrl&&o.imageSource?`<p class="media-credit"><span aria-hidden="true">✓</span> Offizielles Partnerbild · ${esc(o.imageSource)}</p>`:"";const gallery=includeGallery&&(o.additionalImageUrls||[]).length?`<div class="image-gallery" aria-label="Weitere echte Produktbilder">${o.additionalImageUrls.map((src,index)=>`<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(optimizedImageUrl(src,960))}" alt="${esc(o.title)} – Bild ${index+2}" loading="lazy" decoding="async"></a>`).join("")}</div>`:"";return `${main}${credit}${gallery}`};
	const sparkline=o=>{const rows=historyFor(priceHistory,o,30,now);if(rows.length<2)return `<div class="sparkline empty-spark"><span>Preisverlauf wird aufgebaut</span></div>`;const values=rows.map(r=>r.price),min=Math.min(...values),max=Math.max(...values),range=max-min||1,mid=(min+max)/2,points=values.map((v,i)=>`${6+i*(88/Math.max(1,values.length-1))},${15-((v-mid)/range)*10}`).join(" ");return `<div class="sparkline"><svg viewBox="0 0 100 30" role="img" aria-label="Preisentwicklung über 30 Tage"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Preisentwicklung</span></div>`};
const historyChart=(o,days)=>{const rows=historyFor(priceHistory,o,days,now);if(rows.length<2)return `<div class="history-panel" data-history-panel="${days}"${days===30?'':' hidden'}><p>Für ${days} Tage liegen noch nicht genug echte Messpunkte vor.</p></div>`;const values=rows.map(r=>r.price),min=Math.min(...values),max=Math.max(...values),average=values.reduce((sum,value)=>sum+value,0)/values.length,range=max-min||1,points=values.map((v,i)=>`${20+i*(560/Math.max(1,values.length-1))},${180-(v-min)/range*140}`).join(" "),change=values.at(-1)-values[0],changePercent=values[0]?change/values[0]*100:0;return `<div class="history-panel" data-history-panel="${days}"${days===30?'':' hidden'}><svg viewBox="0 0 600 200" role="img" aria-label="Preisverlauf über ${days} Tage von ${money(values[0],o.currency)} bis ${money(values.at(-1),o.currency)}"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><dl><div><dt>Preis vor ${days} Tagen</dt><dd>${money(values[0],o.currency)}</dd></div><div><dt>Niedrigster Preis</dt><dd>${money(min,o.currency)}</dd></div><div><dt>Höchster Preis</dt><dd>${money(max,o.currency)}</dd></div><div><dt>Durchschnitt</dt><dd>${money(average,o.currency)}</dd></div><div><dt>Änderung</dt><dd>${change>0?'+':''}${moneyDelta(change,o.currency)} · ${changePercent>0?'+':''}${changePercent.toFixed(1)} %</dd></div></dl></div>`};
const merchantLink=o=>{const slug=shopPageByName.get(o.advertiser);return slug?`<a href="${url(`/shops/${slug}.html`)}">${esc(o.advertiser)}</a>`:esc(o.advertiser);};
const brandLink=o=>{const name=canonicalBrand(o.brand);const slug=brandPageFor(o);return name?(slug?`<a href="${url(`/marken/${slug}.html`)}">${esc(name)}</a>`:esc(name)):esc(o.advertiser);};
const breadcrumbNav=o=>`<nav class="breadcrumbs" aria-label="Brotkrümelnavigation"><a href="${url("/")}">Start</a><span aria-hidden="true">›</span><a href="${url(`/${o.category}.html`)}">${esc(labels[o.category]||o.category)}</a><span aria-hidden="true">›</span><span aria-current="page">${esc(o.title)}</span></nav>`;
const historyModule=o=>{const total=historyFor(priceHistory,o,90,now);if(total.length<2)return `<section class="price-history"><h2>Preisentwicklung</h2><p>Preisverlauf wird aufgebaut, sobald mehrere echte Messpunkte vorliegen.</p></section>`;return `<section class="price-history"><div class="history-head"><h2>Preisentwicklung</h2><div role="group" aria-label="Zeitraum"><button type="button" data-history-range="7">7 Tage</button><button type="button" data-history-range="30" aria-pressed="true">30 Tage</button><button type="button" data-history-range="90">90 Tage</button></div></div>${[7,30,90].map(days=>historyChart(o,days)).join("")}</section>`};
const sourceLabel=source=>({"awin":"Awin","impact":"Impact","amazon":"Amazon","direct":"Direkter Partner","daisycon":"Daisycon","tradedoubler":"Tradedoubler","webgains":"Webgains"}[String(source||"").toLowerCase()]||"Partnerquelle");
const dealCheckModule=(o,alternatives=[])=>{const rows=historyFor(priceHistory,o,30,now),prices=rows.map(row=>row.price).filter(value=>Number.isFinite(value)&&value>0),low=prices.length?Math.min(...prices):null,high=prices.length?Math.max(...prices):null,updatedAt=o.updatedAt||o.importTimestamp||o.firstSeen||null,merchantCount=1+alternatives.length;return `<section class="deal-check"><div class="section-head"><div><span class="eyebrow">Daten statt Werbeversprechen</span><h2>Deal-Check</h2></div></div><div class="deal-facts">${hasPrice(o)?`<div><span>Aktueller Preis</span><strong>${money(o.currentPrice,o.currency)}</strong></div>`:""}${low!=null?`<div><span>30-Tage-Tief</span><strong>${money(low,o.currency)}</strong></div>`:""}${low!=null&&high!=null&&high>low?`<div><span>30-Tage-Spanne</span><strong>${money(low,o.currency)} – ${money(high,o.currency)}</strong></div>`:""}${merchantCount>1?`<div><span>Vergleichshändler</span><strong>${merchantCount}</strong></div>`:""}<div><span>Datenquelle</span><strong>${esc(sourceLabel(o.source))}</strong></div>${updatedAt?`<div><span>Zuletzt geprüft</span><strong>${new Intl.DateTimeFormat("de-DE",{dateStyle:"medium"}).format(new Date(updatedAt))}</strong></div>`:""}</div><p class="deal-check-note">Angebotslotse übernimmt Preise, Medien und Aktionen nur aus freigegebenen Quellen. Ein Rabatt wird nur angezeigt, wenn ein belastbarer Vergleichspreis vorliegt; Preisverläufe basieren ausschließlich auf tatsächlich gespeicherten Messpunkten. <a href="${url("/methodik.html")}">So prüfen wir Deals →</a></p></section>`;};
const watchAttrs=o=>'data-watch-id="'+esc(o.slug)+'" data-watch-title="'+esc(o.title)+'" data-watch-price="'+(o.currentPrice??"")+'" data-watch-currency="'+esc(o.currency||"EUR")+'" data-watch-url="'+url("/angebote/"+o.slug+".html")+'" data-watch-merchant="'+esc(o.advertiser)+'"';
const watchButton=o=>'<button type="button" class="watch-button" '+watchAttrs(o)+' data-watch-toggle aria-pressed="false" aria-label="'+esc(o.title)+' merken">♡ <span>Merken</span></button>';
const watchPanel=o=>'<section class="watch-panel" data-watch-panel '+watchAttrs(o)+'><div><span class="eyebrow">Lokal im Browser</span><h2>Merken & Wunschpreis setzen</h2><p>Diese Merkliste bleibt nur auf diesem Gerät gespeichert. Es werden dafür keine persönlichen Daten an Angebotslotse übertragen.</p></div><div class="watch-actions">'+(hasPrice(o)?'<label>Wunschpreis<input type="number" min="0" step="0.01" inputmode="decimal" data-watch-target placeholder="'+Number(o.currentPrice).toFixed(2)+'"></label>':'')+'<button type="button" class="button primary" data-watch-save>Merken</button><button type="button" class="button" data-watch-remove hidden>Entfernen</button><a class="button" href="'+url("/merkliste.html")+'">Merkliste öffnen</a><p data-watch-status aria-live="polite"></p></div></section>';
const watchCatalog=Object.fromEntries(offers.map(o=>[o.slug,{id:o.slug,title:o.title,merchant:o.advertiser,currentPrice:o.currentPrice??null,currency:o.currency||"EUR",url:url("/angebote/"+o.slug+".html"),imageUrl:o.imageUrl||null,updatedAt:o.updatedAt||o.importTimestamp||null}]));
const card=o=>{const pct=discount(o),drop=dropFor(o),firstSeen=Date.parse(o.firstSeen||o.importTimestamp||o.dateAdded||""),isNew=Number.isFinite(firstSeen)&&now.getTime()-firstSeen<86400000,detailHref=url(`/angebote/${esc(o.slug)}.html`);return `<article class="deal-card reveal" tabindex="-1" data-search="${esc(`${o.title} ${o.description} ${o.advertiser} ${o.brand||""} ${o.category}`.toLowerCase())}" data-category="${esc(o.category)}" data-brand="${esc((o.brand||"").toLowerCase())}" data-merchant="${esc((o.advertiser||"").toLowerCase())}" data-updated="${esc(o.updatedAt||"")}" data-end="${esc(o.endDate||"")}" data-discount="${pct||0}" data-price="${o.currentPrice??""}"><div class="media-wrap"><a class="card-media-link" href="${detailHref}" aria-label="${esc(o.title)} im Angebotslotse ansehen">${imageFor(o)}</a>${pct?`<span class="media-discount">-${pct} %</span>`:""}${o.videoUrl?`<span class="video-badge" aria-label="Offizielles Video verfügbar">▶</span>`:""}</div><div class="deal-content"><div class="card-top"><span class="pill">${esc(labels[o.category]||o.category)}</span>${isNew?`<span class="new-badge">Neu</span>`:""}${o.voucherCode?`<span class="code-badge">Code</span>`:""}${watchButton(o)}</div><p class="brandline">${brandLink(o)}</p><h3><a href="${detailHref}">${esc(o.title)}</a></h3><p class="merchant">bei ${merchantLink(o)}</p>${o.currentPrice!=null?`<div class="price-block">${o.previousPrice?`<span class="old-price">UVP ${money(o.previousPrice,o.currency)}</span>`:""}<div class="price"><strong>${money(o.currentPrice,o.currency)}</strong>${pct?`<span>-${pct} %${o.discountAmount?` · spart ${money(o.discountAmount,o.currency)}`:""}</span>`:""}</div>${drop?`<p class="price-change">↓ ${money(drop,o.currency)} in 30 Tagen</p>`:""}</div>`:`<p class="price-note">Preis beim Anbieter prüfen</p>`}${sparkline(o)}${o.voucherCode?`<p class="voucher">Code verfügbar: <code>${esc(o.voucherCode)}</code></p>`:""}${o.endDate?`<p class="countdown" data-countdown="${esc(o.endDate)}">Endet am ${new Intl.DateTimeFormat("de-DE").format(new Date(o.endDate))}</p>`:""}<a class="button card-cta" href="${detailHref}" aria-label="${esc(o.title)} – Details und Preise vergleichen">Details & Preise <span aria-hidden="true">→</span></a><small class="ad-label">Erst vergleichen, dann zum Anbieter</small></div></article>`};
const sameBrandOffersFor=o=>{
  const brand=canonicalBrand(o.brand);
  if(!brand)return[];
  return offers.filter(row=>row.slug!==o.slug&&canonicalBrand(row.brand)===brand).sort((a,b)=>Number(Boolean(b.imageUrl))-Number(Boolean(a.imageUrl))||String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))).slice(0,4);
};
const similarOffersFor=o=>{
  const ownBrand=canonicalBrand(o.brand);
  return diversifyOffers(offers.filter(row=>row.slug!==o.slug&&row.category===o.category&&canonicalBrand(row.brand)!==ownBrand),{limit:4,maxPerBrand:1,maxPerMerchant:2,maxPerCategory:4});
};
const relatedOffersModule=o=>{
  const brand=canonicalBrand(o.brand),brandRows=sameBrandOffersFor(o),similarRows=similarOffersFor(o),brandSlug=brandPageFor(o);
  const same=brandRows.length?`<section class="related-offers deal-section"><div class="section-head"><div><span class="eyebrow">Mehr von derselben Marke</span><h2>Weitere ${esc(brand||o.advertiser)} Angebote</h2></div>${brandSlug?`<a href="${url(`/marken/${brandSlug}.html`)}">Alle von ${esc(brand)} →</a>`:""}</div><div class="deal-grid">${brandRows.map(card).join("")}</div></section>`:"";
  const similar=similarRows.length?`<section class="related-offers deal-section"><div class="section-head"><div><span class="eyebrow">Andere Marken vergleichen</span><h2>Ähnliche Angebote</h2></div><a href="${url(`/${o.category}.html`)}">Mehr aus ${esc(labels[o.category]||o.category)} →</a></div><div class="deal-grid">${similarRows.map(card).join("")}</div></section>`:"";
  return `${same}${similar}`;
};
const offerSection=(id,title,copy,items,limit=10,allHref="/kategorien.html")=>items.length?`<section class="deal-section reveal" id="${id}"><div class="section-head"><div><span class="eyebrow">${esc(copy)}</span><h2>${esc(title)}</h2></div><div class="rail-actions"><a href="${url(allHref)}">Alle ansehen</a>${items.length>1?`<button type="button" data-slider-prev aria-label="${esc(title)} zurück">←</button><button type="button" data-slider-next aria-label="${esc(title)} weiter">→</button>`:""}</div></div><div class="deal-rail" data-slider tabindex="0" aria-label="${esc(title)}">${items.slice(0,limit).map(card).join("")}</div></section>`:"";
const categoryGuides={
  gaming:["Plattform, Edition und Region prüfen – derselbe Titel kann je nach Variante deutlich anders bepreist sein.","Bei Keys und digitalen Produkten immer Aktivierungsplattform und Einschränkungen auf der Händlerseite kontrollieren.","Rabatt und Preisverlauf getrennt betrachten: ein hoher Prozentwert ist nicht automatisch der niedrigste gemessene Preis."],
  technik:["Exakte Modellnummer und Ausstattung vergleichen, nicht nur den Produktnamen.","Versandkosten, Variante und Lieferumfang auf der Zielseite in den Gesamtpreis einbeziehen.","Preisverlauf nutzen, um kurzfristige Aktionen von dauerhaft üblichen Preisen zu unterscheiden."],
  computer:["CPU, GPU, Speicher, Display und konkrete Modellkennung vor dem Preisvergleich abgleichen.","Bei Komponenten Kompatibilität und enthaltenes Zubehör prüfen; ähnliche Namen können unterschiedliche Varianten bezeichnen.","Neben dem aktuellen Preis auch Verlauf und alternative Händler desselben Produktkennzeichens prüfen."],
  "audio-musik":["Bei Software auf Lizenzart, Version und Systemkompatibilität achten; bei Hardware auf Anschlüsse und Lieferumfang.","Bundles und Einzelprodukte nicht nur über den Titel vergleichen, sondern über die genaue Produktkennung.","Aktionscodes und zeitlich begrenzte Herstellerangebote separat vom normalen Produktpreis betrachten."],
  zubehoer:["Kompatibilität mit dem eigenen Gerät und die genaue Modellnummer zuerst prüfen.","Sets, Kabellängen, Anschlussvarianten und enthaltenes Zubehör können den Preis stark verändern.","Gesamtpreis inklusive Versand beim Anbieter gegen andere Händler vergleichen."],
  "smart-home":["Prüfen, ob das Gerät mit dem eigenen Smart-Home-System, Matter, HomeKit, Alexa oder Google Home kompatibel ist.","Bei Kameras, Sensoren und Hubs auf Cloud-Abo, lokale Speicherung und benötigte Basisstationen achten.","Modellgeneration und enthaltenes Zubehör vergleichen; gleiche Produktnamen können unterschiedliche Bundles meinen."],
  homeoffice:["Anschlüsse, Auflösung, Ergonomie und Kompatibilität mit Laptop oder PC vor dem Preisvergleich abgleichen.","Bei Docks, Webcams und Konferenztechnik prüfen, welche Kabel, Netzteile und Adapter enthalten sind.","Arbeitsplatzprodukte nach Ausstattung und nicht nur nach Produktnamen vergleichen."],
  haushalt:["Kapazität, Modellvariante und technische Ausstattung vor dem Preisvergleich abgleichen.","Große Geräte können zusätzliche Versand- oder Lieferbedingungen haben; maßgeblich ist die Händlerseite.","Der gespeicherte Preisverlauf hilft zu erkennen, ob ein Preis tatsächlich gefallen ist."],
  garten:["Fläche, Laufzeit, Wetterfestigkeit und benötigtes Zubehör mit dem eigenen Einsatzbereich abgleichen.","Bei Mährobotern auf Begrenzungskabel, RTK/GPS, Basisstation und maximale Flächenleistung achten.","Saisonpreise und Bundles getrennt vergleichen; Zubehör kann den Gesamtpreis stark verändern."],
  werkzeug:["Prüfen, ob Akku, Ladegerät und Zubehör enthalten sind oder ob es sich um ein Solo-Gerät handelt.","Bei Akku-Systemen die Plattform und Spannung mit vorhandener Ausstattung abgleichen.","Set- und Einzelpreise nicht vermischen; Angebotslotse vergleicht nur eindeutig zuordenbare Produktdaten."],
  mode:["Größe, Farbe und Variante können Preis und Verfügbarkeit verändern.","Rückgabe- und Versandbedingungen vor dem Kauf direkt beim Händler prüfen.","Rabatte werden nur dargestellt, wenn ein belastbarer Vergleichspreis aus der Quelle vorliegt."],
  "sport-fitness":["Größe, Ausführung und Trainingsziel prüfen; Geräte, Kleidung und Zubehör sind nicht immer direkt vergleichbar.","Bei Wearables und Fitnessgeräten auf App-Kompatibilität, Sensoren und mögliche Abo-Funktionen achten.","Rabatte nur mit gleicher Variante und identischem Lieferumfang vergleichen."],
  gesundheit:["Bei Wellness- und Gesundheitsprodukten Ausstattung und Einsatzzweck vergleichen; Angebotslotse ersetzt keine medizinische Beratung.","Bei Trackern, Waagen und Schlafprodukten auf App-Kompatibilität, Datenschutz und Folgekosten achten.","Produktvarianten und Packungsgrößen genau abgleichen, bevor Preise verglichen werden."],
  beauty:["Füllmenge, Variante, Duft bzw. Farbton und Set-Inhalt müssen für einen fairen Preisvergleich übereinstimmen.","Bei Verbrauchsprodukten Grundpreis und Packungsgröße zusätzlich zum Aktionspreis beachten.","Retouren- und Hygieneausschlüsse können je nach Händler gelten und sollten vor dem Kauf geprüft werden."],
  auto:["Kompatibilität mit Fahrzeugmodell, Baujahr und Anschlussstandard vor dem Kauf prüfen.","Bei Dashcams, CarPlay-Adaptern und Ladegeräten auf Speicher, Stromversorgung und benötigtes Zubehör achten.","Zulassung, Einbauanforderungen und Lieferumfang können den tatsächlichen Gesamtpreis beeinflussen."],
  tierbedarf:["Tierart, Größe, Alter und konkrete Produktvariante prüfen; Futter- und Zubehörgrößen sind nicht direkt austauschbar.","Packungsgröße und Grundpreis vergleichen, besonders bei Futter, Streu und Verbrauchsartikeln.","Bei technischen Tierprodukten wie Futterautomaten auf App, Stromversorgung und Ersatzteile achten."],
  freizeit:["Leistungsumfang, Zeitraum und mögliche Nutzungseinschränkungen auf der Zielseite prüfen.","Bei zeitgebundenen Aktionen zählt das tatsächliche Enddatum des Partners.","Ähnliche Angebote erst vergleichen, wenn Leistung und Bedingungen wirklich übereinstimmen."],
  sonstiges:["Produktkennung, Lieferumfang und Bedingungen prüfen, bevor Preise verglichen werden.","Gesamtpreis und aktuelle Verfügbarkeit werden immer auf der Händlerseite bestätigt.","Preisvorteile werden nicht aus Werbeaussagen abgeleitet, sondern nur aus vorhandenen Quelldaten."]
};
const categoryGuideModule=(category,rows)=>{if(!rows.length)return"";const merchants=[...new Set(rows.map(row=>row.advertiser).filter(Boolean))],withHistory=rows.filter(row=>historyFor(priceHistory,row,30,now).length>1).length,withCoupons=rows.filter(row=>row.voucherCode).length,withPrices=rows.filter(hasPrice).length,topMerchants=[...rows.reduce((map,row)=>(map.set(row.advertiser,(map.get(row.advertiser)||0)+1),map),new Map())].sort((a,b)=>b[1]-a[1]).slice(0,4);return `<section class="category-guide"><div class="category-live-stats"><div><span>Aktive Angebote</span><strong>${rows.length}</strong></div><div><span>Händler</span><strong>${merchants.length}</strong></div><div><span>Mit Preis</span><strong>${withPrices}</strong></div><div><span>Mit Preisverlauf</span><strong>${withHistory}</strong></div>${withCoupons?`<div><span>Mit Code</span><strong>${withCoupons}</strong></div>`:""}</div><div class="category-guide-copy"><div><span class="eyebrow">Besser vergleichen</span><h2>Worauf du bei ${esc(labels[category]||category)} achten kannst</h2><ul>${(categoryGuides[category]||categoryGuides.sonstiges).map(item=>`<li>${esc(item)}</li>`).join("")}</ul></div>${topMerchants.length?`<aside><strong>Aktuell häufige Händler</strong>${topMerchants.map(([name,count])=>{const slug=shopPageByName.get(name);return slug?`<a href="${url(`/shops/${slug}.html`)}">${esc(name)} <span>${count}</span></a>`:`<span>${esc(name)} <b>${count}</b></span>`;}).join("")}</aside>`:""}</div></section>`;};
const activeCategories=categories.filter(c=>offers.some(o=>o.category===c));
const categoryTiles=activeCategories.map(c=>({category:c,count:offers.filter(o=>o.category===c).length})).filter(({count})=>count>0).map(({category:c,count})=>`<a class="category-tile" href="${url(`/${c}.html`)}"><div class="category-art"><img src="${url(`/placeholders/${c}.svg`)}" alt="" width="320" height="180" loading="lazy"><span class="category-mark">${esc(categoryIcons[c])}</span></div><div class="category-tile-copy"><span>${esc(labels[c])}</span><b>${count} Angebote</b><small>Entdecken →</small></div></a>`).join("");
const socialEntries=creators.entries.filter(c=>!["bücher","von liebe bis zur tiefsten trauer","dinge über beziehungen","merch-shop"].includes(c.name.toLowerCase()));
const bookEntries=(amazonCatalog.items??[]).filter(item=>item.ownedProject);
const authorEntry=creatorByName.get("bücher");
const merchEntry=creatorByName.get("merch-shop");
const creatorModule=creators.enabled&&socialEntries.length?`<section class="creator-promo reveal" id="projekte"><div class="creator-visual"><img src="${url("/brand-hero.jpg")}" data-soft-fallback="brand" alt="Offizielles Angebotslotse-Logo aus dem Projektbestand" width="720" height="378" loading="lazy" decoding="async"><span>Joel / Angebotslotse</span><b>Creator & Community</b></div><div><span class="eyebrow">Original-Branding · klar getrennt von Deals</span><h2>Von Joel</h2><p>Streams, Videos, Musik und Community – eigenständig, transparent und ohne Einfluss auf die Angebotsauswahl.</p><div class="social-links">${socialEntries.map(c=>`<a href="${esc(c.url)}" rel="me noopener">${esc(c.name)} ↗</a>`).join("")}</div></div></section>`:"";
const creatorVideoModule=creatorVideos.length?`<section class="creator-videos reveal" id="neueste-videos"><div class="section-head"><div><span class="eyebrow">Öffentliche Veröffentlichungen</span><h2>Neueste Videos von Joel</h2><p>Nur tatsächlich veröffentlichte, öffentliche Video-Links.</p></div><a href="${url("/#projekte")}">Mehr von Joel</a></div><div class="creator-video-grid">${creatorVideos.slice(0,6).map(video=>`<article class="creator-video-card"><a class="creator-video-media" href="${esc(video.publicUrl)}" rel="noopener" target="_blank" aria-label="${esc(`${video.title} auf ${video.platform} ansehen`)}">${video.thumbnailUrl?`<img src="${esc(video.thumbnailUrl)}" data-soft-fallback="video" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:`<span aria-hidden="true">▶</span>`}</a><div><span class="eyebrow">${esc(video.platform)}${video.publishedAt?` · ${new Intl.DateTimeFormat("de-DE").format(new Date(video.publishedAt))}`:""}</span><h3>${esc(video.title)}</h3><a class="video-cta" href="${esc(video.publicUrl)}" rel="noopener" target="_blank">Video ansehen ↗</a></div></article>`).join("")}</div></section>`:"";
const creatorTypeLabels={post:"Post",stream:"Stream",music:"Musik",community:"Community",video:"Video"};
const creatorUpdates=creatorItems.filter(item=>item.type!=="video").slice(0,6);
const creatorUpdatesModule=creatorUpdates.length?`<section class="creator-updates reveal" id="creator-updates"><div class="section-head"><div><span class="eyebrow">Direkt aus dem Social-Verteiler</span><h2>Neu von Joel</h2><p>Nur bereits veröffentlichte öffentliche Inhalte. Keine Drafts und keine privaten Social-Daten.</p></div><a href="${url("/#projekte")}">Alle Kanäle</a></div><div class="creator-update-grid">${creatorUpdates.map(item=>`<a class="creator-update-card" href="${esc(item.publicUrl)}" rel="noopener" target="_blank">${item.thumbnailUrl?`<img src="${esc(item.thumbnailUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:`<span class="creator-update-placeholder" aria-hidden="true">${esc((creatorTypeLabels[item.type]||"Update").slice(0,1))}</span>`}<div><span class="eyebrow">${esc(item.platform)} · ${esc(creatorTypeLabels[item.type]||"Update")}${item.publishedAt?` · ${new Intl.DateTimeFormat("de-DE").format(new Date(item.publishedAt))}`:""}</span><h3>${esc(item.title)}</h3>${item.summary?`<p>${esc(item.summary)}</p>`:""}<strong>Öffnen ↗</strong></div></a>`).join("")}</div></section>`:"";
const projectModule=creators.enabled?`<section class="project-promo reveal"><div><span class="eyebrow">Eigene Projekte</span><h2>Bücher & Merch</h2><p>Joels eigene Veröffentlichungen – klar getrennt von automatisch bewerteten Affiliate-Deals.</p></div><div class="project-links"><a href="${url("/buecher.html")}"><strong>Bücher von Joel</strong><span>${bookEntries.length} Titel ansehen →</span></a><a href="${url("/merch.html")}"><strong>Joel Merch</strong><span>Merch-Shop öffnen →</span></a></div></section>`:"";
const activePartners=partners.filter(p=>p.enabled&&p.id!=="razer"&&!p.id.includes("gearup"));
const visiblePartnerCreatives=partners.filter(p=>p.enabled&&p.contentType==="partner-creative");
const partnerCreativeSection=visiblePartnerCreatives.length?`<section class="partner-section partner-creative-section" id="neue-partner"><div class="section-head"><div><span class="eyebrow">Offizielle Awin-Werbemittel</span><h2>Neue Partner-Angebote</h2><p>Offizielle Partner-Creatives – ohne erfundene Produktpreise oder Rabatte.</p></div></div><div class="partner-creative-grid">${visiblePartnerCreatives.map(p=>`<article class="partner-creative-card"><div class="partner-creative-media">${p.creativeUrl?`<img class="partner-creative" src="${esc(p.creativeUrl)}" alt="${esc(p.title)}" loading="lazy">`:`<div class="partner-creative-placeholder" aria-hidden="true">${esc(p.name)}</div>`}</div><div class="partner-creative-copy"><span class="eyebrow">Partner-Creative · Werbung</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><a class="button card-cta" href="${esc(p.trackingUrl)}" rel="sponsored noopener">Zum Angebot <span aria-hidden="true">→</span></a></div></article>`).join("")}</div></section>`:"";
const partnerSection=`<section class="partner-section" id="partner"><span class="eyebrow">Bestätigte Quellen</span><h2>Partner & Shops</h2><div>${activePartners.map(p=>`<a href="${esc(p.trackingUrl)}" rel="sponsored noopener">${p.creativeUrl?`<img class="partner-creative" src="${esc(p.creativeUrl)}" alt="${esc(p.title)}" loading="lazy">`:""}<strong>${esc(p.name)}</strong><small>${p.contentType==="partner-creative"?"Partner-Creative · Werbung":"Werbelink ↗"}</small></a>`).join("")}</div></section>`;
const instantGamingPartner=partners.find(p=>p.id==="instant-gaming"&&p.enabled&&p.trackingUrl);
let instantGamingIgr="";
if(instantGamingPartner){try{instantGamingIgr=new URL(instantGamingPartner.trackingUrl).searchParams.get("igr")||"";}catch{}}
const instantGamingModule=instantGamingPartner?`<section class="partner-section instant-gaming-module" id="instant-gaming"><span class="eyebrow">Gaming-Partnerbereich</span><h2>Instant Gaming</h2><p>Der Partnerlink ist direkt nutzbar. Der externe Instant-Gaming-Partnerbanner wird aus Datenschutz- und Performancegründen erst nach einem ausdrücklichen Klick geladen.</p><div class="instant-gaming-actions"><a class="button primary" href="${esc(instantGamingPartner.trackingUrl)}" rel="sponsored noopener">Instant Gaming öffnen ↗</a>${instantGamingIgr?`<button class="button" type="button" data-ig-banner-load data-igr="${esc(instantGamingIgr)}">Partnerbanner laden</button>`:""}</div>${instantGamingIgr?`<div class="my-banner" data-ig-banner-host aria-label="Instant-Gaming-Partnerbanner" hidden></div><p class="instant-gaming-note" data-ig-banner-note>Externer Inhalt bleibt bis zum Klick deaktiviert.</p>`:""}</section>`:"";
const updated=status.lastSuccessfulUpdate?new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(status.lastSuccessfulUpdate)):"ausstehend";
const qualityScore=o=>(discount(o)||0)*1000+dropFor(o)*100+(hasPrice(o)?80:0)+(o.endDate?50:0)+(o.voucherCode?30:0)+(o.imageUrl?25:0)+(o.brand?10:0)+(o.gtin||o.ean||o.mpn?10:0);
const homepage=selectHomepageOffers(offers,{now,score:qualityScore});
const homepageMixed=diversifyOffers([...homepage.dailyHighlights,...homepage.newest,...topDiscounts,...priceDrops,...offers],{limit:12,maxPerBrand:1,maxPerMerchant:2,maxPerCategory:3});
const homepageNewest=diversifyOffers(homepage.newest,{limit:10,maxPerBrand:1,maxPerMerchant:2,maxPerCategory:3});
const homepageTopDiscounts=diversifyOffers(topDiscounts,{limit:10,maxPerBrand:2,maxPerMerchant:2,maxPerCategory:3});
const homepageTech=diversifyOffers(offers.filter(o=>["gaming","technik","computer","audio-musik","zubehoer","smart-home","homeoffice"].includes(o.category)).sort((a,b)=>qualityScore(b)-qualityScore(a)),{limit:10,maxPerBrand:2,maxPerMerchant:2,maxPerCategory:3});
const homepageEveryday=diversifyOffers(offers.filter(o=>["haushalt","garten","werkzeug","mode","sport-fitness","gesundheit","beauty","auto","tierbedarf","freizeit"].includes(o.category)).sort((a,b)=>qualityScore(b)-qualityScore(a)),{limit:10,maxPerBrand:2,maxPerMerchant:2,maxPerCategory:3});
const heroCandidates=[homepage.dailyDeal,...homepage.dailyHighlights,...homepage.newest].filter(Boolean);
const heroItems=[...new Map(heroCandidates.map(item=>[item.id,item])).values()].slice(0,3);
const heroCopy=[
  ["Gute Angebote. Klar eingeordnet.","Echte Produktdaten, offizielle Medien und nachvollziehbare Preise – ohne erfundene Rabatte."],
  ["Dein nächster guter Kauf.","Entdecke aktuelle Produkte mit großen Bildern und dem direkten Weg zum Anbieter."],
  ["Weniger Lärm. Mehr Überblick.","Angebote aus freigegebenen Quellen, getrennt nach Kategorie und Qualität."],
];
const heroModule=heroItems.length?`<section class="premium-hero redesigned-hero reveal" aria-label="Angebotslotse Highlights"><div class="hero-redesign-copy"><span class="hero-kicker">SMART SPAREN. MEHR ERLEBEN.</span><h1>Die besten Angebote<br><em>für deinen Lifestyle.</em></h1><p>Technik, Gaming, Home, Fashion und Lifestyle – echte Deals aus freigegebenen Quellen, automatisch geprüft und regelmäßig aktualisiert.</p><form class="hero-search-form" action="${url('/suche.html')}" role="search"><label class="sr-only" for="hero-search">Produkt, Marke, Spiel oder Shop suchen</label><input id="hero-search" name="suche" type="search" placeholder="Produkt, Marke oder Shop suchen …" autocomplete="off"><button type="submit">Angebote suchen</button></form><div class="app-install-row"><button class="button app-install-button" type="button" data-app-install hidden>App installieren</button><small class="app-install-help" data-app-install-help hidden></small></div><div class="search-chips" aria-label="Beliebte Suchbegriffe"><a href="${url('/technik.html')}">Technik</a><a href="${url('/gaming.html')}">Gaming</a><a href="${url('/haushalt.html')}">Home</a><a href="${url('/mode.html')}">Fashion</a></div><div class="trust-points"><span>Echte Angebote</span><span>Automatisch geprüft</span><span>Regelmäßig aktualisiert</span><span>Persönlich kuratiert</span></div></div><div class="hero-brand-panel"><div class="hero-brand-glow"></div><img src="${url('/brand-hero.jpg')}" alt="Angebotslotse-Branding aus dem Projektbestand" width="720" height="378" fetchpriority="high" decoding="async"><strong>Joel / Angebotslotse</strong><span>Deals. Discovery. Community.</span><small>Deals · Discovery · Community</small></div></section>`:"";
const searchModule="";
const dailyDealModule=homepage.dailyDeal?(()=>{const o=homepage.dailyDeal,pct=discount(o);return `<section class="daily-deal reveal" id="deal-des-tages"><div class="daily-media">${imageFor(o,true)}${o.videoUrl?`<a class="video-link" href="${esc(o.videoUrl)}" rel="noopener">Offizielles Video ansehen ↗</a>`:""}</div><div class="daily-copy"><span class="eyebrow">Automatisch aus echten Daten gewählt</span><h2>Deal des Tages</h2><p class="daily-title">${esc(o.title)}</p><p class="merchant">bei ${merchantLink(o)}</p>${hasPrice(o)?`<div class="daily-price">${o.previousPrice>o.currentPrice?`<span>UVP ${money(o.previousPrice,o.currency)}</span>`:""}<strong>${money(o.currentPrice,o.currency)}</strong>${pct?`<b>-${pct} %</b>`:""}</div>`:`<p class="price-note">Preis beim Anbieter prüfen</p>`}${o.voucherCode?`<p class="voucher">Code: <code>${esc(o.voucherCode)}</code></p>`:""}${o.endDate?`<p class="countdown" data-countdown="${esc(o.endDate)}">Endet am ${new Intl.DateTimeFormat("de-DE").format(new Date(o.endDate))}</p>`:""}<a class="button primary" href="${url(`/angebote/${esc(o.slug)}.html`)}">Details & Preise →</a><small class="ad-label">Im Angebotslotse vergleichen</small></div></section>`})():`<aside class="inventory-note reveal"><strong>Noch kein veröffentlichungsfähiger Tagesdeal.</strong><span>Es werden weder Produkt, Preis noch Bild ersetzt oder erfunden.</span></aside>`;
const categoriesModule=activeCategories.length?`<section class="categories reveal"><div class="section-head"><div><span class="eyebrow">Direkt zum Thema</span><h2>Kategorien</h2></div><a href="${url('/kategorien.html')}">Alle Kategorien</a></div><div class="category-grid">${categoryTiles}</div></section>`:"";
const brandDirectoryModule=brandGroups.length?`<section class="directory-section reveal"><div class="section-head"><div><span class="eyebrow">Schneller vergleichen</span><h2>Beliebte Marken</h2><p>Marken mit mindestens fünf aktuell veröffentlichten Angeboten.</p></div><a href="${url('/marken.html')}">Alle Marken</a></div><div class="directory-link-grid">${brandGroups.slice(0,8).map(([name,rows])=>`<a href="${url(`/marken/${brandPageByName.get(name)}.html`)}"><strong>${esc(name)}</strong><span>${rows.length} Angebote →</span></a>`).join("")}</div></section>`:"";
const shopDirectoryModule=shopGroups.length?`<section class="directory-section reveal"><div class="section-head"><div><span class="eyebrow">Direkt zum Händler</span><h2>Shops entdecken</h2><p>Händler mit mindestens drei aktuell veröffentlichten Angeboten.</p></div><a href="${url('/shops.html')}">Alle Shops</a></div><div class="directory-link-grid">${shopGroups.slice(0,8).map(([name,rows])=>`<a href="${url(`/shops/${shopPageByName.get(name)}.html`)}"><strong>${esc(name)}</strong><span>${rows.length} Angebote →</span></a>`).join("")}</div></section>`:"";
const newsletterModule=`<section class="newsletter newsletter-live reveal" id="newsletter">
  <div>
    <span class="eyebrow">Kostenloser Newsletter</span>
    <h2>Gute Angebote direkt mitbekommen.</h2>
    <p>Neue Deals, Preisaktionen und ausgewählte Rabattcodes. Erst nach deiner Bestätigung per E-Mail – jederzeit abmeldbar.</p>
  </div>
  <form class="newsletter-form" data-newsletter-form>
    <label class="sr-only" for="newsletter-email">E-Mail-Adresse</label>
    <div class="newsletter-input-row"><input id="newsletter-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="deine@email.de" required><button class="button primary" type="submit">Kostenlos anmelden</button></div>
    <label class="newsletter-consent"><input name="consent" type="checkbox" required> <span>Ich möchte den Angebotslotse-Newsletter erhalten. Die Anmeldung wird erst nach Klick auf den Bestätigungslink aktiv.</span></label>
    <input class="hp-field" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="form-status" data-newsletter-status aria-live="polite"></p>
  </form>
</section>`;
const homeBody=`${searchModule}${heroModule}${offerSection("aktuelle-deals","Für dich entdeckt","Bewusst gemischt: verschiedene Marken, Kategorien und Shops statt Wiederholungen.",homepageMixed,12,"/kategorien.html")}${categoriesModule}${creatorModule}${creatorVideoModule}${dailyDealModule}${offerSection("neu-eingetroffen","Neu eingetroffen","Frische Angebote mit Marken-Mix.",homepageNewest,10,"/neu.html")}${offerSection("top-rabatte","Top-Rabatte","Nur belegte Preisvorteile – ohne erfundene Prozentwerte.",homepageTopDiscounts,10,"/top-rabatte.html")}${offerSection("technik-deals","Technik, Gaming & Smart Home","PC, Gaming, Creator-Gear, Smart Home und Elektronik.",homepageTech,10,"/technik.html")}${offerSection("alltag-deals","Zuhause, Sport & Alltag","Haushalt, Garten, Fitness, Mode, Gesundheit und mehr.",homepageEveryday,10,"/kategorien.html")}${offerSection("rabattcodes","Rabattcodes","Nur echte, noch gültige Codes.",diversifyOffers(coupons,{limit:10,maxPerBrand:2,maxPerMerchant:2,maxPerCategory:3}),10,"/rabattcodes/")}${brandDirectoryModule}${shopDirectoryModule}${partnerCreativeSection}${partnerSection}${instantGamingModule}${creatorUpdatesModule}${projectModule}${newsletterModule}`;
const homeBodyForValidation=homeBody;

await fs.rm(out,{recursive:true,force:true}); await fs.mkdir(path.join(out,"angebote"),{recursive:true}); await fs.mkdir(path.join(out,"produkt"),{recursive:true}); await fs.mkdir(path.join(out,"shops"),{recursive:true}); await fs.mkdir(path.join(out,"marken"),{recursive:true}); await fs.mkdir(path.join(out,"buecher"),{recursive:true}); await fs.mkdir(path.join(out,"placeholders"),{recursive:true}); await fs.cp("public",out,{recursive:true});
const combinedCss=`${await fs.readFile("public/styles.css","utf8")}\n\n${await fs.readFile("public/enhancements.css","utf8")}`;
await fs.writeFile(path.join(out,"site.css"),combinedCss);
for (const category of categories) {
  const label=labels[category], mark=categoryIcons[category];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-labelledby="title"><title id="title">Neutraler ${esc(label)}-Platzhalter</title><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#10152a"/><stop offset="1" stop-color="#21132d"/></linearGradient><pattern id="p" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 36 36 0" stroke="#ff3fa8" stroke-opacity=".06"/></pattern></defs><rect width="640" height="400" rx="28" fill="url(#g)"/><rect width="640" height="400" rx="28" fill="url(#p)"/><circle cx="320" cy="165" r="84" fill="#ff3fa8"/><text x="320" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="29" font-weight="800" fill="#f7f8ff">${esc(mark)}</text><text x="320" y="290" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="750" fill="#f7f8ff">${esc(label)}</text><text x="320" y="323" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#aeb7d0">Neutraler Kategorie-Platzhalter</text></svg>`;
  await fs.writeFile(path.join(out,"placeholders",`${category}.svg`),svg);
}
await fs.writeFile(path.join(out,"index.html"),page({title:"Aktuelle Deals und Angebote für Deutschland",description:"Echte aktuelle Deals, Gutscheine und Partnerangebote aus erlaubten Quellen – transparent geprüft und ohne Fake-Rabatte.",body:homeBodyForValidation,schema:{"@context":"https://schema.org","@type":"WebSite",name:config.siteName,alternateName:"Angebotslotse Deutschland",url:`${base}/`,inLanguage:"de-DE"}}));
const productEntityFor=(o,alternatives=[])=>{const priced=[o,...alternatives].filter(row=>hasPrice(row)&&(row.currency||"EUR")===(o.currency||"EUR"));const entity={"@type":"Product",name:o.title,description:o.description||undefined,image:o.imageUrl?[o.imageUrl,...(o.additionalImageUrls||[])]:undefined,sku:o.productId||undefined,mpn:o.mpn||undefined,brand:o.brand?{"@type":"Brand",name:o.brand}:undefined};if(priced.length>1){const prices=priced.map(row=>row.currentPrice);entity.offers={"@type":"AggregateOffer",lowPrice:Math.min(...prices),highPrice:Math.max(...prices),offerCount:priced.length,priceCurrency:o.currency||"EUR",url:`${base}/angebote/${o.slug}.html`};}else if(hasPrice(o)){entity.offers={"@type":"Offer",url:`${base}/angebote/${o.slug}.html`,price:o.currentPrice,priceCurrency:o.currency||"EUR",priceValidUntil:o.endDate||undefined,seller:{"@type":"Organization",name:o.advertiser}};}return entity;};
for(const o of offers){const pct=discount(o);const alternatives=comparisonFor(o);const entity=productEntityFor(o,alternatives);const comparison=alternatives.length?`<section class="comparison"><h2>Preisvergleich</h2><p>Abgleich über die eindeutige Produktkennung der offiziellen Quellen.</p><div>${[o,...alternatives].sort((a,b)=>a.currentPrice-b.currentPrice).map((row,index)=>`<a href="${esc(row.trackingUrl)}" rel="sponsored noopener"><span>${esc(row.advertiser)}</span><strong>${money(row.currentPrice,row.currency)}</strong>${index===0?"<em>Günstigstes Angebot</em>":""}</a>`).join("")}</div></section>`:"";const video=o.videoUrl?`<section class="offer-video"><h2>${esc(o.videoTitle||"Offizielles Produktvideo")}</h2><video controls preload="none"${o.videoPoster?` poster="${esc(o.videoPoster)}"`:""}><source src="${esc(o.videoUrl)}"></video><p>Quelle: ${esc(o.videoProvider||"offizieller Partner")}</p></section>`:"";const body=`<article class="detail">${breadcrumbNav(o)}<div class="detail-grid">${imageFor(o,false,true)}<div><div class="card-top"><span class="pill">${esc(labels[o.category]||o.category)}</span>${pct?`<span class="discount">-${pct} %</span>`:""}</div><p class="brandline">${brandLink(o)}</p><p class="merchant">${merchantLink(o)}</p><h1>${esc(o.title)}</h1><p class="lead">${esc(o.description||"Details und Bedingungen direkt beim Anbieter prüfen.")}</p>${o.currentPrice!=null?`<div class="price large"><strong>${money(o.currentPrice,o.currency)}</strong>${o.previousPrice?`<del>${money(o.previousPrice,o.currency)}</del>`:""}</div>`:""}${o.voucherCode?`<p class="voucher">Gutscheincode: <code>${esc(o.voucherCode)}</code></p>`:""}${o.endDate?`<p class="countdown" data-countdown="${esc(o.endDate)}">Gültig bis ${new Intl.DateTimeFormat("de-DE").format(new Date(o.endDate))}</p>`:""}<a class="button primary" rel="sponsored noopener" href="${esc(o.trackingUrl)}">Werbelink beim Anbieter öffnen ↗</a></div></div>${watchPanel(o)}${dealCheckModule(o,alternatives)}${historyModule(o)}${comparison}${video}${relatedOffersModule(o)}${o.terms?`<section><h2>Bedingungen</h2><p>${esc(o.terms)}</p></section>`:""}<p class="notice">Bei einem Kauf über diesen Werbelink können wir eine Provision erhalten. Maßgeblich sind Preis, Verfügbarkeit und Bedingungen auf der Händlerseite.</p></article>`;await fs.writeFile(path.join(out,"angebote",`${o.slug}.html`),page({title:o.title,description:o.description||`Angebot von ${o.advertiser}.`,canonical:`/angebote/${o.slug}.html`,body,socialImage:Boolean(o.imageUrl),socialImageUrl:o.imageUrl,socialImageAlt:o.imageAlt||o.title,schema:{"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Angebote",item:`${base}/`},{"@type":"ListItem",position:2,name:labels[o.category]||o.category,item:`${base}/${o.category}.html`},{"@type":"ListItem",position:3,name:o.title,item:`${base}/angebote/${o.slug}.html`}]},entity]}}));}
for(const o of offers.filter(o=>o.productId&&hasPrice(o))){const body=`<article class="detail product-detail"><a class="back" href="${url(`/${o.category}.html`)}">← ${esc(labels[o.category])}</a><div class="detail-grid">${imageFor(o,false,true)}<div><span class="pill">${esc(labels[o.category])}</span><p class="brandline">${brandLink(o)}</p><p class="merchant">${merchantLink(o)}</p><h1>${esc(o.title)}</h1><div class="price large"><strong>${money(o.currentPrice,o.currency)}</strong>${o.previousPrice?`<del>${money(o.previousPrice,o.currency)}</del>`:""}</div><p>${esc(o.description)}</p><p>Zuletzt aktualisiert: ${new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(o.updatedAt))}</p><a class="button primary" href="${esc(o.trackingUrl)}" rel="sponsored noopener">Werbelink öffnen ↗</a></div></div>${historyModule(o)}</article>`;await fs.writeFile(path.join(out,"produkt",`${o.slug}.html`),page({title:o.title,description:o.description||`${o.title} – aktueller Preis und Verlauf.`,canonical:`/angebote/${o.slug}.html`,body,socialImage:Boolean(o.imageUrl),socialImageUrl:o.imageUrl,socialImageAlt:o.imageAlt||o.title,schema:{"@context":"https://schema.org",...productEntityFor(o,comparisonFor(o))}}));}

const listingControlsFor=(category,rows)=>{
  if(!rows.length)return"";
  const brands=[...new Set(rows.map(o=>canonicalBrand(o.brand)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
  const merchants=[...new Set(rows.map(o=>o.advertiser).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
  const searchLabel=category?`In ${esc(labels[category]||category)} suchen`:"Angebote durchsuchen";
  const sortOptions=[
    '<option value="current">Aktuell</option>',
    rows.some(o=>o.endDate)?'<option value="ending">Endet bald</option>':"",
    rows.some(o=>discount(o))?'<option value="discount">Größter Rabatt</option>':"",
    rows.some(hasPrice)?'<option value="price">Preis aufsteigend</option>':""
  ].join("");
  return `<div class="listing-tools listing-filters" data-listing-filters>
    <label class="listing-search">${searchLabel}<input type="search" data-offer-search placeholder="Produkt, Marke oder Anbieter" autocomplete="off"></label>
    ${brands.length>1?`<label>Marke<select data-filter-brand><option value="">Alle Marken</option>${brands.map(name=>`<option value="${esc(name.toLowerCase())}">${esc(name)}</option>`).join("")}</select></label>`:""}
    ${merchants.length>1?`<label>Händler<select data-filter-merchant><option value="">Alle Händler</option>${merchants.map(name=>`<option value="${esc(name.toLowerCase())}">${esc(name)}</option>`).join("")}</select></label>`:""}
    ${rows.some(hasPrice)?'<label>Max. Preis<input type="number" data-filter-max-price min="0" step="0.01" inputmode="decimal" placeholder="kein Limit"></label>':""}
    ${rows.some(o=>discount(o))?'<label class="filter-check"><input type="checkbox" data-filter-discount> Nur Rabatt</label>':""}
    ${rows.length>1?`<label>Sortieren<select data-offer-sort>${sortOptions}</select></label>`:""}
    <button class="button small filter-reset" type="button" data-filter-reset>Zurücksetzen</button>
    <span class="filter-count" data-filter-count>${rows.length} Treffer</span>
  </div>`;
};
for(const category of categories){const rows=offers.filter(o=>o.category===category);const controls=listingControlsFor(category,rows);const categorySchema=rows.length?{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":`${base}/${category}.html#collection`,url:`${base}/${category}.html`,name:`${labels[category]}-Angebote`,description:`Aktuelle ${labels[category]}-Angebote aus erlaubten Quellen.`,inLanguage:"de-DE",mainEntity:{"@id":`${base}/${category}.html#offers`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Kategorien",item:`${base}/kategorien.html`},{"@type":"ListItem",position:2,name:labels[category],item:`${base}/${category}.html`}]},{"@type":"ItemList","@id":`${base}/${category}.html#offers`,numberOfItems:rows.length,itemListElement:rows.map((row,index)=>({"@type":"ListItem",position:index+1,name:row.title,url:`${base}/angebote/${row.slug}.html`}))}]}:null;await fs.writeFile(path.join(out,`${category}.html`),page({title:`${labels[category]}-Angebote`,description:rows.length?`Aktuelle ${labels[category]}-Angebote aus erlaubten Quellen.`:`Aktuell sind keine konkreten ${labels[category]}-Angebote verfügbar.`,canonical:`/${category}.html`,indexable:rows.length>0,body:`<section class="listing"><a class="back" href="${url("/kategorien.html")}">← Kategorien</a><span class="eyebrow">${rows.length} aktive Angebote</span><h1>${esc(labels[category])}</h1><p class="category-intro">${rows.length?`Konkrete ${esc(labels[category])}-Angebote aus angeschlossenen, erlaubten Quellen.`:`Aktuell keine konkreten ${esc(labels[category])}-Angebote. Diese Seite wird automatisch aktiviert, sobald eine freigegebene Quelle passende Produktdaten liefert.`}</p>${controls}<div class="deal-grid" data-sort-grid>${rows.map(card).join("")}</div><p data-no-filter-results hidden>Keine passenden Angebote gefunden.</p>${categoryGuideModule(category,rows)}</section>`,schema:categorySchema}));}
const discoveryPages=[
  ["neu.html","Neue Angebote","Nach dem ersten Erfassungszeitpunkt sortierte Angebote.",newOffers],
  ["endet-bald.html","Endet bald","Nur Angebote mit einem echten Ablaufdatum.",endingSoon],
  ["top-rabatte.html","Top-Rabatte","Nur Angebote mit verlässlichem aktuellem und vorherigem Preis.",topDiscounts],
  ["rabattcodes.html","Aktuelle Rabattcodes","Nur gültige, von Partnern gelieferte Gutscheincodes.",coupons],
  ["preis-gefallen.html","Preis gefallen","Nur Produkte mit einem in der echten Preishistorie gemessenen Preisrückgang.",priceDrops]
];
for(const [file,title,description,rows] of discoveryPages){const list=rows.length?rows.map(card).join(""):`<div class="empty"><h2>Noch keine passenden Live-Daten</h2><p>Diese Seite füllt sich automatisch, sobald die angeschlossenen Quellen verlässliche Daten liefern.</p></div>`;const discoveryCanonical=file==="rabattcodes.html"?"/rabattcodes/":`/${file}`;await fs.writeFile(path.join(out,file),page({title,description,canonical:discoveryCanonical,indexable:rows.length>0,body:`<section class="listing"><span class="eyebrow">Datengetriebene Auswahl</span><h1>${esc(title)}</h1><p class="category-intro">${esc(description)}</p><div class="deal-grid">${list}</div></section>`,schema:rows.length?{"@context":"https://schema.org","@type":"ItemList",numberOfItems:rows.length,itemListElement:rows.map((o,i)=>({"@type":"ListItem",position:i+1,url:`${base}/angebote/${o.slug}.html`,name:o.title}))}:null}));}
await fs.mkdir(path.join(out,"rabattcodes"),{recursive:true});
const couponList=coupons.length?coupons.map(card).join(""):`<div class="empty"><h2>Aktuell keine bestätigten Codes</h2><p>Abgelaufene Codes werden automatisch entfernt. Neue Codes erscheinen ausschließlich aus freigegebenen Partnerquellen.</p></div>`;
const couponSources=[...new Set(coupons.map(o=>sourceLabel(o.source)))];
await fs.writeFile(path.join(out,"rabattcodes","index.html"),page({title:"Rabattcodes",description:"Bestätigte Rabattcodes mit Bedingungen, Laufzeit, Quelle und gekennzeichnetem Affiliate-Link.",canonical:"/rabattcodes/",indexable:coupons.length>0,body:`<section class="listing coupon-page"><span class="eyebrow">Verifizierte Partnerdaten</span><h1>Rabattcodes</h1><p class="category-intro">Nur bestätigte, nicht abgelaufene Codes. Vorteil, Bedingungen und Ablaufdatum stammen direkt aus der jeweiligen Partnerquelle.</p>${couponSources.length?`<p class="coupon-source-note">Aktive Quellen: ${couponSources.map(esc).join(" · ")}</p>`:""}<div class="coupon-filters" aria-label="Verfügbare Filter"><span>Neu</span><span>Endet bald</span><span>Technik</span><span>Gaming</span><span>Mode</span><span>Haushalt</span><span>Sonstige</span></div><div class="deal-grid">${couponList}</div></section>`,schema:coupons.length?{"@context":"https://schema.org","@type":"ItemList",numberOfItems:coupons.length,itemListElement:coupons.map((o,i)=>({"@type":"ListItem",position:i+1,url:`${base}/angebote/${o.slug}.html`,name:o.title}))}:null}));
await fs.writeFile(path.join(out,"kategorien.html"),page({title:"Alle Angebotskategorien",description:"Gaming, Technik, Computer, Audio, Haushalt und weitere Angebotskategorien.",canonical:"/kategorien.html",body:`<section class="listing"><span class="eyebrow">Alle Bereiche</span><h1>Kategorien</h1><div class="category-grid large">${categoryTiles}</div></section>`,schema:{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":`${base}/kategorien.html#collection`,url:`${base}/kategorien.html`,name:"Angebotskategorien",description:"Aktive Angebotskategorien im Angebotslotsen.",inLanguage:"de-DE",mainEntity:{"@id":`${base}/kategorien.html#categories`}},{"@type":"ItemList","@id":`${base}/kategorien.html#categories`,numberOfItems:activeCategories.length,itemListElement:activeCategories.map((category,index)=>({"@type":"ListItem",position:index+1,name:labels[category]||category,url:`${base}/${category}.html`}))}]}}));
const searchControls=listingControlsFor(null,offers);
await fs.writeFile(path.join(out,"suche.html"),page({title:"Angebote durchsuchen",description:"Produktsuche über die aktuell veröffentlichten Angebote im Angebotslotsen.",canonical:"/suche.html",indexable:false,body:`<section class="listing search-page"><span class="eyebrow">${offers.length} veröffentlichte Angebote</span><h1>Angebote durchsuchen</h1><p class="category-intro">Suche nach Produkt, Marke, Shop oder Kategorie. Die Treffer stammen ausschließlich aus aktuell freigegebenen Angebotsdaten.</p>${searchControls}<div class="deal-grid" data-sort-grid>${offers.map(card).join("")}</div><div class="empty" data-no-filter-results hidden><h2>Kein passendes Angebot gefunden</h2><p>Versuche einen allgemeineren Produkt-, Marken- oder Shopnamen.</p></div></section>`}));

const watchlistBody='<section class="listing watchlist-page"><span class="eyebrow">Nur auf diesem Gerät gespeichert</span><h1>Merkliste & Wunschpreise</h1><p class="category-intro">Gemerkte Angebote und Wunschpreise werden ausschließlich im lokalen Browser gespeichert. Beim Öffnen dieser Seite werden sie mit dem aktuell eingebauten Angebotsstand verglichen.</p><div class="watchlist-summary" data-watch-summary></div><div class="watchlist-grid" data-watchlist></div><div class="empty" data-watch-empty><h2>Noch nichts gemerkt</h2><p>Öffne ein Angebot und speichere es mit oder ohne Wunschpreis.</p><a class="button primary" href="'+url("/suche.html")+'">Angebote durchsuchen</a></div><script type="application/json" id="watch-catalog">'+json(watchCatalog)+'</script></section>';
await fs.writeFile(path.join(out,"merkliste.html"),page({title:"Merkliste & Wunschpreise",description:"Lokale Merkliste mit Wunschpreisen für Angebotslotse-Angebote.",canonical:"/merkliste.html",indexable:false,body:watchlistBody}));

const authPublicConfig={
  url:config.supabase?.url||"",
  publishableKey:config.supabase?.publishableKey||"",
  googleAuthEnabled:Boolean(config.supabase?.googleAuthEnabled),
  webPushVapidPublicKey:config.supabase?.webPushVapidPublicKey||""
};
const accountBody=`<section class="listing account-page" data-account-root>
  <span class="eyebrow">Angebotslotse Konto</span>
  <h1>Merkliste, Wunschpreise & Alarme überall dabei</h1>
  <p class="category-intro">Ein Konto ist optional. Ohne Anmeldung bleibt deine lokale Merkliste erhalten. Mit Anmeldung kannst du sie sicher in deine persönliche Cloud-Merkliste übernehmen, Alarmregeln speichern und persönliche In-App-Meldungen zu Treffern erhalten.</p>
  <div class="account-status" data-account-status aria-live="polite"></div>
  <div class="account-grid">
    <section class="account-card" data-account-signed-out>
      <span class="eyebrow">Anmelden</span>
      <h2>Login per E-Mail-Link</h2>
      <p>Du bekommst einen einmaligen Anmeldelink. Angebotslotse speichert kein eigenes Passwort.</p>
      <form data-email-login class="account-login-form">
        <label>E-Mail-Adresse<input type="email" data-email-input autocomplete="email" required placeholder="name@beispiel.de"></label>
        <button class="button primary" type="submit">Anmeldelink senden</button>
      </form>
      <button class="button account-google" type="button" data-google-login${authPublicConfig.googleAuthEnabled?"":" aria-disabled=\"true\""}>Mit Google anmelden</button>
      <small>${authPublicConfig.googleAuthEnabled?"Google-Login ist aktiv.":"Google-Login ist technisch vorbereitet und wird nach Einrichtung des Google-OAuth-Clients freigeschaltet."}</small>
    </section>
    <section class="account-card" data-account-signed-in hidden>
      <span class="eyebrow">Angemeldet</span>
      <h2 data-user-email></h2>
      <p><strong data-cloud-count>0</strong> Einträge liegen aktuell in deiner Cloud-Merkliste.</p>
      <div class="account-actions">
        <button class="button primary" type="button" data-sync-watchlist>Lokale Merkliste synchronisieren</button>
        <a class="button" href="${url("/merkliste.html")}">Merkliste öffnen</a>
        <button class="button" type="button" data-logout>Abmelden</button>
      </div>
      <p class="account-sync-status" data-sync-status aria-live="polite"></p>
    </section>
    <section class="account-card account-alerts-card" data-account-alerts-card hidden>
      <span class="eyebrow">Persönliche Alarme</span>
      <h2>Neue Angebote automatisch beobachten</h2>
      <form class="account-alert-form" data-alert-form>
        <label>Alarmtyp
          <select data-alert-type>
            <option value="search">Suchbegriff</option>
            <option value="category">Kategorie</option>
            <option value="brand">Marke</option>
            <option value="merchant">Händler</option>
          </select>
        </label>
        <label>Begriff
          <input type="text" data-alert-query maxlength="240" required placeholder="z. B. RTX 5070 Ti, Gaming oder Samsung">
        </label>
        <label>Maximalpreis
          <input type="number" data-alert-max-price min="0.01" step="0.01" placeholder="optional">
        </label>
        <label>Mindest-Rabatt %
          <input type="number" data-alert-min-discount min="1" max="100" step="1" placeholder="optional">
        </label>
        <button class="button primary" type="submit">Alarm speichern</button>
      </form>
      <p class="account-sync-status" data-alert-status aria-live="polite"></p>
      <div class="account-alert-list" data-alert-list></div>
    </section>
    <section class="account-card account-matches-card" data-account-matches-card hidden>
      <span class="eyebrow">Aktuelle Treffer</span>
      <h2>Passende Angebote zu deinen Alarmen</h2>
      <p>Diese Treffer werden direkt aus den aktuell veröffentlichten Angeboten berechnet. Browser-Push kann im Konto kostenlos aktiviert werden; E-Mail-Versand bleibt optional für später.</p>
      <div class="account-match-list" data-alert-matches></div>
    </section>
    <section class="account-card account-notifications-card" data-account-notifications-card hidden>
      <span class="eyebrow">Benachrichtigungen</span>
      <h2>Deine persönlichen Meldungen</h2>
      <p>Wunschpreis, Preissturz, Wiederverfügbarkeit und neue Treffer erscheinen hier automatisch.</p>
      <div class="account-notification-actions">
        <button class="button" type="button" data-notifications-read-all>Alle als gelesen</button>
      </div>
      <p class="account-sync-status" data-notification-status aria-live="polite"></p>
      <div class="account-notification-list" data-notification-list></div>
    </section>
    <section class="account-card account-push-card" data-account-push-card hidden>
      <span class="eyebrow">Kostenlose Browser-Pushs</span>
      <h2>Preisalarme direkt als Benachrichtigung</h2>
      <p>Optional für Browser und installierte PWA. Dein Gerät wird erst nach deiner Browser-Freigabe registriert.</p>
      <div class="account-push-actions">
        <button class="button primary" type="button" data-push-enable>Push aktivieren</button>
        <button class="button" type="button" data-push-disable hidden>Push auf diesem Gerät deaktivieren</button>
      </div>
      <div class="account-push-preferences" data-push-preferences hidden>
        <label><input type="checkbox" data-push-price> Wunschpreis, Preissturz & Wiederverfügbarkeit</label>
        <label><input type="checkbox" data-push-matches> Neue Treffer aus persönlichen Alarmregeln</label>
      </div>
      <p class="account-sync-status" data-push-status aria-live="polite"></p>
    </section>
    <section class="account-card account-cashback-card" data-account-cashback-card hidden>
      <span class="eyebrow">Cashback · Beta</span>
      <h2>Deine bestätigten Cashback-Ansprüche</h2>
      <p>Cashback wird nur angezeigt, wenn ein Partnerprogramm es ausdrücklich erlaubt und eine zuordenbare Affiliate-Transaktion serverseitig bestätigt wurde. Nicht jeder Händler erlaubt Cashback.</p>
      <div class="account-cashback-summary">
        <div><strong data-cashback-confirmed>0,00&nbsp;€</strong><small>bestätigt / ausgezahlt</small></div>
        <div><strong data-cashback-pending>0,00&nbsp;€</strong><small>noch in Prüfung</small></div>
      </div>
      <p class="account-sync-status" data-cashback-status aria-live="polite"></p>
      <div class="account-cashback-list" data-cashback-list></div>
      <small>Aktuell erfolgt keine automatische Auszahlung. Ansprüche werden erst nach bestätigter Partnertransaktion erzeugt.</small>
    </section>
    <section class="account-card account-security-card">
      <span class="eyebrow">Datenschutz & Kontrolle</span>
      <h2>Deine Daten bleiben unter deiner Kontrolle</h2>
      <ul>
        <li>gemerkte Angebots-IDs und Wunschpreise</li>
        <li>deine selbst gewählten Alarmregeln</li>
        <li>Benachrichtigungseinstellungen</li>
      </ul>
      <p>Käufe, Zahlungsdaten und Händlerkonten bleiben vollständig beim jeweiligen Anbieter. Für Cashback können später ausschließlich eine pseudonyme Affiliate-Transaktionsreferenz, Status und Cashback-Betrag gespeichert werden; Zahlungsdaten werden nicht im Browser benötigt.</p>
      <div class="account-actions" data-account-data-actions hidden>
        <button class="button" type="button" data-export-account>Meine Daten exportieren</button>
        <button class="button danger" type="button" data-delete-account>Konto vollständig löschen</button>
      </div>
      <p class="account-sync-status" data-account-data-status aria-live="polite"></p>
    </section>
  </div>
  <script>globalThis.ANGEBOTSLOTSE_AUTH_CONFIG=${json(authPublicConfig)};<\/script>
  <script src="${url("/account-client.js")}" defer><\/script>
</section>`;
await fs.writeFile(path.join(out,"konto.html"),page({title:"Konto & Preisalarme",description:"Optionales Angebotslotse-Konto für Cloud-Merkliste, Wunschpreise, Alarmregeln und persönliche In-App-Benachrichtigungen.",canonical:"/konto.html",indexable:false,body:accountBody}));

const shopIndexCards=shopGroups.map(([name,rows])=>{const slug=shopPageByName.get(name);const categoriesForShop=[...new Set(rows.map(row=>labels[row.category]||row.category))].slice(0,4);return `<a class="shop-card" href="${url(`/shops/${slug}.html`)}"><span class="eyebrow">Shop</span><strong>${esc(name)}</strong><b>${rows.length} aktive Angebote</b><small>${esc(categoriesForShop.join(" · "))}</small></a>`;}).join("");
await fs.writeFile(path.join(out,"shops.html"),page({title:"Shops und Händler",description:"Händler mit mehreren aktuell veröffentlichten Angeboten im Angebotslotsen.",canonical:"/shops.html",body:`<section class="listing shops-page"><span class="eyebrow">${shopGroups.length} Händler mit eigener Übersicht</span><h1>Shops & Händler</h1><p class="category-intro">Eigene Shopseiten entstehen erst ab mindestens drei veröffentlichungsfähigen Angeboten. So vermeiden wir leere oder dünne Händlerseiten.</p><div class="shop-grid">${shopIndexCards}</div></section>`,schema:{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":`${base}/shops.html#collection`,url:`${base}/shops.html`,name:"Shops & Händler",description:"Händler mit mehreren aktuell veröffentlichten Angeboten im Angebotslotsen.",inLanguage:"de-DE",mainEntity:{"@id":`${base}/shops.html#shops`}},{"@type":"ItemList","@id":`${base}/shops.html#shops`,numberOfItems:shopGroups.length,itemListElement:shopGroups.map(([name],index)=>({"@type":"ListItem",position:index+1,name,url:`${base}/shops/${shopPageByName.get(name)}.html`}))}]}}));
const shopGuideModule=(name,rows)=>{
  const withHistory=rows.filter(row=>historyFor(priceHistory,row,30,now).length>=2).length;
  const discounted=rows.filter(row=>discount(row)>0).length;
  const codes=rows.filter(row=>row.voucherCode).length;
  const sources=[...new Set(rows.map(row=>sourceLabel(row.source)))].sort((a,b)=>a.localeCompare(b,"de"));
  const categoryCounts=[...rows.reduce((map,row)=>map.set(row.category,(map.get(row.category)||0)+1),new Map())].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),"de"));
  const categoryLinks=categoryCounts.map(([slug,count])=>activeCategories.includes(slug)?`<a href="${url(`/${slug}.html`)}">${esc(labels[slug]||slug)} <span>${count}</span></a>`:`<span>${esc(labels[slug]||slug)} <b>${count}</b></span>`).join("");
  return `<section class="shop-guide"><div><span class="eyebrow">Datencheck zu ${esc(name)}</span><h2>Was aktuell vorliegt</h2><p>Diese Übersicht bewertet den Händler nicht. Sie zeigt nur, welche belegbaren Angebotsdaten im aktuellen Angebotslotse-Bestand vorhanden sind.</p></div><div class="shop-guide-facts"><span><strong>${withHistory}</strong> mit Preisverlauf</span><span><strong>${discounted}</strong> mit belegtem Rabatt</span><span><strong>${codes}</strong> mit bestätigtem Code</span><span><strong>${sources.length}</strong> Quelltyp${sources.length===1?"":"en"}</span></div><div class="shop-guide-categories">${categoryLinks}</div><p class="shop-guide-source">Quellen: ${esc(sources.join(", ")||"keine aktiven Quellen")}. <a href="${url("/methodik.html")}">Methodik ansehen →</a></p></section>`;
};
for(const [name,rows] of shopGroups){const slug=shopPageByName.get(name);const priced=rows.filter(hasPrice);const lowest=priced.length?Math.min(...priced.map(row=>row.currentPrice)):null;const shopCategories=[...new Set(rows.map(row=>labels[row.category]||row.category))];const shopControls=`<div class="listing-tools"><label>Bei ${esc(name)} suchen<input type="search" data-offer-search placeholder="Produkt oder Marke"></label><label>Sortieren<select data-offer-sort><option value="current">Aktuell</option><option value="discount">Größter Rabatt</option><option value="price">Preis aufsteigend</option><option value="ending">Endet bald</option></select></label></div>`;const summary=`<div class="shop-summary"><span><b>${rows.length}</b> aktive Angebote</span>${lowest!=null?`<span><b>ab ${money(lowest,priced[0]?.currency||"EUR")}</b> aktuell gelistet</span>`:""}<span><b>${shopCategories.length}</b> Bereiche</span></div>`;await fs.writeFile(path.join(out,"shops",`${slug}.html`),page({title:`${name} Angebote`,description:`Aktuelle ${name}-Angebote, Preise und Aktionen aus freigegebenen Quellen im Angebotslotsen.`,canonical:`/shops/${slug}.html`,body:`<section class="listing shop-detail-page"><a class="back" href="${url("/shops.html")}">← Alle Shops</a><span class="eyebrow">Shop-Übersicht · zuletzt ${esc(updated)}</span><h1>${esc(name)}</h1><p class="category-intro">Aktuell veröffentlichte Angebote von ${esc(name)}. Preisvorteile und Rabatte werden nur angezeigt, wenn sie aus den angeschlossenen Quellen belegbar sind.</p>${summary}${shopGuideModule(name,rows)}${shopControls}<div class="deal-grid" data-sort-grid>${rows.map(card).join("")}</div><div class="empty" data-no-filter-results hidden><h2>Keine passenden Treffer</h2></div></section>`,schema:{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":`${base}/shops/${slug}.html#collection`,url:`${base}/shops/${slug}.html`,name:`${name} Angebote`,description:`Aktuelle ${name}-Angebote aus freigegebenen Quellen.`,inLanguage:"de-DE",mainEntity:{"@id":`${base}/shops/${slug}.html#offers`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Shops",item:`${base}/shops.html`},{"@type":"ListItem",position:2,name,item:`${base}/shops/${slug}.html`}]},{"@type":"ItemList","@id":`${base}/shops/${slug}.html#offers`,numberOfItems:rows.length,itemListElement:rows.map((row,index)=>({"@type":"ListItem",position:index+1,name:row.title,url:`${base}/angebote/${row.slug}.html`}))}]}}));}
const brandIndexCards=brandGroups.map(([name,rows])=>{
  const slug=brandPageByName.get(name);
  const merchants=new Set(rows.map(row=>row.advertiser)).size;
  const categoriesForBrand=[...new Set(rows.map(row=>labels[row.category]||row.category))].slice(0,4);
  return `<a class="shop-card brand-card" href="${url(`/marken/${slug}.html`)}"><span class="eyebrow">Marke</span><strong>${esc(name)}</strong><b>${rows.length} aktive Angebote</b><small>${merchants} Händler · ${esc(categoriesForBrand.join(" · "))}</small></a>`;
}).join("");
await fs.writeFile(path.join(out,"marken.html"),page({
  title:"Marken im Angebotslotse",
  description:"Marken mit mehreren aktuell veröffentlichten Angeboten, Preisverläufen und Händlervergleichen im Angebotslotsen.",
  canonical:"/marken.html",
  indexable:brandGroups.length>0,
  body:`<section class="listing brands-page"><span class="eyebrow">${brandGroups.length} Marken mit eigener Übersicht</span><h1>Marken</h1><p class="category-intro">Eine eigene Markenseite entsteht erst ab mindestens fünf veröffentlichungsfähigen Angeboten. Dadurch bleiben die Übersichten datenreich und vergleichbar.</p><div class="shop-grid brand-grid">${brandIndexCards}</div></section>`,
  schema:{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":`${base}/marken.html#collection`,url:`${base}/marken.html`,name:"Marken",description:"Marken mit mehreren aktuell veröffentlichten Angeboten im Angebotslotsen.",inLanguage:"de-DE",mainEntity:{"@id":`${base}/marken.html#brands`}},{"@type":"ItemList","@id":`${base}/marken.html#brands`,numberOfItems:brandGroups.length,itemListElement:brandGroups.map(([name],index)=>({"@type":"ListItem",position:index+1,name,url:`${base}/marken/${brandPageByName.get(name)}.html`}))}]}
}));
for(const [name,rows] of brandGroups){
  const slug=brandPageByName.get(name);
  const merchants=[...new Set(rows.map(row=>row.advertiser))].sort((a,b)=>a.localeCompare(b,"de"));
  const categoriesForBrand=[...rows.reduce((map,row)=>map.set(row.category,(map.get(row.category)||0)+1),new Map())].sort((a,b)=>b[1]-a[1]);
  const withHistory=rows.filter(row=>historyFor(priceHistory,row,30,now).length>=2).length;
  const discounted=rows.filter(row=>discount(row)>0).length;
  const priced=rows.filter(hasPrice);
  const lowest=priced.length?Math.min(...priced.map(row=>row.currentPrice)):null;
  const categoryLinks=categoriesForBrand.map(([category,count])=>activeCategories.includes(category)?`<a href="${url(`/${category}.html`)}">${esc(labels[category]||category)} <span>${count}</span></a>`:`<span>${esc(labels[category]||category)} <b>${count}</b></span>`).join("");
  const merchantLinks=merchants.slice(0,8).map(merchant=>{const merchantSlug=shopPageByName.get(merchant);return merchantSlug?`<a href="${url(`/shops/${merchantSlug}.html`)}">${esc(merchant)}</a>`:`<span>${esc(merchant)}</span>`;}).join("");
  const controls=`<div class="listing-tools"><label>Bei ${esc(name)} suchen<input type="search" data-offer-search placeholder="Produkt oder Händler"></label><label>Sortieren<select data-offer-sort><option value="current">Aktuell</option><option value="discount">Größter Rabatt</option><option value="price">Preis aufsteigend</option><option value="ending">Endet bald</option></select></label></div>`;
  const summary=`<div class="shop-summary"><span><b>${rows.length}</b> aktive Angebote</span><span><b>${merchants.length}</b> Händler</span><span><b>${withHistory}</b> mit Preisverlauf</span>${lowest!=null?`<span><b>ab ${money(lowest,priced[0]?.currency||"EUR")}</b> gelistet</span>`:""}</div>`;
  const guide=`<section class="shop-guide brand-guide"><div><span class="eyebrow">Datencheck zu ${esc(name)}</span><h2>Was aktuell vorliegt</h2><p>Diese Seite bewertet die Marke nicht. Sie bündelt ausschließlich aktuell veröffentlichte Angebote und belegbare Preis-/Quelldaten.</p></div><div class="shop-guide-facts"><span><strong>${discounted}</strong> mit belegtem Rabatt</span><span><strong>${withHistory}</strong> mit Preisverlauf</span><span><strong>${merchants.length}</strong> Händler</span><span><strong>${categoriesForBrand.length}</strong> Bereiche</span></div><div class="shop-guide-categories">${categoryLinks}</div><div class="shop-guide-categories">${merchantLinks}</div><p class="shop-guide-source"><a href="${url("/methodik.html")}">Methodik ansehen →</a></p></section>`;
  await fs.writeFile(path.join(out,"marken",`${slug}.html`),page({
    title:`${name} Angebote und Preise`,
    description:`Aktuelle ${name}-Angebote, Händler, Preisverläufe und belegte Rabatte aus freigegebenen Quellen im Angebotslotsen.`,
    canonical:`/marken/${slug}.html`,
    body:`<section class="listing brand-detail-page"><a class="back" href="${url("/marken.html")}">← Alle Marken</a><span class="eyebrow">Markenübersicht · zuletzt ${esc(updated)}</span><h1>${esc(name)}</h1><p class="category-intro">Aktuell veröffentlichte Angebote der Marke ${esc(name)} aus erlaubten Affiliate- und Partnerquellen. Endpreise und Verfügbarkeit werden beim jeweiligen Händler bestätigt.</p>${summary}${guide}${controls}<div class="deal-grid" data-sort-grid>${rows.map(card).join("")}</div><div class="empty" data-no-filter-results hidden><h2>Keine passenden Treffer</h2></div></section>`,
    schema:{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":`${base}/marken/${slug}.html#collection`,url:`${base}/marken/${slug}.html`,name:`${name} Angebote und Preise`,description:`Aktuelle ${name}-Angebote aus freigegebenen Quellen.`,inLanguage:"de-DE",mainEntity:{"@id":`${base}/marken/${slug}.html#offers`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Marken",item:`${base}/marken.html`},{"@type":"ListItem",position:2,name,item:`${base}/marken/${slug}.html`}]},{"@type":"ItemList","@id":`${base}/marken/${slug}.html#offers`,numberOfItems:rows.length,itemListElement:rows.map((row,index)=>({"@type":"ListItem",position:index+1,name:row.title,url:`${base}/angebote/${row.slug}.html`}))}]}
  }));
}
const amazonOfferByAsin=new Map(offers.filter(o=>o.source==="amazon"&&o.productId).map(o=>[String(o.productId).toUpperCase(),o]));
const bookPageByAsin=new Map(bookEntries.map(book=>[String(book.asin).toUpperCase(),shopSlug(book.title)]));
const bookCards=bookEntries.map(book=>{
  const live=amazonOfferByAsin.get(String(book.asin).toUpperCase());
  const slug=bookPageByAsin.get(String(book.asin).toUpperCase());
  const media=live?.imageUrl?`<div class="owned-project-media"><img src="${esc(live.imageUrl)}" alt="${esc(live.imageAlt||book.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>`:"";
  const price=live&&hasPrice(live)?`<strong class="owned-project-price">${money(live.currentPrice,live.currency)}</strong>`:"";
  const note=live?"Live-Preis und Bild stammen aus der Amazon Creators API; maßgeblich bleibt die Amazon-Produktseite.":"Preis, Format und Verfügbarkeit werden direkt bei Amazon geprüft.";
  return `<article class="owned-project-card">${media}<span class="eyebrow">Buch · ASIN ${esc(book.asin)}</span><h2><a href="${url(`/buecher/${slug}.html`)}">${esc(book.title)}</a></h2><p>${esc(book.description||"Buch von Joel Leroy Lehrheuer.")}</p>${price}<div class="owned-project-actions"><a class="button primary" href="${url(`/buecher/${slug}.html`)}">Buchdetails ansehen →</a></div><small>${esc(note)}</small></article>`;
}).join("");
const booksBody=`<section class="listing owned-project-page"><span class="eyebrow">Eigene Veröffentlichungen</span><h1>Bücher von Joel</h1><p class="category-intro">Joels eigene Bücher, klar getrennt von automatisch bewerteten Deals. Amazon-Preise werden erst angezeigt, wenn die offizielle Creators API freigeschaltet und verbunden ist.</p><div class="owned-project-grid">${bookCards}</div>${authorEntry?.url?`<p class="owned-project-footer"><a class="button" href="${esc(authorEntry.url)}" rel="noopener" target="_blank">Autorenseite bei Amazon öffnen ↗</a></p>`:""}</section>`;
await fs.writeFile(path.join(out,"buecher.html"),page({title:"Bücher von Joel Leroy Lehrheuer",description:"Bücher von Joel Leroy Lehrheuer mit eigenen Detailseiten, Amazon-Verweisen und transparenter Trennung von Angebotslotse-Deals.",canonical:"/buecher.html",body:booksBody,schema:{"@context":"https://schema.org","@type":"ItemList",numberOfItems:bookEntries.length,itemListElement:bookEntries.map((book,index)=>({"@type":"ListItem",position:index+1,name:book.title,url:`${base}/buecher/${bookPageByAsin.get(String(book.asin).toUpperCase())}.html`}))}}));
for(const book of bookEntries){
  const asin=String(book.asin).toUpperCase();
  const live=amazonOfferByAsin.get(asin);
  const slug=bookPageByAsin.get(asin);
  const amazonUrl=live?.trackingUrl||book.url;
  const rel=live?"sponsored noopener":"noopener";
  const media=live?.imageUrl?`<div class="owned-project-media detail-media"><img src="${esc(live.imageUrl)}" alt="${esc(live.imageAlt||book.title)}" decoding="async" referrerpolicy="no-referrer"></div>`:"";
  const price=live&&hasPrice(live)?`<div class="price large"><strong>${money(live.currentPrice,live.currency)}</strong>${live.previousPrice>live.currentPrice?`<del>${money(live.previousPrice,live.currency)}</del>`:""}</div>`:`<p class="price-note">Aktuellen Preis bei Amazon prüfen</p>`;
  const sourceNote=live?"Preis und Bild stammen aus der offiziellen Amazon Creators API. Verfügbarkeit und endgültiger Preis werden bei Amazon bestätigt.":"Amazon-Preis und Verfügbarkeit werden direkt auf der Produktseite geprüft.";
  const body=`<article class="detail book-detail"><a class="back" href="${url("/buecher.html")}">← Alle Bücher</a><div class="detail-grid">${media}<div><span class="eyebrow">Eigenes Buch · ASIN ${esc(asin)}</span><h1>${esc(book.title)}</h1><p class="lead">${esc(book.description||"Buch von Joel Leroy Lehrheuer.")}</p><p><strong>Autor:</strong> ${esc(book.author||legalName)}</p>${price}<a class="button primary" href="${esc(amazonUrl)}" rel="${rel}" target="_blank">Bei Amazon ansehen ↗</a><small class="ad-label">${live?"Werbelink · ":""}${esc(sourceNote)}</small></div></div><section class="book-about"><h2>Über dieses Buch</h2><p>${esc(book.description||"Eigene Veröffentlichung von Joel Leroy Lehrheuer.")}</p><dl><div><dt>Autor</dt><dd>${esc(book.author||legalName)}</dd></div><div><dt>ASIN</dt><dd>${esc(asin)}</dd></div><div><dt>Bezugsquelle</dt><dd>Amazon.de</dd></div></dl></section></article>`;
  const bookSchema={"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Bücher",item:`${base}/buecher.html`},{"@type":"ListItem",position:2,name:book.title,item:`${base}/buecher/${slug}.html`}]},{"@type":"Book",name:book.title,description:book.description||undefined,author:{"@type":"Person",name:book.author||legalName},identifier:asin,url:`${base}/buecher/${slug}.html`,image:live?.imageUrl||undefined,offers:live&&hasPrice(live)?{"@type":"Offer",price:live.currentPrice,priceCurrency:live.currency||"EUR",url:amazonUrl,seller:{"@type":"Organization",name:"Amazon.de"}}:undefined}]};
  await fs.writeFile(path.join(out,"buecher",`${slug}.html`),page({title:book.title,description:book.description||`${book.title} von ${book.author||legalName}.`,canonical:`/buecher/${slug}.html`,body,socialImage:Boolean(live?.imageUrl),socialImageUrl:live?.imageUrl||url("/og.png"),socialImageAlt:live?.imageAlt||book.title,schema:bookSchema}));
}

const merchUrl=merchEntry?.url||"https://joel271997.myspreadshop.de/";
const merchBody=`<section class="listing merch-page"><span class="eyebrow">Eigener Shop</span><h1>Joel Merch</h1><p class="category-intro">Der Merch-Shop wird erst nach deiner Auswahl geladen. Dadurch wird nicht schon beim normalen Seitenaufruf eine Verbindung zu Spreadshop hergestellt.</p><div class="merch-loader" id="spreadshop-container" data-spreadshop data-shop-name="joel271997" data-shop-prefix="https://joel271997.myspreadshop.de" data-shop-script="https://joel271997.myspreadshop.net/js/shopclient.nocache.js"><div class="merch-loader-copy"><strong>Merch direkt hier ansehen</strong><p>Beim Laden werden Inhalte und Skripte von Spreadshop eingebunden. Danach gelten zusätzlich die Datenschutz- und Cookie-Regeln von Spreadshop.</p><button class="button primary" type="button" data-load-spreadshop>Spreadshop hier laden</button><a class="button" href="${esc(merchUrl)}" rel="noopener" target="_blank">Shop separat öffnen ↗</a><p class="merch-status" data-spreadshop-status aria-live="polite"></p></div></div></section>`;
await fs.writeFile(path.join(out,"merch.html"),page({title:"Joel Merch",description:"Offizieller Joel-Merch-Shop, datenschutzfreundlich erst nach Auswahl eingebunden.",canonical:"/merch.html",body:merchBody}));

const methodSources=[...new Set(offers.map(o=>sourceLabel(o.source)))].sort((a,b)=>a.localeCompare(b,"de"));
const offersWithHistory=new Set(priceHistory.map(row=>row.productId)).size;
const methodBody=`<article class="text-page methodology-page">
  <span class="eyebrow">Transparente Methodik</span>
  <h1>So prüft Angebotslotse Deals</h1>
  <p class="lead">Angebotslotse ist ein Vermittlungs- und Vergleichsportal, kein Händler. Ein Produkt wird beim jeweiligen Partner gekauft; Provisionen verändern unsere Preis- und Rabattberechnung nicht.</p>
  <div class="method-stats">
    <div><strong>${offers.length}</strong><span>aktuell veröffentlichte Angebote</span></div>
    <div><strong>${priceHistory.length}</strong><span>gespeicherte Preismesspunkte</span></div>
    <div><strong>${offersWithHistory}</strong><span>Produkte mit Preisverlauf</span></div>
    <div><strong>${methodSources.length}</strong><span>aktuell aktive Quelltypen</span></div>
  </div>
  <section><h2>1. Nur erlaubte Quellen</h2><p>Produkte, Aktionen, Bilder, Preise und Trackinglinks werden nur aus angebundenen Affiliate-Netzwerken, offiziellen Produktfeeds oder bestätigten Direktpartnerschaften übernommen. Aktuell veröffentlichte Quelltypen: <strong>${esc(methodSources.join(", ")||"keine aktiven Quellen")}</strong>. Nicht dokumentiertes Scraping und selbst konstruierte Affiliate-Links sind ausgeschlossen.</p></section>
  <section><h2>2. Rabatt nur mit belastbarem Vergleichspreis</h2><p>Ein Prozent-Rabatt erscheint nur, wenn die Quelle sowohl einen aktuellen Preis als auch einen höheren gültigen Vergleichspreis liefert. Fehlt ein solcher Wert, zeigt Angebotslotse keinen erfundenen Streichpreis und keine erfundene Ersparnis.</p></section>
  <section><h2>3. Preisverlauf aus echten Messpunkten</h2><p>Preisverläufe entstehen aus tatsächlich gespeicherten positiven Preisen. Unveränderte Werte werden nicht unnötig vervielfacht; Preisänderungen bleiben nachvollziehbar. Der 30-Tage-Tiefstpreis auf einer Angebotsseite stammt aus diesen Messpunkten, nicht aus einer Werbeaussage des Händlers.</p></section>
  <section><h2>4. Verfügbarkeit und Archivierung</h2><p>Abgelaufene oder aus den Quellen entfernte Angebote werden aus dem aktiven Bestand genommen und ohne aktiven Trackinglink archiviert. Seiten mit unzureichenden Produktdaten oder fehlenden erlaubten Medien werden nicht als vollständige Produktangebote veröffentlicht.</p></section>
  <section><h2>5. Vergleich nur bei eindeutiger Produktidentität</h2><p>Mehrere Händler werden nur dann als Preisvergleich zusammengeführt, wenn belastbare Produktkennungen wie GTIN/EAN, MPN plus Marke oder eine eindeutige Quell-ID passen. Gleiche Namen allein reichen nicht aus.</p></section>
  <section><h2>6. Affiliate-Provision ist keine Qualitätsnote</h2><p>Werbelinks sind als solche gekennzeichnet. Eine mögliche Provision entscheidet nicht darüber, ob ein Rabatt angezeigt wird oder wie hoch er ausfällt. Maßgeblich sind die gelieferten Preis-, Produkt- und Laufzeitdaten. Der endgültige Preis und die Verfügbarkeit werden immer auf der Händlerseite bestätigt.</p></section>
  <section><h2>7. Automatische Aktualisierung</h2><p>Die Angebotsdaten werden automatisiert mehrmals täglich aktualisiert. Zusätzlich laufen Integritäts-, SEO- und Sicherheitsprüfungen. Persönliche Preisalarme werden serverseitig separat geprüft und verändern den öffentlichen Dealbestand nicht.</p></section>
  <aside class="method-note"><strong>Wichtig:</strong> Angebotslotse verkauft keine Produkte, verarbeitet keine Zahlungen und übernimmt keine Händlergarantie. Bei Abweichungen gilt die Zielseite des jeweiligen Anbieters.</aside>
</article>`;
await fs.writeFile(path.join(out,"methodik.html"),page({title:"So prüfen wir Deals",description:"Methodik von Angebotslotse: Quellen, Rabattberechnung, Preisverlauf, Produktidentität, Archivierung und Affiliate-Transparenz.",canonical:"/methodik.html",body:methodBody,schema:{"@context":"https://schema.org","@type":"WebPage",name:"So prüft Angebotslotse Deals",description:"Transparente Methodik für Quellen, Preise, Rabatte, Preisverläufe und Affiliate-Links.",url:`${base}/methodik.html`}}));

const info={"ueber.html":["Über Angebotslotse","Angebotslotse bündelt Händleraktionen aus erlaubten Affiliate-Schnittstellen und bestätigten Direktpartnerschaften. Laufzeit, Region und Datenqualität werden automatisiert geprüft. Eigene Projekte bleiben klar vom Dealbereich getrennt.","/ueber.html"],"affiliate.html":["Affiliate-Hinweis","Ausgehende Angebotslinks sind als Werbelink gekennzeichnet und mit rel=\"sponsored\" markiert. Bei einer vergüteten Aktion kann der Betreiber eine Provision erhalten; für Nutzer entstehen dadurch grundsätzlich keine zusätzlichen Kosten. Die Vergütung belegt weder Qualität noch Preisvorteil. Maßgeblich ist stets die Zielseite.","/affiliate.html"],"datenschutz.html":["Datenschutzerklärung",`Verantwortlicher: ${legalName}, ${legalAddress}. E-Mail: ${email}.\nHosting: Diese statische Website wird über GitHub Pages bereitgestellt. GitHub kann zur sicheren Auslieferung technische Server-Logdaten verarbeiten.\nAffiliate-Links: Erst beim Anklicken eines gekennzeichneten externen Links wird Angebotslotse verlassen. Awin, Impact, Amazon oder der direkte Partner können dann Daten nach ihren eigenen Datenschutzinformationen verarbeiten.\nMerch-Shop: Die eingebettete Spreadshop-Ansicht auf /merch.html wird erst nach einem ausdrücklichen Klick geladen. Erst dann wird eine Verbindung zu Spreadshop hergestellt und deren externe Shop-Software nachgeladen.\nInstant Gaming: Der direkte Affiliate-Link ist ohne zusätzlichen Fremdcode nutzbar. Der externe Instant-Gaming-Partnerbanner wird erst nach einem ausdrücklichen Klick geladen; erst dann wird die Banner-API des Partners kontaktiert.\nMerkliste, Wunschpreise und Konto: Ohne Anmeldung bleiben gemerkte Angebote und Wunschpreise ausschließlich im lokalen Browser-Speicher (localStorage) des verwendeten Geräts. Bei freiwilliger Kontoanmeldung können Merkliste, Wunschpreise, Alarmregeln, Benachrichtigungseinstellungen und – nur bei aktiviertem Cashback – zugeordnete Cashback-Ansprüche in der Angebotslotse-Cloud auf Basis von Supabase gespeichert und geräteübergreifend synchronisiert werden. Die Anmeldung wird über Supabase Auth verarbeitet; Angebotslotse speichert kein eigenes Passwort. Private Nutzerdateien werden in einem nicht öffentlichen Supabase-Storage-Bereich pro Nutzer getrennt gespeichert. Käufe und Zahlungsdaten werden nicht im Angebotslotse-Konto verarbeitet.\nCookies und Analyse: Angebotslotse setzt ohne aktivierte Besucherstatistik keine eigenen Analyse- oder Marketing-Cookies ein.\nKontakt: Per E-Mail übermittelte Angaben werden nur zur Bearbeitung und aufgrund gesetzlicher Pflichten verarbeitet.\nBetroffenenrechte: Im gesetzlichen Rahmen bestehen Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Beschwerde.\nStand: 27. September 2026.`,"/datenschutz.html"],"impressum.html":["Impressum",`Angaben gemäß § 5 DDG\n${legalName}\n${legalAddress}\nKontakt: ${email}\nVerantwortlich gemäß § 18 Abs. 2 MStV: ${legalName}, Anschrift wie vorstehend.`,"/impressum.html"],"kontakt.html":["Feedback & Kontakt",`Fragen, Feedback, Korrekturhinweise oder Meldungen zu abgelaufenen Angeboten bitte per E-Mail an ${email}. Wir bieten keine individuelle Kauf- oder Rechtsberatung.`,"/kontakt.html"]};
if(analyticsToken)info["datenschutz.html"][1]=info["datenschutz.html"][1].replace("Cookies und Analyse: Angebotslotse setzt ohne aktivierte Besucherstatistik keine eigenen Analyse- oder Marketing-Cookies ein.","Besucherstatistik: Angebotslotse nutzt Cloudflare Web Analytics für zusammengefasste Aufruf- und Leistungsdaten. Beim Laden des Cloudflare-Skripts und Übertragen der Messung wird die IP-Adresse transportbedingt verarbeitet. Cloudflare erklärt, Web Analytics verwende keine Cookies, erstelle keine individuellen Profile, verfolge Besucher nicht websiteübergreifend und erhebe oder verwende keine personenbezogenen Besucherdaten. Es wird kein Marketing-Tracking eingesetzt.");
for(const [file,[title,copy,canonical]] of Object.entries(info))await fs.writeFile(path.join(out,file),page({title,description:copy.slice(0,155),canonical,body:`<section class="text-page"><span class="eyebrow">Information</span><h1>${esc(title)}</h1>${copy.split("\n").map(p=>`<p>${esc(p)}</p>`).join("")}</section>`}));
const sourceRows=Object.entries(status.sources||{}).map(([name,s])=>`<div><dt>${esc(name)}</dt><dd>${esc(s.state)} · ${Number(s.count)||0} Datensätze</dd></div>`).join("");
const statusStored=Number.isFinite(Number(status.storedOffers))?Number(status.storedOffers):storedOffers.length;
const statusStale=Number.isFinite(Number(status.stale))?Number(status.stale):storedOffers.filter(offer=>offer.isStale).length;
const statusAwaitingMedia=Number.isFinite(Number(status.awaitingMedia))?Number(status.awaitingMedia):storedOffers.filter(offer=>!isQuarantined(offer)&&isAwaitingMediaOffer(offer)).length;
const statusBlockedPublisherPromotions=Number.isFinite(Number(status.blockedPublisherPromotions))?Number(status.blockedPublisherPromotions):storedOffers.filter(offer=>!offer.isStale&&!isQuarantined(offer)&&isPublisherPromotion(offer)).length;
const statusQuarantined=Number.isFinite(Number(status.quarantined))?Number(status.quarantined):storedOffers.filter(isQuarantined).length;
await fs.writeFile(path.join(out,"status.html"),page({title:"Systemstatus",description:"Status der Angebotsquellen und letzten Aktualisierung.",canonical:"/status.html",body:`<section class="text-page"><span class="eyebrow">Transparenz</span><h1>Systemstatus</h1><div class="status ${esc(status.state)}"><strong>${status.state==="ok"?"System betriebsbereit":"Aktualisierung eingeschränkt"}</strong><p>${esc(status.message)}</p></div><dl><div><dt>Veröffentlichte Angebote</dt><dd>${offers.length}</dd></div><div><dt>Gespeicherter Bestand</dt><dd>${statusStored}</dd></div><div><dt>Veraltet zurückgehalten</dt><dd>${statusStale}</dd></div><div><dt>Warten auf Medien</dt><dd>${statusAwaitingMedia}</dd></div><div><dt>Publisher-Werbetexte blockiert</dt><dd>${statusBlockedPublisherPromotions}</dd></div><div><dt>Quarantänisiert</dt><dd>${statusQuarantined}</dd></div>${status.archivedTotal!=null?`<div><dt>Historisch archiviert</dt><dd>${Number(status.archivedTotal)||0}</dd></div>`:""}<div><dt>Letztes Update</dt><dd>${esc(updated)}</dd></div>${status.filteredForeignLocale!=null?`<div><dt>Fremde Länder-Varianten gefiltert</dt><dd>${Number(status.filteredForeignLocale)||0}</dd></div>`:""}${sourceRows}</dl></section>`}));
await fs.writeFile(path.join(out,"404.html"),page({title:"Seite nicht gefunden",description:"Die angeforderte Seite wurde nicht gefunden.",canonical:"/404.html",indexable:false,body:`<section class="text-page"><span class="eyebrow">Fehler 404</span><h1>Hier ist nichts mehr.</h1><p>Das Angebot ist möglicherweise abgelaufen oder wurde aus Qualitätsgründen entfernt.</p><a class="button primary" href="${url("/")}">Zur Startseite</a></section>`}));
await fs.writeFile(path.join(out,"offline.html"),page({title:"Offline",description:"Angebotslotse ist gerade offline. Bereits geladene öffentliche Seiten können teilweise weiter verfügbar sein.",canonical:"/offline.html",indexable:false,body:`<section class="text-page"><span class="eyebrow">Offline-Modus</span><h1>Gerade keine Verbindung.</h1><p>Öffentliche Seiten können teilweise aus dem lokalen App-Cache geladen werden. Konto, Cloud-Merkliste und aktuelle Alarmtreffer benötigen eine Internetverbindung.</p><a class="button primary" href="${url("/")}">Erneut zur Startseite</a></section>`}));
const manifest={id:url("/"),name:"Angebotslotse",short_name:"Angebotslotse",description:"Deals, Preisverläufe, Wunschpreise und Affiliate-Angebote aus geprüften Quellen.",start_url:url("/"),scope:url("/"),display:"standalone",orientation:"any",background_color:"#0d1121",theme_color:"#10152a",lang:"de-DE",categories:["shopping","utilities"],icons:[{src:url("/app-icon-192.png"),sizes:"192x192",type:"image/png",purpose:"any"},{src:url("/app-icon-512.png"),sizes:"512x512",type:"image/png",purpose:"any"},{src:url("/app-icon-maskable-512.png"),sizes:"512x512",type:"image/png",purpose:"maskable"},{src:url("/favicon.svg"),sizes:"any",type:"image/svg+xml",purpose:"any"}],shortcuts:[{name:"Aktuelle Deals",url:url("/#aktuelle-deals")},{name:"Merkliste",url:url("/merkliste.html")},{name:"Konto & Alarme",url:url("/konto.html")}]};
await fs.writeFile(path.join(out,"manifest.webmanifest"),`${JSON.stringify(manifest,null,2)}\n`);
const sitemapUrls=["/","/buecher.html",...bookEntries.map(book=>`/buecher/${bookPageByAsin.get(String(book.asin).toUpperCase())}.html`),"/merch.html","/kategorien.html","/shops.html",...(brandGroups.length?["/marken.html"]:[]),"/methodik.html",...(coupons.length?["/rabattcodes/"]:[]),...shopGroups.map(([name])=>`/shops/${shopSlug(name)}.html`),...brandGroups.map(([name])=>`/marken/${brandPageByName.get(name)}.html`),...activeCategories.map(c=>`/${c}.html`),...discoveryPages.filter(x=>x[0]!=="rabattcodes.html"&&x[3]?.length).map(x=>`/${x[0]}`),...Object.values(info).map(x=>x[2]),"/status.html",...offers.map(o=>`/angebote/${o.slug}.html`)];
const meaningfulDate=o=>[o?.lastPriceChange,o?.dateAdded,o?.firstSeen].map(value=>value?new Date(value):null).filter(date=>date&&Number.isFinite(date.valueOf())).sort((a,b)=>b-a)[0]?.toISOString()??null;
const latestMeaningfulDate=rows=>rows.map(meaningfulDate).filter(Boolean).sort().at(-1)??null;
const sitemapLastmod=new Map();
for(const offer of offers){const changed=meaningfulDate(offer);if(changed)sitemapLastmod.set(`/angebote/${offer.slug}.html`,changed);}
for(const category of activeCategories){const changed=latestMeaningfulDate(offers.filter(o=>o.category===category));if(changed)sitemapLastmod.set(`/${category}.html`,changed);}
for(const [name,rows] of shopGroups){const changed=latestMeaningfulDate(rows);if(changed)sitemapLastmod.set(`/shops/${shopSlug(name)}.html`,changed);}
for(const [name,rows] of brandGroups){const changed=latestMeaningfulDate(rows);if(changed)sitemapLastmod.set(`/marken/${brandPageByName.get(name)}.html`,changed);}
for(const [file,,,rows] of discoveryPages){if(file==="rabattcodes.html"||!rows?.length)continue;const changed=latestMeaningfulDate(rows);if(changed)sitemapLastmod.set(`/${file}`,changed);}
if(coupons.length){const changed=latestMeaningfulDate(coupons);if(changed)sitemapLastmod.set("/rabattcodes/",changed);}
const homeChanged=latestMeaningfulDate(offers);if(homeChanged){sitemapLastmod.set("/",homeChanged);sitemapLastmod.set("/shops.html",homeChanged);if(brandGroups.length)sitemapLastmod.set("/marken.html",homeChanged);sitemapLastmod.set("/kategorien.html",homeChanged);}
await fs.writeFile(path.join(out,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls.map(p=>`<url><loc>${esc(url(p))}</loc>${sitemapLastmod.get(p)?`<lastmod>${esc(sitemapLastmod.get(p))}</lastmod>`:""}</url>`).join("")}</urlset>\n`);await fs.writeFile(path.join(out,"robots.txt"),`User-agent: *\nAllow: /\nSitemap: ${url("/sitemap.xml")}\n`);
const alertFeed={updatedAt:now.toISOString(),offers:offers.map(o=>({id:o.id,slug:o.slug,title:o.title,description:o.description||"",category:o.category,brand:o.brand||"",advertiser:o.advertiser,currentPrice:hasPrice(o)?o.currentPrice:null,previousPrice:o.previousPrice>o.currentPrice?o.previousPrice:null,currency:o.currency||"EUR",imageUrl:o.imageUrl||null,updatedAt:o.updatedAt||o.dateAdded||null}))};
await fs.writeFile(path.join(out,"alerts-feed.json"),`${JSON.stringify(alertFeed)}\n`);
await fs.writeFile(path.join(out,"build-report.json"),`${JSON.stringify({version:"V8-premium-dark-commerce",rawRecords:storedOffers.length,offers:offers.length,uniqueProducts:new Set(offers.map(o=>o.productId||o.id)).size,offersWithGtin:offers.filter(o=>o.gtin||o.ean).length,offersWithMpn:offers.filter(o=>o.mpn).length,multiImageProducts:offers.filter(o=>(o.additionalImageUrls||[]).length>0).length,offersWithMultipleMerchants:[...new Set(offers.map(o=>o.productId).filter(Boolean))].filter(id=>offers.filter(o=>o.productId===id).length>1).length,productCards:offers.length,images:offers.filter(o=>o.imageUrl).length,placeholders:offers.filter(o=>!o.imageUrl).length,videos:offers.filter(o=>o.videoUrl).length,merchants:new Set(offers.map(o=>o.advertiser)).size,categories:activeCategories.length,prices:offers.filter(hasPrice).length,previousPrices:offers.filter(o=>hasPrice(o)&&o.previousPrice>o.currentPrice).length,discounts:offers.filter(o=>discount(o)).length,coupons:coupons.length,productsWithHistory:new Set(priceHistory.map(r=>r.productId)).size,priceRecords:priceHistory.length,comparisons:[...comparisonGroups.values()].filter(rows=>rows.length>1).length,countdowns:offers.filter(o=>o.endDate).length,productPages:offers.filter(o=>o.productId&&hasPrice(o)).length,landingPages:categories.length+discoveryPages.length+3+brandGroups.length+(brandGroups.length?1:0),brandPages:brandGroups.length,ownedBooks:bookEntries.length,merchPage:Boolean(merchEntry),sitemapUrls:sitemapUrls.length,analytics:analyticsToken?"active":"prepared-not-active",googleVerification:googleVerification?"active":"prepared-not-active",dailyDeal:homepage.dailyDeal?.id||null,currentDeals:homepage.newest.slice(0,5).length,dailyHighlights:homepage.dailyHighlights.length,weekDeals:homepage.weekDeals.length,monthHighlights:homepage.monthHighlights.length,newestProducts:homepage.newest.length,desktopCardsPerViewport:6,tabletCardsPerViewport:3,mobileCardsPerViewport:1,homeCards:[...homeBody.matchAll(/class="deal-card\b/g)].length,quarantined:statusQuarantined,staleStored:statusStale,awaitingMedia:statusAwaitingMedia,blockedPublisherPromotions:statusBlockedPublisherPromotions,excludedFromPublication:storedOffers.length-offers.length},null,2)}\n`);
if (testBuildCacheEnabled) {
  await fs.writeFile(testBuildCacheFile, `${JSON.stringify({signature:testBuildSignature})}\n`);
  await fs.writeFile(testBuildOutputMarker, `${testBuildSignature}\n`);
}
console.log(`V8 gebaut: ${offers.length} Angebote, ${priceHistory.length} echte Preismesspunkte.`);
