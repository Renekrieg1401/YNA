# Handoff — Pflege-Faktencheck (ex Pflege-Fakten / YNA Digital), 2026-11-15

## Nachtrag 2026-11-17 (25) — Neuer Abschnitt "Über mich"
René-Auftrag: Kurzbiografie über ihn selbst für die Seite. Fakten
direkt erfragt statt erraten (echte biografische Angaben über eine
reale Person werden nie erfunden): examinierter Pflegefachmann,
ambulanter Dienst, Motivation aus dem Berufsalltag (Betroffene kennen
ihre Ansprüche oft nicht). Nach Rückmeldung 2x überarbeitet ("viele"→
"einige Jahre", persönlicher/wärmer/klientennäher). Als neues Thema
in der Werkzeuge-Gruppe verankert (`id="ueber-mich"`), DE+EN,
Kontakthinweis am Ende. Overflow-Sweep über alle jetzt 35 Themen bei
320–430px erneut grün. Commit `9797794`, live byte-identisch verifiziert.

## Nachtrag 2026-11-17 (24) — Teilen-Text präziser gefasst
René-Auftrag "kurzer, prägnanter Social-Media-Text für die Teilen-
Buttons". 3 Varianten vorgelegt (sachlich/plakativ/kurz-direkt), René
wählte "Sachlich". Neuer Text ersetzt den bisherigen generischeren:
"Pflegegrad, Pflegegeld, Entlastungsbetrag & mehr — kostenlos erklärt,
jeder Betrag gegen das echte Gesetz geprüft." Live gegen die echte
Domain verifiziert (WhatsApp-Link enthält den neuen Text korrekt).
Commit `eac7ae7`.

## Nachtrag 2026-11-17 (23) — Kritischer Mobile-Test (Auflösung/Größen/Anordnung) + Header verschlankt
René-Auftrag "kritischer Test und Analyse für Auflösung, Größen,
Anordnung für Smartphones". Methode: programmatischer Sweep über ALLE
34 Themen bei 320/360/375/390/414/430px (reale iPhone-SE bis Pro-Max-
Breiten) per `document.documentElement.scrollWidth` vs. `clientWidth`
in Safari (Playwright/Chrome lokal nicht verfügbar) — kein Stichproben-
Screenshot-Raten, sondern vollständige, reproduzierbare Messung.
**3 echte Bugs gefunden, alle behoben:**
1. **`table.data` (Thema "Pflegegeld & Leistungen") überlief bei
   ≤414px um bis zu 60px** — 3-spaltige Tabelle mit `width:100%`, aber
   `table-layout:auto` ignoriert die 100%-Grenze bei zu langen
   Spaltenköpfen. Fix: neues `.table-scroll`-Wrapper-Muster, Tabellen
   werden per JS beim Laden automatisch hineingesetzt (DRY, gilt auch
   für künftige Tabellen) — Tabelle bleibt lesbar, wird innerhalb der
   Karte horizontal scrollbar statt die ganze Seite zu verbreitern.
2. **Dekorative `.blob`-Hintergrundelemente** (`position:absolute`,
   `right:-150px`/`left:-130px` u. a.) erzeugten bei bestimmten
   Themen (gefunden bei "gdb") 7–22px horizontales Seiten-Overflow —
   die Verkleinerung bei ≤680px (Breakpoint von 2026-11-15) reduzierte
   nur die Blob-Größe, nicht den negativen Positions-Offset. Fix:
   `html,body{overflow-x:hidden}` als globaler Schutz — zusätzlich
   `body{max-width:100vw}`.
3. **`a.tel`-Telefonbuttons** (Alzheimer-Telefon etc.) mit
   `white-space:nowrap` liefen bei ≤360px (z. B. kleinere Android-
   Geräte) aus dem Rahmen. Fix: neue `@media (max-width:380px)`-Regel
   erlaubt Umbruch + minimal kleinere Schrift — Telefonnummer bleibt
   vollständig lesbar statt abgeschnitten.
- **Nach allen 3 Fixes: 0px Overflow bei JEDEM der 34 Themen auf JEDER
  der 6 getesteten Breiten** — live gegen die echte Domain
  gegengeprüft (nicht nur lokal), bestätigt.
- **Zusätzlich im selben Commit (René-Direktive "Ratgeber im Header
  entfernen und Header schmälern"):** „Ratgeber · Pflege"-Badge aus dem
  Header entfernt, vertikales Innenpolster 14px→9px, Header-Höhe
  63px→49px (Desktop) bzw. 121px→91px (Mobile), `--header-h`-Scroll-
  Offset-Variable entsprechend 148px→126px nachgezogen, damit
  Sprung-Navigation weiterhin exakt passt.
- Commit `9ec8d6e` (Commit-Message deckt nur die Header-Änderung ab,
  enthält technisch aber beide Themen — hier zur Vollständigkeit
  nachgetragen).
- **[OFFEN, nicht kritisch]:** Touch-Target-Größe der neuen Quiz-
  Radiobuttons (Erschöpfungs-Selbstcheck) noch nicht einzeln gegen die
  44×44px-Richtlinie gemessen (native `<input type=radio>`, vermutlich
  <44px, aber mit anklickbarem `<label>` drumherum) — kein im Test
  gefundener Fehlalarm, da das Element beim Test zufällig ausgeblendet
  war (anderes Thema aktiv), einfach noch nicht nachgeholt.

## Nachtrag 2026-11-17 (22) — 4 Ideen umgesetzt: Selbstcheck, Kalender, Checklisten, Wohnraum-Demenz
René-Frage "weitere Ideen, vielleicht ZBI-22" + Folgefrage zu demenz-
gerechtem Wohnraum → 4 Punkte gewählt ("eigene Fragenkatalog und
Kalender und checklisten" + Wohnraum-Ergänzung), sequenziell umgesetzt:
- **ZBI-22 ehrlich abgelehnt, Alternative gebaut:** Der Zarit Burden
  Interview ist urheberrechtlich geschützt, exklusiv über Mapi Research
  Trust/ePROVIDE lizenziert (primärquellen-verifiziert) — Nachbau wäre
  echte Urheberrechtsverletzung gewesen. Stattdessen eigenes, 7-Fragen-
  Erschöpfungs-Selbstcheck-Instrument (0–14 Punkte, 3 Bänder), reine
  Browser-Berechnung, im Thema "Wenn die Kraft nachlässt" verankert.
  Commit `3ae06aa`.
- **Demenzspezifische Wohnraum-Gestaltung** ergänzt (Spiegel-Angst, Licht
  nach Tageszeit, sichere Rundwege, Bild-Orientierung, Gefahrenquellen,
  Ruheinseln) — Fund: bisher nur 1 Satz zu Demenz im bestehenden Thema.
  Gegen mehrere Praxisquellen verifiziert. Commit `4fdd0c4`.
- **Checklisten-Familie erweitert:** 2 neue PDFs (Pflegedienst-
  Erstgespräch, Krankenhausentlassung — § 39 Abs. 1a SGB V-Entlass-
  management primärquellen-verifiziert), per `reportlab` erzeugt (Chrome/
  Playwright lokal nicht verfügbar). Commit `923a66e`.
- **Fristen-Kalender (ICS)** mit 2 verifizierten Fristen (Entlastungs-
  betrag-Übertrag bis 30.06., Verhinderungspflege-Jahresbudget verfällt
  31.12.). **Validierungs-Zwischenfall:** Beim lokalen Testen in
  Calendar.app wurden die Test-Termine versehentlich real importiert —
  sofort erkannt, beide Termine gezielt entfernt, per Screenshot in
  beiden Monaten als leer verifiziert, kein anderer Termin betroffen.
  Commit `097da3d`.
- **Dashboard-Nachtrag (René-Wunsch "Kalenderfunktion-Zähler"):**
  Download-Zähler-Infrastruktur auf `fristen-kalender.ics` + beide neuen
  Checklisten erweitert (gleicher Mechanismus wie Flyer/Vorlagen).
  Commit `e8dede9`.
- Alle Deploys live byte-identisch verifiziert.

## Nachtrag 2026-11-17 (21) — Teilen-Zähler fürs Dashboard
René-Wunsch: Dashboard soll zeigen, wie oft die Teilen-Buttons geklickt
werden. Neues `navigator.sendBeacon('/beacon-share?plattform=X')` pro
Klick (analog beacon-geladen/beacon-dauer-Muster), neue Nginx-Location,
`stats-aggregate.js` wertet pro Plattform aus (gleiche Bot-Filter wie
überall sonst), neue Dashboard-Sektion „Teilen in sozialen Medien".
Mit synthetischen Log-Zeilen auf dem Server verifiziert (echte Browser-
Session + Share-Klick → gezählt), danach Testdaten aus dem echten Log
entfernt. Commit `32ebc5b`.

## Nachtrag 2026-11-17 (20) — Teilen-Buttons, SEO-Phrasing, Dashboard-Erweiterung, neuer Agent
- **Teilen-Buttons** (Commit `3d5baf0`): WhatsApp/Facebook/X/Threads über echte
  Web-Intent-URLs (alle 4 live getestet). Instagram hat KEINE offizielle
  Web-Freigabe-URL (verifizierte Plattform-Einschränkung) — nutzt
  `navigator.share()` auf Mobilgeräten, sonst Link-kopieren-Fallback mit
  sichtbarer Bestätigung statt eines vorgetäuschten Intents.
- **SEO-Frage ehrlich beantwortet:** Breite Begriffe ("Pflege", "Pflegeheim")
  sind ohne Werbung nicht erreichbar (dominiert von Großportalen) — René
  wählte "nur Long-Tail stärken" statt des größeren Multi-URL-Umbaus.
  Long-Tail-Begriffe (ambulante Pflege, Pflegeheim-Kosten, Pflegegrad
  beantragen) natürlich in Meta-Description + Start-Hub-Text eingearbeitet,
  keine Keyword-Stapelung (Commit `4cb2e61`).
- **Dashboard erweitert** (Commit `62b29b3`): Download-Zähler für Flyer/
  Vorlagen (Daten wurden schon geloggt, nur nie ausgewertet) + Newsletter-
  Abonnentenzahl (per `sqlite3`-CLI aus der separaten Newsletter-DB
  gelesen). Live verifiziert.
- **Neue Governance-Rolle `seo-technisch`** (René-Direktive nach einem
  Strato-SEO-Audit-Ergebnis): read-only Fachagent, Abteilung Marketing &
  Marke, verifiziert externe SEO-Tool-Befunde IMMER gegen die echte
  Live-Seite statt sie blind umzusetzen (Single-Page-Apps erzeugen bei
  generischen Crawlern bekannte Fehlalarme). Datei `~/.claude/agents/
  seo-technisch.md`, registriert in Root-`CLAUDE.md` Agenten-Organigramm.
  **Technische Einschränkung (wie schon bei anderen neuen Rollen 2026-08-21
  dokumentiert):** neue Agent-Typen werden vom Agent-Tool erst nach einem
  Session-Neustart erkannt — der erste Einsatz lief übergangsweise als
  `general-purpose` mit vollständig eingebetteter Rollenbeschreibung.
- **René-Korrekturschleife beim OG-Bild (wichtig fürs Gedächtnis):** 1. Entwurf
  hatte einen selbst erfundenen Glow-Ring statt des echten Logos — korrigiert
  per echtem SVG-Rendering. 2. Entwurf: René zeigte das TATSÄCHLICHE
  Original-Referenzbild, komplett danach neu gebaut, mit "Ok" bestätigt.
  Lehre: bei Grafikaufträgen ohne explizite Vorlage erst nachfragen, nicht
  selbst komponieren (Autonomie-Ausnahme "Design, Effekte, Funktionen").
- **Strato-SEO-Audit verifiziert und abgeschlossen** (`seo-technisch`-Agent,
  Commit `9445880`): Von 7 Befunden waren **5 Fehlalarme** — "3 defekte
  Links" (eigener Bot-Schutz blockt UA-lose Crawler mit 403, alle 26 echten
  Links einzeln mit Browser-UA getestet: 200), "43% fehlende Descriptions"
  (real 0%, es gibt genau 1 vollständige Description), "57%/43% Titel-
  Stats" (es existiert nur 1 Titel, Duplikate bei 1 Seite unmöglich).
  **1 echter Fund:** 0 `<h1>`-Tags auf der ganzen Seite — behoben, Hero-
  Headline auf `<h1>` umgestellt, visuell unverändert. **1 nicht
  code-behebbar:** Backlinks/Social-Media = 0 ist real, aber reine
  manuelle/externe Arbeit (Renés Entscheidung, kein Fachagenten-Auftrag).

## Nachtrag 2026-11-17 (19) — OG-Meta-Tags + Base64-Vorlagen ausgelagert
René-Frage "Hast du weiter Ideen?" (2.) → 2 verifizierte Funde: fehlende
OpenGraph/Twitter-Tags, 387 KB eingebettete Vorlagen-Base64. Beide gewählt
("Alles"):
- **OpenGraph/Twitter-Card-Tags ergänzt** (Commit `e5af242`). Neues
  `og-image.png` (1200×630). **René-Korrekturschleife (wichtig für
  künftige Design-Aufträge):** erster Entwurf hatte einen selbst
  erfundenen Gradient-Glow-Ring statt des echten Logos — René korrigierte
  "Kein Glow Kreis original logo verwenden", per SVG-Rendering (`qlmanage`)
  1:1 das echte Herz+Haken-Logo nachgezogen (Commit `411e859`). Danach
  zeigte René das TATSÄCHLICHE Original-Referenzdesign ("Das ist das
  original") — komplett neu nach dieser Vorlage gebaut (Logo oben links,
  Bronze-Ring-Dekoration oben rechts, Titel mit Halbgeviertstrich,
  Domain-Zeile unten), von René mit "Ok" bestätigt (Commit `6d40964`).
  Lehre: bei Grafik-/Bildaufträgen ohne explizite Vorlage zuerst nachfragen
  statt selbst zu komponieren — exakt der Autonomie-Ausnahme-Fall aus der
  Root-Governance ("Design, Effekte, Funktionen").
- **Pflegetagebuch-Vorlagen (PDF+Word) aus Base64 ausgelagert** (Commit
  `3f9bd3c`) — waren direkt in `index.html` eingebettet (~390 KB bei
  JEDEM Seitenaufruf, auch ohne Download). Jetzt echte Dateien
  (`vorlage-pflegetagebuch.pdf`/`.docx`), analog zum Flyer-Muster.
  `index.html` live 788 KB → 396 KB, Downloads byte-identisch gegen die
  vormals eingebetteten Originale verifiziert.

## Nachtrag 2026-11-17 (18) — Offene Punkte aus (17) erledigt: Newsletter-Auto-Löschung
René-Auftrag "Offenes erledigen" zu den 2 in (17) genannten offenen Punkten:
- **stats.json-Einzelereignisse:** bewusst NICHT entfernt — die Liste ist ein
  echtes, genutztes Dashboard-Feature (`dashboard/index.html` zeigt eine
  Zeit/Land/Dauer-Tabelle), enthält keine IP/Kennung, und die
  Datenschutzerklärung beschreibt sie bereits präzise seit (16). Entfernen
  hätte ein funktionierendes Feature ohne echten Compliance-Gewinn gekostet.
- **Newsletter-Löschung automatisiert:** neues `server/cleanup-newsletter.js`
  (Muster von `crawl.js` übernommen) löscht abgemeldete Datensätze nach 30
  Tagen, nie bestätigte Anmeldungen 7 Tage nach Linkablauf. Neuer täglicher
  systemd-Timer `pflege-fakten-cleanup.timer` auf dem Server eingerichtet
  und aktiviert. Mit synthetischen Testdaten verifiziert (alter Fall
  gelöscht, frischer Fall korrekt erhalten, Testdaten danach entfernt —
  Live-DB hatte zum Testzeitpunkt 0 echte Abonnenten). Datenschutzerklärung
  (Punkt 5+9) mit den konkreten Fristen aktualisiert. Commit `b2fff03`.

## Nachtrag 2026-11-17 (17) — 3 Ideen umgesetzt: FAQ-Schema, Datenschutz-Fix, Kurzgeschichten
René-Frage "Hast du weitere Ideen?" → 4 Vorschläge gemacht, er wählte "Alles".
Sequenziell abgearbeitet, jeweils committed+deployed+verifiziert:
- **(15) FAQ-Schema.org-Markup:** JSON-LD FAQPage für die 3 bestehenden
  FAQ-Blöcke (Pflegegrad, Demenz, allgemeine Fragen) ergänzt — reine
  Metadaten, keine sichtbare Änderung. Commit `3174383`.
- **(16) Datenschutzerklärung aktualisiert — echter Fund, kein Platzhalter:**
  Die vermutete Lücke "AGB/Barrierefreiheit sind Platzhalter" (Manifest
  15.11.) erwies sich bei Prüfung als veraltet — beide Texte sind bereits
  vollständig. Stattdessen echter Fund: die Datenschutzerklärung behauptete
  "kein Tracking, keine Analyse-Cookies", obwohl seitdem Newsletter
  (E-Mail+consent_ip-Speicherung), Statistik-Dashboard (geoip-Aggregation)
  und 2 JS-Beacons dazugekommen waren — keines davon dokumentiert. Neue
  Fassung ergänzt Logfile-Rotation (14 Tage), Reichweitenstatistik-Zweck,
  Newsletter-Datenverarbeitung (Art. 6 Abs. 1 lit. a), erweiterte
  Rechtsgrundlagen. Von `legal-compliance` gegen echten Code/DB-Zustand
  geprüft (Beacon-Zweck, stats-aggregate.js-Ausgabeformat, Newsletter-
  Schema, Logrotate-Config), 2 Präzisierungen eingearbeitet. Commit `b272d49`.
- **(17) Kurzgeschichten-Format ausgeweitet:** Nach Demenz-Vorbild je eine
  fiktive Beispielgeschichte bei Verhinderungs-/Kurzzeitpflege, Hospiz &
  Palliativversorgung, Pflege-WG ergänzt — keine neuen Fakten, nur
  Veranschaulichung. `legal-compliance`-Würde-/Framing-Check bestanden
  (insbesondere die sensible Hospiz-Geschichte ohne Angstmachen/
  Verharmlosung). Commit `2905fc5`.
- Alle 3 Deploys live unter pflege-faktencheck.de byte-identisch verifiziert.

## Nachtrag 2026-11-17 (14) — Demenz-Thema umfassend ausgebaut (Medizin, Pflege, Familie, FAQ)
René-Auftrag per XML-Spec: Demenz-Abschnitt sollte Medizin (S3-Leitlinie),
Pflege (DNQP), personzentrierten Umgang (Kitwood/IVA) abdecken; per
Folgeauftrag erweitert um Verlaufsformen im Alltag, Familiendynamik-
Frühwarnzeichen (inkl. fiktiver Kurzgeschichten) und ein „Was tun wenn"-FAQ.
- **Vorgehen:** Erst Recherche + Vorschau (`demenz-vorschau.html`, Scratchpad)
  in Safari gezeigt, NICHT direkt live geschaltet — René wählte "legal-
  compliance gegenprüfen lassen" statt direkter Übernahme.
- **1. Agentenlauf (`legal-compliance`):** Epidemiologie (Alzheimer ~65 %,
  vaskulär ~15 %), MMST/DemTect/Biomarker, Cholinesterase-Hemmer/Memantin-
  Zulassungsgrenzen, DNQP-Kernaussage, Kitwood-Bedürfnisse, IVA-4-Schritte
  alle ✅ bestätigt. 2 Formfehler gefunden: beide Quell-Links zeigten nur auf
  Organisations-Startseiten statt konkrete Dokumente — behoben
  (`register.awmf.org/de/leitlinien/detail/038-013`,
  `dnqp.de/expertenstandards-und-auditinstrumente/`, beide live 200 OK
  verifiziert).
- **René-Folgeauftrag (mid-turn):** Verlaufsformen, Familiendynamik,
  Kurzgeschichten, FAQ "Was tun/Wer hilft/Was darf ich" ergänzt — 3 neue
  Blöcke (`dz-verlauf`, `dz-familie`, `dz-was-tun`), DE+EN.
- **2. Agentenlauf (`legal-compliance`, nur neue Blöcke):** Verlaufsformen
  ✅, Familiendynamik/Würde-Framing ✅, Kurzgeschichten-Kennzeichnung ✅.
  **Echter Rechtsfehler gefunden:** neue FAQ "Ohne Vorsorgevollmacht dürfen
  auch Ehepartner nicht automatisch entscheiden" widersprach der bereits
  korrekten Aussage im bestehenden Abschnitt „Vorsorge & Vollmacht" zum
  Ehegatten-Notvertretungsrecht (§ 1358 BGB, seit 2023, max. 6 Monate, nur
  medizinisch) — behoben, jetzt widerspruchsfrei zur bestehenden Seite.
  Zusätzlich "im Vollbesitz ihrer geistigen Kräfte" durch die präzisen
  Rechtsbegriffe Geschäftsfähigkeit (Vollmacht) / Einwilligungsfähigkeit
  (Patientenverfügung) ersetzt.
- **Deploy:** Commit `ac8c0fb` (Repo `Renekrieg1401/YNA`, gepusht). Server-
  Backup vor Deploy (`index.html.bak-20261117-*`), per `scp` auf
  `/var/www/pflege-fakten/index.html`, live unter `pflege-faktencheck.de`
  mit echtem Browser-UA verifiziert (200, byte-identisch zum Commit).
  Eigener curl-Test ohne Browser-UA bekam zunächst 403 — kein Bug, sondern
  der bestehende Bot-Filter (`$pfk_bad_bot`) griff korrekt gegen den
  eigenen Test-Request selbst.
- **[OFFEN]:** `demenz-vorschau.html` im Scratchpad war nur Arbeitskopie,
  nicht Teil des Repos. Die Domain `pflege-faktencheck.de` ist entgegen dem
  älteren Stand weiter oben in dieser Datei inzwischen bereits registriert
  und per Let's-Encrypt-Zertifikat live (kein offener Punkt mehr, nur hier
  noch nicht nachgetragen gewesen).

## Nachtrag 2026-11-16 (13) — JS-Lade-Signal als weitere Bot-Barriere
René-Frage "welche Barrieren ohne echte Nutzer zu blockieren" + Freigabe
("Ok") für die empfohlene Option: ein per JavaScript beim Seitenaufruf
ausgelöster Beacon (`navigator.sendBeacon('/beacon-geladen')`, neue
`location = /beacon-geladen { return 204; }` in nginx). Nur IPs, die
mindestens einmal diesen Request gesendet haben, zählen als echter
Seitenaufruf — reine HTTP-Tools ohne Browser-Engine (curl/requests/
aiohttp/die meisten bisher gefundenen Scraper) können das nicht aussenden,
egal wie gut sie Header fälschen.
- Isoliert mit synthetischen Daten verifiziert: Bot ohne Beacon → nicht
  gezählt, echter Besucher mit Beacon → gezählt.
- Live mit echtem Playwright-Durchlauf (0 Konsolenfehler) + parallelem
  curl-Request ohne JS getestet (beide liefen zufällig über dieselbe
  eigene IP, daher nur isolierter Funktionstest aussagekräftig, nicht der
  Live-Vergleich selbst).
- **[OFFEN, ehrlich benannt]:** Kein Allheilmittel — ein Bot, der den
  Beacon-Aufruf gezielt nachbaut (z.B. ein zweiter `fetch()`-Call direkt
  nach dem Haupt-Request), würde davon nicht erkannt. Filtert nur Tools,
  die gar kein JavaScript ausführen — das war aber die Mehrheit der
  heute gefundenen Fälle.

## Nachtrag 2026-11-16 (12) — Skalierbare Hosting-IP-Erkennung statt Handarbeit
René-Auftrag nach dem fünften einzeln per WHOIS entlarvten Bot an einem Tag
("Ja leg los" auf den Vorschlag einer fertigen Liste) + Nachfrage "warum
nur IPv4".

- **`hosting-ranges.txt`/`hosting-ranges-v6.txt`:** Einmalig heruntergeladene,
  lokal gebündelte Listen bekannter Hosting-/Rechenzentrums-IP-Bereiche
  (Quelle: `X4BNet/lists_vpn`, öffentlich, Community-gepflegt, Datacenter-
  Teil — 45.830 IPv4- + 8.590 IPv6-Bereiche). Kein Live-API-Call pro
  Besucher-IP, genau wie bei geoip-lite.
- **Verifiziert vor Einbau:** Stichprobe gegen alle 9 bisher per WHOIS
  bestätigten Hosting-IPs des Tages — 8 von 9 bereits in der Liste
  enthalten (nur Sundance International LLC fehlt, bleibt als einzelner
  Handeintrag bestehen). Deutlich präziser als die vorherige Hand-Regex
  (AWS/GCP/Fastly/Subnet Digital kommen jetzt automatisch aus der Liste).
- **IPv6-Nachtrag (René-Nachfrage):** Eigene BigInt-basierte Pruefung
  ergänzt (JS-Bitoperatoren sind auf 32 Bit begrenzt, reichen für IPv6
  nicht). Mit mehreren Testfällen auf dem Server verifiziert (Google-
  Cloud-IPv6-Bereich korrekt erkannt, `::1` korrekt NICHT erkannt).
- **Performance:** Kompletter Aggregator-Lauf inkl. ~54.000 IP-Bereichen
  weiterhin 262ms — kein Problem für den 5-Minuten-Timer.
- Live deployed, Testergebnis: 10/10 bekannte Hosting-IPs korrekt erkannt,
  3/3 echte ISPs korrekt durchgelassen.
- **[OFFEN]:** Liste ist ein einmaliger Download, kein automatisches
  Update-Mechanismus — Community-Listen wie diese ändern sich über Zeit
  (neue Hosting-Bereiche kommen dazu). Bei Bedarf künftig regelmäßig neu
  herunterladen.

## Nachtrag 2026-11-16 (11) — Flyer: weißer Seitenrand in der PDF behoben
René-Fund: Seitenkanten der Flyer-PDF weiß wie eine Papierkante. Echte
Pixelprüfung (fitz/PIL, nicht nur visuell geschätzt) bestätigte: eine
dünne, aber reale weiße Linie an rechter/unterer Kante — NICHT durch
Drucker-Hardware verursacht (René druckt nicht, sieht es direkt in der
Datei), sondern durch Chromiums `page.pdf()`-Druck-Pipeline selbst (ein
Screenshot derselben Seite war pixelgenau sauber bis zum Rand, die
PDF-Druckfunktion nicht — mehrere CSS-Fixversuche wie html-Hintergrund
und 1mm-Inhaltspuffer brachten keine Besserung, da der Fehler dort nicht
lag). Lösung: PDF nicht mehr über Chromiums Druckfunktion erzeugt, sondern
der bereits saubere Screenshot (4x Pixel-Dichte, ~384 DPI) direkt per PIL
als Einzelseiten-PDF mit exakter physischer Seitengröße gespeichert.
Pixelprüfung an allen 6 Kanten/Ecken danach einheitlich (18-20,26-27,38),
QR-Code erneut per OpenCV als scannbar bestätigt. Live ausgetauscht und
per Download-`diff` identisch bestätigt.
- **[KORREKTUR-POTENZIAL]:** Dieselbe Chromium-`page.pdf()`-Eigenheit
  könnte auch den ursprünglichen Sticker (`sticker-rund-final.png`, dort
  schon als Raster statt Live-PDF gebaut) oder andere künftige A6/A4-PDF-
  Exporte in diesem Silo betreffen — bei neuen Druckvorlagen vorsorglich
  denselben Screenshot-zu-PDF-Weg statt `page.pdf()` verwenden.

## Nachtrag 2026-11-16 (10) — Flyer v3 (Hilfe-Headline) live ausgetauscht
René-Freigabe nach Vorschau. Neue Version (Benefits + kleiner Footer-QR +
"Kostenlose Hilfe bei Pflegegrad, Pflegegeld & Co."-Headline) live unter
`flyer-pflege-faktencheck.pdf` ausgetauscht, per Download-Vergleich
(`diff`) identisch zur freigegebenen Datei bestätigt.

## Nachtrag 2026-11-16 (9) — Alle verbliebenen Bot-Signale ausgebaut
René-Fund "immer noch nur USA/Thailand/Belgien" + Auftrag "alle noch
möglichen Nicht-Mensch-Signale einbauen". Jede verbliebene Nicht-DE-IP per
WHOIS einzeln geprüft (ausnahmslos Bot oder Hosting-Rechenzentrum, kein
einziger nachgewiesener echter Mensch):
- `136.65.80.251` — Google Cloud, UA explizit "CMS-Checker/1.0" (Scanner).
- `27.145.179.200` — UA "understory/0.1 (CT research...)", kein
  "Mozilla/"-Präfix (kein echter Browser-String überhaupt).
- `216.38.230.121` — Sundance International LLC (AS40355, Hosting-ASN).
- `147.93.155.10` — Contabo GmbH (deutscher VPS-Anbieter).
- `205.169.39.157` — CenturyLink (echter US-Provider), aber **zwei
  unterschiedliche Windows/Chrome-Versionen von derselben IP** innerhalb
  kurzer Zeit — klassisches UA-Rotations-Muster eines Scrapers.

**Neue Filter in `stats-aggregate.js`:**
1. `hatEchtesBrowserPraefix()` — User-Agent muss mit "Mozilla/" beginnen
   (Konvention aller echten Browser seit den 1990ern), fängt rohe
   Nicht-Browser-Tools ohne jede Tarnung.
2. `BOT_RE` um `compatible;`, `checker`, `research` erweitert.
3. `findeRotierendeUaIps()` — IPs mit >1 verschiedenem User-Agent am selben
   Tag werden komplett ausgeschlossen (echtes Gerät wechselt nie Browser/OS
   mitten in einer Sitzung).
4. `BEKANNTE_HOSTING_IPS` — einzeln WHOIS-bestätigte Hosting-IPs ohne
   erkennbares Bot-UA-Muster (Sundance, Contabo).
5. **Accept-Language-Header:** Neues eigenes Nginx-Log-Format `pfk_log`
   (`/etc/nginx/conf.d/pflege-faktencheck-botblock.conf`, nicht im Repo)
   protokolliert jetzt zusätzlich `$http_accept_language` — echte Browser
   senden diesen Header immer automatisch, viele Bots nicht.
   `hatFehlendenAcceptLanguage()` schließt Zeilen mit leerem Header aus
   (alte Logzeilen vor der Umstellung werden NICHT bestraft, da dort das
   Feld technisch fehlt statt leer ist — sauber unterschieden).
- **Ergebnis:** Gesamtaufrufe heute nach allen Filtern: **0** — jeder
  bisherige Log-Treffer war nachweislich Bot/Hosting/eigener Test, kein
  einziger echter fremder Besuch. Live verifiziert (Playwright mit
  realistischer UA + Accept-Language-Header), 0 Konsolenfehler.
- **[OFFEN]:** Keine Burst-/Zeitfenster-Erkennung (mehrere Aufrufe derselben
  IP in sehr kurzer Zeit) umgesetzt — wäre die nächste sinnvolle
  Erweiterung, aber noch keine konkrete Beweislage dafür gefunden.

## Nachtrag 2026-11-16 (8) — Newsletter live deployed + echter IP-Irrtum korrigiert
René-Auftrag "jetzt komplett fertigstellen" (Newsletter) + Korrektur eines
eigenen Fehlers aus Nachtrag (6)/(7).

- **Korrektur:** `79.207.63.73` ist entgegen meiner vorherigen (falschen)
  Aussage **tatsächlich Renés echte IP** (diese Session läuft lokal auf
  seinem Mac, jeder Curl-/Playwright-Testaufruf lief über seinen echten
  Internetanschluss) — der Kommentar "das ist Claudes Sandbox" in
  `stats-aggregate.js` war ein Irrtum, jetzt korrigiert. Grund für die
  "Connection refused"-Fehler beim API-Test: Fail2Ban hatte genau diese IP
  gerade gesperrt (eigene Scanner-Test-Simulation) — entsperrt + zur
  `ignoreip`-Liste in `jail.local` hinzugefügt, damit das nicht wieder
  passiert.
- **Server-Deployment (devops-infra, nicht im Git-Repo):** `server/`-Code
  nach `/opt/pflege-fakten-server/` deployed, `npm install` (0
  Schwachstellen), eigene `.env` (PORT 4100, `JWT_SECRET`/`ADMIN_PIN_HASH`
  frisch generiert — PIN wurde René im Chat mitgeteilt, nicht gespeichert).
  Neuer systemd-Service `pflege-fakten-server` (dauerhaft, `node server.js`)
  + neuer systemd-Timer `pflege-fakten-crawl` (wöchentlich Montag 03:00,
  `node crawl.js`) — Testlauf durchgeführt, 6/7 Facts erfolgreich geprüft
  (1 toter Seed-Link `leistungen.pflegehilfsmittel`, 404 — vorbestehendes
  Datenproblem, nicht Teil dieses Auftrags). Nginx um `location /api/`
  (Reverse-Proxy zu `127.0.0.1:4100`, inkl. Bot-Blocking) und `location
  /admin` ergänzt.
- **Newsletter-Formular live auf der Webseite:** Neue Sektion vor dem
  Footer (E-Mail-Feld + DSGVO-Einwilligungs-Checkbox + "Abonnieren"-Button,
  bronze gestaltet analog bestehendem Markenstil). JS postet an
  `/api/newsletter/subscribe`. End-to-End mit echter Test-Adresse gegen
  die Live-API verifiziert: Anmeldung → DB-Eintrag korrekt → Bestätigungs-
  Link funktioniert → Abmelde-Link funktioniert. Test-Abonnent danach aus
  der echten Datenbank gelöscht (0 reale Abonnenten, ehrlicher Start).
- **SMTP ERLEDIGT (2026-11-16, direkt im Anschluss):** Erstes App-Passwort
  wurde von Google abgelehnt (535 BadCredentials) — Ursache: 2-Schritt-
  Verifizierung bei `pflegefaktencheck@gmail.com` lief zunächst nur über
  einen Passkey, ohne Telefonnummer/Authenticator als Zweitmethode (bei
  reinem Passkey blendet Google App-Passwörter komplett aus). René hat
  eine Telefonnummer als Zweitmethode ergänzt, neues App-Passwort erzeugt
  — `SMTP_USER`/`SMTP_APP_PASSWORD` in `/opt/pflege-fakten-server/.env`
  jetzt gesetzt, `node -e "transport.verify()"` bestätigt erfolgreichen
  SMTP-Login. **Kompletter echter Flow Ende-zu-Ende von René selbst
  bestätigt:** Anmeldung → echte Bestätigungsmail erhalten → Bestätigungs-
  Link geklickt → echte Willkommensmail erhalten. Test-Abonnent danach aus
  der echten Datenbank gelöscht (0 reale Abonnenten).
- **Willkommensmail (René-Auftrag, direkt im Anschluss):** Neue
  `mailer.sendWelcomeMail()` — wird im `/api/newsletter/confirm`-Endpunkt
  direkt nach erfolgreicher Bestätigung ausgelöst. Erklärt was künftig
  kommt (automatische SGB-XI/BMG/MD-Bund-Beobachtung, Original-Wortlaut,
  noch nicht redaktionell geprüft, kein fester Rhythmus) + Abmelde-Link.
  End-to-End erneut getestet (Anmeldung → Bestätigung → Log zeigt
  korrekten "SMTP fehlt"-Hinweis statt Absturz), Test-Abonnent danach
  wieder gelöscht.
- **[OFFEN]:** Toter Seed-Link `leistungen.pflegehilfsmittel` (404) sollte
  bei Gelegenheit durch eine aktuelle BMG-Quelle ersetzt werden. Admin-PIN
  wurde nur im Chat mitgeteilt, nicht in einer Datei gespeichert — falls
  René ihn vergisst: `node scripts/hash-pin.js <neue-pin>` auf dem Server,
  Hash in `.env` eintragen, Service neu starten.

## Nachtrag 2026-11-16 (6) — Diagramm-Fix, Verweildauer, Bot-Blocking, Firewall-Lücke geschlossen
René-Funde/Aufträge in einer Reihe: "Balkendiagramm nicht lesbar", "Verweildauer
ergänzen", "Bots blockieren", "meine IP ausschließen", "Firewall-Frage".

- **Balkendiagramm-Fix:** Bei nur 1 Tag Daten füllte ein einziger Balken die
  komplette Fläche (sah wie ein Farbfeld aus). Fix: feste Breite pro Tag
  (max. 34px) statt Gesamtbreite/Anzahl-Tage, Werte-Label über jedem Balken,
  Hinweistext unter 3 Tagen ("noch zu wenige Tage für einen Trend").
- **Verweildauer:** Neu per `navigator.sendBeacon('/beacon-dauer?ms=...')`
  beim Verlassen der Seite (`index.html`) — landet als normale Logzeile im
  bestehenden Nginx-Log (neue `location = /beacon-dauer { return 204; }`),
  kein neuer Server, kein Tracking-Pixel. `stats-aggregate.js` berechnet
  Durchschnitt (Obergrenze 2h gegen offen gelassene Tabs), neue Dashboard-
  KPI "Ø Verweildauer".
- **Echter Befund (René-Frage "warum USA mehr als Deutschland"):** Von den
  heutigen Aufrufen war NUR 1 ein eindeutig echter Mensch — der Rest Bots,
  die sich als Browser tarnen (Python/aiohttp von Google Cloud, "iPhone
  Safari"-UA von einem AWS-Server in Virginia, mehrere "iPhone Safari"-UAs
  über Cloudflare-IP-Bereich — Letzteres bewusst NICHT geblockt, da dort
  auch echtes Apple iCloud Private Relay läuft, eine Blockade würde echte
  deutsche Leser mit Datenschutz-Feature fälschlich aussperren).
- **Bot-Blocking (echtes 403, nicht nur Statistik-Filter):** Neue, isolierte
  `/etc/nginx/conf.d/pflege-faktencheck-botblock.conf` (betrifft nur dieses
  Silo) blockt bekannte Scraper-Signaturen (aiohttp/python-requests/curl/
  wget/scrapy/axios/okhttp/go-http-client/libwww-perl/node-fetch/leerer
  User-Agent/headlesschrome) — Googlebot/Bingbot/echte Browser bewusst NICHT
  blockiert (sonst keine Suchmaschinen-Indexierung mehr möglich). Zusätzlich
  die beiden konkret identifizierten AWS/GCP-IPs direkt per `deny` gesperrt.
  Verifiziert: aiohttp/curl → 403, Googlebot/echter Browser → 200.
- **Stats-Aggregator-Erweiterung:** `istCloudHostingIp()` (AWS/GCP-Bereiche,
  bewusst NICHT Cloudflare wegen Private-Relay) + `BEKANNTE_IPS`-Liste
  (konfigurierbar per `BEKANNTE_IPS`-Env-Var) schließen zusätzlich aus der
  Zählung aus, was nicht schon beim Nginx-Blocking abgefangen wird.
- **Korrektur (Selbstkorrektur, wichtig):** Die als "Renés eigene IP" markierte
  79.207.63.73 ist tatsächlich die Sandbox-IP von Claude während der
  Verifikation, NICHT Renés eigenes Gerät — fälschliche Annahme beim ersten
  Anlegen der Liste. Bleibt trotzdem sinnvoll ausgeschlossen (auch kein
  echter Publikums-Aufruf), aber René muss seine ECHTE IP separat ergänzen,
  falls sein eigenes Gerät auch ausgeschlossen werden soll.
- **Firewall-Fund:** UFW (port-basiert) deckt diese Domain automatisch mit ab.
  Fail2Ban-Jail `aeris-scanners` beobachtete bisher NUR das alte, geteilte
  Nginx-Log — seit der eigenen `access_log`-Direktive für diese Domain (s.
  Nachtrag 2) sah dieser Jail pflege-faktencheck.de gar nicht mehr. Behoben:
  `/var/log/nginx/pflege-faktencheck-access.log` als zweiten `logpath` in
  `jail.local` ergänzt (generischer Filter: wp-admin/.env/phpmyadmin/admin —
  kein AERIS-spezifischer Inhalt, unbedenklich). Live mit simuliertem
  Scanner-Angriff verifiziert (Sperre griff), danach eigene Test-IP wieder
  entsperrt.
- **[OFFEN]:** Renés echte eigene IP noch nicht bekannt/eingetragen. Cloudflare-
  Bereich (mögliche Bots über Private-Relay-Pfad) bleibt ungelöst — bräuchte
  echtes ASN-/Reputations-Lookup für eine sauberere Trennung.

## Nachtrag 2026-11-16 (7) — Bot-Filter-Nachschärfung + Verweildauer pro Aufruf
René-Fund nach (6): Bot-Zahlen waren trotz Filter weiterhin hoch (11 statt
erwartet niedriger). Per WHOIS echte Netz-Zugehörigkeit geklärt statt
geraten: `104.197.x.x` ist ebenfalls Google Cloud (Lücke geschlossen),
`140.248.x.x` ist Fastly (Apples zweiter Private-Relay-Anbieter neben
Cloudflare), `205.169.x.x` ist CenturyLink (echter US-Provider, kein
Hosting). René-Entscheidung nach Vorlage des Verhaltensmusters (identischer
User-Agent, wiederholte Selbst-Referer-Treffer binnen Minuten): Cloudflare
UND Fastly jetzt ebenfalls ausgeschlossen, Risiko vereinzelter echter
Private-Relay-Nutzer bewusst akzeptiert. Gesamtaufrufe dadurch von 11 auf 2
korrigiert.
- **Verweildauer pro Aufruf (nicht nur Durchschnitt):** Neue Liste
  `verweildauerJeAufruf` (Zeit, Land, Dauer — bewusst KEINE IP, konsistent
  mit dem Rest des Dashboards), max. 50 letzte Einträge, gleiche Bot-/Cloud-/
  Bekannte-IP-Filter wie bei den Seitenaufrufen. Neue Dashboard-Sektion
  "Verweildauer je Aufruf" mit Tabelle. Mit synthetischer Testzeile
  end-to-end verifiziert (Live-Rendering bestätigt, 0 Fehler), danach wieder
  aus dem echten Log entfernt.
- **[OFFEN]:** Renés echte IP weiterhin nicht bekannt. Keine Session-
  Zusammenführung bei mehreren Beacons derselben Person (jeder Beacon ist
  ein eigener Listeneintrag, auch bei mehreren Tabs/Besuchen).

## Nachtrag 2026-11-16 (5) — Flyer-Download: iOS-Safari öffnete nur Vorschau statt Download
René-Fund: Button "Flyer herunterladen" zeigte die PDF nur in der Safari-
Vorschau an, kein echter Download. Root Cause: der HTML `download`-
Attribut-Weg wird von iOS Safari grundsätzlich ignoriert (bekannte
WebKit-Einschränkung, kein Code-Fehler in `index.html`). Fix serverseitig
in `/etc/nginx/sites-available/pflege-faktencheck` (NICHT im Git-Repo,
Backup vor Änderung angelegt: `pflege-faktencheck.bak-20261116-135411`):
neue `location = /flyer-pflege-faktencheck.pdf`-Block mit
`add_header Content-Disposition "attachment; filename=..."` — erzwingt
den Download browserübergreifend, unabhängig vom HTML-Attribut.
Verifiziert: `curl -I` zeigt den Header, Playwright-Test löst einen
echten `download`-Event mit korrektem Dateinamen aus. `nginx -t` +
`systemctl reload nginx` sauber durchgelaufen.

**Ergänzung (René-Fund, direkt im Anschluss):** Download funktionierte
weiterhin nicht, wenn die Seite vom Home-Bildschirm aus geöffnet wird.
Root Cause: `apple-mobile-web-app-capable: yes` (bereits vorhanden,
`index.html` Zeile 14) schaltet den Home-Bildschirm-Modus in eine
abgespeckte WKWebView-Ansicht OHNE Safari-Werkzeugleiste — dort gibt es
keinen Download-/Teilen-Mechanismus, unabhängig vom Server-Header. Fix:
`target="_blank" rel="noopener"` auf dem Flyer-Link ergänzt — das
schickt den Klick gezielt in die echte Safari-App, wo der
`Content-Disposition`-Header normal funktioniert. Live deployed,
Link-Attribute per `curl` verifiziert.

## Nachtrag 2026-11-16 (4) — Dashboard: Bundesland/Stadt + Zugriffsquelle ergänzt
René-Aufträge "nicht nur Herkunftsland sondern auch Bundesland und Bezirke"
und "von wo aus die Seite aufgerufen wurde — direkt, Suche oder Social
Media". Echter Befund vorab mitgeteilt: die kostenlose Offline-GeoIP-Quelle
(`geoip-lite`) liefert KEINE echten Landkreise/Stadtbezirke, nur Stadtname
als feinste Stufe — René hat sich per Rückfrage explizit gegen einen
kostenpflichtigen Drittanbieter (echte Bezirksauflösung, laufende Kosten +
IP-Weitergabe) und für die kostenlose Variante entschieden.
- **Bundesland:** abgeleitet aus der aufgelösten Stadt über eine neue,
  verifizierte Stadt→Bundesland-Tabelle (`STADT_ZU_BUNDESLAND`, ~80 größte
  deutsche Städte) in `stats-aggregate.js` — bewusst NICHT über den opaken
  numerischen geoip-lite-Regioncode (Kodierung nicht zuverlässig
  dokumentiert, Raten wäre ein Governance-Verstoß).
- **Stadt:** direkt aus `geoip-lite`, als eigener Dashboard-Bereich.
- **Zugriffsquelle:** Direkt/Suchmaschine/Social Media/Sonstige Verweise,
  abgeleitet aus dem ohnehin bereits geloggten HTTP-Referer-Header — kein
  neuer Tracking-Code auf der öffentlichen Seite. Top-10-Liste externer
  Verweisdomains ("Sonstige Verweise") als Zusatzinfo.
- **Verifikation:** `node --check` auf dem Server sauber. Funktionsnachweis
  per synthetischen Testzeilen (Berlin/Nürnberg-IP, Google/Facebook/Direkt/
  Forum-Referer) im echten Log, Aggregator-Lauf bestätigte korrekte
  Klassifikation (4/4), Playwright gegen die echte Live-URL bestätigte
  korrektes Rendering aller neuen Bereiche, 0 Konsolenfehler. Testzeilen
  danach wieder aus dem echten Log entfernt — ehrlicher Nullpunkt
  (0 Aufrufe) wiederhergestellt, kein Datenbestand verfälscht.
- **[ERGÄNZUNG 2026-11-16, René-Auftrag "Unbekannt-Quote senken"]:**
  Stadt→Bundesland-Tabelle von ~80 auf 383 deutsche Städte erweitert
  (alle 16 Bundesländer, bis in mittelgroße Städte). Duplikat-Check
  (0 Treffer) + Funktionstest auf dem Server (Flensburg/Cottbus/
  Kaiserslautern korrekt aufgelöst, unbekannte Stadt liefert weiterhin
  `null` statt Rateergebnis) bestanden, `node --check` sauber, deployed.
- **[OFFEN]:** Tabelle deckt jetzt 383 Städte ab, aber nicht jeden der
  >2.000 deutschen Orte — bei sehr kleinen Gemeinden zeigt Bundesland
  weiterhin ggf. "Unbekannt (keine Stadtauflösung)", obwohl `geoip-lite`
  einen Stadtnamen gefunden hat, der nur nicht in der Tabelle steht.

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

## Nachtrag 2026-11-16 (3) — Zugriffsschutz-Korrektur: Basic-Auth entfernt
René-Direktive "ohne Registrierung oder Anmeldung" — der Basic-Auth-Login
war beim "Zum Home-Bildschirm"-Aufruf auf iOS unzuverlässig (eingebettete
URL-Credentials übersteht den Standalone-/WebClip-Kontext nicht verlässlich,
führte vermutlich erneut zum Login-Dialog statt direktem Öffnen). Ersetzt
durch einen langen zufälligen URL-Pfad (`openssl rand -hex 20`, 40 Hex-
Zeichen) — kein Anmeldedialog mehr, weiterhin nicht öffentlich verlinkt.
`.htpasswd` entfernt. Live verifiziert: alter `/dashboard/`-Pfad jetzt 404,
neuer Pfad liefert 200 ohne jede Authentifizierung, Playwright-Test im
echten Browser bestätigt fehlerfreies Laden + Datenabruf. In Safari erneut
geöffnet. Token selbst bewusst NICHT in diesem Git-Repo hinterlegt (René
hat ihn im Chat erhalten) — exakt dasselbe Prinzip wie zuvor beim Passwort.

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
