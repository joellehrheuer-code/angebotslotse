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

export function rankDaisyconPrograms(programs = [], reviews = {}) {
  const reviewMap = reviews instanceof Map ? reviews : new Map(Object.entries(reviews ?? {}));
  return programs
    .map(row => {
      const name = String(pick(row, ["name","program_name","title"]) ?? "").trim();
      const id = pick(row, ["id","program_id"]);
      const sector = String(pick(row, ["category","sector","primary_sector","description"]) ?? "");
      const rawStatus = statusText(row);
      const review = id != null ? reviewMap.get(String(id)) ?? null : null;
      const status = String(review?.relationship || rawStatus || "unknown").toLowerCase();
      const category = categoryForProgram({ name, primarySector: sector });
      const joined = /active|joined|approved|accepted/.test(status);
      const open = /available|not.?joined|open|new|not-subscribed/.test(status);
      const agreementTermsPresent = Boolean(review?.agreementTermsPresent);
      const questionnaires = Number(review?.questionnaires) || 0;
      const reviewRequired = Boolean(review?.reviewRequired || agreementTermsPresent || questionnaires > 0);
      let score = 0;
      const reasons = [];
      if (category !== "Weitere") { score += 25; reasons.push(`passt zu ${category}`); }
      if (isStrategicProgram({ name })) { score += 20; reasons.push("strategisch relevante Marke"); }
      if (joined) { score += 20; reasons.push("aktive Beziehung"); }
      if (open) { score += 10; reasons.push("potenziell bewerbbar"); }
      if (agreementTermsPresent) reasons.push("Agreement Terms müssen geprüft werden");
      if (questionnaires > 0) reasons.push(`${questionnaires} Fragebogen/Fragebögen erforderlich`);
      const priority = score >= 45 ? "hoch" : score >= 25 ? "mittel" : "niedrig";
      const applicationPossible = open && !joined;
      let nextAction = "Programmdaten und verfügbare Produktfeeds beobachten.";
      let automationState = joined ? "joined" : "monitor";
      if (applicationPossible && questionnaires > 0) {
        nextAction = "Daisycon-Fragebogen und Programmbedingungen prüfen; Bewerbung erst danach manuell bestätigen.";
        automationState = "questionnaire-review-required";
      } else if (applicationPossible && agreementTermsPresent) {
        nextAction = "Daisycon Agreement Terms prüfen; Vertragsbedingungen nicht automatisch akzeptieren.";
        automationState = "terms-review-required";
      } else if (applicationPossible) {
        nextAction = "Bewerbung ist technisch möglich; vor dem Absenden Programmbedingungen final prüfen.";
        automationState = "ready-for-review";
      }
      return {
        network: "Daisycon",
        programId: id ?? null,
        brand: name || "Unbenanntes Programm",
        status,
        category,
        score,
        priority,
        reasons,
        applicationPossible,
        agreementTermsPresent,
        questionnaires,
        reviewRequired,
        automaticSubmissionAllowed: false,
        automationState,
        nextAction
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
