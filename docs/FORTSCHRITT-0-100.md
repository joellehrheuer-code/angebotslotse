# 🛍️ Angebotslotse – Fortschrittslinie 0–100 %

**Stand:** 19.11.2026 · **Geltungsbereich:** Angebotslotse, nicht Discord/ShortSync · **Quelle:** GitHub `main` und Actions.

## Fortschritt

**30 % (3/10 eindeutig abgeschlossenen Meilensteinen)** – das ist der *Meilensteinfortschritt*, nicht die Zahl verfügbarer Angebote oder eine Garantie, dass 30 % der Arbeit erledigt sind. Pro Meilenstein werden 10 Punkte nur nach erfülltem Abnahmekriterium vergeben; Teilstände bringen noch keine Punkte. Der Nutzer kann die Gewichte später neu festlegen.

`[██████░░░░░░░░░░░░░░] 30 %`

**Produktionsbereitschaft: NICHT ERREICHT.** Letzter geprüfter Workflow: 44527004164, `catalog:health` stoppt bei 0 verifizierten Angeboten; Commit, Deploy, Smoke, IndexNow wurden übersprungen.

| # | Bereich | Fortschritt | Abnahmekriterium | Nächste Aktion |
|---|---|---|---|---|
| 1 | GitHub-Grundgerüst | ✅ 10/10 | Repository, bestehende Actions und bestehende Pages-Deploykette überprüft | Bei Änderungen weiterhin `main` und PR verwenden |
| 2 | Sicherheitsregeln | ✅ 10/10 | `catalog:health` blockiert ungültige/leere Veröffentlichung; Secrets nicht im Code; Schutztest vorhanden | Niemals umgehen |
| 3 | Fehlerdiagnose | ✅ 10/10 | Awin-Autorisierungsdiagnose (PR #63) und Impact-Link-Ablehnungsdiagnose (PR #65) im Hauptbranch; gezielte Tests bestanden | Nächste echte Quellenberichte auswerten |
| 4 | Awin-API | ⬜ 0/10 | GitHub Actions kann authentifiziert freigegebene DE-Programme und Angebote abfragen, ohne 401/403 | gültigen PAT sicher ins Secret `AWIN_API_TOKEN` eintragen; Live-Lauf prüfen |
| 5 | Awin-Produktfeeds | ⬜ 0/10 | genehmigte Händlerfeeds mit echten Preisen, Bildern und Trackinglinks importiert und geprüft | `AWIN_FEED_LIST_URL` bzw. `AWIN_LEGACY_FEED_URLS` in Actions Secrets einrichten; PR #64 bereits gemergt |
| 6 | Impact-Verwertung | ⬜ 0/10 | Mindestens ein reales, freigegebenes Impact-Produkt erfolgreich normalisiert und verifiziert | `sources.impact.audit.productDiagnostics.linkFailureReasons` im nächsten Lauf auswerten; Partner-Deeplinkrechte prüfen |
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
- Impact: 200 katalogisierte Produkte im vorherigen gespeicherten Audit, 200 ohne freigegebenen Produkt-Trackinglink. Neue Linkdiagnose ist auf `main`; PR #66 gibt im Fehlerfall nur freigegebene, aggregierte Ablehnungsgründe im GitHub Job Summary aus. Der echte Folgelauf 44527004164 zählt **300** Ablehnungen der Kategorie `unverified-merchant-domain`. PR #67 ergänzt eine auf 40 Kombinationen begrenzte Hostnamen-Prüfliste im temporären Actions-Diagnose-Artefakt (ohne Pfade, Querystrings oder Freigaben). Die Zuordnung der abweichenden Produktdomains muss weiterhin anhand offiziell bestätigter Impact-Programmbedingungen geprüft werden. Der erste Folgelauf 44528653702 hat Impact nach 90 Sekunden abgebrochen; Domainprüfung noch nicht auswertbar. PR #68 begrenzt aufwendige zusätzliche Anzeigen-Trackinglink-Prüfungen auf 12 pro Lauf, übersprungene Anzeigen bleiben gesperrt; Erfolg im nächsten echten Lauf ist erst zu bestätigen.
- 28 bestehende Tests im Branch-Validation-Lauf fehlgeschlagen. Drei neue Impact-Diagnosetests bestanden.
- 0 veröffentlichungsfähige Angebote; aktuelle Website-Veröffentlichung nach neuester Änderung nicht bestätigt.

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

**100 %** erst, wenn alle zehn Abnahmekriterien **mit Nachweisen** erreicht sind. Neue Feature-Ideen kommen auf eine separate Wunschliste und ändern die Messlatte nicht heimlich.
