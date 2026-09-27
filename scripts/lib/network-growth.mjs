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
      const subscriptionEndpointAvailable = Boolean(review?.subscriptionEndpointAvailable);
      const submissionReady = Boolean(review?.submissionReady) && !reviewRequired;
      const networkScore = Number(review?.score?.score ?? review?.score?.overall ?? review?.score);
      const commissions = Number(review?.commissions) || 0;
      const accessRulesPresent = Boolean(review?.accessRulesPresent);
      let score = 0;
      const reasons = [];
      if (category !== "Weitere") { score += 25; reasons.push(`passt zu ${category}`); }
      if (isStrategicProgram({ name })) { score += 20; reasons.push("strategisch relevante Marke"); }
      if (joined) { score += 20; reasons.push("aktive Beziehung"); }
      if (open) { score += 10; reasons.push("potenziell bewerbbar"); }
      if (Number.isFinite(networkScore)) { score += Math.min(15, Math.max(0, Math.round(networkScore / 7))); reasons.push("Daisycon-Score vorhanden"); }
      if (commissions > 0) { score += 10; reasons.push("Provisionsdaten vorhanden"); }
      if (accessRulesPresent) reasons.push("Zugangsregeln vorhanden");
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
      } else if (applicationPossible && submissionReady) {
        nextAction = "Subscribe-Endpunkt ist technisch bereit; Bewerbung erst nach ausdrücklicher menschlicher Freigabe absenden.";
        automationState = "ready-for-human-submit";
      } else if (applicationPossible) {
        nextAction = "Bewerbung ist potenziell möglich; Media-/Subscribe-Status und Programmbedingungen vor dem Absenden final prüfen.";
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
        subscriptionEndpointAvailable,
        submissionReady,
        humanApprovalRequired: true,
        metrics: { networkScore: Number.isFinite(networkScore) ? networkScore : null, commissionEntries: commissions, accessRulesPresent },
        automaticSubmissionAllowed: false,
        automationState,
        nextAction
      };
    })
    .filter(row => row.brand && row.brand !== "Unbenanntes Programm")
    .sort((a,b) => b.score - a.score || String(a.brand).localeCompare(String(b.brand),"de"));
}

export function rankWebgainsPrograms(memberships = [], reviews = {}) {
  const reviewMap = reviews instanceof Map ? reviews : new Map(Object.entries(reviews ?? {}));
  return memberships
    .map(row => {
      const program = row?.program && typeof row.program === "object" ? row.program : {};
      const campaign = row?.campaign && typeof row.campaign === "object" ? row.campaign : {};
      const name = String(program.name ?? pick(row, ["program_name","programName","name","merchant_name","merchantName"]) ?? "").trim();
      const programId = program.id ?? pick(row, ["program_id","programId"]);
      const campaignId = campaign.id ?? pick(row, ["campaign_id","campaignId"]);
      const sectorRaw = program.categories ?? pick(row, ["category","categories","sector","description"]) ?? "";
      const sector = Array.isArray(sectorRaw) ? sectorRaw.join(" ") : String(sectorRaw);
      const review = programId != null ? reviewMap.get(String(programId)) ?? null : null;
      const rawStatus = review?.status ?? pick(row, ["membership_status_name","membershipStatusName","status_name","statusName","membership_status","membershipStatus","status"]);
      const status = String(rawStatus ?? "unknown").trim().toLowerCase();
      const numericStatus = /^code:\d+$/.test(status) || /^\d+$/.test(status);
      const joined = Boolean(review?.joined) || (!numericStatus && /joined|active|approved|accepted/.test(status));
      const explicitOpen = !numericStatus && /not.?joined|available|open|new|invitable/.test(status);
      const category = categoryForProgram({ name, primarySector: sector });
      const hasProductFeed = Boolean(program.has_product_feed ?? program.hasProductFeed ?? pick(row, ["has_product_feed","hasProductFeed","product_feed","productFeed"]));
      const commission = Number(program.commission ?? pick(row, ["commission","commission_rate","commissionRate"]));
      let score = 0;
      const reasons = [];
      if (category !== "Weitere") { score += 25; reasons.push(`passt zu ${category}`); }
      if (isStrategicProgram({ name })) { score += 20; reasons.push("strategisch relevante Marke"); }
      if (joined) { score += 20; reasons.push("aktive Beziehung"); }
      if (explicitOpen && !joined) { score += 10; reasons.push("eindeutig als offen/nicht beigetreten markiert"); }
      if (hasProductFeed) { score += 15; reasons.push("Produktfeed verfügbar"); }
      if (Number.isFinite(commission) && commission > 0) { score += 5; reasons.push("Provisionssignal vorhanden"); }
      if (review?.termsPresent) reasons.push("Programmbedingungen abgerufen");
      if (numericStatus) reasons.push("numerischen Membership-Status nicht automatisch interpretiert");
      const applicationPossible = Boolean(review?.applicationPossible) && explicitOpen && !joined;
      const submissionReady = false;
      let automationState = joined ? "joined" : "monitor";
      let nextAction = "Programmdaten beobachten; unbekannte oder numerische Statuscodes nicht automatisch interpretieren.";
      if (applicationPossible) {
        automationState = "dashboard-submit-required";
        nextAction = "Terms wurden abgerufen; Beitritt nach Prüfung im Webgains-Dashboard bestätigen.";
      } else if (explicitOpen && !joined) {
        automationState = "terms-review-required";
        nextAction = "Programmbedingungen abrufen und prüfen; API-Join bleibt deaktiviert.";
      }
      return {network:"Webgains",programId:programId ?? null,campaignId:campaignId ?? review?.campaignId ?? null,brand:name || "Unbenanntes Programm",status,category,score,priority:score >= 45 ? "hoch" : score >= 25 ? "mittel" : "niedrig",reasons,applicationPossible,submissionReady,termsPresent:Boolean(review?.termsPresent),termsDigest:review?.termsDigest ?? null,humanApprovalRequired:true,automaticSubmissionAllowed:false,automationState,nextAction,metrics:{hasProductFeed,commission:Number.isFinite(commission)?commission:null}};
    })
    .filter(row => row.brand && row.brand !== "Unbenanntes Programm")
    .sort((a,b)=>b.score-a.score||String(a.brand).localeCompare(String(b.brand),"de"));
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
