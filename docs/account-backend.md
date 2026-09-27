# Angebotslotse Accounts, Alerts und Newsletter

## Ziel

Der Angebotslotse bleibt Vermittler: Käufe und Zahlungen finden beim Händler statt. Das Konto speichert nur Komfortfunktionen wie Merkliste, Wunschpreise, Such-/Marken-/Kategorie-Alarme und Benachrichtigungseinstellungen.

Die Backend-Schnittstellen sollen später unverändert von Website, PWA und nativen Apps genutzt werden können.

## Authentifizierung

Geplant:
- Google Login als primärer Social Login.
- Optional Magic Link / E-Mail Login.
- Keine eigenen Passwörter im Angebotslotse-Datenmodell.
- Supabase Auth verwaltet Identitäten und Sitzungen.
- App-spezifische Rollen oder Rechte dürfen nicht aus editierbaren user_metadata-Feldern abgeleitet werden.

## Öffentliche, nutzereigene Daten

Die folgenden Tabellen liegen in public, sind aber ausschließlich für authenticated freigegeben und per Row Level Security auf auth.uid() begrenzt:

- user_profiles
- saved_offers
- alert_subscriptions
- notification_preferences

Der Browser erhält nur den Supabase Publishable Key. Jeder Zugriff muss zusätzlich durch RLS autorisiert werden.

## Private Serverdaten

Diese Tabellen liegen im Schema private und werden nicht für die Browser-Data-API freigegeben:

- newsletter_consents
- push_subscriptions
- notification_outbox
- notification_events

E-Mail-Adressen für Newsletter werden nicht in öffentlich lesbaren Profil- oder Merkliste-Tabellen gespeichert.

## Preis- und Produktalarme

Ein Nutzer kann später z. B. speichern:
- Produkt unter 499 EUR
- mindestens 25 % Rabatt
- wieder verfügbar
- neue Angebote in einer Kategorie
- neue Angebote einer Marke
- neue Angebote eines Händlers
- neue Treffer für einen Suchbegriff

Der regelmäßige Angebots-Import erzeugt daraus nur dann einen Versandjob, wenn eine Regel neu erfüllt wurde. dedupe_key verhindert doppelte Benachrichtigungen für dasselbe Ereignis.

## Newsletter

Newsletter und Preisalarme werden getrennt behandelt.

Newsletter:
1. Nutzer fordert Newsletter an.
2. Server legt pending-Consent an.
3. Bestätigungslink wird versendet.
4. Erst nach Double-Opt-in wird status=confirmed gesetzt.
5. Abmeldung ist jederzeit möglich.

Preis-/Produktalarme sind kontobezogene Benachrichtigungen und werden über notification_preferences gesteuert.

## E-Mail-Versand

Vorgesehene Absender:
- alerts@angebotslotse-domain
- newsletter@angebotslotse-domain
- partner@angebotslotse-domain

Der Versandprovider wird serverseitig angebunden. API-Schlüssel dürfen niemals in public/ oder dist/ landen.

## App-Vorbereitung

Die Datenmodelle verwenden stabile IDs und keine browser-spezifischen Felder. Eine spätere App kann dieselben Auth-Sitzungen, Merkliste, Alarme und Benachrichtigungspräferenzen verwenden.

Web-Push-Endpunkte bleiben serverseitig/private. Native Push-Tokens können später über denselben Notification-Service ergänzt werden.

## Noch nicht aktiviert

Aktuell existiert noch kein verbundenes Supabase-Projekt. Deshalb werden Google Login, Cloud-Sync und echte E-Mail-/Push-Zustellung erst aktiviert, sobald Projekt, OAuth-Konfiguration und Versanddomain vorhanden sind.
