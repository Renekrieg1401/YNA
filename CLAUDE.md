# Pflege-Fakten (ex YNA Digital) | Silo-Governance (Genesis-Registrierung 2026-11-15)

> Nachtrag-Registrierung (2026-11-15) — Repo+AERIS-Rebrand existierten bereits
> (Commits bis 2026-10-04), waren aber nirgends in der Root-Governance
> registriert (kein CLAUDE.md/handoff.md, fehlte in Umbrella-Struktur/
> Sub-Projekte-Tabelle/Silo-Switcher). René-Direktive „hol dir das Silo YNA
> Digital und baue es auf das Brand-Design von AERIS um" — bei Prüfung
> festgestellt: Rebrand war bereits vollständig umgesetzt und gepusht, nur
> die Registrierung fehlte noch. Analog zu den Präzedenzfällen `aeris-web`/
> `Bestellschein-pflegebox` (unregistrierte, aber real existierende Silos).

## Was ist Pflege-Fakten
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
