# Angebotslotse – aktueller Arbeitsstand

Stand: 2. Oktober 2026, nach V12.1 Creator & Social

## Aktuelle Phase
V12 „Night Market“ – Premium-Shopping-Portal, Creator-/Social-Integration und finale Qualitätsrunde.

## Source of Truth
- Produktion: `main`
- Letzter funktionaler Release: `V12.1 Creator & Social: Logo, Facebook und Multi-Plattform-Releases`
- Weltmarken-Audit: `docs/WELTMARKE-200-AUDIT.md`
- Arbeitsregel: größere Änderungen isoliert auf `work/**`, `feature/**` oder `design/**`; vor Merge Branch Validation.

## Bereits live
- V12 Night-Market-Design: dunkles Navy/Schwarz mit gezielten Pink/Violett/Blau-Akzenten
- LIVE-Leiste und „Aktuell angebunden“ mit echten Angebots-/Shop-/Quellen-/Kategorie-Daten
- Search-first Hero, Smart Search, große Kategorie-Kacheln, Top-Deals und Deal des Tages
- faktenbasierte Preis-/Deal-Einordnung und Sticky Provider CTA auf Produktseiten
- reduzierte Navigation, Mobile-Navigation, Merkliste/Konto
- echtes Angebotslotse-Branding
- echtes hochgeladenes Joel271997/J0JOEL-Creator-Logo im Creator-Bereich
- Instagram, YouTube, TikTok, Facebook, Snapchat, Twitch, Spotify und Discord in der Creator-/Social-Struktur
- identische Cross-Plattform-Clips werden als eine Veröffentlichung mit Plattform-Links dargestellt
- eigener Bereich „Musik & Streams“; echte Feed-Einträge ersetzen automatisch die Spotify-/Twitch-Einstiegskarten
- Bücher und Merch bleiben eigener, klar getrennter Bereich
- Reduced Motion, Fokuszustände, ausreichend große Touch-Ziele
- automatisierte Tests, Datenupdate, Build, SEO, Security, Pages-Deploy, Live-Smoke und IndexNow

## Verifiziert
- V12.1 Produktionsworkflow vollständig erfolgreich
- Live-Seite HTTP 200
- Creator-Logo im ausgelieferten HTML vorhanden
- Facebook-Link kommt aus einem echten öffentlichen Facebook-Reel des Social-Verteilers; kein erfundenes Profil
- aktueller Clip wird live genau einmal dargestellt, mit Instagram-, TikTok-, YouTube- und Facebook-Links
- Musik-/Stream-Bereich live mit Spotify J0JOEL und Twitch Joel271997
- CSS-Cache V12.1: site.css?v=25
- PWA Shell Cache: angebotslotse-shell-v9

## Bekannte Datenbegrenzung
Der öffentliche Social-Verteiler liefert derzeit nur vier Plattform-Posts desselben Clips vom 26.09.2026. Der Angebotslotse kann mehr Einträge verarbeiten; sobald der Verteiler weitere unterschiedliche öffentliche Veröffentlichungen liefert, entstehen automatisch weitere Release-Karten. Keine historische Veröffentlichung wird erfunden.

## Nächste offene Blöcke
1. Social-Verteiler-Publikationshistorie prüfen/erweitern, damit zukünftige echte Veröffentlichungen dauerhaft im öffentlichen Feed erhalten bleiben.
2. V12 Performance/Accessibility messen und Asset-Größen weiter reduzieren.
3. verbleibende Legacy-CSS-Blöcke schrittweise entfernen, ohne V12-Funktionen zu brechen.
4. vollständige Desktop-/Mobile-Live-QA aller Hauptseiten (Start, Suche, Kategorien, Shops, Produktdetail, Vergleiche, Konto).
5. Tarif-/Versicherungsintegrationen nur nach echter Partnerfreigabe weiter ausbauen.
6. Heise/compaliate erst nach finaler Gesamt-QA erneut zur Prüfung vorlegen.

## Regel bei Chat-/Stream-Abbruch
1. Diese Datei lesen.
2. Neuesten `main`-Commit prüfen.
3. Offene PRs und letzte Workflow-Läufe prüfen.
4. Beim ersten offenen Punkt unter „Nächste offene Blöcke“ fortsetzen.
5. Bereits gemergte und live-verifizierte Arbeit nicht neu bauen.

Keine Behauptung „live“, bevor Deploy + Live-Smoke erfolgreich waren.
