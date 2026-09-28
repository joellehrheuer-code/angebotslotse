# Social-Media-Verteiler → Angebotslotse

## Zweck

Der Angebotslotse kann öffentliche Creator-Inhalte aus dem Social-Media-Verteiler übernehmen, ohne Instagram, TikTok, YouTube, Twitch oder andere Plattformen zu scrapen.

Der Verteiler veröffentlicht dafür eine öffentliche HTTPS-JSON-Datei. Im Angebotslotse wird deren URL als GitHub-Variable `CREATOR_SOCIAL_FEED_URL` hinterlegt.

Der ältere `CREATOR_VIDEO_FEED_URL` bleibt als kompatibler Fallback bestehen.

## Format

```json
{
  "version": 1,
  "updatedAt": "2026-09-27T18:30:00Z",
  "items": [
    {
      "id": "instagram-abc123",
      "type": "post",
      "platform": "Instagram",
      "title": "Neuer Beziehungs-Post",
      "summary": "Kurze öffentliche Beschreibung.",
      "publicUrl": "https://www.instagram.com/p/...",
      "thumbnailUrl": "https://...",
      "publishedAt": "2026-09-27T18:00:00Z"
    }
  ]
}
```

## Erlaubte Typen

- `video`
- `post`
- `stream`
- `music`
- `community`

## Regeln

- Nur bereits veröffentlichte öffentliche Inhalte.
- `publicUrl` muss öffentliches HTTPS ohne eingebettete Zugangsdaten sein.
- `thumbnailUrl` ist optional, muss bei Verwendung ebenfalls öffentliches HTTPS sein.
- Kein HTML, keine Scripts, keine Zugangstoken.
- IDs müssen innerhalb des Feeds eindeutig sein.
- Ungültige Einträge werden verworfen.
- Der Angebotslotse übernimmt maximal 24 Einträge pro Update.
- Videos werden zusätzlich in den bestehenden Video-Bereich gespiegelt.
- Wenn der neue Social-Feed nicht erreichbar ist, bleibt der letzte gültige Stand erhalten.
- Wenn kein Social-Feed konfiguriert ist, kann weiterhin der alte reine Video-Feed verwendet werden.

## Datenschutz

Der Feed darf keine Drafts, privaten Nachrichten, E-Mail-Adressen, Nutzerprofile, Analytics-Daten oder nicht öffentliche Plattformdaten enthalten. Er dient ausschließlich zur Cross-Promotion bereits öffentlicher Joel-/J0JOEL-Inhalte.
