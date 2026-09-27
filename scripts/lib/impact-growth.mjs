import { categoryForProgram } from "./program-growth.mjs";

const marketplaceTerms = {
  "Gaming": ["gaming", "games", "console", "esports"],
  "Technik & Computer": ["electronics", "computer", "hardware", "mobile", "smart home"],
  "Audio & Musik": ["audio", "music", "headphones", "microphone", "recording"],
  "Mode & Sport": ["fashion", "sportswear", "fitness", "shoes"],
  "Haushalt & Alltag": ["home", "appliances", "kitchen", "garden", "DIY"],
  "Freizeit": ["travel", "outdoor", "hobby", "tickets"]
};

export const buildImpactContactDraft = signal => {
  const name = signal?.advertiserName || signal?.name || "die Marke";
  const category = categoryForProgram({ name, primarySector: "" });
  return `Hallo ${name}-Team, Angebotslotse ist ein deutsches Deal-, Preisvergleichs- und Discovery-Portal. Wir sind über impact.com bereits mit eurem Programm verbunden und möchten die Zusammenarbeit im Bereich ${category} stärker ausbauen. Besonders interessant sind für uns aktuelle Produktkataloge, zeitlich begrenzte Aktionen, Gutscheincodes und offizielle Medien, die wir transparent und mit korrekter Werbekennzeichnung darstellen können. Wenn für Publisher zusätzliche Feeds, Creatives oder aktuelle Kampagnen verfügbar sind, freuen wir uns über einen Hinweis direkt über impact.com.`;
};

export function rankImpactPrograms(signals = []) {
  return signals.map(signal => {
    const category = categoryForProgram({ name: `${signal.name ?? ""} ${signal.advertiserName ?? ""}`, primarySector: "" });
    let score = 0;
    const reasons = [];
    const products = Number(signal.products) || 0;
    const promotions = Number(signal.promotions) || 0;
    const deals = Number(signal.deals) || 0;
    const ads = Number(signal.ads) || 0;
    if (category !== "Weitere") { score += 15; reasons.push(`passt zu ${category}`); }
    if (products) { score += Math.min(40, products * 3); reasons.push(`${products} Produkt${products === 1 ? "" : "e"}`); }
    if (promotions) { score += Math.min(15, promotions * 4); reasons.push(`${promotions} Promotion${promotions === 1 ? "" : "s"}`); }
    if (deals) { score += Math.min(15, deals * 5); reasons.push(`${deals} aktiver Deal${deals === 1 ? "" : "s"}`); }
    if (ads) { score += Math.min(8, ads * 2); reasons.push(`${ads} Creative${ads === 1 ? "" : "s"}`); }
    if (signal.deeplinks) { score += 8; reasons.push("Deeplinks erlaubt"); }
    if (signal.trackingLinkAvailable) { score += 5; reasons.push("Trackinglink verfügbar"); }
    if (signal.publicTermsAvailable) { score += 4; reasons.push("öffentliche Programmbedingungen"); }
    if (signal.logoAvailable) score += 2;
    const assetCount = products + promotions + deals + ads;
    const priority = score >= 55 ? "hoch" : score >= 30 ? "mittel" : "niedrig";
    const nextAction = products
      ? "Produktkatalog und aktuelle Preise stärker im Angebotslotse ausspielen."
      : promotions || deals
        ? "Aktuelle Aktionen und Codes prominent einbinden; Produktfeed beim Brand-Team erfragen."
        : "Über impact.com nach Produktfeed, Promotions, Codes und Publisher-Creatives fragen.";
    return {
      brand: signal.advertiserName || signal.name,
      campaign: signal.name || null,
      advertiserId: signal.advertiserId ?? null,
      campaignId: signal.campaignId ?? null,
      category,
      score,
      priority,
      assets: { products, promotions, deals, ads },
      capabilities: {
        deeplinks: Boolean(signal.deeplinks),
        trackingLink: Boolean(signal.trackingLinkAvailable),
        publicTerms: Boolean(signal.publicTermsAvailable),
        logo: Boolean(signal.logoAvailable)
      },
      reasons,
      nextAction,
      contactDraft: assetCount < 5 ? buildImpactContactDraft(signal) : null
    };
  }).sort((a,b) => b.score - a.score || b.assets.products - a.assets.products || String(a.brand).localeCompare(String(b.brand), "de"));
}

export function buildImpactMarketplaceSearches({ siteCategoryStats = {}, signals = [] } = {}) {
  const joinedCoverage = new Map();
  for (const signal of signals) {
    const category = categoryForProgram({ name: `${signal.name ?? ""} ${signal.advertiserName ?? ""}`, primarySector: "" });
    if (category === "Weitere") continue;
    joinedCoverage.set(category, (joinedCoverage.get(category) || 0) + 1);
  }
  const categoryMap = {
    "Gaming": ["gaming"],
    "Technik & Computer": ["technik", "computer", "zubehoer"],
    "Audio & Musik": ["audio-musik"],
    "Mode & Sport": ["mode"],
    "Haushalt & Alltag": ["haushalt", "werkzeug"],
    "Freizeit": ["freizeit"]
  };
  return Object.entries(categoryMap).map(([category, slugs]) => {
    const siteOffers = slugs.reduce((sum, slug) => sum + (Number(siteCategoryStats[slug]) || 0), 0);
    const joinedPrograms = joinedCoverage.get(category) || 0;
    const gapScore = Math.max(0, siteOffers - joinedPrograms * 10);
    return {
      category,
      siteOffers,
      joinedPrograms,
      gapScore,
      searchTerms: marketplaceTerms[category] || [],
      action: "Impact Marketplace nach qualifizierten Brands filtern; Vertragsbedingungen vor Bewerbung prüfen."
    };
  }).filter(row => row.siteOffers > 0).sort((a,b) => b.gapScore - a.gapScore || b.siteOffers - a.siteOffers);
}
