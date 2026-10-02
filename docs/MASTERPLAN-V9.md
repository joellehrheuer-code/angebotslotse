# Angebotslotse V9 – Masterplan für den Live-Relaunch

Stand: 2. Oktober 2026

## Zielbild

Angebotslotse wird von einer reinen Deal-Sammlung zu einem klaren deutschen Angebots- und Vergleichsportal ausgebaut. Die Seite verbindet:

1. Produkte, Deals und Gutscheine
2. Preisvergleich und Preisverlauf
3. Tarife und Verträge (Strom, Gas, DSL, Mobilfunk, Versicherungen, später Kredit)
4. Merkliste und Preisalarme
5. Bücher, Merch und ausgewählte Creator-Empfehlungen von Joel271997 / J0JOEL
6. ausschließlich kostenlose bzw. provisionsbasierte Partnerintegrationen ohne Grundgebühr für den Betreiber

Die Nutzer sollen innerhalb weniger Sekunden verstehen:
- Was kann ich hier finden?
- Was ist aktuell günstig?
- Wo kann ich Preise oder Tarife vergleichen?
- Warum kann ich dem angezeigten Preis/Rabatt vertrauen?
- Wie komme ich mit möglichst wenig Reibung zum passenden Angebot?

## Verbindliche Designprinzipien

### 1. Suche zuerst
Die zentrale Suche bleibt eines der dominantesten Elemente. Sie unterstützt Produkt, Marke, Händler und Kategorie. Später werden tarifbezogene Suchintentionen gesondert geroutet.

### 2. Zwei Hauptwelten
Die Startseite trennt sichtbar:
- Produkte & Deals
- Tarife & Verträge

Beide Bereiche nutzen dieselbe Marke, Navigation und Designsprache.

### 3. Klare visuelle Hierarchie
- Dunkler, ruhiger Header
- Heller Seitenhintergrund
- Weiße bzw. leicht transparente Karten
- Eine dominante Akzentfarbe plus eine warme Sekundärfarbe
- Große Produktbilder
- Deutliche Preis- und Rabatt-Hierarchie
- Weniger gleichzeitig konkurrierende CTA-Farben

### 4. Transparenz mit Maß
Glassmorphism wird nur für Hero-, Utility- und ausgewählte Navigationsflächen verwendet. Produktkarten bleiben gut lesbar und kontrastreich.

### 5. Animationen mit Zweck
Erlaubt:
- dezente Reveal-Animation beim Scrollen
- leichtes Anheben von Karten bei Hover
- weiche Filter-/Menü-Übergänge
- kurze Preis-/Status-Hervorhebungen
- horizontale Slider mit sanfter Bewegung

Nicht erlaubt:
- dauernd bewegte Hintergründe
- aggressive Parallax-Effekte
- lange Intro-Animationen
- Animationen, die Produktinfos verdecken

Alle nicht notwendigen Bewegungen müssen `prefers-reduced-motion` respektieren.

## Informationsarchitektur

### Hauptnavigation
- Deals
- Vergleiche
- Kategorien
- Shops
- Marken
- Merkliste
- Konto
- Creator

### Produkte & Deals
- Technik & Computer
- Gaming
- Audio & Musik
- Smart Home
- Haushalt & Küche
- Garten & Werkzeug
- Mode
- Sport & Fitness
- Gesundheit & Wellness
- Beauty
- Auto & Mobilität
- Tierbedarf
- Freizeit & Reisen
- Software & Digital
- Gutscheine

### Tarife & Verträge
- Strom
- Gas
- DSL / Internet
- Mobilfunk
- Kfz-Versicherung
- weitere Versicherungen
- später Kredit / Finanzierung

Bis ein echter Rechner/Partnerlink freigeschaltet ist, wird kein Scheinvergleich angezeigt. Der Bereich nennt seinen Integrationsstatus transparent.

## Startseiten-Reihenfolge

1. Header mit Logo, Suche, Hauptlinks und Social Icons
2. Hero: „Finde bessere Preise. Vergleiche, bevor du zahlst.“
3. Hauptwege: Produkte & Deals / Tarife & Verträge
4. Kategorien
5. Für dich entdeckt
6. Deal des Tages
7. Neu eingetroffen
8. Top-Rabatte
9. Technik/Gaming/Smart Home
10. Alltag/Haushalt/Mode/Sport
11. Gutscheine
12. Marken und Shops
13. Creator & Community
14. Bücher & Merch
15. Newsletter
16. Partner-/Quellenhinweise
17. Footer

## Produktkarten

Jede Karte folgt derselben Reihenfolge:
- Bild
- Kategorie/Badges
- Marke
- Produktname
- Händler
- alter Preis (nur wenn belastbar)
- aktueller Preis
- belegter Rabatt
- Preisverlauf / Preisänderung
- „Details & Preise“
- Merken

Keine Fake-Rabatte, keine erfundenen Vergleichspreise und keine Publisher-Werbetexte als Produkte.

## Produktdetailseite

Pflichtblöcke:
- Breadcrumb
- großes Produktbild / Galerie
- Produktname / Marke / Händler
- Preis und belegter Vergleichspreis
- Deal-Check
- Preisverlauf
- Vergleichshändler
- Merkliste / Wunschpreis
- ähnliche Produkte
- Bedingungen
- transparenter Affiliate-Hinweis

## Vergleichs-/Tarifseiten

Tarifseiten sind keine Produktkarten-Seiten. Sie bekommen:
- klare Kategorie
- kurze Erklärung
- nur notwendige Eingabefelder
- echten Rechner erst nach Partnerfreigabe
- Ergebnisdarstellung getrennt von redaktionellen Empfehlungen
- transparente Kennzeichnung von Vergütung/Partnerbezug

## Creator, Socials, Bücher & Merch

- Social Icons bleiben oben rechts sichtbar.
- Das Angebotslotse-Logo bleibt im Header und im Hero prominent.
- Joel271997 / J0JOEL bleibt sichtbar als Betreiber/Creator.
- Creator-Content steht nicht vor der eigentlichen Angebots-/Vergleichsfunktion.
- Bücher und Merch erhalten eigene Kacheln und Detailseiten.
- Eigene Produkte werden klar von automatisch geprüften Affiliate-Angeboten getrennt.

## Partner-Roadmap

### Bereits relevant
- Awin / aktive Advertiser
- Impact
- direkte Partner
- Heise Preisvergleich/compaliate nach finaler Website-Prüfung
- Verivox nach Registrierung und Freischaltung

### Vorbereitet, aber nur mit echten Zugangsdaten aktivieren
- Amazon Creators API
- Daisycon
- TradeDoubler
- Webgains
- weitere offizielle, kostenlose Feeds

Regel: keine automatische Annahme kostenpflichtiger Verträge, Mindestumsätze, Exklusivität oder anderer rechtlicher Verpflichtungen.

## Performance-Ziele

Am 75. Perzentil:
- LCP ≤ 2,5 s
- INP ≤ 200 ms
- CLS ≤ 0,1

Umsetzung:
- responsive Bilder und feste Bildabmessungen
- Lazy Loading unterhalb des Folds
- minimales JavaScript
- keine schweren Animationsbibliotheken ohne zwingenden Nutzen
- keine unnötigen Drittanbieter-Skripte
- Service Worker darf keine sichtbar veraltete Version dauerhaft festhalten
- Cache-Versionierung und Live-Smoke nach Deployment

## Accessibility

- semantische Überschriften
- sichtbare Fokuszustände
- Tastaturbedienung
- 44px Touch-Ziele wo sinnvoll
- ausreichender Kontrast
- beschriftete Suche und Formulare
- reduzierte Bewegung via `prefers-reduced-motion`
- keine Information ausschließlich über Farbe kommunizieren

## Sicherheit

- bestehende Input-/URL-Validierung beibehalten
- externe Links nur aus erlaubten Quellen
- Affiliate-/Trackinglinks validieren
- Secrets ausschließlich in Actions/Server-Kontext
- keine Secrets in Build-Artefakten
- CSP-Konzept prüfen; auf GitHub Pages ggf. Meta-CSP nur nach Kompatibilitätstest
- Security-Check bleibt Deployment-Blocker
- Abhängigkeiten reproduzierbar pinnen
- externen Content nur gezielt und möglichst nach Nutzeraktion laden

## Datenqualität

- abgelaufene Angebote niemals veröffentlichen oder als frisch konservieren
- tote Links sperren
- Varianten sauber identifizieren
- Vergleichspreise nur aus echten Quelldaten
- Produktbilder nur aus offiziellen/freigegebenen Quellen
- Dubletten vermeiden
- Quelle, Aktualisierung und Gültigkeit nachvollziehbar halten
- ausfallende Quelle darf gültigen Restbestand nicht zerstören

## Tests / Definition of Done

Ein Release gilt erst als live-fähig, wenn:
- npm test: 0 Fehler
- Build erfolgreich
- Build-Validierung erfolgreich
- SEO-Audit ohne kritische Fehler
- Security-Check erfolgreich
- GitHub Pages Deploy erfolgreich
- Live-Smoke erfolgreich
- Startseite Desktop geprüft
- Startseite Mobile geprüft
- Suche getestet
- Kategorie-/Filterseiten getestet
- mindestens eine Produktdetailseite getestet
- Merkliste getestet
- Tarif-Hub getestet
- keine abgeschnittenen oder überlappenden Kernkomponenten
- neue Version nach normalem Reload sichtbar (kein festhängender Service-Worker-Stand)

## Phasen

### Phase 0 – Stabilität
Status: weitgehend erledigt.
- Ablauf-Fehler im Test behoben
- abgelaufene Angebote werden nicht mehr konserviert
- Regressionstest vorhanden

### Phase 1 – Portal-Fundament
- neue Startseitenhierarchie
- Produkte/Tarife als zwei Hauptwege
- neues Designsystem
- Logo und Socials sauber integrieren
- Vergleichs-Hub
- Animationen und Transparenz auf klar definierte Komponenten begrenzen

### Phase 2 – Produkt-UX
- Filterchips
- Ergebniszahlen
- mobil optimierte Filter
- Kartenhöhen vereinheitlichen
- Produktvergleich für spezifikationslastige Kategorien
- stärkere Preisverlaufsdarstellung

### Phase 3 – Tarif-Integrationen
- Verivox Registrierung/AGB nach manueller Prüfung
- passende iFrames/Textlinks integrieren
- Heise nach finalem Relaunch erneut zur Prüfung vorlegen
- Widgets nur mit redaktionellem Kontext

### Phase 4 – Konto & Alerts
- Cloud-Merkliste nur bei klarer Datenschutzbasis
- Preisalarme
- Web Push
- optionales Konto
- Datenexport/Löschung

### Phase 5 – Monetarisierung & Wachstum
- weitere kostenlose Partnernetze
- eigene Bücher/Merch
- SEO-Hubs
- Newsletter
- Conversion- und Link-Qualitätsmessung
- keine Dark Patterns

## Nicht verhandelbar

- dauerhaft kostenloser technischer Grundbetrieb soweit mit den bestehenden kostenlosen Diensten möglich
- keine Fake-Deals
- keine erfundenen Preise
- keine bezahlten Tools ohne ausdrückliche Freigabe
- keine unkontrollierten KI-Änderungen an main
- GitHub main bleibt Source of Truth
- jeder größere Umbau muss durch Tests, Build und Live-Smoke
