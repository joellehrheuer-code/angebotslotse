const rules = [
  ["Gaming", /gaming|game|games|console|esport|playstation|xbox|nintendo/i],
  ["Technik & Computer", /computer|elektronik|electronic|technology|technik|mobile|phone|smartphone|laptop|monitor|hardware/i],
  ["Audio & Musik", /audio|music|musik|headphone|speaker|microphone|recording/i],
  ["Mode & Sport", /fashion|mode|sportswear|sport|shoe|sneaker|apparel|clothing/i],
  ["Haushalt & Alltag", /home|haushalt|department|garden|kitchen|appliance|werkzeug|tool|diy/i],
  ["Freizeit", /travel|freizeit|outdoor|fitness|hobby/i],
];

const strategic = /amazon|coolblue|beyerdynamic|adidas|dyson|lidl|decathlon|samsung|lenovo|nike|under armour|razer|thomann|rode|waves|logitech|corsair|asus|msi|sony|philips|bosch/i;
export const isStrategicProgram = program => strategic.test(String(program?.name ?? ""));

const finiteMetric = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

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

export function rankAwinOpportunities({ programs = [], discoveryOffers = [], feedAdvertiserIds = [], programDetails = {} } = {}) {
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
    .filter(program => ["notjoined", "pending"].includes(String(program.relationship).toLowerCase()))
    .map(program => {
      const advertiserId = program.advertiserId ?? program.id ?? null;
      const id = String(advertiserId ?? "");
      const discovered = offerMap.get(id) ?? { count: 0, examples: [] };
      const category = categoryForProgram(program);
      const hasFeed = feedIds.has(id);
      const metrics = summarizeAwinProgramDetail(detailMap.get(id));
      let score = 0;
      const reasons = [];
      if (category !== "Weitere") { score += 20; reasons.push(`passt zu ${category}`); }
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
