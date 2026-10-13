# Awin Legacy-Feeds – sichere Einrichtung (Stand: 13.10.2026)

## Vom Awin Publisher Success Team am 12.10.2026 bestätigt

- **Enhanced-/Google-Feeds:** über die bereits angebundene Awin Publisher/Enhanced-Feed-API.
- **Klassische Legacy-/Awin-Feeds:** über **vollständige Downloadlinks** aus **Toolbox → Create-a-Feed**.
- Der im Downloadpfad sichtbare Bestandteil `/apikey/` ist **kein universell für die Awin-Partner-API nutzbarer Token**. Den kompletten Link verwenden.
- Awin nennt keine zusätzliche Aktivierung für Create-a-Feed bei aktiven Publisherkonten.
- Für Produktbilder und Werbemittel gelten Awin Publisher Terms und Code of Conduct; zusätzlich gelten die jeweiligen Programmbedingungen.

**Wichtig:** Die vollständigen Feedlinks können Zugriffskennungen enthalten. **Nie in öffentliches GitHub, README, Logs, Issues, Screenshots oder Supportantworten kopieren.** Als GitHub Actions Secret speichern. Bestehende private Tokens nicht in E-Mails weitergeben.

## Kostenlose Einrichtung

1. Bei Awin als Publisher anmelden und **Toolbox → Create-a-Feed** öffnen.
2. **Nur genehmigte/joined DE-Programme** und relevante deutsche Produktfeeds wählen; vollständigen Downloadlink kopieren.
3. In den **GitHub Actions Secrets** für das Repo `joellehrheuer-code/angebotslotse` eines der folgenden Secrets hinterlegen:
   - `AWIN_LEGACY_FEED_URLS`: ein oder mehrere komplette klassische CSV-Downloadlinks, getrennt mit **Semikolon**.
   - `AWIN_FEED_LIST_URL`: offizieller `https://productdata.awin.com/datafeed/list/apikey/...`-Link, falls ein CSV-Feedverzeichnis gewünscht ist.
   - `AWIN_DATAFEED_API_KEY`: **alte, weiterhin unterstützte** Variante nur für die Feed-Liste (nicht derselbe Token wie `AWIN_API_TOKEN`). Bevorzugt den vollständigen List-Link verwenden.
4. GitHub-Workflow **Angebote aktualisieren** erneut starten oder den nächsten geplanten Lauf abwarten.
5. Im generierten `data/status.json` den Zustand `sources["awin-product-feeds"]` und im Qualitätsbericht die tatsächlich veröffentlichungsfähigen Produkte prüfen.

## Sicherheits- und Qualitätsgarantien

- Vertraute Hosts: `productdata.awin.com` und `datafeed.api.productserve.com`, ausschließlich HTTPS.
- Direkte Legacy-Feedlinks werden nur verwendet, wenn die im öffentlichen Awin-Portfolio bestätigten `joined`-Advertiser bekannt sind; eine `Not Joined`-Kennung wird nicht akzeptiert.
- Händler-ID jeder heruntergeladenen Produktzeile muss zu einem bestätigten beigetretenen Programm passen.
- Nur echte Produktangaben mit offiziellem Trackinglink werden übernommen. Die vorhandenen Markt-, Alters-, Betrugs-, Datenqualitäts- und Quarantänefilter gelten weiterhin.
- Keine Veröffentlichung fremder Angebotsdaten allein deshalb, weil ein Feed-Link technisch abrufbar ist.
- Die Einrichtung eines Secrets **ist bisher nicht bestätigt**; bis dahin kann der Legacy-Feed-Import auf `disabled` bleiben. Bereits aktive Enhanced-Feeds funktionieren unabhängig weiter.

## Quellen

- [Awin: Downloading feeds using Create-a-Feed](https://help.awin.com/developers/docs/downloading-feeds-using-create-a-feed)
- [Awin: Product Feed List Download](https://help.awin.com/developers/docs/product-feed-list-download)
- [Awin Publisher Terms](https://www.awin.com/de/publisher-terms)
