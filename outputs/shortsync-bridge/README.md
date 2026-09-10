# ShortSync Bridge

Private Node.js-24-REST-API ausschließlich für Video-Publishing über ShortSync auf Instagram, TikTok, YouTube und Snapchat. Eigenständiges Projekt unter `outputs/shortsync-bridge`; keine Änderungen am Angebotslotse-Projekt erforderlich.

## Render: bestehender Service

- Branch: `main`
- Root Directory: `outputs/shortsync-bridge`
- Runtime: Node (Version über `.node-version` und `package.json`)
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/healthz`
- Render stellt `PORT` bereit; der Server nutzt es und bindet standardmäßig an `0.0.0.0`.
- Nur den bereits gewählten Free-Service verwenden, keine neuen Dienste oder kostenpflichtigen Upgrades nötig.

Für den ersten **Dry-Run** genügen `AUTH_TOKEN` (zufälliges Secret mit mindestens 32 Zeichen), `DRY_RUN=true` und für die optionalen echten Leseprüfungen `SHORTSYNC_API_KEY`. Es sind keine weiteren Environment Variables zwingend erforderlich. Ohne ShortSync-Key bleibt `/healthz` erfolgreich; ShortSync-Leseendpunkte antworten mit 503. `npm start` lädt keine `.env`-Datei; Secrets kommen ausschließlich aus `process.env`.

`GET /healthz` und der kompatible Alias `/health` sind öffentlich und geben `{ "status": "ok" }` zurück. Sie rufen weder ShortSync noch Upstash auf und bestätigen ausschließlich, dass der HTTP-Server läuft.

## Sicherheitsmodi

`DRY_RUN` ist standardmäßig **true**. In diesem Modus validiert `/publish` die Datei und die Plattformfelder, gibt eine Vorschau mit `dry_run: true`, `all_published: false` und Target-Status `dry_run` zurück und führt **keine ShortSync-Aufrufe** aus. Auch Drafts und geplante Posts werden nicht angelegt. Die ShortSync-Transportklasse blockiert Schreibzugriffe zusätzlich unabhängig vom Publisher.

Echtes Publishing ist nur bei **beiden** Einstellungen `DRY_RUN=false` und `LIVE_PUBLISH_ENABLED=true` möglich. Diese Kombination darf erst nach ausdrücklicher Freigabe eines Live-Tests gesetzt werden. Nicht erkannte boolesche Werte lassen den Start fehlschlagen.

Für späteren Live-Betrieb auf Render zusätzlich erforderlich:

| Environment Variable | Wert / Zweck |
|---|---|
| `JOURNAL_BACKEND` | `upstash` |
| `UPSTASH_REDIS_REST_URL` | HTTPS-REST-Endpoint der eigenen Upstash-Datenbank |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash-Schreibtoken, als Secret speichern |
| `UPLOAD_ALLOWED_HOSTS` | Exakte öffentliche ShortSync-Storage-Hostnamen, mit Kommas getrennt; keine URL/Wildcard |
| `LIVE_PUBLISH_ENABLED` | Erst nach Freigabe `true`, zusammen mit `DRY_RUN=false` |

Der kostenlose Render-Dateispeicher ist flüchtig. Deshalb verweigert die Render-Konfiguration Live-Publishing ohne Upstash. Der kostenlose Upstash-Tarif dient nur für kleine Journal-/Upload-Metadaten, niemals Videos, Captions, API-Keys oder signierte Storage-URLs. **Eviction ausgeschaltet lassen; Journal-Einträge nicht löschen.** Fehlt der Speicher oder ist er nicht erreichbar, scheitert die Veröffentlichung geschlossen statt auf flüchtigen Speicher auszuweichen. Nach einer Archivierung die vorhandenen Daten wiederherstellen, keine leere Datenbank als Ersatz verwenden.

Stand der Prüfung am 10.09.2026: [Render Free](https://render.com/docs/free) schläft nach 15 Minuten ohne Nutzung ein und braucht beim Aufruf etwa eine Minute zum Start; 750 Instanzstunden pro Monat, flüchtige Disk. [Hobby](https://render.com/pricing) enthält 5 GB ausgehenden Traffic pro Monat. Kein bezahlter Tarif wird durch dieses Projekt aktiviert. [Upstash Free](https://upstash.com/pricing/redis) enthält 256 MB, 500.000 Befehle/Monat und 10 GB Bandbreite. Ohne Kreditkarte/Upgrade bleiben Free-Grenzen bestehen. Upstash kann kostenlose inaktive Datenbanken [archivieren](https://upstash.com/docs/redis/help/faq); Limits oder Archivierung können weitere Veröffentlichungen blockieren. Kein Uptime-SLA. Der PC wird im Render-Betrieb nicht benötigt.

## Lokal starten und testen

```powershell
npm install
npm test
npm run check
```

Für lokale Entwicklung kann `.env.example` nach `.env` kopiert und nur lokal befüllt werden. `.env` niemals committen. Expliziter lokaler Start mit diesen Werten:

```powershell
node --env-file=.env src/server.mjs
```

`npm start` verwendet ausschließlich bereits gesetzte Environment Variables. Einen AUTH_TOKEN lokal beispielsweise mit `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` erzeugen. Keine realen Secrets in Quelltext, Repository, Frontend, Chat oder Logs kopieren.

Read-only-Client:

```powershell
node --env-file=.env src/client.mjs health
node --env-file=.env src/client.mjs status
node --env-file=.env src/client.mjs connections
```

Optional `BRIDGE_URL=https://DEIN-SERVICE.onrender.com` setzen. `status` und `connections` lesen bei gesetztem ShortSync-Key echte Kontodaten, auch im Dry-Run. Sie veröffentlichen nichts. Die automatisierten Tests verwenden ausschließlich Mocks für externe Services.

## REST-Schnittstelle

Außer `/healthz` und `/health` benötigen alle Endpunkte `Authorization: Bearer <AUTH_TOKEN>`. Der ShortSync-Key ist niemals ein Client-Credential. Alle Browser-Origin-Anfragen werden abgelehnt; vorgesehen sind autorisierte Server-/Tool-Clients. Keine beliebigen Client-URLs werden abgerufen.

| Methode / Pfad | Verhalten |
|---|---|
| `GET /bridge/status` | Dry-Run-/Live-Status und Uploadlimit |
| `GET /shortsync/status` | Sichere Plan-/Quota-/Scopes-Projektion aus `/me` |
| `GET /shortsync/connections` | Paginierte Connections, nur platform/display_name/status |
| `POST /publish` | Video und Plattformfelder als Multipart; alternativ JSON mit vorbereitetem Upload-Token |
| `POST /uploads` | Multipart nur mit `video`; validiert und liefert einen kurzlebigen Upload-Token. Im Dry-Run kein ShortSync-Aufruf |
| `GET /requests/{idempotency_key}` | Gespeichertes Live-Ergebnis oder explizit unklarer/in Bearbeitung befindlicher Zustand |
| `GET /shortsync/posts/{post_id}` | Aktuellen Status eines einzelnen ShortSync-Posts lesen |

Für `/publish` ist `Idempotency-Key` zwingend: 16–128 Zeichen aus Buchstaben, Zahlen, `_`, `-`; UUID empfohlen. Für dieselbe logische Veröffentlichung bei einem Timeout **denselben Key und Inhalt** wiederverwenden.

### Multipart `/publish`

Erforderlich: `video` (MP4 mit `video/mp4`, MOV mit `video/quicktime`) und `platforms` als JSON-Array-Text, etwa `["instagram","tiktok","youtube","snapchat"]`.

| Feld | Bedeutung |
|---|---|
| `publish_mode` | `immediate` (Standard), `scheduled` oder `draft` |
| `scheduled_for` | Nur für `scheduled`: zukünftiger ISO-8601-Zeitpunkt mit Zeitzone |
| `instagram_caption`, `tiktok_caption` | Je maximal 2200 Zeichen |
| `youtube_title` | Für YouTube erforderlich, maximal 100 Zeichen |
| `youtube_description` | Maximal 5000 Zeichen |
| `snapchat_caption` | Maximal 160 Zeichen |
| `first_comment` | Maximal 2200 Zeichen, nur Instagram/YouTube |
| `youtube_notify_subscribers` | Text `true`/`false`, Standard `false` |
| `tiktok_privacy_level` | Standard `SELF_ONLY`; alternativ `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR` |
| `tiktok_post_mode` | `direct` oder `draft` (TikTok-Inbox, separat vom ShortSync-Modus) |
| `tiktok_disable_comment`, `tiktok_disable_duet`, `tiktok_disable_stitch` | Text `true`/`false`, Standard `false` |
| `tiktok_is_branded_content`, `tiktok_is_your_brand`, `tiktok_is_aigc` | Text `true`/`false`, Standard `false`; passend zum Inhalt setzen |

YouTube sendet `privacy_status=public`, `made_for_kids=false`. Instagram nutzt Reel-Publishing mit Feed-Freigabe. Snapchat erhält nur `connection_id` und `caption`, keine erfundenen Optionen. Es muss genau eine aktive Verbindung pro Plattform vorhanden sein; fehlende/mehrdeutige Verbindungen werden als Target-Fehler gemeldet. Verbindungen werden dynamisch aufgelöst, auch Snapchat.

### Upload-Token für spätere Tools/Adapter

1. Autorisierter Client überträgt die Bytes per Multipart an `/uploads`.
2. Antwort: `upload_token`, `dry_run`, `expires_at` (24 Stunden).
3. Derselbe Client ruft `/publish` mit JSON auf: `{ "upload_token": "...", "platforms": ["snapchat"], "snapchat_caption": "..." }`, mit Bearer-Token und Idempotency-Key. Plattform-Arrays werden in JSON nativ akzeptiert; boolesche Optionen bleiben Textwerte.

Dry-Run-Uploads dürfen nicht in Live-Modus umgewandelt werden. Bei einem Moduswechsel neu hochladen. Im Live-Modus speichert `/uploads` das Video schon bei ShortSync, erzeugt aber keinen Post. Ein Retry dieses Upload-Schritts kann eine zusätzliche ungenutzte Upload-Reservierung erzeugen; für Post-Retries denselben Upload-Token verwenden. Abgelaufene/unbekannte Tokens geben 410 zurück. Lokale Metadaten bleiben bis zur manuellen Bereinigung auf der privaten Disk, Upstash-Asset-Metadaten haben 24 Stunden TTL. Publishing-Journal-Einträge haben keine TTL.

ChatGPT kann später die Captions/Titel erzeugen und über einen Adapter diesen Vertrag verwenden. Ein nativer ChatGPT-Dateianhang wird hier noch nicht automatisch aufgelöst. MCP/OAuth und ein sicherer ChatGPT-Datei-Adapter sind nicht integriert; `openapi.json` ist der REST-Vertrag. Kein OpenAI-API-Key erforderlich und kein automatisches Schreiben aus einem gewöhnlichen Chat.

## Ergebnisse, Idempotenz und Grenzen

Im Live-Modus isoliert je ein Post-Aufruf pro Plattform auch eine Snapchat-HTTP-Ablehnung. `200` heißt alle Targets bereits `published`, `202` angenommen/geplant/in Bearbeitung, `207` mindestens ein Fehler oder unklarer Ausgang. **Im Dry-Run gibt 200 nur eine Simulation zurück**; immer `dry_run` und `all_published` prüfen. Einzelne Post-IDs und Target-Fehler auswerten, spätere asynchrone Fehler über den Post-Status prüfen. Dry-Run-Vorschauen werden nicht im Publishing-Journal gespeichert.

Exklusive Journal-Claims entstehen vor dem ersten Schreibzugriff auf ShortSync. Wiederholung mit geändertem Inhalt ergibt 409. Nach Absturz oder unklarem Ergebnis: erst in ShortSync abgleichen, niemals blind einen neuen Key generieren. Upstash nutzt atomare SET-NX-Claims und Compare-and-set-Abschluss. Lokales Journal schreibt atomare Dateien. Bei Datenverlust erlischt der lokale Duplikatschutz; persistente Daten erhalten und sichern. Der Schutz gilt für denselben Key, nicht für absichtlich neue Keys.

25 MiB Dateilimit und 64 KiB Multipart-Overhead, maximal ein Upload gleichzeitig. Extension/MIME/Container-Basisprüfung; keine vollständige Codec-/Dauerprüfung, keine Transkodierung. Alte MOV-Dateien ohne `ftyp` werden konservativ abgelehnt. Videos verbleiben nur im begrenzten RAM, keine temporären Videodateien. Für 512 MiB RAM ausgelegt. Globale Rate-Limit-Vorgabe: 20 private API-Anfragen/Minute, unabhängig von manipulierbaren Proxy-Headern. Healthchecks bleiben erreichbar. Ein einzelner Serverprozess vorgesehen.

Signierte Upload-Header bleiben unverändert; MIME-Konflikte oder gefährliche Header führen zum Abbruch. Storage-Ziele nur aus der vom Betreiber bestätigten Hostallowlist, ausschließlich HTTPS und ohne Redirects. Keine Keys/Headers/Upstream-Rohfehler in Responses oder Logs. Öffentlicher Verkehr nur über Render-HTTPS oder einen TLS-Proxy; Port 3000 nicht direkt ins Internet stellen.

## Projektdateien

- `src/app.mjs`: Authentifizierung, HTTP, Limits, Upload-Endpunkte.
- `src/publisher.mjs`: gemeinsamer Dry-Run-/Live-Ablauf, Upload-Token und Ergebnisse.
- `src/journal.mjs`, `src/upstash.mjs`: lokales bzw. persistentes externes Journal.
- `src/shortsync.mjs`: fester API-Client und zusätzliche Dry-Run-Schreibsperre.
- `src/validation.mjs`: Video-/Content-Validierung.
- `src/config.mjs`, `src/server.mjs`: Environment-Konfiguration und Render-Start.
- `src/client.mjs`, `src/errors.mjs`: Read-only-Client und Fehlercodes.
- `test/`: HTTP-/Mock-/Konfigurations-Tests; keine echten Veröffentlichungen.
- Docker/Compose/Caddy-Dateien sind optionale Self-Hosting-Beispiele und werden vom Node-Render-Service nicht benötigt.

`TEST-RESULTS.md` dokumentiert den geprüften Stand. Root-Dateien/Workflows anderer Projekte werden nicht benötigt. Ein Bridge-Push kann mit `[skip actions]` erfolgen, um einen vorhandenen fremden GitHub-Pages-Deployment-Workflow nicht auszulösen; dies verändert dessen Konfiguration nicht.
