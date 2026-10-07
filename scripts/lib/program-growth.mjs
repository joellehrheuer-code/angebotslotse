const rules = [
  ["Gaming", /gaming|game|games|console|esport|playstation|xbox|nintendo|steam/i],
  ["Technik & Computer", /computer|elektronik|electronic|technology|technik|mobile|phone|smartphone|telecom|internet|laptop|monitor|hardware|tablet/i],
  ["Smart Home", /smart\s?home|robot vacuum|saugroboter|staubsaugerroboter|security camera|thermostat|homekit|matter|roborock|dreame|ecovacs|irobot|imou|eufy/i],
  ["Audio & Creator", /audio|music|musik|headphone|speaker|microphone|mikrofon|recording|camera|kamera|creator|streaming|webcam/i],
  ["Homeoffice", /home\s?office|office|büro|buero|desk|schreibtisch|ergonomic|docking|conference|meeting/i],
  ["Mode & Sport", /fashion|mode|sportswear|sport|fitness|shoe|sneaker|apparel|clothing|running|cycling/i],
  ["Gesundheit & Wellness", /health|gesundheit|wellness|massage|sleep|schlaf|oral care|zahnpflege|fitness tracker/i],
  ["Haushalt & Küche", /home|haushalt|kitchen|küche|appliance|coffee|kaffee|vacuum|staubsauger|food|drink|lebensmittel|gewürz|gewuerz|spice/i],
  ["Garten & Werkzeug", /garden|garten|mower|mähroboter|maehroboter|werkzeug|tool|diy|grill/i],
  ["Auto & Mobilität", /automotive|\\bauto\\b|\\bcar\\b|vehicle|dashcam|navigation|e-bike|ebike|mobility/i],
  ["Tierbedarf", /pet|pets|tier|hund|katze|cat|dog|aquarium/i],
  ["Beauty & Pflege", /beauty|kosmetik|skincare|haircare|pflege|parfum|fragrance/i],
  ["Freizeit & Reisen", /travel|reise|freizeit|outdoor|hobby|ticket/i],
];

const strategic = /\b(?:amazon|coolblue|beyerdynamic|adidas|dyson|lidl|decathlon|samsung|lenovo|nike|under armour|razer|thomann|rode|waves|logitech|corsair|asus|msi|sony|philips|bosch|lg|anker|ankerkraut|eufy|roborock|dreame|ecovacs|irobot|xiaomi|dji|gopro|garmin|fitbit|puma|shure|sennheiser|elgato|steelseries|hyperx|hp|dell|acer|intersport|sportspar|bstn|premiumsim|zooplus|fressnapf|alternate|cyberport|notebooksbilliger)\b/i;
const strategicExact = /^(?:one de)$/i;
const blockedPartnerSignal = /\b(?:adult|erotic|erotik|sexshop|sexspielzeug|sex\s?toy|vibrator|dildo|masturbator|analplug|butt\s?plug|penisring|porn(?:o|ografie|ography)?|erotikshop|bdsm\s?gear|lovense|satisfyer)\b/i;
export const isBlockedPartnerProgram = program => blockedPartnerSignal.test(`${program?.name??""} ${program?.primarySector??""} ${program?.description??""}`);
export const isStrategicProgram = program => { const name=String(program?.name ?? "").trim(); return strategicExact.test(name) || strategic.test(name); };

const finiteMetric = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const siteCategoryKeys = {
  "Gaming": ["gaming"],
  "Technik & Computer": ["technik","computer","zubehoer"],
  "Smart Home": ["smart-home"],
  "Audio & Creator": ["audio-musik"],
  "Homeoffice": ["homeoffice"],
  "Mode & Sport": ["mode","sport-fitness"],
  "Gesundheit & Wellness": ["gesundheit"],
  "Haushalt & Küche": ["haushalt"],
  "Garten & Werkzeug": ["garten","werkzeug"],
  "Auto & Mobilität": ["auto"],
  "Tierbedarf": ["tierbedarf"],
  "Beauty & Pflege": ["beauty"],
  "Freizeit & Reisen": ["freizeit"]
};
export const categoryCoverage = (category, siteCategoryStats = {}) =>
  (siteCategoryKeys[category] || []).reduce((sum,key)=>sum+(Number(siteCategoryStats[key])||0),0);


export const summarizeAwinProgramDetail = detail => {
  const row = Array.isArray(detail) ? detail[0] : detail;
  const kpi = row?.kpi ?? {};
  const ranges = Array.isArray(row?.commissionRange) ? row.commissionRange : [];
  return {
    awinIndex: finiteMetric(kpi.awinIndex),
    epc: finiteMetric(kpi.epc),
    conversionRate: finiteMetric(kpi.conversionRate),
    approvalPercentage: finiteMetric(kpi.approvalPercentage),
    validationDays: finiteMetric(kpi.validationDays),
    averagePaymentTime: kpi.averagePaymentTime ?? null,
    commissionMin: ranges.length ? Math.min(...ranges.map(item => Number(item.min)).filter(Number.isFinite)) : null,
    commissionMax: ranges.length ? Math.max(...ranges.map(item => Number(item.max)).filter(Number.isFinite)) : null,
    commissionTypes: [...new Set(ranges.map(item => item.type).filter(Boolean))]
  };
};

export const categoryForProgram = program => {
  const text = `${program?.name ?? ""} ${program?.primarySector ?? ""}`;
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Weitere";
};

export const buildApplicationDraft = ({ name, primarySector, activeOffers = 0 }) => {
  const category = categoryForProgram({ name, primarySector });
  const offerSentence = activeOffers > 0
    ? `Bei Awin sind aktuell ${activeOffers} für Deutschland sichtbare Aktion${activeOffers === 1 ? "" : "en"} dieses Programms vorhanden. `
    : "";
  return `Angebotslotse ist ein unabhängiges deutsches Deal-, Preis- und Discovery-Portal. Wir möchten ${name} redaktionell passend im Bereich ${category} einbinden. ${offerSentence}Wir verwenden ausschließlich freigegebene Produkt-, Preis-, Medien- und Aktionsdaten und kennzeichnen Affiliate-Links transparent als Werbung. Preisvorteile werden nur aus belegbaren Quelldaten dargestellt; Reichweitenangaben werden nicht erfunden. Wir freuen uns über die Prüfung unserer Bewerbung.`;
};

export function rankAwinOpportunities({ programs = [], discoveryOffers = [], feedAdvertiserIds = [], programDetails = {}, siteCategoryStats = {} } = {}) {
  const feedIds = new Set([...feedAdvertiserIds].map(String));
  const detailMap = programDetails instanceof Map ? programDetails : new Map(Object.entries(programDetails ?? {}));
  const offerMap = new Map();
  for (const offer of discoveryOffers) {
    const advertiser = offer?.advertiser ?? {};
    const id = String(advertiser.id ?? offer?.advertiserId ?? "");
    if (!id) continue;
    const entry = offerMap.get(id) ?? { count: 0, examples: [] };
    entry.count += 1;
    if (entry.examples.length < 3 && offer?.title) entry.examples.push(String(offer.title).slice(0, 140));
    offerMap.set(id, entry);
  }

  return programs
    .filter(program => !isBlockedPartnerProgram(program) && ["notjoined", "pending"].includes(String(program.relationship).toLowerCase()))
    .map(program => {
      const advertiserId = program.advertiserId ?? program.id ?? null;
      const id = String(advertiserId ?? "");
      const discovered = offerMap.get(id) ?? { count: 0, examples: [] };
      const category = categoryForProgram(program);
      const hasFeed = feedIds.has(id);
      const metrics = summarizeAwinProgramDetail(detailMap.get(id));
      const siteCoverage = categoryCoverage(category, siteCategoryStats);
      let score = 0;
      const reasons = [];
      if (category !== "Weitere") { score += 20; reasons.push(`passt zu ${category}`); }
      if (category !== "Weitere") {
        const breadthPoints = siteCoverage < 10 ? 15 : siteCoverage < 25 ? 10 : siteCoverage < 50 ? 5 : 0;
        if (breadthPoints) { score += breadthPoints; reasons.push(`Sortimentslücke: erst ${siteCoverage} veröffentlichte Angebote in ${category}`); }
      }
      if (isStrategicProgram(program)) { score += 15; reasons.push("strategisch relevante Marke"); }
      if (discovered.count) { const points = Math.min(30, discovered.count * 6); score += points; reasons.push(`${discovered.count} aktive DE-Aktion${discovered.count === 1 ? "" : "en"}`); }
      if (hasFeed) { score += 25; reasons.push("Produktfeed verfügbar"); }
      if (metrics.awinIndex != null) { score += Math.min(20, Math.max(0, Math.round(metrics.awinIndex / 5))); reasons.push(`Awin Index ${metrics.awinIndex}`); }
      if (metrics.approvalPercentage != null) {
        const approvalPoints = metrics.approvalPercentage >= 90 ? 8 : metrics.approvalPercentage >= 75 ? 5 : metrics.approvalPercentage >= 50 ? 2 : 0;
        score += approvalPoints;
        reasons.push(`Approval ${metrics.approvalPercentage}%`);
      }
      if (metrics.epc != null && metrics.epc > 0) { score += 5; reasons.push(`EPC ${metrics.epc}`); }
      if (metrics.commissionMax != null && metrics.commissionMax > 0) { score += 5; reasons.push(`Provision bis ${metrics.commissionMax} ${metrics.commissionTypes.join("/") || ""}`.trim()); }
      if (String(program.relationship).toLowerCase() === "notjoined") score += 10;
      const priority = score >= 70 ? "hoch" : score >= 40 ? "mittel" : "niedrig";
      const applicationRequired = String(program.relationship).toLowerCase() === "notjoined";
      return {
        brand: program.name,
        network: "Awin",
        advertiserId,
        status: program.relationship,
        category,
        score,
        priority,
        activeDiscoveryOffers: discovered.count,
        offerExamples: discovered.examples,
        productFeed: hasFeed,
        siteCategoryCoverage: siteCoverage,
        metrics,
        reasons,
        applicationRequired,
        applicationDraft: applicationRequired ? buildApplicationDraft({ name: program.name, primarySector: program.primarySector, activeOffers: discovered.count }) : null,
        nextAction: applicationRequired ? "Bedingungen prüfen und Bewerbung im Awin-Dashboard bestätigen." : "Ausstehende Bewerbung weiter beobachten.",
        automationState: applicationRequired ? "ready-for-review" : "pending"
      };
    })
    .sort((a, b) => b.score - a.score || b.activeDiscoveryOffers - a.activeDiscoveryOffers || String(a.brand).localeCompare(String(b.brand), "de"));
}
