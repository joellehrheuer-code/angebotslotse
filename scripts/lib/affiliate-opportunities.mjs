const priorityWeight = { hoch: 3, mittel: 2, niedrig: 1 };

const normalizePriority = value => {
  const text = String(value ?? "").toLowerCase();
  return ["hoch","mittel","niedrig"].includes(text) ? text : "niedrig";
};

const scoreOf = row => Number.isFinite(Number(row?.score)) ? Number(row.score) : 0;

const common = ({ network, brand, category, priority, score, status, action, draft, reason, kind, reference }) => ({
  network,
  brand: brand || network,
  category: category || "Weitere",
  priority: normalizePriority(priority),
  score: scoreOf({ score }),
  status: status || "unknown",
  kind,
  nextAction: action || null,
  applicationDraft: draft || null,
  reason: reason || null,
  reference: reference || null
});

export function buildAffiliateOpportunityReport({
  awin = [],
  impact = [],
  daisycon = [],
  networkSearches = {},
  generatedAt = new Date().toISOString()
} = {}) {
  const items = [];

  for (const row of awin) {
    items.push(common({
      network:"Awin",
      brand:row.brand,
      category:row.category,
      priority:row.priority,
      score:row.score,
      status:row.status,
      action:row.nextAction,
      draft:row.applicationDraft,
      reason:(row.reasons || []).join(", "),
      kind:row.applicationRequired ? "application" : "pending",
      reference:row.advertiserId
    }));
  }

  for (const row of impact) {
    items.push(common({
      network:"Impact",
      brand:row.brand,
      category:row.category,
      priority:row.priority,
      score:row.score,
      status:"joined",
      action:row.nextAction,
      draft:row.contactDraft,
      reason:(row.reasons || []).join(", "),
      kind:row.contactDraft ? "partner-expansion" : "joined-program",
      reference:row.campaignId ?? row.advertiserId
    }));
  }

  for (const row of daisycon) {
    items.push(common({
      network:"Daisycon",
      brand:row.brand,
      category:row.category,
      priority:row.priority,
      score:row.score,
      status:row.status,
      action:row.nextAction,
      draft:row.applicationPossible ? row.applicationDraft ?? null : null,
      reason:(row.reasons || []).join(", "),
      kind:row.applicationPossible ? "application" : "program",
      reference:row.programId
    }));
  }

  for (const [key, rows] of Object.entries(networkSearches || {})) {
    const network = key === "tradedoubler" ? "Tradedoubler" : key === "webgains" ? "Webgains" : key === "daisycon" ? "Daisycon" : key;
    for (const row of rows || []) {
      const priority = normalizePriority(row.priority);
      const score = row.siteOffers + (priorityWeight[priority] || 0) * 10;
      items.push(common({
        network,
        brand:`${network} Marketplace`,
        category:row.category,
        priority,
        score,
        status:row.connected ? "connected" : "connection-required",
        action:row.action,
        reason:`${row.siteOffers} veröffentlichte Angebotslotse-Angebote in dieser Kategorie.`,
        kind:"marketplace-search",
        reference:(row.searchTerms || []).join(", ")
      }));
    }
  }

  const deduped = new Map();
  for (const row of items) {
    const key = [row.network,row.kind,row.reference ?? row.brand,row.category].join("|").toLowerCase();
    const current = deduped.get(key);
    if (!current || row.score > current.score) deduped.set(key,row);
  }

  const opportunities = [...deduped.values()]
    .sort((a,b) =>
      (priorityWeight[b.priority]||0) - (priorityWeight[a.priority]||0) ||
      b.score - a.score ||
      String(a.network).localeCompare(String(b.network),"de") ||
      String(a.brand).localeCompare(String(b.brand),"de")
    );

  const byNetwork = Object.fromEntries(
    [...new Set(opportunities.map(row=>row.network))].map(network => [
      network,
      opportunities.filter(row=>row.network===network).length
    ])
  );

  const reviewQueue = opportunities.slice(0, 20).map((row, index) => ({
    rank:index + 1,
    network:row.network,
    brand:row.brand,
    category:row.category,
    priority:row.priority,
    score:row.score,
    kind:row.kind,
    status:row.status,
    actionType:row.kind === "application"
      ? "application-review"
      : row.kind === "marketplace-search"
        ? (row.status === "connected" ? "marketplace-review" : "connection-required")
        : row.kind === "partner-expansion"
          ? "partner-expansion"
          : "monitor",
    nextAction:row.nextAction,
    applicationDraft:row.applicationDraft
  }));

  return {
    generatedAt,
    total: opportunities.length,
    highPriority: opportunities.filter(row=>row.priority==="hoch").length,
    byNetwork,
    reviewQueue,
    safeguards:{
      autoDiscovery:true,
      autoRanking:true,
      autoDrafts:true,
      autoContractAcceptance:false,
      autoApplicationSubmission:false
    },
    opportunities
  };
}
