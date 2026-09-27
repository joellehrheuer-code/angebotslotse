import fs from "node:fs/promises";
import { collectSources } from "./lib/source-manager.mjs";
import { normalizeAndDedupe, isConcreteOffer, isPublicationReady } from "./lib/normalize.mjs";
import { updatePriceHistory } from "./lib/price-history.mjs";
import { selectHomepageOffers } from "./lib/homepage-selection.mjs";
import { mergeOfferInventory } from "./lib/offer-merge.mjs";
import { rankAwinOpportunities } from "./lib/program-growth.mjs";

const config = JSON.parse(await fs.readFile("config.json", "utf8"));
const oldOffers = JSON.parse(await fs.readFile("data/offers.json", "utf8").catch(() => "[]"));
const oldStatus = JSON.parse(await fs.readFile("data/status.json", "utf8").catch(() => "{}"));
const oldHistory = JSON.parse(await fs.readFile("data/price-history.json", "utf8").catch(() => "[]"));
const oldProgramInventory = JSON.parse(await fs.readFile("report/program-inventory.json", "utf8").catch(() => '{"programs":[]}'));
const impactLinkPolicy = JSON.parse(await fs.readFile("data/impact-link-policy.json", "utf8").catch(() => "{}"));
const oldIds = new Set(oldOffers.map(o => o.id));
let status;
try {
  const collected = await collectSources();
  const sources = collected.sources;
  const failed = new Set(sources.filter(s => s.state === "error").map(s => s.name));
  const fresh = sources.flatMap(s => s.rows);
    const normalizedFresh = normalizeAndDedupe(fresh, config).filter(offer => !(offer.source === "awin" && String(offer.sourceId).startsWith("enhanced-") && !(Number(offer.currentPrice) > 0 && offer.imageUrl && offer.trackingUrl)));
  const offers = mergeOfferInventory({
    freshOffers: normalizedFresh,
    oldOffers,
    sources,
    maxOffers: config.maxOffers,
    circuitBreakerRatio: Number(config.inventoryCircuitBreakerRatio) || 0.5
  });
  const newIds = new Set(offers.map(o => o.id));
  status = { state: "ok", lastSuccessfulUpdate: new Date().toISOString(), activeOffers: offers.length,
    added: offers.filter(o => !oldIds.has(o.id)).length, removed: oldOffers.filter(o => !newIds.has(o.id)).length,
    invalidLinks: 0, apiErrors: failed.size, sources: Object.fromEntries(sources.map(s => [s.name, { state: s.state, count: s.rows.length, error: s.error ?? null, audit: s.audit ?? null }])),
    stale: offers.filter(o => o.isStale).length,
    message: failed.size || sources.some(s => s.state === "disabled") ? "Aktualisierung mit geschützten Bestandsdaten abgeschlossen." : "Aktualisierung erfolgreich." };
  await fs.writeFile("data/offers.json", `${JSON.stringify(offers, null, 2)}\n`);
  await fs.writeFile("data/price-history.json", `${JSON.stringify(updatePriceHistory(oldHistory, offers), null, 2)}\n`);
  const coupons = offers.filter(offer => offer.voucherCode && (!offer.endDate || new Date(offer.endDate) > new Date())).map(offer => ({code:offer.voucherCode,discountText:offer.description || null,discountPercent:null,validFrom:offer.startDate,validUntil:offer.endDate,merchant:offer.advertiser,landingUrl:offer.trackingUrl,terms:offer.terms || null,source:offer.source,isCommunityExclusive:false,creatorCode:null,creatorBenefit:null}));
  await fs.writeFile("data/coupons.json", `${JSON.stringify(coupons, null, 2)}\n`);
  const priority=/coolblue|beyerdynamic|adidas|dyson|lidl|decathlon|samsung|lenovo|nike|under armour|razer|thomann|rode|waves|logitech|corsair|asus|msi|sony|philips|bosch/i;
  const relevant=/gaming|computer|elektronik|electronic|audio|musik|music|mode|fashion|sport|haushalt|home|werkzeug|tools|travel|outdoor|fitness/i;
  const awinDiscoveryOffers=collected.awinDiscoveryOffers??[];
  const discoveryAdvertiserIds=new Set(awinDiscoveryOffers.map(offer=>String(offer?.advertiser?.id??offer?.advertiserId??"")).filter(Boolean));
  const programmeRows=Object.entries(collected.awinPrograms??{}).flatMap(([relationship,rows])=>rows.map(row=>({network:"Awin",relationship,advertiserId:row.id??row.advertiserId??null,name:row.name??row.advertiserName??null,primarySector:row.primarySector??null,primaryRegion:row.primaryRegion??null}))).filter(row=>row.name&&(row.relationship!=="notjoined"||priority.test(row.name)||relevant.test(`${row.name} ${row.primarySector??""}`)||discoveryAdvertiserIds.has(String(row.advertiserId)))).sort((a,b)=>Number(priority.test(b.name))-Number(priority.test(a.name))||a.relationship.localeCompare(b.relationship)||a.name.localeCompare(b.name,"de")).slice(0,200);
  const impact=sources.find(source=>source.name==="impact");
  const feedSources=sources.filter(source=>source.name.includes("feed"));
  const concreteOffers=offers.filter(isConcreteOffer), publicOffers=offers.filter(isPublicationReady);
  const countBy = (rows, key) => Object.fromEntries([...rows.reduce((counts, row) => { const value = row[key] || "sonstige"; counts.set(value, (counts.get(value) || 0) + 1); return counts; }, new Map())].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "de")).map(([name, count]) => [name, count]));
  const quarantined = new Set((impactLinkPolicy.quarantinedAdvertisers ?? []).map(rule => `${rule.advertiserId ?? ""}|${String(rule.advertiserName ?? "").toLowerCase()}`));
  const isQuarantined = offer => quarantined.has(`${offer.advertiserId ?? ""}|${String(offer.advertiser ?? "").toLowerCase()}`);
  const sourceStats = countBy(publicOffers.map(offer => ({ source: offer.source === "awin" ? "Awin" : offer.source === "impact" ? "Impact" : offer.source === "amazon" ? "Amazon" : "sonstige" })), "source");
  const merchantStats = countBy(publicOffers, "advertiser");
  const categoryStats = countBy(publicOffers, "category");
  const awinEnhancedFeeds = feedSources.find(source => source.name === "awin-enhanced-feeds")?.audit?.feeds ?? [];
  const feedAdvertisers=new Set(feedSources.flatMap(source=>(source.audit?.feeds??[]).filter(feed=>feed.state==="available").map(feed=>String(feed.advertiserId))));
  const checkedAt=new Date().toISOString();
  const programInventory=programmeRows.map(row=>({name:row.name,platform:"Awin",status:row.relationship,country:"DE",categories:row.primarySector?[row.primarySector]:[],commission:null,cookieDuration:null,
    productFeed:feedAdvertisers.has(String(row.advertiserId)),images:null,prices:null,coupons:null,deeplinks:null,dealShoppingAllowed:null,
    applicationPossible:row.relationship==="notjoined",applicationSent:row.relationship==="pending",lastChecked:checkedAt,advertiserId:row.advertiserId,applicationDraft:row.applicationDraft??null}));
  const impactInventory=(impact?.audit?.programInventory??[]).map(row=>({name:row.name,platform:"Impact",status:row.status,country:row.countries,categories:[],commission:null,cookieDuration:null,
    productFeed:(impact?.audit?.catalogs??0)>0,images:(impact?.audit?.products??0)>0,prices:(impact?.audit?.products??0)>0,coupons:(impact?.audit?.promotions??0)>0,deeplinks:row.deeplinks,
    dealShoppingAllowed:null,applicationPossible:false,applicationSent:false,lastChecked:checkedAt,advertiserId:row.advertiserId,campaignId:row.campaignId}));
  const opportunities=rankAwinOpportunities({programs:programmeRows,discoveryOffers:awinDiscoveryOffers,feedAdvertiserIds:feedAdvertisers,programDetails:collected.awinProgramDetails??{}});
  const opportunityById=new Map(opportunities.map(opportunity=>[String(opportunity.advertiserId),opportunity]));
  for(const program of programInventory){
    const opportunity=opportunityById.get(String(program.advertiserId));
    if(!opportunity)continue;
    program.applicationDraft=opportunity.applicationDraft;
    program.opportunityScore=opportunity.score;
    program.opportunityPriority=opportunity.priority;
    program.activeDiscoveryOffers=opportunity.activeDiscoveryOffers;
    program.metrics=opportunity.metrics;
  }
  const growth={generatedAt:new Date().toISOString(),market:"DE",publisherId:Number(process.env.AWIN_PUBLISHER_ID)||null,
    awin:{counts:Object.fromEntries(Object.entries(collected.awinPrograms??{}).map(([key,rows])=>[key,rows.length])),programs:programmeRows,discoveryOffers:awinDiscoveryOffers.length,discoveryError:collected.awinDiscoveryError??null,detailsEnriched:Object.keys(collected.awinProgramDetails??{}).length,opportunities:opportunities.slice(0,25),feeds:feedSources.map(source=>({source:source.name,state:source.state,count:source.rows.length,audit:source.audit??null}))},
    impact:{state:impact?.state??"disabled",publishableOffers:impact?.rows.length??0,inventory:impact?.audit??null},
    publication:{offers:publicOffers.length,concreteAwaitingMedia:concreteOffers.filter(offer=>!isPublicationReady(offer)).length,partnerEntries:offers.length-concreteOffers.length,merchants:new Set(publicOffers.map(offer=>offer.advertiser)).size,products:publicOffers.filter(offer=>offer.productId).length,images:publicOffers.filter(offer=>offer.imageUrl).length,videos:publicOffers.filter(offer=>offer.videoUrl).length,prices:publicOffers.filter(offer=>offer.currentPrice!=null).length,discounts:publicOffers.filter(offer=>offer.discountPercent).length,coupons:publicOffers.filter(offer=>offer.voucherCode).length},
    safeguards:{unjoinedProgramsPublished:false,applicationSubmission:"review-required",credentialsPersisted:false}};
  await fs.writeFile("data/affiliate-growth.json",`${JSON.stringify(growth,null,2)}\n`);
  await fs.mkdir("report",{recursive:true});
  await fs.writeFile("report/program-inventory.json",`${JSON.stringify({generatedAt:checkedAt,programs:[...programInventory,...impactInventory]},null,2)}\n`);
  await fs.writeFile("data/program-opportunities.json",`${JSON.stringify({generatedAt:checkedAt,scope:"Automatisch aus dem aktuellen Awin-Programminventar, aktiven DE-Discovery-Angeboten und verfügbaren Feed-Signalen erzeugt.",automation:{discovery:"automatic",ranking:"automatic",applicationDrafts:"automatic",submission:"human-review-required",reason:"Bewerbungen können Vertragsbedingungen enthalten und werden nicht blind bestätigt."},programs:opportunities.slice(0,50),impact:{status:impact?.state??"disabled",joinedPrograms:impactInventory.length,marketplaceDiscovery:"dashboard-review-required",applicationTermsRequireApproval:true,note:"Aktive Impact-Programme werden per Partner API synchronisiert. Neue Marketplace-Bewerbungen werden erst nach Prüfung der jeweiligen Bedingungen bestätigt."}},null,2)}\n`);
  const manualActions=[];
  if(!process.env.AWIN_PUBLISHER_ID||!process.env.AWIN_API_TOKEN)manualActions.push({id:"awin-api-credentials",platform:"Awin",action:"AWIN_PUBLISHER_ID und AWIN_API_TOKEN als sichere Runtime-/GitHub-Secrets konfigurieren.",reason:"Ohne Publisher-ID und API-Token können aktive Awin-Programme und Enhanced Feeds nicht aktualisiert werden."});
  if(!process.env.AWIN_DATAFEED_API_KEY)manualActions.push({id:"awin-datafeed-key",platform:"Awin",action:"AWIN_DATAFEED_API_KEY als lokales .env.local-Secret und GitHub Actions Secret hinterlegen.",reason:"Die offizielle Legacy-Produktfeed-Liste benötigt einen separaten Datafeed-Key."});
  if(!process.env.AMAZON_CREATORS_CREDENTIAL_ID||!process.env.AMAZON_CREATORS_CREDENTIAL_SECRET||!process.env.AMAZON_PARTNER_TAG)manualActions.push({id:"amazon-creators-api",platform:"Amazon",action:"Amazon PartnerNet vollständig freischalten, Creators-API-Credentials und deutschen Partner-Tag als GitHub Secrets hinterlegen.",reason:"Ohne finale Amazon-Associates-Freigabe, Credential ID, Secret und Partner-Tag werden keine Amazon-Preise oder Produktbilder automatisiert übernommen."});
  if(!process.env.IMPACT_ACCOUNT_SID||!process.env.IMPACT_AUTH_TOKEN)manualActions.push({id:"impact-api-credentials",platform:"Impact",action:"IMPACT_ACCOUNT_SID und IMPACT_AUTH_TOKEN als sichere Runtime-/GitHub-Secrets konfigurieren.",reason:"Ohne beide Impact-Zugangswerte können Kampagnen, Ads und Katalogdaten nicht synchronisiert werden."});
  else manualActions.push({id:"impact-marketplace-review",platform:"Impact",action:"Brands Marketplace auf neue passende Programme prüfen und nur nach Prüfung der jeweiligen Vertragsbedingungen bewerben.",reason:"Die API synchronisiert bestehende Impact-Programme und Angebote; neue Marketplace-Bewerbungen können Vertragsannahmen oder Surveys erfordern und werden deshalb nicht blind abgesendet."});
  for(const opportunity of opportunities.filter(opportunity=>opportunity.applicationRequired&&opportunity.priority!=="niedrig").slice(0,8))manualActions.push({id:`awin-apply-${opportunity.advertiserId}`,platform:"Awin",action:opportunity.nextAction,reason:`Automatisch priorisiert (${opportunity.score} Punkte): ${opportunity.reasons.join(", ") || "passendes Programm"}. Keine automatische Zustimmung zu Vertragsbedingungen.`,applicationDraft:opportunity.applicationDraft});
  await fs.writeFile("report/manual-actions.json",`${JSON.stringify({generatedAt:checkedAt,actions:manualActions},null,2)}\n`);
  const oldProgramKeys=new Set((oldProgramInventory.programs??[]).map(program=>`${program.platform}:${program.advertiserId}:${program.campaignId??""}`));
  const selections=selectHomepageOffers(publicOffers,{now:new Date(checkedAt),score:offer=>(offer.discountPercent||0)*1000+(offer.currentPrice!=null?80:0)+(offer.endDate?50:0)+(offer.voucherCode?30:0)+(offer.imageUrl?25:0)});
  const report={generatedAt:checkedAt,newAwinPrograms:programInventory.filter(program=>!oldProgramKeys.has(`Awin:${program.advertiserId}:`)).length,newImpactPrograms:impactInventory.filter(program=>!oldProgramKeys.has(`Impact:${program.advertiserId}:${program.campaignId??""}`)).length,activeAwinPrograms:programInventory.filter(program=>program.status==="joined").length,activeImpactPrograms:impactInventory.filter(program=>String(program.status).toLowerCase()==="active").length,applicationsSent:0,pendingApplications:programInventory.filter(program=>program.status==="pending").length,manualApplications:manualActions.filter(action=>action.id.startsWith("awin-apply-")).length,awinDiscoveryOffers:awinDiscoveryOffers.length,applicationCandidates:opportunities.filter(opportunity=>opportunity.applicationRequired).length,newMerchants:new Set(publicOffers.filter(offer=>!oldIds.has(offer.id)).map(offer=>offer.advertiser)).size,newProducts:publicOffers.filter(offer=>!oldIds.has(offer.id)&&offer.productId).length,productsWithImage:publicOffers.filter(offer=>offer.imageUrl).length,productsWithVideo:publicOffers.filter(offer=>offer.videoUrl).length,productsWithPrice:publicOffers.filter(offer=>Number(offer.currentPrice)>0).length,productsWithOldPrice:publicOffers.filter(offer=>Number(offer.previousPrice)>Number(offer.currentPrice)).length,productsWithDiscount:publicOffers.filter(offer=>Number(offer.discountPercent)>0).length,newCoupons:publicOffers.filter(offer=>offer.voucherCode&&!oldIds.has(offer.id)).length,coupons:publicOffers.filter(offer=>offer.voucherCode).length,priceChanges:publicOffers.filter(offer=>offer.lastPriceChange).length,expiredOffers:oldOffers.filter(offer=>offer.endDate&&new Date(offer.endDate)<=new Date()).length,expiredCoupons:oldOffers.filter(offer=>offer.voucherCode&&offer.endDate&&new Date(offer.endDate)<=new Date()).length,totalProducts:publicOffers.length,productsBySource:sourceStats,productsByMerchant:merchantStats,productsByCategory:categoryStats,awinEnhancedFeeds,quarantinedRecords:oldOffers.filter(isQuarantined).length,dailyDeal:selections.dailyDeal?.id||null,dailyHighlights:selections.dailyHighlights.map(offer=>offer.id),weekDeals:selections.weekDeals.map(offer=>offer.id),monthHighlights:selections.monthHighlights.map(offer=>offer.id),apiErrors:failed.size,affiliateLinkErrors:0};
  await fs.writeFile("report/update-report.json",`${JSON.stringify(report,null,2)}\n`);
} catch (error) {
  status = { state: "error", lastSuccessfulUpdate: oldStatus.lastSuccessfulUpdate ?? null, activeOffers: oldOffers.length, added: 0, removed: 0,
    invalidLinks: 0, apiErrors: 1, message: String(error.message).slice(0, 250) };
  await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
  throw error;
}
await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
