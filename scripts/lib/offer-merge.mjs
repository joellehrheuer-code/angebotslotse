const AWIN_GROUP = /^awin(?:-|$)/;

const sourceGroup = source => AWIN_GROUP.test(String(source ?? "")) ? "awin" : String(source ?? "unknown");

const sourceHealth = sources => {
  const health = new Map();
  for (const source of sources) {
    const group = sourceGroup(source.name);
    const current = health.get(group) ?? { hasOk: false, hasError: false, hasDisabled: false, sourceNames: [], rows: 0 };
    current.hasOk ||= source.state === "ok";
    current.hasError ||= source.state === "error";
    current.hasDisabled ||= source.state === "disabled";
    current.sourceNames.push(source.name);
    current.rows += source.rows?.length ?? 0;
    health.set(group, current);
  }
  for (const current of health.values()) {
    current.unavailable = !current.hasOk && (current.hasError || current.hasDisabled);
    current.partialError = current.hasOk && current.hasError;
    current.partialDisabled = current.hasOk && current.hasDisabled;
  }
  return health;
};

const markStale = (offer, now, reason) => ({
  ...offer,
  isStale: true,
  staleSince: offer.staleSince ?? now,
  staleReason: reason,
  lastSeen: offer.lastSeen ?? offer.updatedAt ?? null
});

const markFresh = (offer, previous, now) => ({
  ...offer,
  firstSeen: previous?.firstSeen ?? offer.firstSeen ?? now,
  dateAdded: previous?.dateAdded ?? offer.dateAdded ?? now,
  lastSeen: now,
  isStale: false,
  staleSince: null,
  staleReason: null
});

/**
 * Merge fresh normalized offers with the previous inventory without treating
 * missing credentials or a partial source response as deletions.
 */
export function mergeOfferInventory({ freshOffers, oldOffers, sources, now = new Date().toISOString(), maxOffers = Infinity, circuitBreakerRatio = 0.5 }) {
  const health = sourceHealth(sources);
  const oldById = new Map(oldOffers.map(offer => [offer.id, offer]));
  const freshById = new Map(freshOffers.map(offer => [offer.id, offer]));
  const guardedGroups = new Map();

  for (const [group, info] of health) {
    const oldGroupOffers = oldOffers.filter(offer => sourceGroup(offer.sourceGroup ?? offer.source) === group);
    const freshGroupOffers = freshOffers.filter(offer => sourceGroup(offer.sourceGroup ?? offer.source) === group);
    if (info.unavailable) guardedGroups.set(group, "unavailable");
    else if (info.partialError) guardedGroups.set(group, "partial-source-error");
    else if (info.partialDisabled) guardedGroups.set(group, "partial-source-disabled");
    else if (oldGroupOffers.length >= 10 && freshGroupOffers.length < oldGroupOffers.length * circuitBreakerRatio) guardedGroups.set(group, "circuit-breaker-low-inventory");
  }

  const merged = new Map();
  for (const offer of freshOffers) {
    const previous = oldById.get(offer.id);
    merged.set(offer.id, markFresh(offer, previous, now));
  }

  for (const oldOffer of oldOffers) {
    if (freshById.has(oldOffer.id)) continue;
    const group = sourceGroup(oldOffer.sourceGroup ?? oldOffer.source);
    const guardReason = guardedGroups.get(group);
    if (!guardReason) continue;
    const info = health.get(group);

    // A transient failure in only one sub-source must not depublish offers
    // that were verified by the same healthy source group on the previous run.
    if (guardReason === "partial-source-error") {
      merged.set(oldOffer.id, { ...oldOffer, protectionReason: guardReason });
      continue;
    }

    const reason = guardReason === "unavailable"
      ? `source-${info?.sourceNames.join("+")}-${info?.hasError ? "unavailable" : "disabled"}`
      : guardReason === "partial-source-disabled"
        ? `source-${info?.sourceNames.join("+")}-disabled`
        : guardReason;
    merged.set(oldOffer.id, markStale(oldOffer, now, reason));
  }

  return [...merged.values()]
    .sort((a, b) => Number(Boolean(b.isStale)) - Number(Boolean(a.isStale)) || (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999"))
    .slice(0, maxOffers);
}

export function annotateSourceRows(rows, sourceName) {
  return rows.map(row => ({ ...row, sourceGroup: sourceGroup(sourceName), sourceKey: sourceName }));
}
