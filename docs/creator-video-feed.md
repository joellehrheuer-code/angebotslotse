# Öffentlicher Creator-Video-Feed

Angebotslotse liest für den Bereich **Neueste Videos von Joel** ausschließlich eine statische, öffentliche Referenz unter `data/creator-videos.json`. Der aktuelle Feed ist absichtlich leer; dadurch werden keine Videos erfunden oder vorzeitig veröffentlicht.

## Zulässiges Schema

Jeder Eintrag benötigt `id`, `title`, `publicUrl` und `platform`. `thumbnailUrl` ist optional und `publishedAt` darf leer sein. URLs müssen absolute HTTPS-URLs ohne Benutzername oder Passwort sein. Die Build-Pipeline sanitiziert und verwirft ungültige Einträge vor der Ausgabe.

## Sichere spätere Verbindung

Der separate Social-Media-Verteiler darf nach erfolgreicher Veröffentlichung ausschließlich bereinigte öffentliche Metadaten in dieses Format exportieren. Er darf keine Authentifizierungsdaten, OAuth- oder Refresh-Tokens, API-Keys, internen IDs, privaten API-URLs oder Rohdaten übertragen. GitHub Pages ruft keine private ShortSync-API auf; die Website erhält nur einen versionierten öffentlichen JSON-Export oder einen kontrollierten Read-only-Feed, der denselben Sanitizer durchläuft.

Ein möglicher Export lautet:

```json
{
  "version": 1,
  "source": "public-only",
  "updatedAt": "2026-09-16T00:00:00Z",
  "videos": [
    {
      "id": "public-video-id",
      "title": "Öffentlicher Videotitel",
      "thumbnailUrl": "https://cdn.example/video.jpg",
      "publicUrl": "https://www.youtube.com/watch?v=public-id",
      "platform": "YouTube",
      "publishedAt": "2026-09-15T18:00:00Z"
    }
  ]
}
```

Die beiden Repositories bleiben technisch und sicherheitstechnisch getrennt. Es gibt in Angebotslotse keine direkte Verbindung zu `shortsync-bridge` und keine Speicherung von Secrets im Frontend.
