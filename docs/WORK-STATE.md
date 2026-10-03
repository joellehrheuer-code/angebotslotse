# Angebotslotse – aktueller Arbeitsstand

Stand: 3. Oktober 2026, V12.4.1 Performance-Fix in Arbeit

## Aktuelle Phase
V12 „Night Market“ – Premium-Shopping-Portal, siteweite Design-/UX-Vereinheitlichung und finale Qualitätsrunde.

## Source of Truth
- Produktion: `main`
- Letzter funktionaler Release: `V12.4 Phase 1: bekannte Mobile-/CSS-Konflikte entfernt`
- Aktueller Arbeitsbranch: `work/v12-4-1-real-minify`
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
- V12.3.1 Produktionsworkflow: Tests, Update, Build, Validierung, SEO, Security, Deploy und Live-Smoke erfolgreich
- Live CSS vor V12.4.1: `site.css?v=28`
- V12.4.1 baut Produktions-CSS und `app.js` mit esbuild minifiziert; Quellen bleiben lesbar
- PWA Shell: `angebotslotse-shell-v12`
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

## Nächste offene Blöcke
1. V12.4.1 Minify-Regression vollständig validieren und nach erfolgreichem Produktions-Smoke live verifizieren.
2. Legacy-CSS schrittweise weiter bereinigen, nur nachweislich überholte Mobile-/Theme-Regeln.
3. weitere Performance-/Accessibility-Messungen auf Start-, Such-, Kategorie-, Konto- und Produktseiten.
4. visuelle QA auf sehr kleinen Geräten sowie sehr breiten Desktop-Auflösungen.
5. Tarif-/Versicherungsintegrationen nur nach echter Partnerfreigabe weiter ausbauen.
6. Heise/compaliate erst nach finaler Gesamt-QA erneut zur Prüfung vorlegen.

## Regel bei Chat-/Stream-Abbruch
1. Diese Datei lesen.
2. Neuesten `main`-Commit prüfen.
3. Offene PRs und letzte Workflow-Läufe prüfen.
4. Beim ersten offenen Punkt unter „Nächste offene Blöcke“ fortsetzen.
5. Bereits gemergte und live-verifizierte Arbeit nicht neu bauen.

Keine Behauptung „live“, bevor Deploy + Live-Smoke erfolgreich waren.
