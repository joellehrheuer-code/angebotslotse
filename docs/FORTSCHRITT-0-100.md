# 🛍️ Angebotslotse – Fortschrittslinie 0–100 %

**Stand:** 19.11.2026 · **Geltungsbereich:** Angebotslotse, nicht Discord/ShortSync · **Quelle:** GitHub `main` und Actions.

## Fortschritt

**40 % (4/10 eindeutig abgeschlossenen Meilensteinen)** – das ist der *Meilensteinfortschritt*, nicht die Zahl verfügbarer Angebote oder eine Garantie, dass 30 % der Arbeit erledigt sind. Pro Meilenstein werden 10 Punkte nur nach erfülltem Abnahmekriterium vergeben; Teilstände bringen noch keine Punkte. Der Nutzer kann die Gewichte später neu festlegen.

`[████████░░░░░░░░░░░░] 40 %`

**Produktionsbereitschaft: NICHT ERREICHT.** Letzter geprüfter Workflow: 44534878063. Erstmals **6 verifizierte, veröffentlichungsfähige Impact-Angebote** (Martinic) und `catalog:health` erfolgreich. Die nachfolgenden 393 Tests enden jedoch mit **14 Fehlern**, deshalb wurden Commit, Deploy, Smoke und IndexNow übersprungen. Website-Release ist **nicht** bestätigt.

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

**100 %** erst, wenn alle zehn Abnahmekriterien **mit Nachweisen** erreicht sind. Neue Feature-Ideen kommen auf eine separate Wunschliste und ändern die Messlatte nicht heimlich.
