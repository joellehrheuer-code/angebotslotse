import fs from "node:fs/promises";
import { collectSources } from "./lib/source-manager.mjs";
import { normalizeAndDedupe } from "./lib/normalize.mjs";
import { updatePriceHistory } from "./lib/price-history.mjs";

const config = JSON.parse(await fs.readFile("config.json", "utf8"));
const oldOffers = JSON.parse(await fs.readFile("data/offers.json", "utf8").catch(() => "[]"));
const oldStatus = JSON.parse(await fs.readFile("data/status.json", "utf8").catch(() => "{}"));
const oldHistory = JSON.parse(await fs.readFile("data/price-history.json", "utf8").catch(() => "[]"));
const oldIds = new Set(oldOffers.map(o => o.id));
let status;
try {
  const collected = await collectSources();
  const sources = collected.sources;
  const failed = new Set(sources.filter(s => s.state === "error").map(s => s.name));
  const fresh = sources.flatMap(s => s.rows);
  const fallback = oldOffers.filter(o => failed.has(o.source));
  const offers = normalizeAndDedupe([...fresh, ...fallback], config);
  const previousById=new Map(oldOffers.map(offer=>[offer.id,offer]));
  for(const offer of offers){const previous=previousById.get(offer.id);if(previous){offer.firstSeen=previous.firstSeen??offer.firstSeen;offer.dateAdded=previous.dateAdded??offer.dateAdded;}}
  const newIds = new Set(offers.map(o => o.id));
  status = { state: "ok", lastSuccessfulUpdate: new Date().toISOString(), activeOffers: offers.length,
    added: offers.filter(o => !oldIds.has(o.id)).length, removed: oldOffers.filter(o => !newIds.has(o.id)).length,
    invalidLinks: 0, apiErrors: failed.size, sources: Object.fromEntries(sources.map(s => [s.name, { state: s.state, count: s.rows.length, error: s.error ?? null }])),
    message: failed.size ? "Aktualisierung mit zwischengespeicherten Quelldaten abgeschlossen." : "Aktualisierung erfolgreich." };
  await fs.writeFile("data/offers.json", `${JSON.stringify(offers, null, 2)}\n`);
  await fs.writeFile("data/price-history.json", `${JSON.stringify(updatePriceHistory(oldHistory, offers), null, 2)}\n`);
  const coupons = offers.filter(offer => offer.voucherCode && (!offer.endDate || new Date(offer.endDate) > new Date())).map(offer => ({code:offer.voucherCode,discountText:offer.description || null,discountPercent:null,validFrom:offer.startDate,validUntil:offer.endDate,merchant:offer.advertiser,landingUrl:offer.trackingUrl,terms:offer.terms || null,source:offer.source,isCommunityExclusive:false,creatorCode:null,creatorBenefit:null}));
  await fs.writeFile("data/coupons.json", `${JSON.stringify(coupons, null, 2)}\n`);
  const priority=/coolblue|beyerdynamic|adidas|dyson|lidl|decathlon|samsung|lenovo|nike|under armour|razer|thomann|rode|waves/i;
  const relevant=/gaming|computer|elektronik|electronic|audio|musik|music|mode|fashion|sport|haushalt|home|werkzeug|tools/i;
  const programmeRows=Object.entries(collected.awinPrograms??{}).flatMap(([relationship,rows])=>rows.map(row=>({network:"Awin",relationship,advertiserId:row.id??row.advertiserId??null,name:row.name??row.advertiserName??null,primarySector:row.primarySector??null,primaryRegion:row.primaryRegion??null}))).filter(row=>row.name&&(row.relationship!=="notjoined"||priority.test(row.name)||relevant.test(`${row.name} ${row.primarySector??""}`))).sort((a,b)=>Number(priority.test(b.name))-Number(priority.test(a.name))||a.relationship.localeCompare(b.relationship)||a.name.localeCompare(b.name,"de")).slice(0,150);
  for(const row of programmeRows.filter(row=>row.relationship==="notjoined")) row.applicationDraft=`Angebotslotse ist ein unabhängiges deutsches Deal-, Preis- und Discovery-Portal. Wir möchten ${row.name} redaktionell passend im Bereich ${row.primarySector||"Angebote"} einbinden und ausschließlich freigegebene Produkt-, Preis- und Aktionsdaten verwenden. Affiliate-Links werden transparent als Werbung gekennzeichnet; Reichweitenangaben werden nicht erfunden. Wir freuen uns über eine Prüfung unserer Bewerbung.`;
  const impact=sources.find(source=>source.name==="impact");
  const feedSources=sources.filter(source=>source.name.includes("feed"));
  const growth={generatedAt:new Date().toISOString(),market:"DE",publisherId:Number(process.env.AWIN_PUBLISHER_ID)||null,
    awin:{counts:Object.fromEntries(Object.entries(collected.awinPrograms??{}).map(([key,rows])=>[key,rows.length])),programs:programmeRows,feeds:feedSources.map(source=>({source:source.name,state:source.state,count:source.rows.length,audit:source.audit??null}))},
    impact:{state:impact?.state??"disabled",publishableOffers:impact?.rows.length??0,inventory:impact?.audit??null},
    publication:{offers:offers.length,merchants:new Set(offers.map(offer=>offer.advertiser)).size,products:offers.filter(offer=>offer.productId).length,images:offers.filter(offer=>offer.imageUrl).length,prices:offers.filter(offer=>offer.currentPrice!=null).length,coupons:coupons.length},
    safeguards:{unjoinedProgramsPublished:false,applicationSubmission:"manual-only",credentialsPersisted:false}};
  await fs.writeFile("data/affiliate-growth.json",`${JSON.stringify(growth,null,2)}\n`);
} catch (error) {
  status = { state: "error", lastSuccessfulUpdate: oldStatus.lastSuccessfulUpdate ?? null, activeOffers: oldOffers.length, added: 0, removed: 0,
    invalidLinks: 0, apiErrors: 1, message: String(error.message).slice(0, 250) };
  await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
  throw error;
}
await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
