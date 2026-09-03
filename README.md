# Angebotslotse

Produktionsfähige, statische Affiliate-Angebotsseite für Deutschland. Sie nutzt die offizielle Awin Offers API, übernimmt nur echte Partnerdaten, filtert abgelaufene/fremde Angebote, dedupliziert Datensätze und veröffentlicht automatisch über GitHub Pages.

## Architektur

- `scripts/update.mjs`: Awin-Abruf und atomare Datenaktualisierung
- `scripts/lib/awin.mjs`: modularer Provider (weitere Netzwerke können daneben ergänzt werden)
- `scripts/lib/normalize.mjs`: Validierung, Deutschland-Filter, Kategorien, Dubletten
- `scripts/build.mjs`: statische Seiten, Detailseiten, Sitemap, Robots und Statusseite
- `scripts/integrity.mjs`: täglicher Daten- und HTTPS-Linkcheck
- `scripts/report.mjs`: privater 30-Tage-Awin-Report; `data/private/` wird nie veröffentlicht oder committed
- `.github/workflows`: Updates um 04:17, 12:17 und 20:17 UTC sowie täglicher Integritätscheck

Der gewählte Rhythmus bleibt weit unter Awins dokumentiertem allgemeinen Limit von 20 API-Aufrufen pro Minute. Die Pagination wartet zusätzlich zwischen Seiten.

## Lokal ausführen

Node.js 20 oder neuer genügt; es gibt keine npm-Abhängigkeiten.

```bash
npm test
npm run check
npm run build
```

Mit echten Daten:

```bash
AWIN_PUBLISHER_ID=... AWIN_API_TOKEN=... npm run update
SITE_URL=https://name.github.io/repo npm run build
```

`dist/` enthält danach die komplett statische Website. Niemals das Token in `.env.example`, Quelltext, Actions-Variablen oder Commits schreiben.

## Awin-Anbindung

Benötigt werden eine Awin Publisher-ID, ein persönliches API-Token mit Adminberechtigung und aktive Beziehungen zu Programmen. Das Token wird laut aktueller Awin-Dokumentation in der UI unter **API Credentials** erzeugt und als OAuth-2-Bearer-Token übertragen. Die Offers API liefert auch fertige `urlTracking`-Links; nur Angebote beigetretener Programme, gültige Laufzeiten und Region DE werden veröffentlicht. Der optionale Transaktionsreport verwendet die Publisher Transactions API.

Hinweis: Awin kann das genaue Request-Schema der Offers-API weiterentwickeln. Bei einem 4xx-Fehler zeigt der Actions-Lauf die HTTP-Antwortklasse; dann `scripts/lib/awin.mjs` gegen die aktuelle offizielle API-Seite abgleichen. Es werden bewusst keine undokumentierten Scraper verwendet.

## Datenschutz und Recht

Die Site lädt keine externen Fonts, setzt keine eigenen Cookies und enthält standardmäßig keine Analytics. Affiliate-Links tragen `rel="sponsored noopener"`. Impressum und Datenschutz sind technische Vorlagen, keine Rechtsberatung. Die Platzhalter müssen vor Veröffentlichung ersetzt und die Texte passend zum tatsächlichen Hosting und Geschäft geprüft werden.

## JOEL MUSS NUR NOCH DIESE PUNKTE MACHEN

1. Neues GitHub-Repository anlegen, diesen Ordner hochladen und unter **Settings → Pages → Source** einmal **GitHub Actions** wählen.
2. In **Settings → Secrets and variables → Actions** die Secrets `AWIN_PUBLISHER_ID` und `AWIN_API_TOKEN` hinterlegen.
3. Dort als Variables `SITE_URL`, `CONTACT_EMAIL`, `LEGAL_NAME` und `LEGAL_ADDRESS` mit echten Angaben hinterlegen; Impressum und Datenschutz vor der Veröffentlichung rechtlich prüfen.
4. Den Workflow **Angebote aktualisieren** einmal manuell starten und kontrollieren, dass deine freigeschalteten Awin-Programme Angebote liefern.

## Monitoring und Fehler

GitHub benachrichtigt standardmäßig bei fehlgeschlagenen Workflow-Läufen. Die öffentliche `status.html` enthält nur unsensible Betriebsdaten. Transaktionen und Provisionen liegen ausschließlich im ignorierten privaten Build-Report und werden nicht als Artifact hochgeladen. Abgelaufene Angebote verschwinden beim nächsten Update; Detail-URLs liefern anschließend die 404-Seite. Ein echter externer Linkabruf wird aus Rücksicht auf Händler und Rate-Limits nicht massenhaft durchgeführt; strukturell ungültige und nicht-HTTPS Trackinglinks blockiert der Integritätscheck.

## Offizielle Referenzen (Stand 3. September 2026)

- Awin API Authentication: https://help.awin.com/apidocs/api-authentication
- Awin Retrieve Offers: https://help.awin.com/apidocs/promotions
- Awin Publisher Transactions: https://help.awin.com/apidocs/returns-a-list-of-transactions-for-a-given-publisher
- Awin API Introduction / Limits: https://help.awin.com/apidocs/introduction-1
