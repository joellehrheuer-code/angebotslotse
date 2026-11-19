# 🛍️ Angebotslotse – Fortschrittslinie 0–100 %

**Stand:** 19.11.2026 · **Geltungsbereich:** Angebotslotse, nicht Discord/ShortSync · **Quelle:** GitHub `main` und Actions.

## Fortschritt

**40 % (4/10 eindeutig abgeschlossenen Meilensteinen)** – das ist der *Meilensteinfortschritt*, nicht die Zahl verfügbarer Angebote oder eine Garantie, dass 30 % der Arbeit erledigt sind. Pro Meilenstein werden 10 Punkte nur nach erfülltem Abnahmekriterium vergeben; Teilstände bringen noch keine Punkte. Der Nutzer kann die Gewichte später neu festlegen.

`[████████░░░░░░░░░░░░] 40 %`

**Produktionsbereitschaft: NICHT ERREICHT.** Letzter geprüfter echter Import-Workflow: 44539900999. Erstmals **6 verifizierte, veröffentlichungsfähige Impact-Angebote** (Martinic) und `catalog:health` erfolgreich. Die nachfolgenden 401 Tests enden jedoch mit **4 Fehlern**, deshalb wurden Commit, Deploy, Smoke und IndexNow übersprungen. Website-Release ist **nicht** bestätigt.

| # | Bereich | Fortschritt | Abnahmekriterium | Nächste Aktion |
|---|---|---|---|---|
| 1 | GitHub-Grundgerüst | ✅ 10/10 | Repository, bestehende Actions und bestehende Pages-Deploykette überprüft | Bei Änderungen weiterhin `main` und PR verwenden |
| 2 | Sicherheitsregeln | ✅ 10/10 | `catalog:health` blockiert ungültige/leere Veröffentlichung; Secrets nicht im Code; Schutztest vorhanden | Niemals umgehen |
| 3 | Fehlerdiagnose | ✅ 10/10 | Awin-Autorisierungsdiagnose (PR #63) und Impact-Link-Ablehnungsdiagnose (PR #65) im Hauptbranch; gezielte Tests bestanden | Nächste echte Quellenberichte auswerten |
| 4 | Awin-API | ⬜ 0/10 | GitHub Actions kann authentifiziert freigegebene DE-Programme und Angebote abfragen, ohne 401/403 | gültigen PAT sicher ins Secret `AWIN_API_TOKEN` eintragen; Live-Lauf prüfen |
| 5 | Awin-Produktfeeds | ⬜ 0/10 | genehmigte Händlerfeeds mit echten Preisen, Bildern und Trackinglinks importiert und geprüft | `AWIN_FEED_LIST_URL` bzw. `AWIN_LEGACY_FEED_URLS` in Actions Secrets einrichten; PR #64 bereits gemergt |
| 6 | Impact-Verwertung | ✅ 10/10 | Mindestens ein reales, freigegebenes Impact-Produkt erfolgreich normalisiert und verifiziert | Lauf 44534445077: 6 Martinic-Produkte angenommen, `catalog:health` bestanden; Veröffentlichung erst nach CI-Fix |
| 7 | Weitere Quellen | ⬜ 0/10 | Mindestens eine weitere freigegebene Quelle mit verifizierten Angeboten aktiviert; keine künstlichen Einträge | Daisycon/Webgains/Tradedoubler prüfen; Amazon nur mit erlaubtem Zugang |
| 8 | Durchgängige CI-Qualität | ⬜ 0/10 | `npm test`, Build, Validate, SEO, Security vollständig grün; ohne Qualitätsfilter abzuschalten | 28 bestehende Fehlschläge prüfen, insbesondere fehlende Bestandsdaten vs. wirkliche Regressionen |
| 9 | Echte End-to-End-Veröffentlichung | ⬜ 0/10 | update → commit → deploy → Live-Smoke → IndexNow erfolgreich und echte Angebotsseiten erreichbar | Erst nach mindestens einem verifizierten Angebot ausführen |
| 10 | Stabiler Regelbetrieb | ⬜ 0/10 | Mehrere aufeinanderfolgende geplante Läufe erfolgreich; Fehlerfälle, Dubletten, Ablaufdaten und Preisänderungen nachweislich korrekt | Bestandsmonitoring nutzen, keine zweite Publisher-Infrastruktur |

## Sichere Arbeitsfolge

1. Vor jedem Eingriff: `main`, offene PRs und jüngste Actions-Läufe prüfen. Nicht auf gespeicherte Oktober-Statusberichte verlassen.
2. Immer nur eine konkrete Ursache beheben; Tests und PR, erst dann in `main`.
3. Quellen zuerst, dann Validierung, erst dann Veröffentlichung. Niemals 0 gültige Angebote als Erfolg markieren.
4. Nutzer nach erforderlicher externer Freigabe/Token-Eingabe fragen, aber Tokens niemals im Chat, Issues, Code oder Actions-Logs verarbeiten.
5. Jede Runde unterscheiden: **vorbereitet** / **mit Test bestanden** / **gemergt** / **in Produktion bestätigt**.
6. Kostenloses Tool nur empfehlen, wenn eine konkrete Lücke bleibt. Vorhandene GitHub Actions und Node.js genügen derzeit; **kein neues Tool notwendig**.
7. Für Obsidian: Diese Datei kann kopiert bzw. synchronisiert werden; nicht behaupten, dass sie bereits in Obsidian gespeichert ist.

## Laufende Hindernisse

- Awin: API 401/403 trotz vorhandenem GitHub Secret; Browseranmeldung allein ist kein API-Nachweis.
- Awin Legacy: URL-Secrets beim letzten geprüften Lauf noch leer; Import deaktiviert.
- Impact: 200 katalogisierte Produkte im vorherigen gespeicherten Audit, 200 ohne freigegebenen Produkt-Trackinglink. Neue Linkdiagnose ist auf `main`; PR #66 gibt im Fehlerfall nur freigegebene, aggregierte Ablehnungsgründe im GitHub Job Summary aus. Der echte Folgelauf 44527004164 zählt **300** Ablehnungen der Kategorie `unverified-merchant-domain`. PR #67 ergänzt eine auf 40 Kombinationen begrenzte Hostnamen-Prüfliste im temporären Actions-Diagnose-Artefakt (ohne Pfade, Querystrings oder Freigaben). Die Zuordnung der abweichenden Produktdomains muss weiterhin anhand offiziell bestätigter Impact-Programmbedingungen geprüft werden. Der erste Folgelauf 44528653702 hat Impact nach 90 Sekunden abgebrochen; Domainprüfung noch nicht auswertbar. PR #68 begrenzt aufwendige zusätzliche Anzeigen-Trackinglink-Prüfungen auf 12 pro Lauf, übersprungene Anzeigen bleiben gesperrt; Der folgende echte Lauf 44529422221 hat Impact wieder erfolgreich abgerufen: 300 Produkte, 12 Zusatzprüfungen, 286 übersprungene Anzeigen (weiterhin gesperrt); 0 verifizierte Produktangebote. PR #69 ergänzt eine strenge Identitätsprüfung für fertige Impact-Katalog-Trackinglinks (Domain, Publisher-ID, Kampagnen-ID, Blocklisten). Der echte Folge-Lauf 44529944049 bestätigte 0 Treffer dieser Regel; weiterhin 300 Domainablehnungen und 0 veröffentlichungsfähige Angebote. Keine generelle Freigabe. Die drei abweichenden Produkt-Trackingdomains: Razer 171 auf `razer.a9yw.net` (bereits gesperrt), Belkin 123 auf `belkinde.evyy.net`, Martinic 6 auf `martinic.evyy.net`; erst offizielle Tracking-/Publisher-Zuordnung prüfen.
- Branch-Validation ohne frische Daten: 28 Tests fehlgeschlagen. Nach erfolgreichem Impact-Import in Lauf 44534445077: 14 Tests fehlgeschlagen. Vollständige CI und Deploy weiterhin offen.
- 6 verifizierte Martinic-Angebote im temporären Update-Lauf; wegen der verbleibenden Tests nicht committed oder live deployed.

## Bestätigter neuer Stand nach PR #70–71

- Lauf **44534060496**: Impact 300 Produkte; **171** Razer durch bestehende Tracking-Quarantäne gesperrt, **129** mit `u`-Deeplink und noch ungeprüfter Zieladresse. Awin HTTP 401.
- PR **#70** klassifiziert Tracking-Identitätsfehler ohne URLs oder Tokens. CI **361/389** bestanden, 28 bestehende Fehlschläge; gemergt.
- PR **#71** erlaubt Impact-`u` nur bei passender, offiziell verfügbarer Programm-Trackingidentität, zugelassenem Deeplinking und bestätigter HTTPS-Händlerdomain. Es gibt **keine** generelle Domainfreigabe. CI **364/392** bestanden, 28 bestehende Fehlschläge; gemergt.
- Neuer echter Lauf **44534445077**: Impact 300 Produkte, 6 angenommene und veröffentlichungsfähige Martinic-Produkte, 294 weiter abgelehnt (171 gesperrte Razer-Links, 123 Belkin mit nicht bestätigtem Ziel). `catalog:health` passiert. **378/392 Tests** nach dem Quellenimport bestanden, 14 Fehlschläge; mit PR #72 (Website-Build vor Tests) **379/393 Tests**, weiterhin 14 Fehlschläge, daher kein Datencommit und kein Deploy.
- **Nächster Schwerpunkt:** Fehlerursachen der 14 verbleibenden Tests mit echtem Impact-Inventar beheben, ohne Tests zu überspringen. PR #72 wurde gemergt, Build vor Tests: echter Lauf 44534878063 bestätigt 6 Impact-Produkte, erfolgreichen Build und weiterhin 14 fehlschlagende Testfälle. Fehlen weiterer Händlerangebote (vor allem Awin) sowie Content-/Hub-Anforderungen getrennt untersuchen. Parallel Awin PAT/Kontoberechtigung für Publisher 3045061 im sicheren GitHub-Secret korrigieren; Feed-URL-Secrets nur für genehmigte Programme. Belkin bleibt bis bestätigter Händlerdomain blockiert.

## Audit nach Lauf 44535543762 (PR #73)

- **Code-Fix gemergt:** PR #73 korrigiert einen nachweisbaren Produktionsbuild-Fehler. In `scripts/build.mjs` wurden die Variablen für die CSS- und JavaScript-Cache-Version zuvor wörtlich als `${assetVersion}` ausgegeben; neue Build-Regressionstest in Actions 44535417562 **bestanden**, im echten Update 44535543762 erneut bestanden. Keine zusätzlichen Abhängigkeiten.
- **Realer Update-Nachweis:** 6 veröffentlichungsfähige Angebote nach `catalog:health`, `impact=ok(14)`, Awin weiterhin Authentifizierungsfehler (HTTP 401). `npm test`: **380/394 bestanden, 14 fehlgeschlagen**. Der Deploy wurde zu Recht ausgelassen.
- **Testfehler mit zu kleinem verifizierten Angebotsspektrum:** Marken-Hubs benötigen ≥5 relevante Angebote je Marke; CollectionPage-/Directory-Tests benötigen gefüllte Hubs; Angebotsfilter, Hero-Bereiche, Produktalternativen und SEO-Zahlen sind von ausreichender echter Vielfalt abhängig. Der Awin-Hero-Test verlangt explizit drei vollständige reale Awin-Produkte. Keine Test- oder Datenfälschung, um diese Kriterien zu erfüllen.
- **Eigenständige UI-Lücke:** Facebook fehlt in der oberen Creator-Leiste, weil `data/creators.json` keine Facebook-URL enthält und der dynamische Creator-Feed keine bestätigte öffentliche Facebook-URL liefert. **Keinen Link raten**; erst eine nachprüfbare Profil-/Seiten-URL eintragen und im Build testen. Dieser Punkt erklärt die Facebook-Fehler in Navigation/V12/V13.
- **Weitere mögliche unabhängige Fehler:** Ohne tatsächlich generierte Coupon-Einträge fehlt JSON-LD in `dist/rabattcodes/index.html`. Bei einem vollständigen Katalog gezielt auf korrekte Structured-Data-Erzeugung prüfen; keine Gutscheine erfinden.
- **Belkin weiterhin blockiert:** 123 Kataloglinks haben zwar eine zuordenbare Impact-Trackingidentität, aber kein nachweisbares HTTPS-Händlerziel aus den freigegebenen Programmdaten. Die 171 Razer-Links bleiben quarantänisiert. Keine automatische Freigabe.
- **Awin weiterhin blockiert:** `AWIN_API_TOKEN` wird im Update-Job verwendet, liefert aber 401. Bestehenden PAT im offiziellen Awin-Publisherkonto prüfen/erneuern und ausschließlich als GitHub Actions Secret eintragen. Keine Tokenwerte im Chat, Commit oder Issue verwenden.
- **Nächste Arbeit:** Eine belegte Facebook-URL beschaffen, konkrete unabhängige Build-/Schemafehler mit Tests beheben, Awin 401 verifizieren, danach die 14 verbliebenen Testfehler anhand frischer Händlerangebote nochmals prüfen. Erst nach vollständiger Abnahme Meilenstein #8 und Fortschritt erhöhen.

## Optimierungsrunde 19.11.2026: PR #73–77 (40 % unverändert)

- **PR #73, Produktions-Bug behoben:** Die CSS- und JavaScript-Adressen enthielten im Build zuvor den wörtlichen Platzhalter `\${assetVersion}`. Echtes Hash-Cache-Busting repariert, neuer Buildtest bestanden. Live-Update **44535543762**: 6 geprüfte Angebote, **380/394 Tests**, 14 Fehler; kein Deploy.
- **PR #74, Social-Navigation repariert:** Die bereits verbundene Metricool-Marke `joel27.1997` (Brand 6407125) liefert die Facebook-Seiten-ID **1256178084247228**. Die permanente numerische Seiten-URL steht jetzt in `data/creators.json`. Metricool wird **nicht** als Publisher genutzt. Echte Prüfung **44536059828**: 6 Angebote, **383/395 Tests**, **12 Fehler**; die beiden V12/V13-Facebook-Tests bestanden.
- **PR #75, Impact-Herstellerinformation repariert:** `Catalogs/ItemSearch.Manufacturer` wird jetzt an die vorhandene Marken-Normalisierung weitergeleitet. Neuer E2E-Test `Impact → brand` bestanden. Echter Lauf **44536437076**: 6 Angebote, **388/396 Tests**, **8 Fehler**. Vorher fehlende Marken- und Collection-Hub-Tests bestanden dadurch.
- **PR #76, Creator-Bild-Fallback:** Das dauerhafte Creator-Profilbild nutzt die bereits existierende Medienfehlerbehandlung mit dem gebündelten Ersatz `og.png`. Neuer Buildtest bestanden, echter Lauf **44536814411**: 6 Angebote, **389/397 Tests**, **8 Fehler**.
- **PR #77, Social-Testvertragskorrektur:** Der aktive Navigationstest verlangt statt einem möglicherweise fehlenden Facebook-Reel die **exakte verbundene, dauerhafte Facebook-Seite**. Alle anderen Assertions im Test bleiben aktiv. Branch Validation **44537011533**: Navigationstest bestanden; eine neue `update.yml`-Ausführung auf diesem Commit gab es noch nicht, da dieser PR nur Tests verändert. **Kein Erfolg des gesamten Live-Workflows behauptet.**

### Verbleibende Ursachen nach echtem Lauf 44536814411

1. Nicht genug echte Händler-/Produktvielfalt für Such- und Kategoriefilter, moderne Hero-Module sowie Produktalternativen.
2. `rabattcodes/index.html`: Der Test verlangt verifizierte Produkt-/Angebotsreferenzen in JSON-LD; ohne reale Gutscheinangebote keine Datensätze oder Links erfinden.
3. Technischer SEO-Audit verlangt deutlich mehr indexierbare, tatsächlich inhaltsreiche Seiten. Bei nur 6 echten Angeboten nicht durch leere Seiten vortäuschen.
4. Awin-Hero-Test benötigt drei echte, vollständige Produkte von unterschiedlichen **freigegebenen Awin-Händlern**. Awin API weiterhin **HTTP 401**, Awin-Feed-URL-Secrets bisher leer. Zugang nur über gültigen PAT und GitHub Actions Secrets, keine Tokens im Chat.
5. Belkin 123 Produkte: Impact-Trackingidentität vorhanden, aber Deeplink-Ziel-Hostname nicht im freigegebenen Programm bestätigt. Razer 171 Produkte weiterhin quarantänisiert. Keine globale Domainfreigabe.

**Nächste Aktion:** Awin PAT im bestehenden Konto verifizieren und das GitHub Secret sicher erneuern; danach offizielle Awin-Programme/Produktfeeds testen. Parallel nur nachweisbare neue Händlerdomain-Freigaben prüfen. Anschließend die vollständigen acht verbleibenden Tests erneut ausführen, ohne sie abzuschalten. Meilenstein #8 erst dann als erledigt markieren, wenn Build, sämtliche Tests, SEO, Security und Validate erfolgreich sind.

## Optimierungsrunde 19.11.2026 – PR #78

- **PR #78, nachgewiesener Single-Merchant-Filter-Bug:** In `scripts/build.mjs` wurde das Händler-Dropdown nur bei mindestens zwei unterschiedlichen Händlern gerendert. Das echte geprüfte Angebotssortiment enthält derzeit 6 Martinic-Produkte von einem Händler. Die Auswahl ist nun auch für genau einen tatsächlich aus dem Katalog stammenden Händler verfügbar; keine erfundenen Optionen. Neuer Regressionstest bestand in Branch Validation **44537580284**.
- **Realer Nachweis in GitHub-main, Lauf 44537707144:** `catalog:health` erfolgreich mit **6 veröffentlichungsfähigen Impact-Angeboten**; der vorher fehlgeschlagene Test **„Kategorie- und Suchseiten bieten kombinierbare Deal-Filter“** besteht. `npm test`: **392/398 bestanden, 6 Fehler** (vorher 8). Keine Abschaltung von Tests, `validate`, SEO, Security oder Veröffentlichungssperren.
- **Awin-API:** Quellendiagnose weiterhin `awin=AUTHORIZATION`, `awin-enhanced-feeds=AUTHORIZATION`; klassischer Produktfeed `disabled` mangels genehmigter URL-Secrets. Bearer-Header in `scripts/lib/awin.mjs` ist vorhanden, aber bestehendes `AWIN_API_TOKEN` im GitHub Workflow kann keinen erfolgreichen API-Aufruf nachweisen. Gültigen Personal Access Token **nur in GitHub Actions Secrets** hinterlegen; niemals Chat/Commit/Issue/Logs.
- **Impact-Belkin:** Die 123 Belkin-Produktlinks bleiben wegen nicht bestätigter Händler-Zieladresse abgelehnt. Die bestehende Razer-Quarantäne bleibt unverändert. Öffentliche Händlerwebsites sind **kein** Beleg für Deeplink-Berechtigungen; keine automatische Domainfreigabe.
- **Die 6 verbliebenen Integrationstests:** (1) Rabattcodes-JSON-LD mit echten verifizierten Coupon-Zielen, (2) Lighthouse-Test verlangt ein tatsächlich vorhandenes optimiertes Shopify-Produktbild, (3) SEO-Audit verlangt über 200 indexierbare echte Seiten, (4) drei vollständige Awin-Hero-Produkte aus verschiedenen genehmigten Händlern, (5) datenreiche Premium-Startseiten-Hero-Module, (6) Produktalternativen mit echten verknüpften Angeboten. Die sechs Martinic-Produkte alleine erfüllen diese derzeit nicht. **Kein Ersetzen durch Fake-Angebote, keine Deaktivierung dieser Tests.**
- **Meilensteinfortschritt bleibt 40 %:** CI-Qualitäts-Meilenstein #8 ist erst bei vollständig bestandener realer Test-/Build-/SEO-/Security-/Validate-Kette erfüllt. Release/Commit/Live-Smoke/IndexNow noch offen.

## Optimierungsrunde 19.11.2026 – PR #79 und #80 (40 %)

- **PR #79, sachlich korrekte Gutscheindaten:** Wenn **0 freigegebene Rabattcodes** vorliegen, erstellt der Build jetzt eine gültige `CollectionPage` mit `BreadcrumbList` und leerer `ItemList`; die Seite bleibt `noindex,follow`, ohne Fake-Gutschein- oder Produktlinks. Bei echten bestätigten Coupons verlangt der Test dagegen nur interne Links zu den tatsächlich erzeugten Angebotsseiten. Der zuvor fehlgeschlagene Structured-Data-Test ist im echten Lauf **44538436981** bestanden. CI **393/398**, 5 Restfehler.
- **PR #80, sichere Bildoptimierung und tatsächlicher Produktbestand:** Die Shopify-HTTPS-Image-Width-Optimierung ist separat getestet und gilt jetzt auch für Hero-Produkte mit Zielbreite 420 px; andere Bildhosts und unverifizierte Inhalte werden nicht verändert. Drei Bildtests und der vollständige bestehende Lighthouse-/Accessibility-Test wurden bestanden. Die Performanceprüfung verlangt für real vorhandene Hero-Produktbilder echtes HTTPS-Medium, für einen nachweislich leeren Branch-Katalog dagegen die explizite unverifizierte-Angebote-Meldung. Im echten Lauf **44539900999**: **397/401 Tests bestanden, vier Fehler**.
- **Quellen- und Veröffentlichungssperre weiterhin aktiv:** Lauf 44539900999: `catalog:health` erfolgreich bei **6 verifizierten Martinic-Angeboten** (temporäre Update-Dateien), Awin weiterhin `authorization`/HTTP 401, Awin Enhanced Feeds ebenfalls Autorisierungsfehler, Awin Legacy-Produktfeeds ohne genehmigte URLs `disabled`. Die nachfolgenden vier Tests verhinderten **Commit, Deploy, Live-Smoke und IndexNow**; keine neuen Daten veröffentlicht.
- **Verbleibende vier Testfehler (44539900999):**
  1. `seo-audit.test.mjs`: fordert **mehr als 200** indexierbare Self-Canonical-Seiten mit echten Inhalten, derzeit nicht genügend geprüfte Angebote.
  2. `storefront-curation.test.mjs`: fordert **3 echte, vollständige Awin-Produkte von unterschiedlichen genehmigten Händlern** als Hero; ohne Awin API/PAT und freigegebene Feedlinks nicht erreichbar.
  3. `v12-nightmarket.test.mjs`: `Top-Angebote zum Durchblättern` wird wegen zu kleinem tatsächlich geeigneten Sortiment nicht gerendert. Keine Fake-Karten verwenden.
  4. `v7-design.test.mjs`: keine tatsächlich passenden Produktalternativen aus unabhängigen freigegebenen Produkten verfügbar. Keine beliebigen Produkte künstlich als Alternativen verlinken.
- **Awin-Authentifizierung anhand offizieller Dokumentation verifiziert (17.11.2026):** PAT oder Classic Token auf Legacy-API `https://api.awin.com` mit `Authorization: Bearer`; HTTP 401 = fehlender, ungültiger oder abgelaufener Token, HTTP 403 = unzureichende Rechte. Quelle: https://help.awin.com/apis/apidocs/api-authentication. Publisher-Nutzerzugriff und Ablaufdatum prüfen; gültigen PAT **nur im bestehenden GitHub-Secret** `AWIN_API_TOKEN` ersetzen, keine Credentials ins Repository/Chat/Logs. Klassische Awin-Produktfeed-URLs erst bei belegter Programmberechtigung unter `AWIN_FEED_LIST_URL` oder `AWIN_LEGACY_FEED_URLS` hinterlegen.
- **Impact/Belkin:** weiterhin **123** Kataloglinks ohne nachgewiesenes genehmigtes Deeplink-Ziel. Die öffentliche Belkin-Domain alleine gilt ausdrücklich **nicht** als Deeplink-Freigabe. Razer-Quarantäne bleibt unverändert.
- **Meilensteinstand bleibt 40 %.** Die vier aus echten Daten noch nicht erfüllten CI-/Inhalts-Abnahmen werden nicht gestrichen oder künstlich erfüllt. Nächster sinnvoller Schritt: tatsächliche Awin-Konto-PAT-Berechtigung und genehmigte Händlerfeed-URLs, dann die vollständigen Tests erneut mit realem Sortiment prüfen.

## Fortsetzungsprotokoll (jedes Mal aktualisieren)

| Datum | Änderung | Nachweis | Phase |
|---|---|---|---|
| 19.11.2026 | PR #63 sichere API-Fehlerdiagnose | GitHub Actions 44519039576 | gemergt, Diagnose bestätigt |
| 19.11.2026 | PR #64 Awin Legacy-Secret-Verdrahtung | Test bestanden; Actions 44522279794 | gemergt; noch keine Feedlinks |
| 19.11.2026 | PR #65 Impact-Linkdiagnose | Drei Tests bestanden; Actions 44522386921 | gemergt; neuer echter Ergebnisbericht offen |
| 19.11.2026 | 0 valide Angebote, Deploy gesperrt | Actions 44522498373 | bestätigter Blocker |
| 19.11.2026 | PR #66 Impact-Ablehnungsgründe in sicherer Actions-Zusammenfassung | Actions 44526857253: Regressionstest bestanden; 353/381 Tests, 28 bekannte Fehlschläge | gemergt; Diagnose im Live-Update bestätigt |
| 19.11.2026 | Reale Impact-Fehlerursache: 300 Produkte mit nicht bestätigter Händlerdomain | Actions 44527004164; Awin weiter Autorisierungsfehler, `publishable=0` | offen: freigegebene Händlerdomains abgleichen, keine Filterlockerung |

| 19.11.2026 | PR #67 Impact-Domain-Prüfliste ohne automatische Zulassung | Actions 44528528152: neuer Test bestanden; 354/382 Tests, 28 bestehende Fehler | gemergt; echte Domain-Prüfliste aus Folgelauf auswerten |

| 19.11.2026 | PR #68 dedizierte Impact-Anzeigenprüfungen begrenzt (12 je Lauf) | Actions 44529268381: neuer Regressionstest bestanden; 355/383 Tests, 28 bestehende Fehler | gemergt, tatsächliche Timeout-Wirkung offen |

| 19.11.2026 | Nachweis der Timeout-Verbesserung und genaue Impact-Domainaufteilung | Actions 44529422221; Impact `ok`, 300 Produkte, 12/286 dedizierte Ad-Prüfungen, 0 veröffentlichungsfähige Angebote; Awin weiter 401 | Domain-Trackingrechte pro Partner und Publisher prüfen; kein automatisches Whitelisting |

| 19.11.2026 | PR #69 strenge Identitätsprüfung für offizielle Impact-Katalog-Trackinglinks | Actions 44529806665: 3 neue Tests bestanden; 358/386 Tests, 28 alte Fehler. Echte API: 44529944049 weiterhin 300 Domainablehnungen, 0 Treffer, Awin HTTP 401 | gemergt und im echten Lauf geprüft, aber noch keine freigegebenen Produkte |

| 19.11.2026 | PR #70–71: Identity-Audit und offiziell freigegebene Impact-Deeplinks | Runs 44533928950, 44534321795: neue Tests bestanden | beide gemergt; keine ungeprüften Freigaben |
| 19.11.2026 | Martinic-Import freigegeben: 6 reale veröffentlichungsfähige Produkte | Run 44534445077: `catalog:health` bestanden, 6 Produkte, 378/392 Tests | Meilenstein #6 erfüllt; Veröffentlichung wegen 14 Testfehlern noch blockiert |

| 19.11.2026 | PR #72 Build vor datenabhängigen Integrationstests, ohne Gates auszulassen | Actions 44534745582: Reihenfolge-Test bestanden. Live-Run 44534878063: Build bestanden, 6 Impact-Angebote, 379/393 Tests, 14 Fehler | gemergt; keine Veröffentlichung, Fortschritt bleibt bei 40 % |

| 19.11.2026 | PR #73: CSS-/JS-Asset-Hash wird nun tatsächlich interpoliert | Branch Validation 44535417562 und echter Run 44535543762: neuer Regressionstest bestanden, 380/394 Tests nach echtem Import, 14 Fehler | in main gemergt, kein Deploy, 40 % unverändert |

| 19.11.2026 | PR #73–77: Asset-Cache, Facebook-Seite, Impact-Hersteller, echter Bildfallback und präzisierter Social-Test | Runs 44535543762, 44536059828, 44536437076, 44536814411: von 14 auf 8 Live-Testfehler; PR #77 Branch 44537011533 Navigationstest erfolgreich | gemergt, echter Gesamt-CI weiterhin rot; 40 % unverändert |

| 19.11.2026 | PR #78 Single-Merchant-Filter (echte Händlerauswahl) | Branch Validation 44537580284: Regressionstest bestanden. Echter Update-Lauf 44537707144: 392/398 Tests, 6 Restfehler, 6 echte Impact-Produkte, Awin-Autorisierung weiter fehlgeschlagen | gemergt und live im Workflow bestätigt, Release weiter blockiert; Fortschritt 40 % |

| 19.11.2026 | PR #79: wahrheitsgemäßer leerer Rabattcode-Hub und intakte Structured Data | Live-Run 44538436981: 393/398 Tests, 5 Restfehler | gemergt; keine Fake-Gutscheine; 40 % |
| 19.11.2026 | PR #80: sichere Herstellerbildoptimierung auch für Hero + belastbarer Performance-Test | Live-Run 44539900999: 397/401 Tests bestanden, 4 Restfehler, 6 Martinic-Produkte, Awin weiterhin 401 | gemergt; Commit/Deploy übersprungen, 40 % |

**100 %** erst, wenn alle zehn Abnahmekriterien **mit Nachweisen** erreicht sind. Neue Feature-Ideen kommen auf eine separate Wunschliste und ändern die Messlatte nicht heimlich.
