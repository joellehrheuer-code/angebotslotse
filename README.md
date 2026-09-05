# Angebotslotse

## V4 – Premium Deal Engine

Die Startseite nutzt eine prominente Produktsuche, einen kompakten Drei-Slide-Hero und horizontale Deal-Rails mit fünf sichtbaren Karten auf großen Desktop-Ansichten. Maus-Drag, Touch-Swipe, Pfeile, Tastatursteuerung, Scroll-Snap, Lazy Loading, Skeletons und `prefers-reduced-motion` sind ohne schwere UI-Bibliothek umgesetzt.

Echte Produktdaten können über Impact-Kataloge und die offizielle Awin-Produktfeed-Liste einlaufen. Für Awin ist dazu zusätzlich zum normalen API-Token der separate GitHub-Actions-Secret `AWIN_DATAFEED_API_KEY` erforderlich. Die Herkunft und Rechtehinweise offizieller Bilder werden als `imageSource` und `imageRightsNote` gespeichert. Fehlen verifizierte Preise oder Medien, zeigt die Seite ausdrücklich einen Prüfhinweis beziehungsweise ein neutrales Kategorievisual.

Die dokumentierte Bestandsaufnahme steht unter `docs/media-and-program-research.md`; die nicht automatisch versendete Bewerbungsgrundlage unter `docs/program-application-template.md`.

## Angebotslotse V3

V3 ist als wachsendes Deal-, Preis- und Discovery-Portal aufgebaut. Der Build erzeugt kompakte visuelle Übersichten, echte Kategorie- und Discovery-Landingpages sowie – erst bei ausreichenden Quelldaten – Produktseiten, sichere Preisvergleiche und 30-Tage-Preisverläufe. `data/price-history.json` speichert ausschließlich positive Preise mit eindeutiger Produkt-ID; `data/coupons.json` enthält ausschließlich von Quellen gelieferte, noch gültige Codes. Beide Dateien werden im bestehenden GitHub-Actions-Lauf aktualisiert.

Offizielle Medien werden mit Quelle und Alt-Text im Datenmodell geführt. Ohne freigegebenes Produktbild zeigt V3 lokale, eindeutig nicht fotografische Kategorie-Platzhalter. Videos werden nur bei vorhandener erlaubter URL, ohne Autoplay und mit `preload="none"` eingebunden. Social-Sharing verändert keine Affiliate-Ziel- oder Trackinglinks.

Cloudflare Web Analytics bleibt nur aktiv, wenn die öffentliche Repository-Variable `CLOUDFLARE_WEB_ANALYTICS_TOKEN` gesetzt ist. Ohne sie werden weder Besucher noch Affiliate-Klicks als messbar ausgegeben. Eine first-party Klickstatistik benötigt später einen datenschutzrechtlich geprüften Erfassungsendpunkt; V3 erzeugt keine Fake-Zahlen.

### Einmalige Search-Console-Schritte

1. URL-Präfix-Property `https://joellehrheuer-code.github.io/angebotslotse/` in Google Search Console anlegen und den Meta-Tag-Wert als Repository-Variable `GOOGLE_SITE_VERIFICATION` speichern.
2. Nach dem erfolgreichen Deployment `https://joellehrheuer-code.github.io/angebotslotse/sitemap.xml` einreichen.
3. Die Startseite einmal über die URL-Prüfung zur Indexierung anstoßen.

## Angebotslotse V2

Die statische Website rendert echte Aktionen und Partnerangebote als visuelle Deal-Karten. Offizielle Bild-, Preis-, Vergleichspreis-, Produktkennungs- und Laufzeitdaten werden übernommen, sofern eine angeschlossene Quelle sie liefert. Fehlende Angaben werden nicht erfunden: Ohne freigegebenes Bild erscheint ein neutraler Platzhalter, ohne Preis kein Rabatt und ohne Enddatum kein Countdown.

Aktuelle Deals und Dauerangebote werden getrennt. Ein Preisvergleich erscheint nur, wenn mehrere Quellen dieselbe eindeutige Produktkennung (EAN/GTIN/MPN oder Feed-ID) und dieselbe Währung liefern. GearUP bleibt per `data/impact-link-policy.json` quarantänisiert; Razer bleibt deaktiviert.

## Datenschutzfreundliche Statistik und Search Console

Cloudflare Web Analytics ist optional vorbereitet und standardmäßig deaktiviert. Der öffentliche Site-Token wird als GitHub-Actions-Variable `CLOUDFLARE_WEB_ANALYTICS_TOKEN` hinterlegt, niemals als Quellcodewert. Google Search Console kann über die ebenfalls öffentliche Repository-Variable `GOOGLE_SITE_VERIFICATION` verifiziert werden. Die Sitemap liegt nach dem Deployment unter `https://joellehrheuer-code.github.io/angebotslotse/sitemap.xml`.

Beide Werte sind technische öffentliche Kennungen, keine API-Secrets. Awin- und Impact-Zugangsdaten bleiben ausschließlich GitHub-Secrets beziehungsweise lokale, ignorierte `.env.local`-Werte.

Produktionsfähige, statische Affiliate-Angebotsseite für Deutschland. Sie vereinheitlicht Awin, direkte Partner und optional Impact.com, filtert ungültige oder abgelaufene Datensätze, dedupliziert Angebote und veröffentlicht automatisch über GitHub Pages.

## Architektur

- `scripts/update.mjs`: quellenisolierte Aktualisierung mit Fallback auf zuletzt gültige Daten
- `scripts/lib/source-manager.mjs`: zentraler Affiliate Source Manager
- `scripts/lib/awin.mjs`: offizielle Awin Publisher Offers API
- `scripts/lib/impact.mjs`: Impact Partner API v16 für Programme, Ads, Promotions, Deals und Produktkataloge
- `scripts/lib/direct.mjs` und `data/direct-partners.json`: Waves, Thomann, RØDE und Instant Gaming; Razer bleibt deaktiviert
- `scripts/lib/normalize.mjs`: Validierung, Deutschland-Filter, Kategorien, Dubletten
- `scripts/build.mjs`: statische Seiten, Detailseiten, Sitemap, Robots und Statusseite
- `scripts/integrity.mjs`: täglicher Daten- und HTTPS-Linkcheck
- `scripts/validate-build.mjs`: Pflichtseiten, SEO- und GitHub-Pages-Buildprüfung
- `scripts/security-check.mjs`: Secret-Leak-Prüfung
- `scripts/report.mjs`: privater 30-Tage-Awin-Report; `data/private/` wird nie veröffentlicht oder committed
- `.github/workflows`: Updates um 04:17, 12:17 und 20:17 UTC sowie täglicher Integritätscheck

Der gewählte Rhythmus bleibt weit unter Awins dokumentiertem allgemeinen Limit von 20 API-Aufrufen pro Minute. Die Pagination wartet zusätzlich zwischen Seiten.

## Lokal ausführen

Node.js 20 oder neuer genügt; es gibt keine npm-Abhängigkeiten.

```bash
npm test
npm run check
npm run build
npm run validate
npm run security
```

Mit echten Daten:

```bash
AWIN_PUBLISHER_ID=... AWIN_API_TOKEN=... npm run update
SITE_URL=https://joellehrheuer-code.github.io/angebotslotse npm run build
```

`dist/` enthält danach die komplett statische Website. Niemals das Token in `.env.example`, Quelltext, Actions-Variablen oder Commits schreiben.

## Awin-Anbindung

Benötigt werden eine Awin Publisher-ID, ein persönliches API-Token mit Adminberechtigung und aktive Beziehungen zu Programmen. Das Token wird laut aktueller Awin-Dokumentation in der UI unter **API Credentials** erzeugt und als OAuth-2-Bearer-Token übertragen. Die Offers API liefert auch fertige `urlTracking`-Links; nur Angebote beigetretener Programme, gültige Laufzeiten und Region DE werden veröffentlicht. Der optionale Transaktionsreport verwendet die Publisher Transactions API.

Hinweis: Awin kann das genaue Request-Schema der Offers-API weiterentwickeln. Bei einem 4xx-Fehler zeigt der Actions-Lauf die HTTP-Antwortklasse; dann `scripts/lib/awin.mjs` gegen die aktuelle offizielle API-Seite abgleichen. Es werden bewusst keine undokumentierten Scraper verwendet.

## Impact.com

Der Adapter verwendet die offizielle Partner API v16 mit HTTP Basic Auth aus AccountSID und AuthToken. Er berücksichtigt ausschließlich beigetretene Programme mit aktivem Vertrag und Deutschland als Zielmarkt. Abgerufen werden Programme, verfügbare Werbemittel, Promotions, aktive Deals und Produktkatalogeinträge. Veröffentlicht werden nur Datensätze mit einem von Impact bereitgestellten Trackinglink; Links, Preise und Rabatte werden nicht konstruiert oder erfunden. Ohne beide Zugangswerte meldet die Quelle `disabled` und beeinträchtigt weder Awin noch direkte Partner.

## Neue Affiliate-Quelle ergänzen

1. Einen Adapter unter `scripts/lib/<quelle>.mjs` anlegen, der strukturierte Quelldaten zurückgibt.
2. Die Quelle in `scripts/lib/source-manager.mjs` registrieren und fehlende Secrets als `disabled` behandeln.
3. Rohdaten auf `title`, `description`, `url`, `urlTracking`, `advertiserName`, optionale Laufzeiten und Region abbilden.
4. Tests für Authentifizierung, HTTPS-Links, Ablaufdatum und Fehlermodus ergänzen.
5. Secrets ausschließlich als GitHub Secrets, öffentliche IDs als Variables konfigurieren.

Scraping, erfundene Trackinglinks und künstliche Klicktests sind ausgeschlossen.

## Creator-Modul

`data/creators.json` ist bewusst vom Affiliate-System getrennt. Twitch, YouTube, Spotify, Instagram, Snapchat, Discord, Buch und Merch-Shop sind als eigene Projekte vorbereitet. Solange kein eindeutig verifizierter Ziel-Link hinterlegt ist, zeigt die Seite keinen anklickbaren Link. Fremde Creator werden nicht als Partner bezeichnet, sofern keine Partnerschaft besteht.

## Datenschutz und Recht

Die Site lädt keine externen Fonts, setzt keine eigenen Cookies und enthält keine Analytics. Affiliate-Links tragen `rel="sponsored noopener"`. Deshalb ist derzeit kein Cookie-Banner nötig. Impressum und Datenschutz bilden die tatsächlich eingesetzte statische GitHub-Pages-Technik ab; eine individuelle Rechtsprüfung bleibt empfehlenswert.

## JOEL MUSS NUR NOCH DIESE PUNKTE MACHEN

1. Die acht verifizierten öffentlichen URLs für Twitch, YouTube, Spotify, Instagram, Snapchat, Discord, Buch und Merch-Shop in `data/creators.json` ergänzen. Bis dahin bleiben die Einträge absichtlich nicht anklickbar.
2. Impressum und Datenschutzerklärung trotz technischer Anpassung einmal individuell rechtlich prüfen lassen.

## Monitoring und Fehler

GitHub benachrichtigt standardmäßig bei fehlgeschlagenen Workflow-Läufen. Die öffentliche `status.html` enthält nur unsensible Betriebsdaten. Transaktionen und Provisionen liegen ausschließlich im ignorierten privaten Build-Report und werden nicht als Artifact hochgeladen. Abgelaufene Angebote verschwinden beim nächsten Update; Detail-URLs liefern anschließend die 404-Seite. Ein echter externer Linkabruf wird aus Rücksicht auf Händler und Rate-Limits nicht massenhaft durchgeführt; strukturell ungültige und nicht-HTTPS Trackinglinks blockiert der Integritätscheck.

## Offizielle Referenzen (Stand 4. September 2026)

- Awin API Authentication: https://help.awin.com/apidocs/api-authentication
- Awin Retrieve Offers: https://help.awin.com/apidocs/promotions
- Awin Publisher Transactions: https://help.awin.com/apidocs/returns-a-list-of-transactions-for-a-given-publisher
- Awin API Introduction / Limits: https://help.awin.com/apidocs/introduction-1
- Impact Partner API: https://integrations.impact.com/impact-publisher
- Impact Promotions: https://integrations.impact.com/impact-publisher/reference/promotions-overview
- Impact Pagination: https://integrations.impact.com/impact-publisher/reference/pagination
- Impact Programs: https://integrations.impact.com/impact-publisher/reference/list-campaigns
- Impact Ads: https://integrations.impact.com/impact-publisher/reference/list-ads
- Impact Deals: https://integrations.impact.com/impact-publisher/reference/list-deals
- Impact Catalog Search: https://integrations.impact.com/impact-publisher/reference/search-catalog-items
