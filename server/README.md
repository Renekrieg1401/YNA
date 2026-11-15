# Pflege-Fakten Server

Eigenstaendiger Node/Express-Server für das private, nicht-kommerzielle
Informationsangebot **Pflege-Fakten** (René Krieg, Privatperson) — **KEIN
AERIS-Produkt**, kein Code-/Auth-Sharing mit `Projekte/aeris/server/`. Dient
als "Change-Radar" für SGB-XI-/BMG-/MD-Bund-Quellen, die den Zahlenwerten in
`index.html` zugrunde liegen, plus Admin-Freigabe-Workflow für Renés manuelle
Prüfung, bevor irgendeine Änderung öffentlich sichtbar wird.

## Setup

```bash
cd Projekte/yna-digital/server
npm install
cp .env.example .env
node scripts/hash-pin.js <gewuenschte-admin-pin>   # Ausgabe in .env einfuegen
# JWT_SECRET z.B. per: openssl rand -hex 32
```

`.env` ausfüllen (siehe `.env.example` für alle Felder, inkl. SMTP für die
Draft-Benachrichtigungsmail). Danach:

```bash
npm start          # startet server.js auf PORT (Default 4100)
npm run crawl      # einmaliger Crawl-Lauf (node crawl.js)
```

## Was macht dieser Server NICHT

- Kein TLS/Zertifikat im Code — läuft als reiner HTTP-Dienst auf einem
  internen Port, TLS übernimmt der nginx-Reverse-Proxy (devops-infra-Aufgabe).
- Kein automatischer Scheduler/Cron — `crawl.js` muss von außen periodisch
  aufgerufen werden (Vorschlag: systemd-Timer, analog
  `Projekte/aeris/server/aeris-backup.timer`, wöchentlich statt täglich).
  Beispiel-Unit (von devops-infra einzurichten, nicht Teil dieses Auftrags):
  ```
  # /etc/systemd/system/pflege-fakten-crawl.timer
  [Timer]
  OnCalendar=weekly
  Persistent=true
  [Install]
  WantedBy=timers.target
  ```
- Kein automatischer Wert-Extrakt aus Gesetzestexten/PDFs — jeder Scraper
  erkennt nur "hat sich etwas geändert", nie "was genau". `proposed_new_value`
  bleibt für ALLE drei Quelltypen `null`; der tatsächliche neue Wert
  (`approved_new_value`) wird ausschließlich durch René selbst im
  `approve`-Request eingegeben (Pflichtfeld `newValue`, s. API unten).
- Keine Integration in `index.html` — macht `frontend-ui` in einem separaten
  Auftrag (neue `data-fact-id`-Attribute, Fetch-Skript, Overlay-UI gegen
  `GET /api/public/facts`).

## Datenmodell (SQLite, `better-sqlite3`)

- `facts` — ein Zahlenwert/Sachverhalt mit stabiler ID (Slug), Quelltyp
  (`sgbxi_html`/`bmg_pdf`/`mdbund_pdf`), Quell-URL, letztem Crawl-Hash.
- `drafts` — ein erkannter Fund, der Renés manueller Prüfung bedarf.
  `proposed_new_value`/`proposed_effective_date` sind strukturell fast immer
  `null` (s. Diffing-Strategie unten) — die eigentliche Wert-/Stichtag-Eingabe
  erfolgt durch René selbst im `approve`-Request und landet in
  `approved_new_value`/`approved_effective_date`.
- `change_history` — append-only Audit-Log jeder Statusänderung (kein
  UPDATE/DELETE-Endpunkt).
- `crawl_runs` — ein Eintrag je Crawl-Versuch (Diagnose/Staleness), auch bei
  unveränderten/fehlgeschlagenen Läufen.

### Seed-Daten (bewusst nur 5-8 Beispiel-Facts)

`db.js` legt beim ersten Start **7 Beispiel-Facts** an (Pflegegeld PG2-PG5,
Entlastungsbetrag §45b, gemeinsamer Jahresbetrag Verhinderungs-/
Kurzzeitpflege §42a, Pflegehilfsmittel §40) — reicht zum Testen des gesamten
Workflows, ist aber
**ausdrücklich nicht** die vollständige ~28-Themen-/~30-40-Werte-Liste aus
`index.html`. Die vollständige Fact-Liste (alle Zahlenwerte + Quell-URLs
korrekt zugeordnet) ist ein **separater, eigener Folgeauftrag** — nicht Teil
dieses Server-Baus.

## Diffing-Strategie je Quelltyp (ehrliche Grenzen)

| Quelltyp | Was wird gehasht | Erkennt | Extrahiert automatisch? |
|---|---|---|---|
| `sgbxi_html` | Extrahierter Paragraph-Textkörper (Navigation/Footer vorher entfernt, `scrapers/sgbxiHtml.js`) | "Gesetzestext hat sich geändert" | Nein — nie einen neuen Zahlenwert |
| `bmg_pdf` | Binärhash der PDF-Datei (`scrapers/bmgPdf.js`) | "Unter dieser URL liegt jetzt eine andere Datei" | Nein — reiner Änderungs-Radar |
| `mdbund_pdf` | Binärhash der PDF-Datei (`scrapers/mdBundPdf.js`) | Wie `bmg_pdf` | Nein |

Jeder erkannte Fund erzeugt einen `draft` mit Status `pending_review` und
löst eine E-Mail an `r.krieg.home@gmail.com` aus. Erst wenn René im
Admin-Panel `approve` mit `effectiveDate`+`newValue`+`prosText`+`consText`
aufruft, wird der Fund jemals öffentlich sichtbar — und auch dann erst **ab
dem gesetzten Stichtag** (s. u.). Vor dem Stichtag bleibt `value` in
`GET /api/public/facts` der alte `current_value`, ab dem Stichtag liefert
`resolveEffectiveValue()` automatisch `approved_new_value` zurück.

## Stichtag-Logik (kein Cronjob!)

`lib/resolveEffectiveValue.js` ist eine **reine, zustandslose Funktion**, die
bei jedem Request (Public-API + Admin-Vorschau) neu entscheidet, ob ein
`approved`-Draft bereits wirksam ist (`approved_effective_date <= now`).
`facts.current_value` wird durch `approve()` **niemals** überschrieben — es
gibt bewusst keinen separaten Schreibvorgang/Cronjob, der am Stichtag den
Datensatz ändert. Das war explizit die Lehre aus einem früheren Bug in einem
Schwestersystem (zwei Code-Pfade werteten denselben Zustand unterschiedlich
aus, abhängig vom Cronjob-Timing).

`pendingOverlay` in `GET /api/public/facts` ist befüllt, sobald ein Draft
`approved` ist, auch wenn der Stichtag noch in der Zukunft liegt (René-
Entscheidung: Overlay erscheint sofort nach Freigabe, nicht erst X Tage
vorher) — sobald der Stichtag erreicht ist, wandert der Wert automatisch von
`pendingOverlay` in `value`.

## API

### Public (kein Auth)
- `GET /api/public/facts` — Liste aller Facts mit aufgelöstem Wert + ggf.
  Pending-Overlay.
- `GET /health`

### Admin (JWT, `Authorization: Bearer <token>`)
- `POST /admin/login` — Body `{pin}`. Lockout nach 5 Fehlversuchen/15 Min
  (IP-basiert, `login_sperre`-Tabelle).
- `GET /admin/drafts` / `GET /admin/drafts/:id`
- `POST /admin/drafts/:id/approve` — Body `{effectiveDate, newValue, prosText,
  consText}`, alle vier Pflichtfelder (`newValue` darf nicht leer sein).
- `POST /admin/drafts/:id/reject` — Body optional `{note}`.
- `GET /admin/crawl-runs` — letzter Lauf je Fact.

## E-Mail-Benachrichtigung — Gmail-App-Passwort nötig

`mailer.js` nutzt `nodemailer` mit Gmail-SMTP (`SMTP_USER`/
`SMTP_APP_PASSWORD` in `.env`). **Ein echtes Gmail-App-Passwort kann nur René
selbst erzeugen** (https://myaccount.google.com/apppasswords, erfordert
2FA auf dem Google-Konto) — das Feature ist vollständig lauffähig gebaut,
funktioniert aber erst, sobald diese beiden Werte gesetzt sind. Ohne sie
loggt `mailer.js` nur einen Fehler (`missing_smtp_credentials`) — der
Crawl-Lauf selbst bricht dadurch **nicht** ab.

## Offene Punkte (nicht Teil dieses Auftrags)

- Vollständige Fact-Liste über die 8 Seed-Einträge hinaus.
- Gmail-App-Passwort von René.
- devops-infra: nginx-Reverse-Proxy + TLS (selbstsigniertes Zertifikat,
  analog AERIS Buch), systemd-Service für `server.js`, systemd-Timer für
  `crawl.js` (wöchentlich).
- frontend-ui: Integration in `index.html` (`data-fact-id`, Fetch-Skript,
  Overlay-UI).
