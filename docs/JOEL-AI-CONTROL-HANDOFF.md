# Angebotslotse – JOEL AI CONTROL Übergabe und QA
Stand: 2026-10-14

## Zweck
Diese Datei ist die zentrale, versionierte Übergabe für den Desktop-KI-Ordner / Obsidian / JOEL AI CONTROL. Sie enthält keine Zugangsdaten. „Dego-Sache“ ist vorläufig als Dokumentation/Übergabe interpretiert; Begriff bei Bedarf präzisieren.

## Quelle und aktuelle Messwerte
Repository: https://github.com/joellehrheuer-code/angebotslotse
Branch: main. Datenstatus vom 2026-10-14T13:45:42Z:
- activeOffers/publishableOffers: 252
- storedOffers: 481
- quarantined: 130
- blockedPublisherPromotions: 5
- invalidLinks/apiErrors: 0
Ein Statuswert 0 für ungültige Links ist KEIN Beweis, dass jeder externe Händlerlink im Browser funktioniert.

## Designvertrag
- Marke Angebotslotse, echtes Logo, einheitliche Identität und konsistente Sprache.
- 3 Themes: Light, Dark, Black. Kontrast auch bei Suchvorschlägen, Dialogen und Footer.
- Hero mit ausgewählten, echten Top-Angeboten; mit Tastatur bedienbares Karussell, sichtbare Vor/Zurück-Controls, kein unkontrolliertes Autoplay.
- Darunter alle aktuellen Angebote mit klaren Preis- und Shopangaben, verlässlichen Rabattcodes, echter Such-/Filter-/Sortierlogik.
- Mobile zuerst: 320, 360, 375, 390, 430, 768 px plus Desktop 1366, 1440, 1920 px; 200 % Textzoom.
- Saubere Animationen bei Hover, Fokus, Karten und Übergängen, aber prefers-reduced-motion berücksichtigen und Funktionalität ohne Animation erhalten.
- Community-Bewertungen nur bei überprüfbarem Freigabestatus und echten Daten; Besucherzahlen niemals erfinden.
- Barrierefreiheit: sichtbarer Fokus, passende Labels, erreichbare Touchziele, Kontrast und Tastaturbedienbarkeit.

## Vollständige QA – noch keine pauschale Freigabe
1. Alle internen Navigationseinträge, Footer-Links, Social-Links und Logo-Home-Link öffnen.
2. Jeden Button und jede Aktion auf Startseite, Angeboten, Details, Merkliste und Konto prüfen.
3. Suche: Tastatur, Vorschläge, leere Treffer, Sonderzeichen, Zurücksetzen.
4. Filter: Mehrfachauswahl, Ergebnisanzahl, aktive Filterchips, Mobil-Dialog und Sortierung.
5. Angebote: Produktbild, Preis, Händler, affiliate Kennzeichnung, Deeplink, Rabattcode, Preisverlauf.
6. Top-Deal-Karussell: Richtung, Dots, Touch, Keyboard, Pause sowie Layoutwechsel.
7. Bewertungen: ausstehend vs. freigegeben, Sterne, Fehlermeldungen, Moderation.
8. Formularzustände: erfolgreich, leer, invalid, offline, Timeout, doppelte Übermittlung.
9. Animationen: Hover/Touch, Fokus, reduced motion, keine Layoutverschiebung.
10. Theme-Matrix je Seitentyp und in Browsern Chromium, Firefox, Safari, Edge.
11. Mobile: Überläufe, abgeschnittene Karten/Texte, sticky Elemente, Menüs, Overlay-Schließen.
12. Ladeleistung: LCP/INP/CLS mit Messung, nicht nur statische Tests.
13. Sicherheit und rechtliche Angaben: Datenschutzhinweise, Impressum, Affiliate-Transparenz.
14. Automatische Feeds: Gültigkeit, Freigabe, Dubletten, Quarantäne, alte und archivierte Deals.
15. Deployment-Gate: npm test, npm run build, npm run validate, npm run check, Live-Smoke.

## Aktuell belegte Einschränkungen
- Die alte Abschlussliste docs/COMPLETION-CHECKLIST.md nennt weitere Browser-/Viewport-/E2E-Aufgaben als offen.
- Diverse Partnerfeeds sind mangels Credentials/Freigaben nicht vollständig angeschlossen.
- Eine Prüfung des sichtbaren Live-Verhaltens aller Buttons und Animationen ist in dieser Übergabe ausdrücklich NICHT behauptet.
- Desktop-Ordner und Obsidian sind nicht allein durch GitHub-Datei automatisch synchronisiert; zum Import diese Markdown-Datei übernehmen oder eine Sync-Verbindung konfigurieren.

## Nächster Durchlauf
Priorität P0: reproduzierbaren visuellen und interaktiven End-to-End-Test etablieren und rote Testfälle beseitigen.
Priorität P1: Karten/Karussell/Filter/Themes sowie Code-Anzeige und Sterne validieren.
Priorität P2: weitere Partnerdaten mit ausdrücklicher Freigabe und stabilen Feeds ergänzen.
Für jedes Thema ein Statusfeld offen/in Arbeit/geprüft/blockiert und einen Beleg (Testprotokoll, Screenshot, Commit).
