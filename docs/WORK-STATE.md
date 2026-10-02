# Angebotslotse – aktueller Arbeitsstand

Stand: 2. Oktober 2026, nach V9-Produktdetail-Merge

## Aktuelle Phase
V9 Phase 1 – Portal-Fundament, Design-Stabilisierung und Live-QA.

## Source of Truth
- Produktion: `main`
- Letzter funktionaler Merge: `feat(v9): unify product detail purchase hierarchy`
- Masterplan: `docs/MASTERPLAN-V9.md`
- Arbeitsregel: neue UI-Pakete isoliert auf `work/**` oder `feature/**`, vor Merge über Branch Validation prüfen

## Bereits umgesetzt
- Ablauf-/Expired-Offer-Fehler behoben
- V9 Startseite mit Produkte/Deals + Tarife/Verträge
- Vergleichs-Hub mit transparentem externem Verivox-Status
- Angebotslotse Branding, Logo und Socials
- V9 Produktfilter inklusive sichtbarer aktiver Filter
- siteweite V9 Oberflächenangleichung
- PWA Cache-Rotation
- mobile Schnellnavigation mit Safe Area
- Skip-Link und Fokuszustände
- primäre Klick-/Touchflächen auf mindestens 44 px vergrößert
- Produktdetailseite: getrennte Medien-/Kaufbereiche, stärkerer Preis, 54-px-Haupt-CTA
- Deal-Check, Merkliste, Preisverlauf und Preisvergleich auf V9-Oberflächen vereinheitlicht
- automatisierte Tests, Update, Build, SEO, Security, Deploy, Smoke und IndexNow
- Branch-/PR-Validierung vor main

## Aktuell laufend
1. Produktionsworkflow des Produktdetail-Merges vollständig abschließen
2. danach Live-QA einer echten Angebotsdetailseite auf Desktop + Mobile
3. falls nötig nur konkrete Live-Abweichungen als kleines Folgepaket fixen

## Danach
1. Performance und Accessibility final messen
2. weitere verbleibende Legacy-CSS-Inseln entfernen
3. Tarif-/Versicherungs-Hub nur nach echter Partnerfreigabe weiter monetarisieren
4. finale Website-QA
5. Heise erst nach finalem Frontend erneut zur Prüfung vorlegen

## Regel bei Chat-/Stream-Abbruch
Ein Chat-/Übermittlungs-Timeout darf den Projektstand nicht bestimmen.

Beim Wiederaufnehmen:
1. diese Datei lesen
2. neuesten `main`-Commit prüfen
3. offene PRs und letzte Workflow-Läufe prüfen
4. beim ersten offenen Punkt unter „Aktuell laufend“ fortsetzen
5. bereits gemergte Arbeit nicht neu bauen

Große Änderungen in kleine, separat testbare Pakete aufteilen. Nach jedem erfolgreichen Paket einen Git-Checkpoint behalten. Keine Behauptung „live“, bevor Deploy + Live-Smoke erfolgreich waren.
