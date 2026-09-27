const priorityWeight = { hoch: 3, mittel: 2, niedrig: 1 };

const normalizePriority = value => {
  const text = String(value ?? "").toLowerCase();
  return ["hoch","mittel","niedrig"].includes(text) ? text : "niedrig";
};

const scoreOf = row => Number.isFinite(Number(row?.score)) ? Number(row.score) : 0;

const actionTypeFor = row => row.kind === "application"
  ? "application-review"
  : row.kind === "marketplace-search"
    ? (row.status === "connected" ? "marketplace-review" : "connection-required")
    : row.kind === "partner-expansion"
      ? "partner-expansion"
      : "monitor";

const actionWeight = {
  "application-review": 5,
  "partner-expansion": 4,
  "marketplace-review": 3,
  "connection-required": 2,
  "monitor": 1
};

const queueSort = (a,b) =>
  (actionWeight[actionTypeFor(b)] || 0) - (actionWeight[actionTypeFor(a)] || 0) ||
  (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0) ||
  b.score - a.score ||
  String(a.network).localeCompare(String(b.network),"de") ||
  String(a.brand).localeCompare(String(b.brand),"de");

const queueRow = (row, index) => ({
  rank:index + 1,
  network:row.network,
  brand:row.brand,
  category:row.category,
  priority:row.priority,
  score:row.score,
  kind:row.kind,
  status:row.status,
  actionType:actionTypeFor(row),
  nextAction:row.nextAction,
  applicationDraft:row.applicationDraft,
  submissionReady:row.submissionReady,
  humanApprovalRequired:row.humanApprovalRequired
});

const common = ({ network, brand, category, priority, score, status, action, draft, reason, kind, reference, submissionReady = false, humanApprovalRequired = false }) => ({
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
  reference: reference || null,
  submissionReady: Boolean(submissionReady),
  humanApprovalRequired: Boolean(humanApprovalRequired)
});

export function buildAffiliateOpportunityReport({
  awin = [],
  impact = [],
  daisycon = [],
  webgains = [],
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
      reference:row.advertiserId,
      humanApprovalRequired:Boolean(row.applicationRequired)
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
      reference:row.programId,
      submissionReady:row.submissionReady,
      humanApprovalRequired:row.humanApprovalRequired
    }));
  }

  for (const row of webgains) {
    items.push(common({
      network:"Webgains",
      brand:row.brand,
      category:row.category,
      priority:row.priority,
      score:row.score,
      status:row.status,
      action:row.nextAction,
      draft:row.applicationPossible ? row.applicationDraft ?? null : null,
      reason:(row.reasons || []).join(", "),
      kind:row.applicationPossible ? "application" : "program",
      reference:row.programId,
      submissionReady:row.submissionReady,
      humanApprovalRequired:row.humanApprovalRequired
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

  const queueCandidates = [...opportunities].sort(queueSort);
  const reviewQueue = queueCandidates.slice(0, 20).map(queueRow);
  const actionNow = queueCandidates
    .filter(row => ["application-review","partner-expansion","marketplace-review"].includes(actionTypeFor(row)))
    .slice(0, 12)
    .map(queueRow);
  const connectionQueue = queueCandidates
    .filter(row => actionTypeFor(row) === "connection-required")
    .slice(0, 12)
    .map(queueRow);
  const monitorQueue = queueCandidates
    .filter(row => actionTypeFor(row) === "monitor")
    .slice(0, 12)
    .map(queueRow);

  return {
    generatedAt,
    total: opportunities.length,
    highPriority: opportunities.filter(row=>row.priority==="hoch").length,
    byNetwork,
    reviewQueue,
    actionNow,
    connectionQueue,
    monitorQueue,
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
