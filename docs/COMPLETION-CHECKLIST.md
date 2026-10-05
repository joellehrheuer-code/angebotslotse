# Angebotslotse – Abschlussliste

Stand: 5. Oktober 2026. Grundlage: aktueller main-Stand 1d90b2f, 19 Projektdateien und 114 Themenblöcke des 5.000-Punkte-Plans.

## Erledigt in dieser Runde
- [x] Projektdateien und sämtliche Repository-Verzeichnisse inventarisiert.
- [x] Doppelte Vorgaben erkannt: Masterplan MD/TXT identisch; drei eingefügte Generator-Texte identisch. Originale erhalten.
- [x] 254 bestehende Tests ohne parallelen Build erfolgreich ausgeführt.
- [x] Newsletter/Fehlermeldung bei hängender Verbindung nach 15 Sekunden freigeben; kein automatischer doppelter POST.
- [x] Partnerlinks korrekt benennen statt als Datenquellen ausgeben.
- [x] PWA löscht nur eigene alte Cache-Versionen, keine Caches anderer Apps derselben Origin.
- [x] HTTP-Fehlerseiten nicht in den Navigationscache schreiben; Cache-Schreiboperationen bis zum Abschluss an Service-Worker-Ereignis binden.
- [x] JS-/PWA-Version erhöhen und bestehende Release-Verträge anpassen.
- [x] Zwei Verhaltenstests für Abbruch und Cache-Isolation ergänzt: 256 Tests bestanden.
- [x] Live-Suche, Vorschläge und alphabetische Shop-Sortierung im Browser geprüft.
- [ ] Veröffentlichung und anschließenden Live-Smoke bestätigen.

## Weitere Abschlussaufgaben
- [ ] Visuelle Prüfung auf 320/375/768/1440/1920 Pixeln und mit 200 % Textzoom.
- [ ] Tastaturfolge, Lightbox, Merkliste und Wunschpreis im Browser vollständig prüfen.
- [ ] Firefox/Safari/Edge real prüfen; Chromium allein ist kein Cross-Browser-Nachweis.
- [ ] Feldmessung für LCP/INP/CLS dokumentieren; Build-Tests beweisen keine realen Core Web Vitals.
- [ ] Newsletter-Bestätigung, Versand und Abmeldung end-to-end mit ausdrücklich freigegebener Testadresse prüfen.
- [ ] Cloud-Konto, Sync, Export, Löschung und Push mit Testkonto prüfen.
- [ ] 5.000 Anforderungen einzeln mit Beleg als erfüllt/adaptiert/offen bewerten. Der alte pauschale 200-Punkte-Audit ist kein vollständiger Nachweis.

## Externe Voraussetzungen
- Tarifrechner: echte Partnerfreigabe fehlt; vorhandene externe Vergleichswege erhalten.
- Amazon/Daisycon/Tradedoubler/Webgains: Zugang/Freigabe laut report/manual-actions.json erforderlich.
- Awin: zusätzliche Programmbewerbungen benötigen Prüfung der individuellen Bedingungen; Entwürfe vorhanden.
- Creator-Feed: zuletzt nur ein Clip mit vier Plattformveröffentlichungen, keine erfundenen neuen Videos.
- Heise/compaliate: erneute Einreichung erst nach Gesamt-QA; keine Nachricht ohne ausdrücklichen Versandauftrag.

## Funktionsmatrix der 114 Themenblöcke
Status „offen“ bedeutet: noch kein vollständiger Einzelnachweis für alle Anforderungen dieses Blocks. Vorhandener Code und bestandene Tests bleiben erhalten; sie ersetzen den Einzelnachweis nicht.

| Nr. | Themenblock | Vollständiger Abnahmenachweis |
|---|---|---|
| 001 | Markenpositionierung | offen |
| 002 | Premium-Designrichtung | offen |
| 003 | Farbwelt | offen |
| 004 | Design-Tokens | offen |
| 005 | Typografie | offen |
| 006 | Layout-Raster | offen |
| 007 | Header | offen |
| 008 | Live-Topbar | offen |
| 009 | Mega-Navigation | offen |
| 010 | Hero-Bereich | offen |
| 011 | Hero-Animation | offen |
| 012 | Globale Suche | offen |
| 013 | Suchergebnisse | offen |
| 014 | Deal-Radar | offen |
| 015 | Bestands-Kennzahlen | offen |
| 016 | Kategorie-Teaser | offen |
| 017 | Top-Deals-Rail | offen |
| 018 | Deal-Karte | offen |
| 019 | Deal-Karten-Microinteractions | offen |
| 020 | Produktbilder | offen |
| 021 | Preis-Darstellung | offen |
| 022 | Preisverlauf | offen |
| 023 | Deal des Tages | offen |
| 024 | Neu eingetroffen | offen |
| 025 | Produkt-vs-Tarif-Einstieg | offen |
| 026 | Technik/Gaming-Sektion | offen |
| 027 | Zuhause/Sport/Alltag-Sektion | offen |
| 028 | Rabattcodes | offen |
| 029 | Markenübersicht | offen |
| 030 | Shopübersicht | offen |
| 031 | Transparenz-Sektion | offen |
| 032 | Bewertungen und Community | offen |
| 033 | Problem melden | offen |
| 034 | Newsletter | offen |
| 035 | Creator-Bereich | offen |
| 036 | Social-Media-Links | offen |
| 037 | Creator-Videos | offen |
| 038 | Musik und Streams | offen |
| 039 | Bücher und Merch | offen |
| 040 | Partner-Creatives | offen |
| 041 | Footer | offen |
| 042 | Sticky-Verhalten | offen |
| 043 | Seitenübergänge | offen |
| 044 | Scroll-Storytelling | offen |
| 045 | Microanimationen | offen |
| 046 | Hintergrund-Effekte | offen |
| 047 | 3D-/Parallax-Effekte | offen |
| 048 | View-Transitions | offen |
| 049 | Reduced Motion | offen |
| 050 | Desktop-Responsive | offen |
| 051 | Tablet-Responsive | offen |
| 052 | Mobile-Responsive | offen |
| 053 | Touch und Gesten | offen |
| 054 | Tastatursteuerung | offen |
| 055 | Screenreader | offen |
| 056 | Focus-System | offen |
| 057 | Kontrast | offen |
| 058 | Formulare | offen |
| 059 | Loading-Zustände | offen |
| 060 | Empty States | offen |
| 061 | Error States | offen |
| 062 | Merkliste | offen |
| 063 | Wunschpreis | offen |
| 064 | Preisalarm | offen |
| 065 | Konto | offen |
| 066 | Supabase-Integration | offen |
| 067 | Personalisierung | offen |
| 068 | Empfehlungen | offen |
| 069 | Produktdetailseite | offen |
| 070 | Händlervergleich | offen |
| 071 | Vergleichsseite | offen |
| 072 | Tarife | offen |
| 073 | Kategorieseite | offen |
| 074 | Markenseite | offen |
| 075 | Shopseite | offen |
| 076 | Deal-Listen | offen |
| 077 | Filter | offen |
| 078 | Sortierung | offen |
| 079 | Pagination/Infinite Loading | offen |
| 080 | PWA | offen |
| 081 | Offline-Verhalten | offen |
| 082 | Performance-Budget | offen |
| 083 | LCP | offen |
| 084 | INP | offen |
| 085 | CLS | offen |
| 086 | Asset-Pipeline | offen |
| 087 | CSS-Architektur | offen |
| 088 | JavaScript-Architektur | offen |
| 089 | Komponenten-System | offen |
| 090 | GitHub-Pages-Kompatibilität | offen |
| 091 | Build-Pipeline | offen |
| 092 | Datenintegrität | offen |
| 093 | Affiliate-Integrität | offen |
| 094 | Awin | offen |
| 095 | Impact | offen |
| 096 | Weitere Affiliate-Quellen | offen |
| 097 | SEO-Technik | offen |
| 098 | Onpage-SEO | offen |
| 099 | Structured Data | offen |
| 100 | Discoverability | offen |
| 101 | Social Sharing | offen |
| 102 | Analytics | offen |
| 103 | Datenschutz | offen |
| 104 | Security | offen |
| 105 | Rechtliches | offen |
| 106 | Monitoring | offen |
| 107 | Tests | offen |
| 108 | Cross-Browser | offen |
| 109 | Conversion | offen |
| 110 | Vertrauen | offen |
| 111 | Content-Strategie | offen |
| 112 | Skalierung | offen |
| 113 | Release-Qualität | offen |
| 114 | Definition of Done | offen |

## Live-Nachprüfung dieser Runde

- Veröffentlichung von PR 28 einschließlich Live-Smoke erfolgreich.
- Suche, Markenauswahl, Merkliste und Wunschpreis im Live-Browser geprüft.
- Header-Überlagerung identifiziert: generische `.brand span`-Regel begrenzte den Textblock auf 38 px und färbte ihn pink. Textblock erhält nun eigene, eindeutige Größen- und Hintergrundregeln; CSS-Version auf 32 angehoben.

## Logo und Header – 5. Oktober 2026

- Das vom Nutzer bereitgestellte Joker-Logo wird nun auch im Header verwendet. Die vorhandene Webfassung wurde durch eine höher aufgelöste Fassung desselben vollständigen Motivs ersetzt.
- Desktop-Header hat fünf explizite Spalten einschließlich Menüknopf; Tablet nutzt vier bzw. drei Spalten. Keine zusätzliche Menüzeile durch implizite Grid-Platzierung.
- CSS-Version 33 und Logo-Version 2 verhindern alte Browser-Assetstände.
- 256 Tests bestanden; Integrität, Build, Seitenvalidierung, SEO und Sicherheitsprüfung bestanden.
- Veröffentlichung, Live-Smoke und Desktop-Sichtprüfung bestätigt (PR 30). Logo sichtbar; Menüknopf in derselben Header-Zeile. Kategorien, Preisfilter, Produktdetail, Menü und Merkliste live geprüft. Vollständige mobile und Cloud-Funktionsabnahme bleibt offen.

## PWA-Hintergrundaktualisierung – 5. Oktober 2026

- Race Condition bei bereits gespeicherten Bildern und Schriften behoben: Die Hintergrundaktualisierung registriert ihre Lebensdauer direkt beim Fetch-Ereignis, bevor die gespeicherte Antwort ausgeliefert wird.
- Verhaltenstest liefert zuerst das alte Bild aus und bestätigt anschließend, dass die verspätete Netzantwort gespeichert wird.
- Google-Login bleibt deaktiviert, bis der OAuth-Client eingerichtet ist. Cloud-Synchronisierung, E-Mail-Anmeldung und Push benötigen weiterhin eine authentifizierte End-to-End-Abnahme.
