# Angebotslotse – aktueller Arbeitsstand

Stand: 2. Oktober 2026

## Aktuelle Phase
V9 Phase 1 – Portal-Fundament und visuelle Stabilisierung.

## Source of Truth
- Branch für Produktion: `main`
- Aktive Arbeits-Branch: `work/v9-phase1-mobile-ux`
- Masterplan: `docs/MASTERPLAN-V9.md`

## Bereits umgesetzt
- abgelaufene Angebote blockieren nicht mehr den Build
- Regressionstest für abgelaufene Angebote
- V9 Startseiten-Architektur: Produkte/Deals + Tarife/Verträge
- Vergleichs-Hub
- Angebotslotse Branding in Header/PWA
- Social Icons im Header und Creator-Bereich
- reduzierte Bewegungen via `prefers-reduced-motion`
- PWA Cache für V9 auf neue Version rotiert
- Verivox-Bereiche als externer Übergang vorbereitet, eigene Einbettung erst nach Freigabe

## Dieses Arbeitspaket
- mobile Schnellnavigation
- Skip-Link und sichtbare Fokuszustände
- V9 Build-Report-Version
- Checkpoint-Datei für zuverlässiges Wiederaufnehmen nach Chat-/Stream-Abbruch

## Nächster Schritt nach grünem CI
1. Live-Deploy visuell Desktop + Mobile prüfen
2. Überlagerungen, Logo-Größe, Header und Kartenhöhen korrigieren
3. mobile Filter-UX verbessern
4. Produktdetailseiten visuell an V9 angleichen
5. Tarif-Hub nach Partnerstatus weiter ausbauen
6. Heise erst nach finalem Frontend erneut zur Prüfung vorlegen

## Regel bei Abbruch
Bei einem Chat-/Stream-Abbruch zuerst diese Datei und die letzten Commits lesen. Keine bereits erledigte Phase neu anfangen. Nur ab dem ersten offenen Punkt weiterarbeiten.
