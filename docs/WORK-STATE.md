# Angebotslotse – aktueller Arbeitsstand

Stand: 5. Oktober 2026. V13.2 ist bereits in main; die früheren V12.5/V12.6-To-dos waren veraltet.

## Aktuelle Runde
Branch: `work/completion-audit-resilience`.
Abschlussliste: `docs/COMPLETION-CHECKLIST.md`.
256 Tests bestanden; Veröffentlichung noch nicht bestätigt.

Behoben: Timeout bei öffentlichen Formularen, korrekte Partnerlink-Kennzahl, PWA-Cache-Isolation und Cache-Schreibvorgänge. JS v18 / Shell v16.

## Fortsetzen nach Abbruch
1. Abschlussliste lesen.
2. aktuellen main-Commit und letzten Produktionsworkflow prüfen.
3. Erst Veröffentlichung dieser Runde bestätigen, dann offene visuelle und funktionale Abnahmen durchführen.
4. Blockierte Integrationen separat führen; keine Zustimmung zu Programmbedingungen vortäuschen.
5. Keine Behauptung „fertig“ oder „live“ ohne passenden Nachweis.

## Historischer Stand (teilweise überholt)

# Angebotslotse – aktueller Arbeitsstand

Stand: 3. Oktober 2026, V12.6 Visible Social + Live Motion in Arbeit

## Aktuelle Phase
V12 „Night Market“ – Premium-Shopping-Portal, siteweite Design-/UX-Vereinheitlichung und finale Qualitätsrunde.

## Source of Truth
- Produktion: `main`
- Letzter funktionaler Release: `V12.4.1 echte Produktions-Minifizierung`
- Aktueller Arbeitsbranch: `work/v12-6-visible-social-live-motion`
- Weltmarken-Audit: `docs/WELTMARKE-200-AUDIT.md`
- Arbeitsregel: größere Änderungen isoliert auf `work/**`, `feature/**` oder per PR; vor Merge vollständige Validation.

## Bereits live
- V12 Night-Market-Design mit dunklem Navy/Schwarz und gezielten Pink/Violett/Blau-Akzenten
- Search-first Hero, Smart Search, Kategorien, Top-Deals und Deal des Tages
- „Aktuell angebunden“ mit echten Angebots-/Shop-/Quellen-/Kategorie-Daten
- Premium-Unterseitenaufbau auf Kategorien, Suche, Merkliste, Konto, Shops, Marken, Bücher, Merch, Methodik, Status und Utility-Seiten
- Produktdetail mit Preis-/Deal-Einordnung und Sticky Provider CTA
- Creator-/Social-Bereich mit echtem Joel271997/J0JOEL-Logo, Facebook, deduplizierten Cross-Plattform-Releases sowie Musik & Streams
- Mobile-Navigation, Merkliste, Konto, Reduced Motion, Fokuszustände und vergrößerte Touch-Ziele
- Social-Verteiler liest veröffentlichte ShortSync-Posts jetzt paginiert über Cursor und dedupliziert Plattform/Post-ID
- automatisierte Tests, Datenupdate, Build, SEO, Security, Pages-Deploy, Live-Smoke und IndexNow

## Verifiziert
- V12.4.1 Produktionsworkflow: Tests, Update, Build, Validierung, SEO, Security, Deploy, Live-Smoke und IndexNow erfolgreich
- Live-Smoke V12.4.1: 217 veröffentlichte Angebote, 487 gespeicherte Datensätze, 252/252 Sitemap-URLs erreichbar
- Live Produktionsassets V12.4.1: `site.css?v=29`, `app.js?v=16`
- V12.4.1 baut Produktions-CSS und `app.js` mit esbuild minifiziert; Quellen bleiben lesbar
- PWA Shell: `angebotslotse-shell-v13`
- 375px Live-QA: kein horizontaler Overflow
- Mobile Kategorie-Kacheln: zuvor 16–24px breit, jetzt 336px breit und einspaltig
- Slider-Pfeile: 44×44px
- Merken-Buttons: 44px hoch
- Live-Shop-Links: 44px hoch
- Footer About-Link: 154×44px
- Footer Social-/Navigationslinks: 44px hoch
- Footer Problem-melden: 137×44px
- Live-Performance-Messung vor V12.3: CSS ca. 42KB übertragen, app.js ca. 11KB übertragen, gemessener Load ca. 305ms
- Social-Verteiler Render-Deploy `e065743cb8000682bcbfac3c5244faa975ee313a` ist live

## Bekannte Datenbegrenzung
Der öffentliche Social-Verteiler liefert aktuell weiterhin nur vier Plattform-Posts desselben Clips vom 26.09.2026. Die Pagination ist live und kann ältere ShortSync-Seiten lesen, sobald ShortSync dafür tatsächlich einen Cursor liefert. Es werden keine historischen Veröffentlichungen erfunden.

## Arbeitsregel: Gute bestehende Bereiche erhalten
- Bereits funktionierende und vom Nutzer bestätigte Bereiche nicht entfernen, nur weil ein neuer Optimierungsschritt folgt.
- Header behält Suche, Schnellnavigation, Merkliste/Konto und Socials; oben wird das echte Joel271997/J0JOEL-Logo verwendet.
- „Aktuell angebunden“, Creator/Social, Deal-Struktur und andere bestätigte V12-Bereiche bleiben erhalten, solange kein nachgewiesener Fehler vorliegt.

## V12.5 in Arbeit
- Faktenbasierter Trust-/Transparenzbereich statt erfundener Sterne oder Besucherzahlen
- direkte Community-Fehlermeldung über den bestehenden Report-Dialog
- Build-Validierung für fehlende lokale Bilder, Scripts und Stylesheets sowie fehlende Alt-Attribute
- erweiterter Live-Smoke für Startseiten-Verträge und kritische Assets
- zusätzliche Regressionstests für Buttons, Bilder, Links und Bewertungs-Transparenz
- internes Build-Report-Label auf V12.5 aktualisiert

## V12.6 feste Nutzeranforderungen
- Instagram, TikTok, YouTube, Facebook, Twitch, Snapchat, Spotify und Discord bleiben oben sichtbar und dürfen nicht durch Desktop-/Tablet-/Mobile-Breakpoints komplett ausgeblendet werden.
- Die Socials sitzen in einer eigenen Top-Leiste, damit Suche, Navigation und Konto nicht um denselben Platz kämpfen.
- „Aktuell angebunden“ bleibt erhalten und bekommt echte sichtbare Interaktion: Shop-Karten, Rangfolge sowie animierte Sortierung nach „Meiste Deals“ und „A–Z“.
- Count-up, Reveal, Live-Puls und Kartenbewegung respektieren `prefers-reduced-motion`.
- Bestehende gute Bereiche werden nicht für neue Änderungen entfernt.
- CSS/JS/PWA-Versionen werden bei sichtbaren Änderungen hochgezählt, damit Browser nicht einen alten Stand aus dem Cache zeigen.

## Nächste offene Blöcke
1. V12.5 Branch-Validation vollständig grün bekommen, Fehler direkt korrigieren.
2. V12.5 per PR mergen und Produktion bis Live-Smoke verifizieren.
3. Eigenständiges Angebotslotse-Markenlogo entwickeln; Joel271997/J0JOEL bleibt ein separates Creator-Branding.
4. Legacy-CSS schrittweise weiter bereinigen, nur nachweislich überholte Mobile-/Theme-Regeln.
5. weitere Performance-/Accessibility-Messungen auf Start-, Such-, Kategorie-, Konto- und Produktseiten.
6. visuelle QA auf sehr kleinen Geräten sowie sehr breiten Desktop-Auflösungen.
7. Tarif-/Versicherungsintegrationen nur nach echter Partnerfreigabe weiter ausbauen.
8. Heise/compaliate erst nach finaler Gesamt-QA erneut zur Prüfung vorlegen.

## Regel bei Chat-/Stream-Abbruch
1. Diese Datei lesen.
2. Neuesten `main`-Commit prüfen.
3. Offene PRs und letzte Workflow-Läufe prüfen.
4. Beim ersten offenen Punkt unter „Nächste offene Blöcke“ fortsetzen.
5. Bereits gemergte und live-verifizierte Arbeit nicht neu bauen.

Keine Behauptung „live“, bevor Deploy + Live-Smoke erfolgreich waren.
