import { categoryForProgram, isStrategicProgram } from "./program-growth.mjs";

const categoryMap = {
  "Gaming": ["gaming"],
  "Technik & Computer": ["technik","computer","zubehoer"],
  "Audio & Musik": ["audio-musik"],
  "Mode & Sport": ["mode"],
  "Haushalt & Alltag": ["haushalt","werkzeug"],
  "Freizeit": ["freizeit"]
};

const searchTerms = {
  "Gaming": ["gaming","games","console","esports","hardware"],
  "Technik & Computer": ["electronics","computer","hardware","mobile","smart home"],
  "Audio & Musik": ["audio","music","headphones","microphone","recording"],
  "Mode & Sport": ["fashion","sportswear","fitness","shoes"],
  "Haushalt & Alltag": ["home","appliances","kitchen","garden","DIY"],
  "Freizeit": ["travel","outdoor","hobby","tickets"]
};

const pick = (row, keys) => keys.map(key => row?.[key]).find(v => v !== undefined && v !== null && v !== "");
const statusText = row => String(pick(row, ["status","relationship","membership_status","membershipStatus","publisher_status"]) ?? "unknown").toLowerCase();

export function rankDaisyconPrograms(programs = []) {
  return programs
    .map(row => {
      const name = String(pick(row, ["name","program_name","title"]) ?? "").trim();
      const id = pick(row, ["id","program_id"]);
      const sector = String(pick(row, ["category","sector","primary_sector","description"]) ?? "");
      const status = statusText(row);
      const category = categoryForProgram({ name, primarySector: sector });
      let score = 0;
      const reasons = [];
      if (category !== "Weitere") { score += 25; reasons.push(`passt zu ${category}`); }
      if (isStrategicProgram({ name })) { score += 20; reasons.push("strategisch relevante Marke"); }
      if (/active|joined|approved|accepted/.test(status)) { score += 20; reasons.push("aktive Beziehung"); }
      if (/available|not.?joined|open|new/.test(status)) { score += 10; reasons.push("potenziell bewerbbar"); }
      const priority = score >= 45 ? "hoch" : score >= 25 ? "mittel" : "niedrig";
      return {
        network: "Daisycon",
        programId: id ?? null,
        brand: name || "Unbenanntes Programm",
        status,
        category,
        score,
        priority,
        reasons,
        applicationPossible: /available|not.?joined|open|new/.test(status),
        nextAction: /available|not.?joined|open|new/.test(status)
          ? "Programmbedingungen im Daisycon-Dashboard prüfen und Bewerbung nur nach Freigabe bestätigen."
          : "Programmdaten und verfügbare Produktfeeds beobachten."
      };
    })
    .filter(row => row.brand && row.brand !== "Unbenanntes Programm")
    .sort((a,b) => b.score - a.score || String(a.brand).localeCompare(String(b.brand),"de"));
}

export function buildNetworkMarketplaceSearches({ siteCategoryStats = {}, network, connected = false } = {}) {
  return Object.entries(categoryMap)
    .map(([category, slugs]) => {
      const siteOffers = slugs.reduce((sum, slug) => sum + (Number(siteCategoryStats[slug]) || 0), 0);
      return {
        network,
        category,
        siteOffers,
        priority: siteOffers >= 50 ? "hoch" : siteOffers >= 15 ? "mittel" : "niedrig",
        searchTerms: searchTerms[category] || [],
        connected,
        action: connected
          ? `${network}: passende Programme für ${category} anhand der Suchbegriffe prüfen; Bedingungen vor Beitritt bestätigen.`
          : `${network}-Publisherzugang/API bzw. offiziellen Feed freischalten; danach Programme für ${category} priorisieren.`
      };
    })
    .filter(row => row.siteOffers > 0)
    .sort((a,b) => b.siteOffers - a.siteOffers || a.category.localeCompare(b.category,"de"));
}

export function buildNetworkApplicationDraft({ network, brand, category }) {
  return `Angebotslotse ist ein deutsches Deal-, Preisvergleichs- und Discovery-Portal. Wir möchten ${brand} über ${network} passend im Bereich ${category} integrieren. Wir verwenden ausschließlich freigegebene Produkt-, Preis-, Medien- und Aktionsdaten, kennzeichnen Affiliate-Links transparent als Werbung und zeigen Rabatte nur auf Basis belegbarer Vergleichspreise. Wir freuen uns über die Prüfung unserer Bewerbung und Hinweise zu verfügbaren Produktfeeds, Gutscheinen und Creatives.`;
}
