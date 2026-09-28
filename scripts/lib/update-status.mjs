import { isPublicationReady, isAwaitingMediaOffer, isPublisherPromotion } from "./normalize.mjs";

export function buildFailureStatus({ oldStatus = {}, oldOffers = [], isQuarantined = () => false, error }) {
  const allowed = oldOffers.filter(offer => !isQuarantined(offer));
  const publishable = allowed.filter(isPublicationReady).length;
  return {
    ...oldStatus,
    state: "error",
    lastSuccessfulUpdate: oldStatus.lastSuccessfulUpdate ?? null,
    activeOffers: publishable,
    storedOffers: oldOffers.length,
    publishableOffers: publishable,
    awaitingMedia: allowed.filter(isAwaitingMediaOffer).length,
    blockedPublisherPromotions: allowed.filter(offer => !offer.isStale && isPublisherPromotion(offer)).length,
    quarantined: oldOffers.length - allowed.length,
    stale: oldOffers.filter(offer => offer.isStale).length,
    added: 0,
    removed: 0,
    archivedThisRun: 0,
    invalidLinks: Number(oldStatus.invalidLinks) || 0,
    apiErrors: Math.max(1, Number(oldStatus.apiErrors) || 0),
    message: `Aktualisierung fehlgeschlagen; letzter geprüfter Bestand bleibt erhalten. ${String(error?.message ?? error ?? "Unbekannter Fehler").slice(0, 180)}`
  };
}
