# Sicherheitsrichtlinie für Angebotslotse

Angebotslotse ist ein öffentliches, unabhängig betriebenes deutsches Angebots-, Preisvergleichs- und Affiliate-Portal.

## Sicherheitsproblem vertraulich melden

Bitte **keine privaten Daten, Passwörter, API-Schlüssel oder reproduzierbaren Exploit-Details in öffentlichen GitHub-Issues** veröffentlichen.

Für vertrauliche Hinweise nutze die E-Mail-Adresse `joellehrheuer@gmail.com` mit dem Betreff **Angebotslotse – Sicherheitsmeldung**. Bitte nenne die betroffene Seite, eine sachliche Fehlerbeschreibung, Schritte zur schonenden Reproduktion und deine Kontaktmöglichkeit. Vermeide Tests an Daten anderer Personen oder eine hohe Anzahl automatischer Anfragen.

Sachliche Hinweise prüfen wir und dokumentieren nur die nicht sensiblen Korrekturen öffentlich. Eine garantierte Reaktionszeit wird für dieses private Projekt nicht zugesichert.

## Bestehende Kontrollen (Stand 10.10.2026)

- Übertragung der veröffentlichten GitHub-Pages-Seite sowie des Supabase-Backends über HTTPS.
- Supabase Auth für Benutzerkonten; serverseitige Prüfung der Moderatorenrolle.
- Supabase Row Level Security für öffentliche Tabellen, mit benutzerspezifischen Richtlinien für Kontodaten und bewusst verschlossenen Tabellen für serverseitige Einreichungen.
- Öffentliche Kontakt-, Newsletter- und Bewertungsformulare mit Eingabeprüfung, erzwungener maximaler Datenmenge, Honeypot und pro Anfragegruppe begrenztem Zugriff.
- Wiederholte anonyme Einsendungen werden per anwendungsseitiger, konfliktgeprüfter Rate-Limit-Datenbanktabelle kontrolliert. Das ist **kein Ersatz für WAF/CAPTCHA** bei gezielten DDoS-/Bot-Angriffen.
- Private Awin-/Impact-/Resend-/Supabase-Server-Tokens gehören ausschließlich in Server-Umgebungen und GitHub Actions Secrets. Öffentliche Supabase-Publishable-Keys sind nicht gleichbedeutend mit geheimen Service-Keys.
- Build-Sicherheitsprüfung auf veröffentlichte Schlüsselwerte, Secret-Namen, auffällige Token-Muster und private Schlüsseldateien.
- CSP-Metatag und Referrer-Policy in über den Seitengenerator gebauten Seiten, mit Zulassungen für ausdrücklich eingebundene Affiliate-/Creator-Widgets.
- GitHub-Tests vor Deployment, automatischer Live-Smoke und wöchentlicher kostenloser Audit produktiver npm-Abhängigkeiten.
- Dependabot erstellt Update-Vorschläge; ein PR ist **keine geprüfte oder automatisch übernommene Aktualisierung**.

## Bekannte Grenzen und nächste Kontrollen

- GitHub Pages kann keine eigenen HTTP-Response-Header für alle Seiten frei konfigurieren. Die CSP per HTML-Meta-Tag ist hilfreich, ersetzt aber keine vollständige serverseitige Header-Konfiguration, beispielsweise gegen Framing/Clickjacking.
- Wegen notwendiger älterer Inline-Skripte erlaubt die CSP derzeit `'unsafe-inline'`. Langfristig sollten diese Skripte in geprüfte lokale Dateien verlagert und die CSP ohne Inline-Ausnahme aufgebaut werden.
- CSP-Auswirkungen auf optional geladene Drittanbieter-Widgets (Spreadshop, Instant Gaming, Spotify) müssen auf echten Browsern überprüft werden, bevor die Sicherheitspolicy als vollständig abgenommen gilt.
- Schutz vor bösartigen automatisierten Anfragen kann mit datenschutzkonformem Bot-Management oder einer kostenlosen Turnstile-Integration ergänzt werden, wenn Domain/Schlüssel offiziell eingerichtet sind.
- Multi-Faktor-Authentifizierung, aktuelle Login-Geräte, Recovery-Codes und Rechte für **GitHub, Supabase und Affiliate-Portale** müssen vom berechtigten Kontoinhaber geprüft werden.
- Newsletter-Versand erst nach verifizierter Absenderdomain und erfolgreichem Double-Opt-in-End-to-End-Test.
- Geheime Daten in Screenshots, Logs, Issues und öffentlichen Reports vermeiden; alte mutmaßliche Leaks niemals nur per Git-Commit „entfernen“, sondern Zugangsdaten widerrufen und ersetzen.

## Kein eigener Checkout

Angebotslotse verkauft und kassiert nicht selbst. Externe Käufe und Verträge erfolgen beim jeweiligen Drittanbieter; dessen eigene Datenschutz- und Sicherheitsbedingungen gelten ab Verlassen der Website.
