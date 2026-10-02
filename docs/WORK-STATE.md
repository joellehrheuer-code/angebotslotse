# Angebotslotse – aktueller Arbeitsstand

Stand: 2. Oktober 2026, nach V12.2 Sitewide

## Aktuelle Phase
V12 „Night Market“ – Premium-Shopping-Portal, siteweite Design-/UX-Vereinheitlichung und finale Qualitätsrunde.

## Source of Truth
- Produktion: `main`
- Letzter funktionaler Release: `V12.2 Sitewide: Premium-Design auf allen Hauptseiten`
- Weltmarken-Audit: `docs/WELTMARKE-200-AUDIT.md`
- Arbeitsregel: größere Änderungen isoliert auf `work/**`, `feature/**` oder per PR; vor Merge vollständige Validation.

## Bereits live
- V12 Night-Market-Design: dunkles Navy/Schwarz mit gezielten Pink/Violett/Blau-Akzenten
- LIVE-Leiste und „Aktuell angebunden“ mit echten Angebots-/Shop-/Quellen-/Kategorie-Daten
- Search-first Hero, Smart Search, große Kategorie-Kacheln, Top-Deals und Deal des Tages
- faktenbasierte Preis-/Deal-Einordnung und Sticky Provider CTA auf Produktseiten
- reduzierte Navigation, Mobile-Navigation, Merkliste/Konto
- echtes Angebotslotse-Branding
- echtes Joel271997/J0JOEL-Creator-Logo
- Instagram, YouTube, TikTok, Facebook, Snapchat, Twitch, Spotify und Discord in der Creator-/Social-Struktur
- identische Cross-Plattform-Clips werden als eine Veröffentlichung mit Plattform-Links dargestellt
- eigener Bereich „Musik & Streams“
- Bücher und Merch als eigener, klar getrennter Bereich
- V12.2 Premium-Unterseitenaufbau auf Kategorien, Suche, Merkliste, Konto, Shops, Marken, Bücher, Merch, Methodik, Status und Utility-Seiten
- siteweit vereinheitlichte Filter-, Statistik-, Info- und Kartenflächen
- verbesserte Mobile-Abstände und responsive Filterlogik
- Reduced Motion, Fokuszustände, ausreichend große Touch-Ziele
- automatisierte Tests, Datenupdate, Build, SEO, Security, Pages-Deploy, Live-Smoke und IndexNow

## Verifiziert
- V12.2 Branch-/PR-Validation vollständig erfolgreich
- V12.2 Produktionsworkflow vollständig erfolgreich
- Live-Smoke erfolgreich
- Live-Seiten HTTP 200: Startseite, Suche, Kategorien, Shops, Konto, Methodik, Status, 404 und Produktdetail
- Suche, Kategorien, Shops, Konto, Methodik, Status und Utility-Seiten liefern den neuen `subpage-hero`
- Produktdetail liefert weiterhin `detail-grid` und `sticky-offer-bar`
- CSS-Cache V12.2: `site.css?v=26`
- PWA Shell Cache: `angebotslotse-shell-v10`

## Bekannte Datenbegrenzung
Der öffentliche Social-Verteiler liefert derzeit nur vier Plattform-Posts desselben Clips vom 26.09.2026. Der Angebotslotse kann mehr Einträge verarbeiten; sobald der Verteiler weitere unterschiedliche öffentliche Veröffentlichungen liefert, entstehen automatisch weitere Release-Karten. Keine historische Veröffentlichung wird erfunden.

## Nächste offene Blöcke
1. Social-Verteiler-Publikationshistorie erweitern, damit zukünftige echte Veröffentlichungen dauerhaft im öffentlichen Feed erhalten bleiben.
2. V12 Performance/Accessibility mit realen Messwerten weiter optimieren.
3. verbleibende Legacy-CSS-Blöcke schrittweise entfernen, ohne V12.2-Funktionen zu brechen.
4. weitere visuelle Live-QA auf kleinen Mobilgeräten und sehr breiten Desktop-Auflösungen.
5. Tarif-/Versicherungsintegrationen nur nach echter Partnerfreigabe weiter ausbauen.
6. Heise/compaliate erst nach finaler Gesamt-QA erneut zur Prüfung vorlegen.

## Regel bei Chat-/Stream-Abbruch
1. Diese Datei lesen.
2. Neuesten `main`-Commit prüfen.
3. Offene PRs und letzte Workflow-Läufe prüfen.
4. Beim ersten offenen Punkt unter „Nächste offene Blöcke“ fortsetzen.
5. Bereits gemergte und live-verifizierte Arbeit nicht neu bauen.

Keine Behauptung „live“, bevor Deploy + Live-Smoke erfolgreich waren.
