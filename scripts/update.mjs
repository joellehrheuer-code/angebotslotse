import fs from "node:fs/promises";
import { collectSources } from "./lib/source-manager.mjs";
import { normalizeAndDedupe, isConcreteOffer, isPublicationReady, isAwaitingMediaOffer, isPublisherPromotion, refineOfferCategory, isMarketCompatibleTitle } from "./lib/normalize.mjs";
import { updatePriceHistory } from "./lib/price-history.mjs";
import { selectHomepageOffers } from "./lib/homepage-selection.mjs";
import { mergeOfferInventory } from "./lib/offer-merge.mjs";
import { rankAwinOpportunities } from "./lib/program-growth.mjs";
import { rankImpactPrograms, buildImpactMarketplaceSearches } from "./lib/impact-growth.mjs";
import { rankDaisyconPrograms, rankWebgainsPrograms, buildNetworkMarketplaceSearches, buildNetworkApplicationDraft } from "./lib/network-growth.mjs";
import { archiveRemovedOffers } from "./lib/offer-archive.mjs";
import { buildAffiliateOpportunityReport } from "./lib/affiliate-opportunities.mjs";
import { buildPartnerOutreachQueue } from "./lib/outreach-queue.mjs";
import { fetchCreatorVideoFeed } from "./lib/creator-videos.mjs";
import { fetchCreatorSocialFeed } from "./lib/creator-feed.mjs";
import { buildFailureStatus } from "./lib/update-status.mjs";

const config = JSON.parse(await fs.readFile("config.json", "utf8"));
const oldOffers = JSON.parse(await fs.readFile("data/offers.json", "utf8").catch(() => "[]"));
const oldStatus = JSON.parse(await fs.readFile("data/status.json", "utf8").catch(() => "{}"));
const partnerOutreachStatus=JSON.parse(await fs.readFile("report/partner-outreach-status.json","utf8").catch(() => '{"statuses":[]}' ));
const partnerContactDirectory=JSON.parse(await fs.readFile("data/partner-contact-directory.json","utf8").catch(() => '{"contacts":[]}' ));
const oldHistory = JSON.parse(await fs.readFile("data/price-history.json", "utf8").catch(() => "[]"));
const oldArchive = JSON.parse(await fs.readFile("data/offer-archive.json", "utf8").catch(() => '{"items":[]}'));
const oldProgramInventory = JSON.parse(await fs.readFile("report/program-inventory.json", "utf8").catch(() => '{"programs":[]}'));
const oldCreatorVideos = JSON.parse(await fs.readFile("data/creator-videos.json", "utf8").catch(() => '{"version":1,"source":"public-only","updatedAt":null,"videos":[]}'));
const oldCreatorFeed = JSON.parse(await fs.readFile("data/creator-feed.json", "utf8").catch(() => '{"version":1,"source":"public-only","updatedAt":null,"items":[]}'));
const impactLinkPolicy = JSON.parse(await fs.readFile("data/impact-link-policy.json", "utf8").catch(() => "{}"));
const isQuarantinedByPolicy = offer => (impactLinkPolicy.quarantinedAdvertisers ?? []).some(rule =>
  (rule.advertiserId && String(rule.advertiserId) === String(offer.advertiserId)) ||
  (rule.advertiserName && String(rule.advertiserName).toLowerCase() === String(offer.advertiser).toLowerCase()));
const oldIds = new Set(oldOffers.map(o => o.id));
let creatorFeedState={
  state:"disabled",
  count:Array.isArray(oldCreatorFeed.items)?oldCreatorFeed.items.length:(Array.isArray(oldCreatorVideos.videos)?oldCreatorVideos.videos.length:0),
  videos:Array.isArray(oldCreatorVideos.videos)?oldCreatorVideos.videos.length:0,
  error:null,
  mode:null
};
const creatorSocialFeedUrl=process.env.CREATOR_SOCIAL_FEED_URL||config.creatorSocialFeedUrl||"";
if(creatorSocialFeedUrl){
  try{
    const remote=await fetchCreatorSocialFeed({feedUrl:creatorSocialFeedUrl,maxItems:24});
    const videos=remote.items.filter(item=>item.type==="video").slice(0,12).map(item=>({
      id:item.id,title:item.title,thumbnailUrl:item.thumbnailUrl,publicUrl:item.publicUrl,platform:item.platform,publishedAt:item.publishedAt
    }));
    await fs.writeFile("data/creator-feed.json",`${JSON.stringify({version:1,source:"social-distributor",updatedAt:remote.updatedAt,items:remote.items},null,2)}\n`);
    await fs.writeFile("data/creator-videos.json",`${JSON.stringify({version:1,source:"social-distributor",updatedAt:remote.updatedAt,videos},null,2)}\n`);
    creatorFeedState={state:"ok",count:remote.items.length,videos:videos.length,error:null,mode:"social"};
  }catch(error){
    creatorFeedState={state:"stale",count:Array.isArray(oldCreatorFeed.items)?oldCreatorFeed.items.length:0,videos:Array.isArray(oldCreatorVideos.videos)?oldCreatorVideos.videos.length:0,error:String(error.message).slice(0,160),mode:"social"};
  }
}else if(process.env.CREATOR_VIDEO_FEED_URL){
  try{
    const remote=await fetchCreatorVideoFeed({feedUrl:process.env.CREATOR_VIDEO_FEED_URL,maxVideos:12});
    const items=remote.videos.map(item=>({...item,type:"video",summary:null}));
    await fs.writeFile("data/creator-videos.json",`${JSON.stringify({version:1,source:"social-distributor",updatedAt:remote.updatedAt,videos:remote.videos},null,2)}\n`);
    await fs.writeFile("data/creator-feed.json",`${JSON.stringify({version:1,source:"video-feed-compat",updatedAt:remote.updatedAt,items},null,2)}\n`);
    creatorFeedState={state:"ok",count:items.length,videos:remote.videos.length,error:null,mode:"video"};
  }catch(error){
    creatorFeedState={state:"stale",count:Array.isArray(oldCreatorFeed.items)?oldCreatorFeed.items.length:0,videos:Array.isArray(oldCreatorVideos.videos)?oldCreatorVideos.videos.length:0,error:String(error.message).slice(0,160),mode:"video"};
  }
}
let status;
try {
  const collected = await collectSources();
  const sources = collected.sources;
  const failed = new Set(sources.filter(s => s.state === "error").map(s => s.name));
  const fresh = sources.flatMap(s => s.rows);
    const normalizedFresh = normalizeAndDedupe(fresh, config).filter(offer => !(offer.source === "awin" && String(offer.sourceId).startsWith("enhanced-") && !(Number(offer.currentPrice) > 0 && offer.imageUrl && offer.trackingUrl)));
  const mergedOffers = mergeOfferInventory({
    freshOffers: normalizedFresh,
    oldOffers,
    sources,
    maxOffers: config.maxOffers,
    circuitBreakerRatio: Number(config.inventoryCircuitBreakerRatio) || 0.5
  });
  const offers = mergedOffers
    .filter(offer => isMarketCompatibleTitle(offer.title, config.marketCountry))
    .map(offer => ({...offer,category:refineOfferCategory(offer,config)}));
  const filteredForeignLocale = Math.max(0, mergedOffers.length - offers.length);
  const newIds = new Set(offers.map(o => o.id));
  const updateAt = new Date().toISOString();
  const removedOffers = oldOffers.filter(o => !newIds.has(o.id));
  const archive = archiveRemovedOffers(oldArchive, removedOffers, updateAt);
  const storedOfferCount = offers.length;
  const staleOfferCount = offers.filter(o => o.isStale).length;
  const quarantinedOfferCount = offers.filter(isQuarantinedByPolicy).length;
  const publishableOfferCount = offers.filter(offer => !isQuarantinedByPolicy(offer) && isPublicationReady(offer)).length;
  const awaitingMediaOffers = offers.filter(offer => !isQuarantinedByPolicy(offer) && isAwaitingMediaOffer(offer));
  const blockedPublisherPromotions = offers.filter(offer => !offer.isStale && !isQuarantinedByPolicy(offer) && isPublisherPromotion(offer));
  const degraded = failed.size > 0 || creatorFeedState.state === "stale";
  status = { state: degraded ? "degraded" : "ok", lastSuccessfulUpdate: updateAt, activeOffers: publishableOfferCount,
    storedOffers: storedOfferCount, publishableOffers: publishableOfferCount,
    awaitingMedia: awaitingMediaOffers.length, blockedPublisherPromotions: blockedPublisherPromotions.length, quarantined: quarantinedOfferCount,
    added: offers.filter(o => !oldIds.has(o.id)).length, removed: removedOffers.length,
    archivedThisRun: removedOffers.length, archivedTotal: archive.items.length,
    filteredForeignLocale,
    invalidLinks: 0, apiErrors: failed.size, sources: Object.fromEntries(sources.map(s => [s.name, { state: s.state, count: s.rows.length, error: s.error ?? null, audit: s.audit ?? null }])),
    creatorFeed: creatorFeedState,
    stale: staleOfferCount,
    message: degraded ? "Aktualisierung teilweise eingeschränkt; bestehende geprüfte Daten bleiben geschützt." : sources.some(s => s.state === "disabled") ? "Aktualisierung mit geschützten Bestandsdaten abgeschlossen." : "Aktualisierung erfolgreich." };
  await fs.writeFile("data/offers.json", `${JSON.stringify(offers, null, 2)}\n`);
  await fs.writeFile("data/offer-archive.json", `${JSON.stringify(archive, null, 2)}\n`);
  const priceHistoryOffers = offers.filter(offer => !isQuarantinedByPolicy(offer));
  await fs.writeFile("data/price-history.json", `${JSON.stringify(updatePriceHistory(oldHistory, priceHistoryOffers), null, 2)}\n`);
  const coupons = offers.filter(offer => !isQuarantinedByPolicy(offer) && isPublicationReady(offer) && offer.voucherCode && (!offer.endDate || new Date(offer.endDate) > new Date())).map(offer => ({code:offer.voucherCode,discountText:offer.description || null,discountPercent:null,validFrom:offer.startDate,validUntil:offer.endDate,merchant:offer.advertiser,landingUrl:offer.trackingUrl,terms:offer.terms || null,source:offer.source,isCommunityExclusive:false,creatorCode:null,creatorBenefit:null}));
  await fs.writeFile("data/coupons.json", `${JSON.stringify(coupons, null, 2)}\n`);
  const priority=/coolblue|beyerdynamic|adidas|dyson|lidl|decathlon|samsung|lenovo|nike|under armour|razer|thomann|rode|waves|logitech|corsair|asus|msi|sony|philips|bosch/i;
  const relevant=/gaming|computer|elektronik|electronic|audio|musik|music|mode|fashion|sport|haushalt|home|werkzeug|tools|travel|outdoor|fitness/i;
  const awinDiscoveryOffers=collected.awinDiscoveryOffers??[];
  const discoveryAdvertiserIds=new Set(awinDiscoveryOffers.map(offer=>String(offer?.advertiser?.id??offer?.advertiserId??"")).filter(Boolean));
  const programmeRows=Object.entries(collected.awinPrograms??{}).flatMap(([relationship,rows])=>rows.map(row=>({network:"Awin",relationship,advertiserId:row.id??row.advertiserId??null,name:row.name??row.advertiserName??null,primarySector:row.primarySector??null,primaryRegion:row.primaryRegion??null}))).filter(row=>row.name&&(row.relationship!=="notjoined"||priority.test(row.name)||relevant.test(`${row.name} ${row.primarySector??""}`)||discoveryAdvertiserIds.has(String(row.advertiserId)))).sort((a,b)=>Number(priority.test(b.name))-Number(priority.test(a.name))||a.relationship.localeCompare(b.relationship)||a.name.localeCompare(b.name,"de")).slice(0,200);
  const impact=sources.find(source=>source.name==="impact");
  const feedSources=sources.filter(source=>source.name.includes("feed"));
  const concreteOffers=offers.filter(isConcreteOffer), publicOffers=offers.filter(offer=>!isQuarantinedByPolicy(offer)&&isPublicationReady(offer));
  const countBy = (rows, key) => Object.fromEntries([...rows.reduce((counts, row) => { const value = row[key] || "sonstige"; counts.set(value, (counts.get(value) || 0) + 1); return counts; }, new Map())].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "de")).map(([name, count]) => [name, count]));
  const isQuarantined = isQuarantinedByPolicy;
  const sourceNames={awin:"Awin",impact:"Impact",amazon:"Amazon",direct:"Direkt",daisycon:"Daisycon",tradedoubler:"Tradedoubler",webgains:"Webgains"};
  const sourceStats = countBy(publicOffers.map(offer => ({ source: sourceNames[offer.source] || "sonstige" })), "source");
  const officialMediaStats = countBy(publicOffers.filter(offer=>offer.imageUrl).map(offer=>({source:sourceNames[offer.source]||"sonstige"})),"source");
  const missingMediaStats = countBy(awaitingMediaOffers.map(offer=>({source:sourceNames[offer.source]||"sonstige"})),"source");
  const merchantStats = countBy(publicOffers, "advertiser");
  const categoryStats = countBy(publicOffers, "category");
  const impactSignals=impact?.audit?.programSignals??[];
  const impactOpportunities=rankImpactPrograms(impactSignals);
  const impactMarketplaceSearches=buildImpactMarketplaceSearches({siteCategoryStats:categoryStats,signals:impactSignals});
  const daisyconOpportunities=rankDaisyconPrograms(collected.daisyconPrograms??[],collected.daisyconProgramReviews??{});
  const webgainsOpportunities=rankWebgainsPrograms(collected.webgainsMemberships??[],collected.webgainsProgramReviews??{});
  const networkMarketplaceSearches={
    daisycon:buildNetworkMarketplaceSearches({siteCategoryStats:categoryStats,network:"Daisycon",connected:Boolean(process.env.DAISYCON_PUBLISHER_ID&&process.env.DAISYCON_ACCESS_TOKEN)}),
    tradedoubler:buildNetworkMarketplaceSearches({siteCategoryStats:categoryStats,network:"Tradedoubler",connected:Boolean(process.env.TRADEDOUBLER_FEED_URLS)}),
    webgains:buildNetworkMarketplaceSearches({siteCategoryStats:categoryStats,network:"Webgains",connected:Boolean(process.env.WEBGAINS_PUBLISHER_ID&&process.env.WEBGAINS_ACCESS_TOKEN)})
  };
  const awinEnhancedFeeds = feedSources.find(source => source.name === "awin-enhanced-feeds")?.audit?.feeds ?? [];
  const feedAdvertisers=new Set(feedSources.flatMap(source=>(source.audit?.feeds??[]).filter(feed=>feed.state==="available").map(feed=>String(feed.advertiserId))));
  const checkedAt=new Date().toISOString();
  const programInventory=programmeRows.map(row=>({name:row.name,platform:"Awin",status:row.relationship,country:"DE",categories:row.primarySector?[row.primarySector]:[],commission:null,cookieDuration:null,
    productFeed:feedAdvertisers.has(String(row.advertiserId)),images:null,prices:null,coupons:null,deeplinks:null,dealShoppingAllowed:null,
    applicationPossible:row.relationship==="notjoined",applicationSent:row.relationship==="pending",lastChecked:checkedAt,advertiserId:row.advertiserId,applicationDraft:row.applicationDraft??null}));
  const impactInventory=(impact?.audit?.programInventory??[]).map(row=>({name:row.name,platform:"Impact",status:row.status,country:row.countries,categories:[],commission:null,cookieDuration:null,
    productFeed:(impact?.audit?.catalogs??0)>0,images:(impact?.audit?.products??0)>0,prices:(impact?.audit?.products??0)>0,coupons:(impact?.audit?.promotions??0)>0,deeplinks:row.deeplinks,
    dealShoppingAllowed:null,applicationPossible:false,applicationSent:false,lastChecked:checkedAt,advertiserId:row.advertiserId,campaignId:row.campaignId}));
  const daisyconInventory=daisyconOpportunities.map(row=>({name:row.brand,platform:"Daisycon",status:row.status,country:"DE",categories:[row.category],commission:null,cookieDuration:null,
    productFeed:null,images:null,prices:null,coupons:null,deeplinks:null,dealShoppingAllowed:null,
    applicationPossible:row.applicationPossible,applicationSent:false,lastChecked:checkedAt,advertiserId:row.programId,
    opportunityScore:row.score,opportunityPriority:row.priority,nextAction:row.nextAction}));
  const webgainsInventory=webgainsOpportunities.map(row=>({name:row.brand,platform:"Webgains",status:row.status,country:"DE",categories:[row.category],commission:row.metrics?.commission??null,cookieDuration:null,
    productFeed:row.metrics?.hasProductFeed??null,images:null,prices:null,coupons:null,deeplinks:null,dealShoppingAllowed:null,
    applicationPossible:row.applicationPossible,applicationSent:false,lastChecked:checkedAt,advertiserId:row.programId,campaignId:row.campaignId,
    opportunityScore:row.score,opportunityPriority:row.priority,nextAction:row.nextAction,submissionReady:row.submissionReady,humanApprovalRequired:true}));
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
  const impactOpportunityByCampaign=new Map(impactOpportunities.map(opportunity=>[String(opportunity.campaignId),opportunity]));
  for(const program of impactInventory){
    const opportunity=impactOpportunityByCampaign.get(String(program.campaignId));
    if(!opportunity)continue;
    program.opportunityScore=opportunity.score;
    program.opportunityPriority=opportunity.priority;
    program.assets=opportunity.assets;
    program.nextAction=opportunity.nextAction;
  }
  const growth={generatedAt:new Date().toISOString(),market:"DE",publisherId:Number(process.env.AWIN_PUBLISHER_ID)||null,
    awin:{counts:Object.fromEntries(Object.entries(collected.awinPrograms??{}).map(([key,rows])=>[key,rows.length])),programs:programmeRows,discoveryOffers:awinDiscoveryOffers.length,discoveryError:collected.awinDiscoveryError??null,detailsEnriched:Object.keys(collected.awinProgramDetails??{}).length,opportunities:opportunities.slice(0,25),feeds:feedSources.map(source=>({source:source.name,state:source.state,count:source.rows.length,audit:source.audit??null}))},
    impact:{state:impact?.state??"disabled",publishableOffers:impact?.rows.length??0,inventory:impact?.audit??null,opportunities:impactOpportunities.slice(0,25),marketplaceSearches:impactMarketplaceSearches.slice(0,10)},
    daisycon:{state:process.env.DAISYCON_PUBLISHER_ID&&process.env.DAISYCON_ACCESS_TOKEN?"connected":"disabled",programError:collected.daisyconProgramError??null,mediaDetected:(collected.daisyconMedia??[]).length,reviewsEnriched:Object.keys(collected.daisyconProgramReviews??{}).length,programs:daisyconOpportunities.slice(0,50),marketplaceSearches:networkMarketplaceSearches.daisycon.slice(0,10)},
    tradedoubler:{state:process.env.TRADEDOUBLER_FEED_URLS?"feed-connected":"disabled",marketplaceSearches:networkMarketplaceSearches.tradedoubler.slice(0,10),programJoinAutomation:"not-verified",nextStep:"Programmsuche/Beitritt bis zu einem dokumentierten Join-Endpunkt im Publisher-Dashboard prüfen."},
    webgains:{state:process.env.WEBGAINS_PUBLISHER_ID&&process.env.WEBGAINS_ACCESS_TOKEN?"api-connected":process.env.WEBGAINS_FEED_URLS?"feed-connected":"disabled",membershipError:collected.webgainsMembershipError??null,reviewsEnriched:Object.keys(collected.webgainsProgramReviews??{}).length,programs:webgainsOpportunities.slice(0,50),marketplaceSearches:networkMarketplaceSearches.webgains.slice(0,10),programMembershipApi:"documented",applicationSubmission:"human-review-required",reason:"Webgains Memberships und Terms werden automatisch gelesen; accept_terms=true wird nur nach ausdrücklicher menschlicher Bestätigung des geprüften Terms-Stands verwendet."},
    publication:{offers:publicOffers.length,concreteAwaitingMedia:awaitingMediaOffers.length,blockedPublisherPromotions:blockedPublisherPromotions.length,partnerEntries:offers.length-concreteOffers.length,merchants:new Set(publicOffers.map(offer=>offer.advertiser)).size,products:publicOffers.filter(offer=>offer.productId).length,images:publicOffers.filter(offer=>offer.imageUrl).length,videos:publicOffers.filter(offer=>offer.videoUrl).length,prices:publicOffers.filter(offer=>offer.currentPrice!=null).length,discounts:publicOffers.filter(offer=>offer.discountPercent).length,coupons:publicOffers.filter(offer=>offer.voucherCode).length},
    safeguards:{unjoinedProgramsPublished:false,applicationSubmission:"review-required",credentialsPersisted:false}};
  await fs.writeFile("data/affiliate-growth.json",`${JSON.stringify(growth,null,2)}\n`);
  await fs.mkdir("report",{recursive:true});
  await fs.writeFile("report/program-inventory.json",`${JSON.stringify({generatedAt:checkedAt,programs:[...programInventory,...impactInventory,...daisyconInventory,...webgainsInventory]},null,2)}\n`);
  await fs.writeFile("data/program-opportunities.json",`${JSON.stringify({
    generatedAt:checkedAt,
    scope:"Automatisch aus Programminventar, DE-Angebotsabdeckung und verfügbaren Netzwerk-/Feed-Signalen erzeugt.",
    automation:{discovery:"automatic",ranking:"automatic",applicationDrafts:"automatic",submission:"human-review-required",reason:"Programmbewerbungen können Vertragsbedingungen enthalten und werden nicht blind bestätigt."},
    programs:opportunities.slice(0,50),
    impact:{status:impact?.state??"disabled",joinedPrograms:impactInventory.length,opportunities:impactOpportunities.slice(0,25),marketplaceSearches:impactMarketplaceSearches.slice(0,10),marketplaceDiscovery:"dashboard-review-required",applicationTermsRequireApproval:true,note:"Bestehende Impact-Programme werden automatisch nach nutzbaren Produkten, Aktionen, Deals und Creatives priorisiert. Neue Marketplace-Bewerbungen werden erst nach Prüfung der jeweiligen Bedingungen bestätigt."},
    daisycon:{status:process.env.DAISYCON_PUBLISHER_ID&&process.env.DAISYCON_ACCESS_TOKEN?"connected":"disabled",programError:collected.daisyconProgramError??null,mediaDetected:(collected.daisyconMedia??[]).length,reviewsEnriched:Object.keys(collected.daisyconProgramReviews??{}).length,opportunities:daisyconOpportunities.slice(0,50),marketplaceSearches:networkMarketplaceSearches.daisycon.slice(0,10)},
    tradedoubler:{status:process.env.TRADEDOUBLER_FEED_URLS?"feed-connected":"disabled",marketplaceSearches:networkMarketplaceSearches.tradedoubler.slice(0,10),applicationApi:"not-verified",marketplaceSubmission:"dashboard-review-required"},
    webgains:{status:process.env.WEBGAINS_PUBLISHER_ID&&process.env.WEBGAINS_ACCESS_TOKEN?"api-connected":process.env.WEBGAINS_FEED_URLS?"feed-connected":"disabled",membershipError:collected.webgainsMembershipError??null,reviewsEnriched:Object.keys(collected.webgainsProgramReviews??{}).length,opportunities:webgainsOpportunities.slice(0,50),marketplaceSearches:networkMarketplaceSearches.webgains.slice(0,10),membershipApi:"documented",marketplaceSubmission:"human-review-required",applicationTermsRequireApproval:true}
  },null,2)}\n`);
  await fs.writeFile("data/impact-opportunities.json",`${JSON.stringify({generatedAt:checkedAt,status:impact?.state??"disabled",joinedPrograms:impactInventory.length,automation:{joinedProgramScoring:"automatic",marketplaceGapDetection:"automatic",contactDrafts:"automatic",marketplaceSubmission:"human-review-required"},programs:impactOpportunities.slice(0,50),marketplaceSearches:impactMarketplaceSearches.slice(0,10)},null,2)}\n`);
  const affiliateOpportunityReport=buildAffiliateOpportunityReport({
    awin:opportunities.slice(0,50),
    impact:impactOpportunities.slice(0,50),
    daisycon:daisyconOpportunities.map(row=>({...row,applicationDraft:row.applicationPossible?buildNetworkApplicationDraft({network:"Daisycon",brand:row.brand,category:row.category}):null})).slice(0,50),
    webgains:webgainsOpportunities.map(row=>({...row,applicationDraft:row.applicationPossible?buildNetworkApplicationDraft({network:"Webgains",brand:row.brand,category:row.category}):null})).slice(0,50),
    networkSearches:networkMarketplaceSearches,
    generatedAt:checkedAt
  });
  await fs.writeFile("data/affiliate-opportunities.json",`${JSON.stringify(affiliateOpportunityReport,null,2)}\n`);
  const partnerOutreachQueue=buildPartnerOutreachQueue({opportunities:affiliateOpportunityReport.actionNow,statusRows:partnerOutreachStatus.statuses??[],contactDirectory:partnerContactDirectory.contacts??[],generatedAt:checkedAt,dailyLimit:8});
  await fs.writeFile("data/partner-outreach-queue.json",`${JSON.stringify(partnerOutreachQueue,null,2)}\n`);
  const manualActions=[];
  if(!process.env.AWIN_PUBLISHER_ID||!process.env.AWIN_API_TOKEN)manualActions.push({id:"awin-api-credentials",platform:"Awin",action:"AWIN_PUBLISHER_ID und AWIN_API_TOKEN als sichere Runtime-/GitHub-Secrets konfigurieren.",reason:"Ohne Publisher-ID und API-Token können aktive Awin-Programme und Enhanced Feeds nicht aktualisiert werden."});
  if(!process.env.AWIN_DATAFEED_API_KEY)manualActions.push({id:"awin-datafeed-key",platform:"Awin",action:"AWIN_DATAFEED_API_KEY als lokales .env.local-Secret und GitHub Actions Secret hinterlegen.",reason:"Die offizielle Legacy-Produktfeed-Liste benötigt einen separaten Datafeed-Key."});
  if(!process.env.AMAZON_CREATORS_CREDENTIAL_ID||!process.env.AMAZON_CREATORS_CREDENTIAL_SECRET||!process.env.AMAZON_PARTNER_TAG)manualActions.push({id:"amazon-creators-api",platform:"Amazon",action:"Amazon PartnerNet vollständig freischalten, Creators-API-Credentials und deutschen Partner-Tag als GitHub Secrets hinterlegen.",reason:"Ohne finale Amazon-Associates-Freigabe, Credential ID, Secret und Partner-Tag werden keine Amazon-Preise oder Produktbilder automatisiert übernommen."});
  if(!process.env.IMPACT_ACCOUNT_SID||!process.env.IMPACT_AUTH_TOKEN)manualActions.push({id:"impact-api-credentials",platform:"Impact",action:"IMPACT_ACCOUNT_SID und IMPACT_AUTH_TOKEN als sichere Runtime-/GitHub-Secrets konfigurieren.",reason:"Ohne beide Impact-Zugangswerte können Kampagnen, Ads und Katalogdaten nicht synchronisiert werden."});
  else {
    const gap=impactMarketplaceSearches[0];
    manualActions.push({id:"impact-marketplace-review",platform:"Impact",action:gap?`Impact Marketplace zuerst nach passenden Brands für ${gap.category} durchsuchen (${gap.searchTerms.join(", ")}).`:"Brands Marketplace auf neue passende Programme prüfen und nur nach Prüfung der jeweiligen Vertragsbedingungen bewerben.",reason:gap?`Automatisch erkannte Abdeckungslücke: ${gap.siteOffers} Angebotslotse-Angebote stehen ${gap.joinedPrograms} zugeordneten Impact-Programmen gegenüber. Vertragsbedingungen vor Bewerbung prüfen.`:"Neue Marketplace-Bewerbungen können Vertragsannahmen oder Surveys erfordern und werden deshalb nicht blind abgesendet."});
    for(const opportunity of impactOpportunities.filter(row=>row.contactDraft).slice(0,3))manualActions.push({id:`impact-contact-${opportunity.campaignId}`,platform:"Impact",action:opportunity.nextAction,reason:`Bestehende Partnerschaft automatisch priorisiert (${opportunity.score} Punkte): ${opportunity.reasons.join(", ") || "wenige nutzbare Assets"}.`,contactDraft:opportunity.contactDraft});
  }
  for(const opportunity of opportunities.filter(opportunity=>opportunity.applicationRequired&&opportunity.priority!=="niedrig").slice(0,8))manualActions.push({id:`awin-apply-${opportunity.advertiserId}`,platform:"Awin",action:opportunity.nextAction,reason:`Automatisch priorisiert (${opportunity.score} Punkte): ${opportunity.reasons.join(", ") || "passendes Programm"}. Keine automatische Zustimmung zu Vertragsbedingungen.`,applicationDraft:opportunity.applicationDraft});

  if(!process.env.DAISYCON_PUBLISHER_ID||!process.env.DAISYCON_ACCESS_TOKEN){
    const gap=networkMarketplaceSearches.daisycon[0];
    manualActions.push({id:"daisycon-connect",platform:"Daisycon",action:"Kostenlosen Daisycon-Publisherzugang/API-Zugang freischalten und DAISYCON_PUBLISHER_ID + DAISYCON_ACCESS_TOKEN sicher hinterlegen.",reason:gap?`Danach zuerst Programme für ${gap.category} priorisieren (${gap.searchTerms.join(", ")}), weil dort aktuell ${gap.siteOffers} veröffentlichte Angebotslotse-Angebote liegen.`:"Ohne API-Zugang können Programme und Produktfeeds nicht automatisch bewertet werden."});
  } else {
    const gap=networkMarketplaceSearches.daisycon[0];
    if(gap)manualActions.push({id:"daisycon-marketplace-review",platform:"Daisycon",action:`Daisycon zuerst nach passenden Programmen für ${gap.category} durchsuchen (${gap.searchTerms.join(", ")}).`,reason:`Automatisch priorisierte Kategorie mit ${gap.siteOffers} Angebotslotse-Angeboten. Programmbedingungen vor Bewerbung prüfen.`});
    for(const opportunity of daisyconOpportunities.filter(row=>row.applicationPossible&&row.priority!=="niedrig").slice(0,5)){
      manualActions.push({id:`daisycon-apply-${opportunity.programId}`,platform:"Daisycon",action:opportunity.nextAction,reason:`Automatisch priorisiert (${opportunity.score} Punkte): ${opportunity.reasons.join(", ") || "passendes Programm"}. Keine automatische Vertragsannahme.`,applicationDraft:buildNetworkApplicationDraft({network:"Daisycon",brand:opportunity.brand,category:opportunity.category})});
    }
  }

  {
    const searches=networkMarketplaceSearches.tradedoubler??[];
    const gap=searches[0];
    const productsConnected=Boolean(process.env.TRADEDOUBLER_PRODUCTS_TOKEN||process.env.TRADEDOUBLER_FEED_URLS);
    if(!productsConnected){
      manualActions.push({id:"tradedoubler-connect",platform:"Tradedoubler",action:"Kostenlosen Tradedoubler-Publisherzugang freischalten und entweder TRADEDOUBLER_PRODUCTS_TOKEN oder einen offiziellen Produktfeed als TRADEDOUBLER_FEED_URLS hinterlegen.",reason:gap?`Danach zuerst Programme für ${gap.category} priorisieren (${gap.searchTerms.join(", ")}), weil dort aktuell ${gap.siteOffers} Angebotslotse-Angebote liegen.`:"Ohne Netzwerkzugang können Produktfeeds noch nicht automatisch synchronisiert werden."});
    } else if(gap){
      manualActions.push({id:"tradedoubler-marketplace-review",platform:"Tradedoubler",action:`Tradedoubler nach passenden Programmen für ${gap.category} durchsuchen (${gap.searchTerms.join(", ")}); Bewerbung erst nach Prüfung der Programmbedingungen bestätigen.`,reason:`Automatisch priorisierte Kategorie mit ${gap.siteOffers} Angebotslotse-Angeboten. Die Publisher API unterstützt Programmbewerbungen, Vertragsbedingungen bleiben review-pflichtig.`});
    }
    if(!process.env.TRADEDOUBLER_VOUCHERS_TOKEN){
      manualActions.push({id:"tradedoubler-vouchers-connect",platform:"Tradedoubler",action:"Optional den offiziellen Voucher-API-Token als TRADEDOUBLER_VOUCHERS_TOKEN hinterlegen.",reason:"Damit können gültige Gutscheine und Rabattcodes zusätzlich automatisch eingelesen werden; ohne Token bleibt diese Quelle deaktiviert."});
    }
  }
  {
    const searches=networkMarketplaceSearches.webgains??[];
    const gap=searches[0];
    const apiConnected=Boolean(process.env.WEBGAINS_PUBLISHER_ID&&process.env.WEBGAINS_ACCESS_TOKEN);
    if(!apiConnected){
      manualActions.push({id:"webgains-api-connect",platform:"Webgains",action:"Kostenlosen Webgains-Publisherzugang freischalten und WEBGAINS_PUBLISHER_ID + WEBGAINS_ACCESS_TOKEN sicher hinterlegen.",reason:gap?`Danach zuerst Programme für ${gap.category} priorisieren (${gap.searchTerms.join(", ")}), weil dort aktuell ${gap.siteOffers} Angebotslotse-Angebote liegen.`:"Ohne Platform-API-Zugang können Memberships und Programmbedingungen nicht automatisch geprüft werden."});
    } else {
      if(gap)manualActions.push({id:"webgains-marketplace-review",platform:"Webgains",action:`Webgains Memberships für ${gap.category} priorisieren (${gap.searchTerms.join(", ")}); Join erst nach Prüfung des abgerufenen Terms-Stands bestätigen.`,reason:`Automatisch priorisierte Kategorie mit ${gap.siteOffers} Angebotslotse-Angeboten. accept_terms bleibt ausdrücklich menschlich freigabepflichtig.`});
      for(const opportunity of webgainsOpportunities.filter(row=>row.applicationPossible&&row.priority!=="niedrig").slice(0,5)){
        manualActions.push({
          id:`webgains-apply-${opportunity.programId}`,
          platform:"Webgains",
          action:opportunity.nextAction,
          reason:`Automatisch priorisiert (${opportunity.score} Punkte): ${opportunity.reasons.join(", ")||"passendes Programm"}. Terms-Digest: ${opportunity.termsDigest||"noch nicht verfügbar"}.`,
          applicationDraft:buildNetworkApplicationDraft({network:"Webgains",brand:opportunity.brand,category:opportunity.category}),
          submissionReady:opportunity.submissionReady,
          humanApprovalRequired:true
        });
      }
    }
    if(!process.env.WEBGAINS_FEED_URLS){
      manualActions.push({id:"webgains-feed-connect",platform:"Webgains",action:"Optional nach Programfreigabe offizielle Webgains-Produktfeed-URLs als WEBGAINS_FEED_URLS hinterlegen.",reason:"Membership-/Terms-Prüfung funktioniert unabhängig vom Produktfeed; der Feed liefert anschließend Produkte, Preise und Bilder."});
    }
  }
  await fs.writeFile("report/manual-actions.json",`${JSON.stringify({
    generatedAt:checkedAt,
    topActions:affiliateOpportunityReport.actionNow,
    connectionActions:affiliateOpportunityReport.connectionQueue,
    actions:manualActions
  },null,2)}\n`);
  const oldProgramKeys=new Set((oldProgramInventory.programs??[]).map(program=>`${program.platform}:${program.advertiserId}:${program.campaignId??""}`));
  const selections=selectHomepageOffers(publicOffers,{now:new Date(checkedAt),score:offer=>(offer.discountPercent||0)*1000+(offer.currentPrice!=null?80:0)+(offer.endDate?50:0)+(offer.voucherCode?30:0)+(offer.imageUrl?25:0)});
  const report={generatedAt:checkedAt,newAwinPrograms:programInventory.filter(program=>!oldProgramKeys.has(`Awin:${program.advertiserId}:`)).length,newImpactPrograms:impactInventory.filter(program=>!oldProgramKeys.has(`Impact:${program.advertiserId}:${program.campaignId??""}`)).length,newDaisyconPrograms:daisyconInventory.filter(program=>!oldProgramKeys.has(`Daisycon:${program.advertiserId}:`)).length,newWebgainsPrograms:webgainsInventory.filter(program=>!oldProgramKeys.has(`Webgains:${program.advertiserId}:${program.campaignId??""}`)).length,activeAwinPrograms:programInventory.filter(program=>program.status==="joined").length,activeImpactPrograms:impactInventory.filter(program=>String(program.status).toLowerCase()==="active").length,applicationsSent:0,pendingApplications:programInventory.filter(program=>program.status==="pending").length,manualApplications:manualActions.filter(action=>/-apply-/.test(action.id)).length,networkReviewActions:manualActions.filter(action=>/(marketplace-review|connect)$/.test(action.id)).length,awinDiscoveryOffers:awinDiscoveryOffers.length,applicationCandidates:opportunities.filter(opportunity=>opportunity.applicationRequired).length+daisyconOpportunities.filter(opportunity=>opportunity.applicationPossible).length+webgainsOpportunities.filter(opportunity=>opportunity.applicationPossible).length,newMerchants:new Set(publicOffers.filter(offer=>!oldIds.has(offer.id)).map(offer=>offer.advertiser)).size,newProducts:publicOffers.filter(offer=>!oldIds.has(offer.id)&&offer.productId).length,productsWithImage:publicOffers.filter(offer=>offer.imageUrl).length,productsWithVideo:publicOffers.filter(offer=>offer.videoUrl).length,productsWithPrice:publicOffers.filter(offer=>Number(offer.currentPrice)>0).length,productsWithOldPrice:publicOffers.filter(offer=>Number(offer.previousPrice)>Number(offer.currentPrice)).length,productsWithDiscount:publicOffers.filter(offer=>Number(offer.discountPercent)>0).length,newCoupons:publicOffers.filter(offer=>offer.voucherCode&&!oldIds.has(offer.id)).length,coupons:publicOffers.filter(offer=>offer.voucherCode).length,priceChanges:publicOffers.filter(offer=>offer.lastPriceChange).length,expiredOffers:oldOffers.filter(offer=>offer.endDate&&new Date(offer.endDate)<=new Date()).length,expiredCoupons:oldOffers.filter(offer=>offer.voucherCode&&offer.endDate&&new Date(offer.endDate)<=new Date()).length,filteredForeignLocale,totalProducts:publicOffers.length,productsBySource:sourceStats,officialImagesBySource:officialMediaStats,missingMediaBySource:missingMediaStats,productsByMerchant:merchantStats,productsByCategory:categoryStats,awinEnhancedFeeds,quarantinedRecords:offers.filter(isQuarantined).length,blockedPublisherPromotions:blockedPublisherPromotions.length,dailyDeal:selections.dailyDeal?.id||null,dailyHighlights:selections.dailyHighlights.map(offer=>offer.id),weekDeals:selections.weekDeals.map(offer=>offer.id),monthHighlights:selections.monthHighlights.map(offer=>offer.id),apiErrors:failed.size,affiliateLinkErrors:0};
  await fs.writeFile("report/update-report.json",`${JSON.stringify(report,null,2)}\n`);
} catch (error) {
  status = buildFailureStatus({ oldStatus, oldOffers, isQuarantined: isQuarantinedByPolicy, error });
  await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
  throw error;
}
await fs.writeFile("data/status.json", `${JSON.stringify(status, null, 2)}\n`);
