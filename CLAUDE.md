# Pflege-Faktencheck (ex Pflege-Fakten / YNA Digital) | Silo-Governance (Genesis-Registrierung 2026-11-15)

> Rename 2026-11-15 (René-Direktive): „Pflege-Fakten" → „Pflege-Faktencheck",
> nachdem die Domain `pflege-faktencheck.de` als frei verifiziert wurde
> (DENIC-Whois, Stand 2026-11-15). Domain noch NICHT registriert — das ist
> ein externer Kaufvorgang mit Kosten, den nur René selbst ausführen kann.
> Seite läuft bis zur Registrierung weiterhin unter der Server-IP
> (`http://212.132.117.130/pflege-fakten/`, Pfad-Slug technisch unverändert).

> Nachtrag-Registrierung (2026-11-15) — Repo+AERIS-Rebrand existierten bereits
> (Commits bis 2026-10-04), waren aber nirgends in der Root-Governance
> registriert (kein CLAUDE.md/handoff.md, fehlte in Umbrella-Struktur/
> Sub-Projekte-Tabelle/Silo-Switcher). René-Direktive „hol dir das Silo YNA
> Digital und baue es auf das Brand-Design von AERIS um" — bei Prüfung
> festgestellt: Rebrand war bereits vollständig umgesetzt und gepusht, nur
> die Registrierung fehlte noch. Analog zu den Präzedenzfällen `aeris-web`/
> `Bestellschein-pflegebox` (unregistrierte, aber real existierende Silos).

## Was ist Pflege-Faktencheck
Öffentlicher, statischer Pflege-Ratgeber („Ratgeber Pflege") — ein-Datei-
HTML-Anwendung (`index.html`, ~3.200 Zeilen) mit ~28 Themen-Abschnitten:
Pflegegrad, Pflegegeld/Leistungen, Versorgungsformen, Entlastungsbetrag,
Pflegehilfsmittel, Hausnotruf, Demenz, Reha vor Pflege, Hospiz/Palliativ,
Pflege-WG, Vorsorge/Vollmacht, Schwerbehindertenausweis, Rente für
Pflegende u. a. Kein Backend, keine Nutzerdaten-Erfassung erkennbar (reine
Informationsseite, kein PIN-Gate).

## Quelle & Eigentum
- GitHub: `Renekrieg1401/YNA` (persönlicher Account, public, Beschreibung
  „Ratgeber Pflege")
- Lokal: `/Users/kriegrene/Development/IRIS-DIGITAL/Projekte/yna-digital/`
- **René-Direktive (2026-11-15): „Gehört nicht mehr zu AERIS GmbH"** —
  alle Eigentums-/Produktzuordnungs-Aussagen zu AERIS entfernt (Titel,
  Header-Untertitel „Ein Produkt von AERIS", Footer-Logo-Link zur
  AERIS-Website, Barrierefreiheitserklärungs-Text). Betrieben als privates,
  eigenständiges, nicht-kommerzielles Informationsangebot von René Krieg
  (Privatperson, kein Unternehmen) — Impressum/Datenschutz entsprechend
  mit Renés privater Identität befüllt (Hohenfelsstraße 34, 35232
  Dautphetal, r.krieg.home@gmail.com), nicht mit AERIS-Firmendaten.
- Die Bronze/Navy-Farboptik (AERIS-Design-Tokens) bleibt bewusst erhalten —
  das war eine reine Design-Entscheidung, keine Eigentumsaussage, und wurde
  nicht zurückgenommen.
- **Zugehörigkeit zur IRIS-Digital-Produkthierarchie:** explizit KEIN
  AERIS-Unterprodukt (s. o.) — nur als technisches Silo registriert, nicht
  in der „Produkt-Hierarchie (Exklusive Dachmarke)"-Aufzählung der
  Root-CLAUDE.md zu listen.

## Design — AERIS-Brand-Rebrand (bereits umgesetzt, verifiziert 2026-11-15)
Farbwerte 1:1 gegen die AERIS-Design-Token-Tabelle (Root-CLAUDE.md §
Design-Token-Masterübersicht) geprüft — Übereinstimmung bestätigt:
- `#131B27` (AERIS_BG) als Haupt-Hintergrund
- `#6B4423→#B87333→#E8C39E` (AERIS_BRONZE_GRADIENT) als Akzent-Verlauf
- `#303F58` (AERIS_CARD_GRADIENT-Start) für Card-Flächen
Git-Historie dokumentiert den Rebrand-Verlauf: „AERIS-Rebrand + Kontrast-
Bugfixes" → „kritischer Dialog-Hintergrund-Bug + restliche YNA-Altfarben
behoben" → „Rot auf Notruf-Button beschränkt" → „Mauszeiger-Lichtquelle wie
beim AERIS-Doku-Login ergänzt". Lokaler Stand = `origin/main`, kein offener
Diff.

## Status — Erstkontakt/Registrierung, kein neuer Code-Auftrag
- 2026-11-15: Nur Governance-Registrierung nachgeholt (dieses CLAUDE.md +
  `handoff.md` angelegt, Root-CLAUDE.md Umbrella-Struktur/Sub-Projekte-
  Tabelle/Silo-Switcher ergänzt). Keine Code-Änderung — AERIS-Rebrand war
  bereits abgeschlossen, in Safari zur Ansicht geöffnet.
- Kein eigenständiger Agenten-/Vier-Augen-Lauf (Komplexitäts-Gate: reine
  Doku-Registrierung, Score <6).
- Fachinhalte (SGB-XI-Bezüge in den ~28 Themen-Abschnitten) NICHT
  primärquellen-verifiziert — vor Praxiseinsatz mit `legal-compliance`
  gegenprüfen.

## Monetarisierungs-Dashboard (Genesis 2026-11-16)
René-Auftrag: Besucher-Zahlen/Regionen/12-Monats-Prognose überwachen.
- Eigenes, isoliertes Nginx-Access-Log für diese Domain seit 2026-11-16
  04:26 UTC (`access_log /var/log/nginx/pflege-faktencheck-access.log` in
  der Site-Config) — vorher lief ALLES auf dem Server im geteilten
  Default-Log ohne Host-Trennung, keine zuverlässige Zuordnung möglich.
  Bewusst KEIN Backfill aus der Vorgeschichte (eigene Verifikations-
  Abrufe darin nicht von echtem Publikum unterscheidbar).
- `stats-aggregate.js` (`/opt/pflege-fakten-stats/` auf dem Server) parst
  das Log alle 5 Minuten (systemd-Timer `pflege-fakten-stats.timer`),
  filtert Bots/Crawler heraus, löst Land per `geoip-lite` offline auf
  (keine externe API, kein Tracking-Pixel), schreibt `public/stats.json`.
- **Prognose-Sperre (bewusst, "grimmiges Framing"):** Unter 14 Tagen
  echter Daten zeigt das Dashboard explizit "noch keine seriöse Prognose
  möglich" statt einer erfundenen Zahl.
- **Zugriffsschutz-Korrektur (René-Direktive "ohne Registrierung oder
  Anmeldung"):** HTTP-Basic-Auth wieder entfernt — auf iOS war der
  Login-Dialog beim "Zum Home-Bildschirm"-Aufruf unzuverlässig (eingebettete
  URL-Credentials werden von Safari im Standalone-/WebClip-Kontext nicht
  verlässlich übernommen). Stattdessen jetzt Schutz durch einen langen,
  zufälligen URL-Pfad (`/dash-<40-stelliger Hex-Token>/`, nicht in diesem
  Repo hinterlegt — René hat ihn im Chat erhalten, bei Bedarf auf dem
  Server in `/etc/nginx/sites-available/pflege-faktencheck` nachsehen oder
  neu generieren: `openssl rand -hex 20`, Location-Block entsprechend
  anpassen, `nginx -t && systemctl reload nginx`). Kein Login-Dialog mehr,
  aber weiterhin nicht öffentlich verlinkt/auffindbar.
- Manueller "Aktualisieren"-Button + automatisches Neuladen bei
  `visibilitychange` ergänzt (René-Fund: "Zum Home-Bildschirm"-Aufruf auf
  iOS pausiert `setInterval` im Hintergrund, aktualisiert beim
  Wiederöffnen nicht automatisch).
- **Erweiterung Bundesland/Stadt/Zugriffsquelle (René-Auftrag 2026-11-16,
  Nachtrag):** `geoip-lite` liefert KEINE echten Landkreise/Stadtbezirke
  (René-Entscheidung nach Rückfrage: kostenlose Variante statt
  kostenpflichtigem Drittanbieter) — feinste erreichbare Stufe ist der
  Stadtname. Bundesland wird daraus über eine verifizierte Stadt→
  Bundesland-Tabelle (`STADT_ZU_BUNDESLAND` in `stats-aggregate.js`, 383
  deutsche Städte, erweitert 2026-11-16) abgeleitet, NICHT über den opaken numerischen
  geoip-lite-Regioncode (dessen Kodierung nicht zuverlässig dokumentiert
  ist). Zugriffsquelle (Direkt/Suchmaschine/Social Media/Sonstige
  Verweise) wird aus dem ohnehin bereits geloggten HTTP-Referer-Header
  abgeleitet — kein zusätzlicher Tracking-Code auf der öffentlichen Seite.
  Alle Erweiterungen live mit synthetischen Testzeilen (Berlin/Nürnberg,
  Google/Facebook/Direkt/Forum-Referer) verifiziert, danach aus dem echten
  Log wieder entfernt (ehrlicher Nullpunkt, kein Datenbestand verfälscht).
- **Quellcode im Repo:** `dashboard/index.html` (Frontend),
  `stats-aggregate.js` (Aggregator, 1:1-Kopie dessen was auf dem Server
  unter `/opt/pflege-fakten-stats/` läuft — bei künftigen Änderungen
  beide Stellen synchron halten, kein automatisches Deploy-Skript dafür
  angelegt).
