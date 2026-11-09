/** Distinguish empty/degraded catalogs from corrupt live releases. */
export function validatePublishedOffersState({ report, statusHtml, homeHtml }) {
  const errors = [];
  const count = report?.offers;
  if (!Number.isInteger(count) || count < 0) {
    errors.push("build-report offers ungültig: " + count);
    return errors;
  }
  if (count === 0) {
    if (!/class="status degraded"/.test(statusHtml ?? "")) {
      errors.push("Keine Angebote, aber Live-Status ist nicht als degraded gekennzeichnet");
    }
    if (!String(homeHtml ?? "").includes("keine aktuell verifizierten Produktangebote")) {
      errors.push("Keine Angebote, aber transparenter Hinweis auf der Startseite fehlt");
    }
    if ((String(homeHtml ?? "").match(/<h1\b/gi) ?? []).length !== 1) {
      errors.push("Keine Angebote: Startseite benötigt genau eine sichtbare H1");
    }
  }
  return errors;
}
