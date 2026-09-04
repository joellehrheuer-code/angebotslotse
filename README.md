# Angebotslotse

Produktionsfähige, statische Affiliate-Angebotsseite für Deutschland. Sie vereinheitlicht Awin, direkte Partner und optional Impact.com, filtert ungültige oder abgelaufene Datensätze, dedupliziert Angebote und veröffentlicht automatisch über GitHub Pages.

## Architektur

- `scripts/update.mjs`: quellenisolierte Aktualisierung mit Fallback auf zuletzt gültige Daten
- `scripts/lib/source-manager.mjs`: zentraler Affiliate Source Manager
- `scripts/lib/awin.mjs`: offizielle Awin Publisher Offers API
- `scripts/lib/impact.mjs`: vorbereitete offizielle Impact Media-Partner Promotions API
- `scripts/lib/direct.mjs` und `data/direct-partners.json`: Waves, Thomann und RØDE
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

Der Adapter verwendet die offizielle Media-Partner-Struktur `GET /Mediapartners/{AccountSID}/Promotions` mit HTTP Basic Auth aus AccountSID und AuthToken. Ohne beide Werte meldet die Quelle `disabled` und beeinträchtigt weder Awin noch direkte Partner. Für die Aktivierung werden `IMPACT_ACCOUNT_SID` als GitHub Variable und `IMPACT_AUTH_TOKEN` als GitHub Secret benötigt. Nur Promotionen mit einem von Impact gelieferten Tracking-/Ziel-Link werden veröffentlicht; es werden keine Links konstruiert oder erfunden.

## Neue Affiliate-Quelle ergänzen

1. Einen Adapter unter `scripts/lib/<quelle>.mjs` anlegen, der strukturierte Quelldaten zurückgibt.
2. Die Quelle in `scripts/lib/source-manager.mjs` registrieren und fehlende Secrets als `disabled` behandeln.
3. Rohdaten auf `title`, `description`, `url`, `urlTracking`, `advertiserName`, optionale Laufzeiten und Region abbilden.
4. Tests für Authentifizierung, HTTPS-Links, Ablaufdatum und Fehlermodus ergänzen.
5. Secrets ausschließlich als GitHub Secrets, öffentliche IDs als Variables konfigurieren.

Scraping, erfundene Trackinglinks und künstliche Klicktests sind ausgeschlossen.

## Creator-Modul

`data/creators.json` ist bewusst vom Affiliate-System getrennt und standardmäßig deaktiviert. Einträge dürfen erst mit geklärten Nutzungsrechten und sachlicher Beschreibung aktiviert werden. Fremde Creator werden nicht als Partner bezeichnet, sofern keine Partnerschaft besteht.

## Datenschutz und Recht

Die Site lädt keine externen Fonts, setzt keine eigenen Cookies und enthält keine Analytics. Affiliate-Links tragen `rel="sponsored noopener"`. Deshalb ist derzeit kein Cookie-Banner nötig. Impressum und Datenschutz bilden die tatsächlich eingesetzte statische GitHub-Pages-Technik ab; eine individuelle Rechtsprüfung bleibt empfehlenswert.

## JOEL MUSS NUR NOCH DIESE PUNKTE MACHEN

1. Optional für Impact: in **Settings → Secrets and variables → Actions** `IMPACT_AUTH_TOKEN` als Secret und `IMPACT_ACCOUNT_SID` als Variable hinterlegen; niemals im Chat oder Quellcode.
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
