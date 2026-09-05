# Medien- und Programmrecherche für Angebotslotse V4

Stand: 6. September 2026

## Verifizierte Live-Situation

- Awin Publisher `3045061` authentifiziert erfolgreich.
- Die offizielle Publisher Offers API liefert aktuell eine aktive deutsche Promotion von Coolblue DE (`85171`). Sie enthält keinen konkreten Produktdatensatz, keinen Preis und kein Produktbild.
- Impact ist im GitHub-Workflow angebunden. Der letzte erfolgreiche Import enthielt keine veröffentlichbaren Datensätze.
- Waves, Thomann, RØDE und Instant Gaming sind freigegebene direkte Shop-/Aktionslinks, aber keine konkreten Produktfeeds. Deshalb werden hierfür keine Produktpreise oder Produktbilder behauptet.
- Die Awin-Programm-API bestätigt für Deutschland: Coolblue DE ist beigetreten; beyerdynamic DE und das adidas Affiliate Creators Program sind ausstehend; Dyson DE, Lidl DE, DECATHLON DE, Samsung Shop DE und adidas DE sind verfügbar, aber noch nicht beigetreten. Lenovo, Nike und Under Armour wurden im aktuellen deutschen Ergebnis nicht als priorisierte exakte Treffer bestätigt und werden deshalb nicht gelistet.

## Offizieller Awin-Produktfeed-Weg

Awin dokumentiert einen separaten Product Feed List Download unter `https://productdata.awin.com/datafeed/list/apikey/<DATAFEED_KEY>`. Der Datafeed-Key ist ausdrücklich nicht der Partner-API-Token und wird im Awin-Interface unter **Toolbox → Create-a-Feed** bereitgestellt. Die Liste enthält sichtbare Feeds, Beitrittsstatus, Aktualisierungszeit und die jeweilige Download-URL.

Die V4-Integration kann beigetretene, deutschsprachige/deutsche Feeds einlesen und übernimmt ausschließlich Felder aus diesen offiziellen Feeds: Produktname, Marke, Preis, UVP/Altpreis, Bild-URL, Deep-/Tracking-Link sowie GTIN/EAN/MPN. Der Key gehört ausschließlich in das GitHub-Secret `AWIN_DATAFEED_API_KEY`.

Zusätzlich wurde der offizielle Enhanced-/Google-Feed-Endpunkt mit dem bestehenden Bearer-Token für Coolblue DE und den deutschen Locales geprüft. Awin antwortete mit `404`, also steht für dieses Programm derzeit kein entsprechend abrufbarer Enhanced Feed zur Verfügung. Der Legacy-Feed-Status lässt sich erst mit dem separaten Datafeed-Key zuverlässig auswerten.

## Offizieller Impact-Produktweg

Die Integration nutzt die Partner-API v16 und `Mediapartners/<AccountSID>/Catalogs/ItemSearch`. Offizielle Katalogfelder wie `ImageUrl`, `CurrentPrice`, `OriginalPrice`, `Currency`, `Gtin`, `Mpn`, `CampaignId` und Lagerstatus werden normalisiert. Nur Produkte aus tatsächlich aktiven Programmen und mit zulässigem Affiliate-Link werden veröffentlicht; die Advertiser-Quarantäne bleibt vorgeschaltet.

## Aktueller Medienstatus

Für die fünf veröffentlichten Einträge wurden keine belastbaren konkreten Produktmedien geliefert. Herstellerseiten oder Pressebilder werden nicht automatisch als Affiliate-Produktbilder übernommen, solange kein konkretes Produkt und keine eindeutige Asset-Freigabe vorliegt. V4 verwendet deshalb weiter klar gekennzeichnete lokale Kategorievisuals. Das verhindert irreführende Produktdarstellung und vermeidet ungeklärte Nutzungsrechte.
