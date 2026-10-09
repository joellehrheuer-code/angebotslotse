# Angebotslotse 2.0 – verbindliche Ausbau- und QA-Liste
Stand: 2026-10-10. Ziel: ein kostenlos betreibbares, seriöses deutsches Preisvergleichs-, Deal- und Tarifportal. Keine erfundenen Angebote, Preise, Produktbilder, Bewertungen, Besucherzahlen, Vertragszustimmungen oder Partnerschaften.

## P0: Fehler zuerst (Release-Blocker)
- [ ] GitHub Actions für Update, Qualitätsloop, Deployment, Smoke, Integrität dauerhaft grün; keine unbehandelten Timeout-Hänger oder fehlenden kritischen Assets. Zuletzt #473 und Qualitätsloop #61 grün; nach jeder UI-Änderung erneut prüfen.
- [ ] Bildinventur: jeden öffentlich gezeigten Bildlink auf HTTPS, Erreichbarkeit, ausreichende Auflösung, legitime Quelle und Lizenz prüfen. Kaputte Bilder durch neue **offizielle freigegebene** Partnerbilder ersetzen; ohne Rechte keine fremden Amazon-/Google-Bilder kopieren.
- [ ] Keine leeren oder falschen Fotos. Ein deklarierter neutraler Kategorie-Platzhalter bleibt besser als ein erfundenes oder rechtswidrig genutztes Produktbild. Bei mehrfach defekten Medien Bild reparieren oder Angebot aus prominenten Rails ausschließen.
- [ ] Discord-/Social-Buttons: Clipping und Dock-Overflow über 320/375/768/1024/1440px sowie Touch, Fokus, Hover, 200%-Zoom testen; nie in Header-Leisten hineinbewegen oder ins Unsichtbare laufen lassen.
- [ ] Light/Auto/Black auf Start-, Produkt-, Kategorie-, Merkliste-, Konto-, Buch-, Tarif-, Status- und Formularseiten testen; Farbkontrast und Spotify-/Playlist-/Social-Text prüfen.
- [ ] Community: 3 Bewertungen sind serverseitig als `pending` gespeichert. Moderationsansicht/freigebende Rollen prüfen, **nicht** ungeprüft freigeben; pro Seite letzte fünf genehmigte Bewertungen, Name optional/Anonym, Sterne, Text, Datum; keine Fake-Daten. Frontend wird auf fünf geändert.
- [ ] Gutscheine: Sinn der Codes und Einlösehinweis erklären, Quelle/Gültigkeit kontrollieren, inaktive Codes ausblenden.
- [ ] Kontakt, Newsletter, Login, Merkliste, Suche, Menü und Partner-CTA im Browser auf funktionierende Aktion prüfen, nicht nur auf Vorhandensein der Buttons.

## P1: Angebotsvielfalt und Datenqualität
- [ ] Impact: 90-Sekunden-Timeout seit 2026-10-09 weiterhin mit 0 neuen Ergebnissen. Calls in kleinere Kampagnen-/Katalog-Pakete aufteilen, End-to-end-Abbruch, begrenzte Parallelität, Checkpoints, Quell-Logs, positive/negative Tests.
- [ ] Awin: separaten Product-Datafeed-Key einrichten (derzeit leer), aktive Programme und Produktfeed-Berechtigungen kontrollieren. Keine fremden/abgelehnten Programme publizieren.
- [ ] Partner-Offensive: nur verifizierte offizielle Kontakte; jede Kontaktaufnahme vor Versand gegen Gmail, AgentMail und Partner-Lifecycle prüfen. Kontaktstatus nach Versand sichern. Maximal sinnvolle, individuelle Nachrichten, Anti-Spam-Schutz respektieren.
- [ ] Pro Kategorie mehr Händler gewinnen: Technik/Gaming, Beauty, Tierbedarf, Haushalt, Sport, Werkzeug, Mode und Geschenkideen. Verivox-Termin am 14.10.2026 11 Uhr für Tarif-Widgets/Textlinks; keine automatische Vertragsannahme.
- [ ] Alternative Netze Daisycon/Tradedoubler/Webgains nur mit freigeschalteten APIs/Feeds und passenden kostenlosen Partnerprogrammen.
- [ ] Shop-, Marken- und Kategorievielfalt der Top-Deals erhöhen; nicht dieselben Marken mehrfach nebeneinander, nur bestätigte Rabatte und echte Endzeiten.
- [ ] Preise inklusive Versand/Grundpreis nur nennen, wenn belastbar geliefert; 30-Tage-Historie, Dubletten, GTIN, Rückgabestatus und Preisalarme schrittweise verbessern.
- [ ] Einheitliches Produktkarten-Schema: Bild, exakter Produktname, Marke, Händler, Preis, ggf. Rabatt, Datum, CTA, Werbekennzeichnung. Keine Fantasieprodukte.

## P2: Funktionale Produktseite, Nutzer und Kommunikation
- [ ] Großzügige Desktop-Suche, kompakte mobile Suche, sinnvolle Vorschläge, Filterchips, kombinierbare Kategorien/Preis/Händler/Marke/Verfügbarkeit/Sortierung.
- [ ] Konto anlegen/anmelden/verifizieren, Passwortreset, Abmeldung, Löschung und Datenexport vollständig end-to-end prüfen.
- [ ] Merkliste & Wunschpreis ohne Kaufwagen; Cloud-Synchronisierung nur eingeloggten Nutzern und sicheren Regeln zugänglich.
- [ ] Newsletter-Formular und Double-Opt-in sind vorhanden, 0 Empfänger gemessen. Resend-Versand, Bestätigungslink, Präferenzen, Abmeldelink, Bounces und DSGVO-Text kontrollieren. Nicht automatisch E-Mails ohne bestätigte Einwilligung versenden.
- [ ] Optional täglicher/wöchentlicher Digest und produkt-/kategoriebezogene Preisalarme mit Deduplizierung, Throttling und Abmeldefunktion.
- [ ] Community-Besuche als Sitzungsschätzung erklären; keine einmaligen Personen behaupten, wenn nicht nachweisbar.
- [ ] Barrierefreiheit: Tastatur, sichtbarer Fokus, Screenreader, saubere Labels, Kontrast >=4,5:1 für normalen Text, Reduced Motion.

## P3: Design, Inhalte und Sprachen
- [ ] Groß-/Kleinschreibung, Typografie, Abstände, Sektionen, Kartenhöhen und Buttons konsistent und insgesamt ruhiger gestalten.
- [ ] Theme-Auto als Systemmodus, mittel/dunkel/hell mit voll lesbaren Icons, Dialogen, Widgets, Ratings, Preisgraphen und Spotify.
- [ ] Deutsch/Englisch zuerst, weitere Sprachen nur mit übersetzten Produkt-/Rechtstexten, hreflang und eindeutiger Sprachumschaltung. Fremdsprachige Inhalte nicht als deutsche Angebote fehlkennzeichnen.
- [ ] Zwei Bücher mit richtigen Titeln, autorisierten Amazon-Coverabbildungen, ISBN/ASIN und aktiven Zielseiten; keine fremden Cover aus Suchergebnissen kopieren.
- [ ] Creator-Rubriken Social, Bücher, Merch, Musik in kompakteren Karten. Spotify-Playlist lesbar, Musik-Player gut sichtbar; externer Embed erst nach bewusster Interaktion.
- [ ] Twitch-Live-Kennung aus **offizieller** API nur wenn der Stream tatsächlich live ist; falls offline, normaler Kanal-Link.
- [ ] Discord-Icons und Social-Dock innerhalb der Containergrenzen, kein Clipping in Light/Auto/Black.

## P4: Rechtliches, Google und Wachstum
- [ ] Verivox/Heise Widgets und externe Vergleichsrechner nur nach expliziter zulässiger Einbindung inkl. Affiliate-Kennzeichnung.
- [ ] Google Search Console URL-Präfix `https://joellehrheuer-code.github.io/angebotslotse/` kostenlos als Property hinzufügen und Eigentum bestätigen; Sitemap `https://joellehrheuer-code.github.io/angebotslotse/sitemap.xml` einreichen; Indexabdeckung messen. Automatischer IndexNow-Lauf ersetzt Google Search Console nicht.
- [ ] Google Business Profile ist für reine Online-Websites ohne persönlichen Kundenkontakt i. d. R. nicht zulässig; keinen falschen Standort anlegen.
- [ ] SEO: Canonical, robots, echte Produkt-Snippet-Daten (kein Händler-Merchant-Listing, solange nur zu fremden Shops weitergeleitet wird), strukturierte Organization/WebSite/Breadcrumb-Daten.
- [ ] Mobile Core Web Vitals, PageSpeed, Bildgrößen, CSS/JS-Last, Accessibility und Fehlermeldungen auf echten Geräten kontrollieren.
- [ ] Impressum, Datenschutz, Newsletter-Einwilligung, Widerruf/Abmeldung, Affiliate-Offenlegung, Rechte an Bildern und AGB auf den aktuellen Betrieb abstimmen.

## Abnahme pro Release
1. Vollständiger CI-Lauf grün (Test/Integrität/Build/Validate/SEO/Security/Deploy/Live-Smoke).
2. Desktop und Mobil für drei Themes keine abgeschnittenen Karten/Buttons, alle Formularaktionen sinnvoll.
3. Produktbilder nur mit erlaubten Quellen, Gutscheine/Preise nachvollziehbar.
4. Keine ungenehmigten Partner, keine Fake-Bewertungen, keine unverlangten Newsletter.
5. Nach Deployment Live-Kontrolle plus Status- und Angebotszahlen, offenen Rest dokumentieren.

### Quellen und UX-Vorbilder
- https://baymard.com/research/ecommerce-product-lists
- https://baymard.com/blog/product-listing-page-plp-ux
- https://developers.google.com/search/docs/monitor-debug/search-console-start
- https://developers.google.com/search/docs/appearance/structured-data/product
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
