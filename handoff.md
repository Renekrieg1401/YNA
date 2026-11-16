# Handoff — Pflege-Faktencheck (ex Pflege-Fakten / YNA Digital), 2026-11-15

## Nachtrag 2026-11-16 (1) — Notfall-Overlay Mobile-Überlauf behoben
René-Fund: "Overlay in Notfall auf dem Smartphone innerhalb zu groß, man
muss hin und her wischen". Live bei 375px Breite reproduziert: `.cm-body`
brauchte 489px, hatte nur 336px — Root Cause: `.cm-row` (flex, kein
flex-wrap) enthält bei "Seelische Krise" zwei nebeneinander liegende
Telefon-Pills (TelefonSeelsorge, zwei Nummern), die zusammen breiter als
der verfügbare Platz sind. Fix: `flex-wrap:wrap` auf `.cm-row` +
`overflow-x:hidden` auf `.cm-body` als Verteidigungslinie. Verifiziert
lokal UND live (scrollWidth=clientWidth=336 nach Fix), Screenshot bestätigt
sauberen Zeilenumbruch, 0 Konsolenfehler. Deploy per `scp` auf
`/var/www/pflege-fakten/index.html` (Root aus echter Nginx-Config gelesen).

## Nachtrag 2026-11-16 (2) — Monetarisierungs-Dashboard (Besucher/Regionen/Prognose)
René-Auftrag: "Dashboard zur Monetarisierungsüberwachung — Aufrufe,
Regionen, 12-Monats-Prognose, fortlaufend aktualisiert, in Safari zeigen".

- **Echte Datengrundlage geschaffen, keine erfunden:** Server lief bisher
  mit EINEM geteilten Nginx-Default-Log für ALLE vhosts (AERIS, Arcus/AIM
  usw.) ohne Host-Trennung — eine zuverlässige Zuordnung "das war wirklich
  diese Domain" war technisch nicht möglich. Neue `access_log`-Direktive
  (`/var/log/nginx/pflege-faktencheck-access.log`) in der Site-Config seit
  2026-11-16 04:26 UTC. Bewusst KEIN Backfill aus der alten geteilten
  Historie (11 Treffer darin waren teils eigene curl/Playwright-
  Verifikationsabrufe aus früheren Nachträgen dieser Session, nicht von
  echtem Publikum unterscheidbar — ein ehrlicher Nullpunkt heute ist
  besser als eine geschönte Vorgeschichte).
- **`stats-aggregate.js`** (`/opt/pflege-fakten-stats/`, Node, läuft als
  `systemd`-Timer alle 5 Minuten): parst das eigene Log, filtert Bots/
  Crawler per User-Agent-Heuristik heraus, zählt nur echte `GET /` bzw.
  `/index.html` mit Status 200, löst Herkunftsland per `geoip-lite`
  OFFLINE auf (kein externer API-Call pro Besucher-IP, keine zusätzlichen
  Kosten, keine IP-Weitergabe an Dritte). `npm audit` zeigte 2
  Schwachstellen in einer `geoip-lite`-Abhängigkeit (IPv6-Parsing/ReDoS)
  — behoben via `npm audit fix --force`, zusätzlich eigene IP-Format-
  Validierung vor jedem `geoip.lookup()`-Aufruf als zweite Verteidigungslinie.
- **Prognose-Sperre (grimmiges Framing statt erfundener Zahl):** Unter 14
  Tagen echter Beobachtung zeigt das Dashboard explizit "noch keine
  seriöse 12-Monats-Prognose möglich" samt Begründung, keine Platzhalter-
  Zahl. Ab 14 Tagen: einfache lineare Fortschreibung aus dem 14-Tage-
  Durchschnitt, als "keine saisonale Anpassung" gekennzeichnet.
- **Zugriffsschutz:** Dashboard unter `https://pflege-faktencheck.de/
  dashboard/`, per HTTP-Basic-Auth geschützt (`/opt/pflege-fakten-stats/
  .htpasswd`, Nutzer `rene`, zufällig generiertes Passwort — NICHT im
  Git-Repo, René hat es im Chat erhalten). Nicht von der öffentlichen
  Seite verlinkt (Demo-Gate-Policy: Admin-Tools unsichtbar für normale
  Besucher).
- **René-Nachtrag "Aktualisieren-Button fehlt" (PWA/Home-Bildschirm
  aktualisiert nicht automatisch):** manueller Button ergänzt + zusätzlich
  automatisches Neuladen bei `visibilitychange` (deckt den Fall "App aus
  dem Hintergrund zurückgeholt" zusätzlich zum expliziten Klick ab).
- **Verifikation:** `node --check` auf dem Aggregator, Playwright lokal
  (Mock-Daten, 375px Mobile-Breite, 0 horizontaler Überlauf, Klick auf
  Aktualisieren-Button fehlerfrei) UND live gegen die echte Basic-Auth-
  geschützte URL (0 Konsolenfehler, `stats.json` liefert korrekt
  strukturierte, ehrliche Null-Werte — Domain hat schlicht noch keine
  echten Besucher seit Beginn der eigenen Protokollierung).
- In Safari geöffnet (Credentials in der URL eingebettet, da nur für René
  bestimmt).

**[OFFEN]:**
- Aktuell 0 echte Daten (Log-Erfassung läuft erst seit wenigen Minuten) —
  Dashboard füllt sich organisch, nichts weiter zu tun.
- Kein automatisches Deploy-Skript für `stats-aggregate.js`/`dashboard/
  index.html` — bei künftigen Änderungen manuell per `scp` auf
  `/opt/pflege-fakten-stats/` synchronisieren (Pfade in CLAUDE.md notiert).
- Monetarisierung selbst (Werbung/Affiliate/Spenden) ist technisch noch
  nicht angebunden — dieses Dashboard ist reine Beobachtungs-Infrastruktur
  für eine künftige Entscheidung, keine Umsatz-Anzeige (es gibt noch
  keinen Umsatz auf dieser bewusst nicht-kommerziellen Seite).
- Kein zweiter unabhängiger Review-Lauf (Komplexitäts-Gate, Claude direkt).

## Nachtrag 2026-11-15 (6) — Mobile-Header-Bug behoben, Google Search Console verifiziert
René-Fund (echter iPhone-Screenshot): Zahnrad-Einstellungen-Icon strandete
bei schmalen Viewports (≤395px) isoliert auf einer 3. Header-Zeile mit
riesigem Weißraum, dadurch große Lücke vor dem Fließtext. `testing-qa`-Audit
fand Root Cause (`.nav-inner{gap:28px}` + konkurrierende `margin-left:auto`
bei `.settings-wrap`/`.badge`, index.html:105/107/181) — `frontend-ui` fixte
mit `@media (max-width:420px){.nav-inner{gap:14px};.settings-wrap{margin-left:0}}`
(index.html:105-115). Per Playwright-Bisektion exakte Schwelle ermittelt
(Bug bis 395px, ab 396px schon vorher fehlerfrei). Zweite, unabhängige
`testing-qa`-Gegenprüfung GEGEN DIE ECHTE LIVE-URL (nicht nur lokal)
bestätigt PASS auf allen 5 Breiten.
Google-Search-Console-Verifizierungs-Tag ergänzt (René hat sich bei Google
Search Console angemeldet, URL-Präfix-Methode, HTML-Tag-Verifizierung).
**Prozess-Transparenz:** Beide Änderungen landeten durch Timing (Agent
schrieb auf Platte, bevor ich dessen Fertigstellung registrierte) in
Commit `ae72d41`, dessen Nachricht nur die Search-Console-Änderung nennt —
analog zum bereits einmal dokumentierten Vorfall bei `fc642c9`. Funktional
nichts verloren, aber Commit-Historie an der Stelle ungenau.

## Nachtrag 2026-11-15 (5) — Domain live, echtes HTTPS eingerichtet
DNS propagierte schneller als von Strato angekündigt (sofort statt 24h).
`certbot`+`python3-certbot-nginx` auf dem vServer installiert, neuer
Nginx-Server-Block `/etc/nginx/sites-available/pflege-faktencheck`
(Domain-Root statt `/pflege-fakten/`-Unterpfad), echtes Let's-Encrypt-
Zertifikat geholt (gültig bis 2027-02-13), HTTP→HTTPS-Redirect aktiv.
**Live: https://pflege-faktencheck.de/** (+ www-Variante). Barrierefrei-
heitserklärung von roher IP auf echte Domain umgestellt, committed+gepusht
(`c609ff6`), redeployed, verifiziert (0 IP-Referenzen mehr im HTML).
Alter Pfad `http://212.132.117.130/pflege-fakten/` bewusst unverändert als
Fallback belassen (kein Schaden, nicht beworben).
Crawler-Server-Admin-Bereich (`server/`) läuft noch NICHT hinter diesem
Zertifikat — das ist ein eigener, noch ausstehender devops-infra-Schritt
(eigener Port/Reverse-Proxy für den Node-Server).

## Nachtrag 2026-11-15 (4) — Domain gekauft, TLS-Entscheidung aktualisiert
René hat `pflege-faktencheck.de` bei Strato gekauft, wartet auf Freigabe
(DENIC-Whois zeigt Stand jetzt: noch `Status: free`, noch keine DNS-
Einträge — normal während der Registrierungs-Aktivierung). Sobald aktiv:
1. René setzt A-Record auf `212.132.117.130` im Strato-DNS-Bereich (sein
   Account, nicht mein Zugriff).
2. Ich richte danach `server_name pflege-faktencheck.de` ein + hole ein
   echtes Let's-Encrypt-Zertifikat (certbot).
**Aktualisierte René-Entscheidung:** Die frühere TLS-Entscheidung (s. o.,
selbstsigniertes Zertifikat für Admin-Bereich, reines HTTP für die
öffentliche Seite — beide explizit WEIL keine echte Domain vorlag) ist
überholt. Mit echter Domain: **echtes Let's-Encrypt-HTTPS für ALLES**
(öffentliche Seite + Admin-Bereich des Crawler-Servers), kein Workaround
mehr nötig. Barrierefreiheitserklärung + alle IP-Referenzen müssen bei der
Migration auf die echte Domain nachgezogen werden.

## Nachtrag 2026-11-15 (3) — Rename zu „Pflege-Faktencheck"
René-Direktive: Webseiten-Name ändern, zuvor freie `.de`-Domain suchen.
29 Kandidaten per DENIC-Whois geprüft, 9 frei, René wählte „Pflege-
Faktencheck" (`pflege-faktencheck.de`, frei verifiziert, NICHT registriert —
Kauf/Registrierung ist externe Kostenaktion, muss René selbst ausführen).
Alle sichtbaren Markennennungen in `index.html` umbenannt (Titel, Meta-Tag,
Header, Footer, AGB-Text, Barrierefreiheitserklärung). Technischer
Server-Pfad (`/pflege-fakten/`) bewusst unverändert gelassen (kein
Deploy-Rename in dieser Runde).

## Stand
René-Auftrag „hol dir das Silo YNA Digital und baue es auf das Brand-Design
von AERIS um, zeige es in Safari". Bei Prüfung festgestellt: Silo existierte
bereits lokal + auf GitHub (`Renekrieg1401/YNA`), AERIS-Rebrand war bereits
vollständig umgesetzt und gepusht (Commits bis 2026-10-04) — nur die
Governance-Registrierung fehlte (kein CLAUDE.md/handoff.md, nicht in Root-
CLAUDE.md gelistet). Keine Code-Änderung nötig, nur in Safari geöffnet +
Registrierung nachgeholt.

## Verifikation
- `git status`/`git fetch` — lokaler Stand = `origin/main`, kein Diff.
- Farbwerte stichprobenhaft gegen AERIS-Design-Token-Tabelle abgeglichen
  (`#131B27`/`#6B4423→#B87333→#E8C39E`/`#303F58`) — Übereinstimmung.

## Nachtrag 2026-11-15 — Faktencheck, Brand-Trennung, a11y-Fixes, Live-Deploy
- `legal-compliance`: alle SGB-XI-Zahlenwerte korrekt, aber falsche Rechtsgrundlage-
  Fußnote (Z.2665, zitiertes Gesetz regelt nicht die Beträge) + Impressum/
  Datenschutz waren reine Platzhalter (§5 DDG-Verstoß) — beides behoben.
- René-Direktive „Gehört nicht mehr zu AERIS GmbH" — alle AERIS-Eigentums-/
  Produktzuordnungs-Aussagen entfernt, Impressum/Datenschutz mit Renés
  privater Identität befüllt (Privatperson, kein Unternehmen). Bronze/Navy-
  Design bewusst unverändert (reine Farboptik, keine Eigentumsaussage).
- `accessibility-a11y` fand 10 echte WCAG-Kontrast-Fails + 6 Touch-Target-
  Unterschreitungen (u. a. Notruf-Button 40px statt 44px) — `frontend-ui`
  behoben, unabhängig von `accessibility-a11y` gegengeprüft: alle PASS.
- **Live deployed:** `http://212.132.117.130/pflege-fakten/` (AERIS-vServer,
  neue Nginx-Location im bestehenden HTTP-Server-Block, analog `/aeris-learn/`-
  Muster — bewusst reines HTTP ohne Auth, da öffentliches Infoangebot ohne
  Personendaten; Haupt-AERIS-Seite auf 443 unberührt). Verifiziert: HTTP 200,
  korrekter Titel, keine sichtbaren AERIS-Erwähnungen (nur 5 harmlose
  Code-Kommentare), Haupt-Redirect weiterhin intakt. Backup der alten
  Nginx-Config unter `/etc/nginx/sites-available/aeris.bak-*` auf dem Server.
- Alle Änderungen committed+gepusht (`982611c`, `14b7014`).

## Nachtrag 2026-11-15 (2) — AGB/Barrierefreiheitserklärung fertiggestellt
Letzte Platzhalter aufgelöst (ehrliche Nutzungsbedingungen statt künstlicher
AGB-Struktur; Barrierefreiheitserklärung als „teilweise konform" statt
beschönigt „vollständig konform"). Committed+gepusht (`508c687`), auf dem
Server redeployed, live verifiziert (0 Platzhalter mehr im ausgelieferten
HTML).

## Offen
- **Crawler-Feature** (autonome Übernahme neuer SGB-XI-/BMG-/MD-Bund-
  Änderungen + Vorher/Nachher-Warnhinweis-Overlay) — Scoping-Fragen
  beantwortet (Freigabe-Pflicht vor Live-Schaltung, Quellen, eigener
  Server), aber `software-architect`-Planung noch nicht begonnen. Größter
  offener Punkt.
- Nur 1 `legal-compliance`-Lauf — kein zweiter unabhängiger Rechts-Review.
- Kein echtes TLS für `/pflege-fakten/` (reines HTTP, bewusst analog
  aeris-learn — kein Personenbezug, kein Login).
- **Kein `testing-qa`-Lauf** für diese Änderungskette (nur eigene grobe
  Konsolenfehler-/Broken-Link-Prüfung durch Claude direkt) — Vier-Augen-
  Tabelle sieht `testing-qa` eigentlich als Pflicht-Gegenprüfer für
  `frontend-ui` vor, wurde hier übersprungen.
- **Kein `quality-management`-Prozess-Check** dieser Kette.
- Keine echte Browser-/Playwright-Visualprüfung nach den Touch-Target-
  Vergrößerungen (nur CSS-Rechenwerte von `frontend-ui`/`accessibility-a11y`
  geprüft, z. B. ob das breitere Settings-Panel (240→300px) auf schmalen
  Mobile-Viewports überläuft).
- Domain ist nur die rohe Server-IP (`212.132.117.130`), keine echte
  Domain/DNS — Barrierefreiheitserklärung müsste bei einer echten Domain
  nachgezogen werden.
