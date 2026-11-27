// Pflege-Fakten — SQLite-Setup (eigenstaendig, kein Code-Sharing mit AERIS).
// Stil (WAL-Modus, additive "CREATE TABLE IF NOT EXISTS"-Migrationen) orientiert
// sich an Projekte/aeris/server/db.js, aber eigenstaendig neu geschrieben.

var Database = require('better-sqlite3');
var crypto = require('crypto');

var DB_PATH = process.env.DB_PATH || './pflege-fakten.db';
var db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,                 -- stabiler Slug, z.B. leistungen.pg2.pflegegeld
  section_id TEXT NOT NULL,
  label TEXT NOT NULL,
  current_value TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('sgbxi_html','sgb12_html','bmg_pdf','mdbund_pdf')),
  source_url TEXT NOT NULL,
  last_crawl_hash TEXT,
  last_verified_at TEXT
);

-- drafts: ein Fund eines Crawl-Laufs, der von René manuell geprueft werden muss,
-- bevor er jemals auf der oeffentlichen Seite sichtbar wird. proposed_new_value/
-- proposed_effective_date bleiben bei PDF-Quellen (bmg_pdf/mdbund_pdf) UND bei der
-- reinen HTML-Hash-Erkennung (sgbxi_html) grundsaetzlich NULL -- kein Scraper hier
-- extrahiert automatisch einen neuen Zahlenwert. approved_effective_date UND
-- approved_new_value werden ERST beim approve final gesetzt (Renés manuelle Eingabe,
-- beide Pflichtfelder im POST /admin/drafts/:id/approve-Body) -- approved_new_value
-- ist der Wert, der ab dem Stichtag oeffentlich angezeigt wird (s. resolveEffectiveValue.js).
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  fact_id TEXT NOT NULL REFERENCES facts(id),
  detected_at TEXT NOT NULL,
  source_snapshot TEXT,
  source_url TEXT NOT NULL,
  proposed_new_value TEXT,
  proposed_effective_date TEXT,
  pros_text TEXT,
  cons_text TEXT,
  approved_effective_date TEXT,
  approved_new_value TEXT,            -- Renés manuell eingegebener neuer Wert, erst beim approve gesetzt
  approved_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','rejected','superseded'))
);

-- change_history: append-only Audit-Log jeder Statusaenderung eines Drafts.
-- Kein UPDATE/DELETE-Endpunkt -- nur INSERT, analog AERIS' audit_log-Muster.
CREATE TABLE IF NOT EXISTS change_history (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES drafts(id),
  fact_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  note TEXT
);

-- crawl_runs: Diagnose/Staleness-Sichtbarkeit je Quelle (unabhaengig davon, ob ein
-- Draft entstanden ist oder die Quelle unveraendert war).
CREATE TABLE IF NOT EXISTS crawl_runs (
  id TEXT PRIMARY KEY,
  fact_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  http_status INTEGER,
  content_hash TEXT,
  changed_vs_previous INTEGER NOT NULL DEFAULT 0,
  run_at TEXT NOT NULL,
  error_text TEXT
);

-- Login-Lockout fuer /admin/login, identisches Prinzip wie AERIS' login_sperre
-- (art='ip', da es nur einen einzigen Admin-Zugang gibt, kein User-Konto-Konzept).
CREATE TABLE IF NOT EXISTS login_sperre (
  art TEXT NOT NULL,
  schluessel TEXT NOT NULL,
  fehl INTEGER NOT NULL DEFAULT 0,
  bis TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (art, schluessel)
);

-- Newsletter-Abonnenten (Rene-Auftrag 2026-11-16, Double-Opt-In + 12-Klick-Abmeldung).
-- consent_given_at/consent_ip sind der Nachweis der Einwilligung (Art. 6 Abs. 1 lit. a
-- DSGVO, Nachweispflicht Art. 7 Abs. 1 DSGVO) -- NIE geloescht, solange der Datensatz
-- existiert, auch nach "unsubscribed" (sonst kein Nachweis mehr moeglich, dass die
-- Einwilligung je gegeben wurde). confirm_token wird nach erfolgreicher Bestaetigung
-- auf NULL gesetzt (kein nutzbarer Alt-Token mehr), unsubscribe_token bleibt dauerhaft
-- gueltig (1-Klick-Abmeldung muss jederzeit funktionieren, auch Jahre spaeter).
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation','confirmed','unsubscribed')),
  confirm_token TEXT,
  confirm_token_expires TEXT,
  unsubscribe_token TEXT NOT NULL,
  consent_given_at TEXT NOT NULL,
  consent_ip TEXT,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT
);
`);

// Additive Migration fuer bereits bestehende DB-Dateien von vor dem 'sgb12_html'-
// source_type (2026-11-27, Haushaltshilfe-Sozialamt-Abschnitt). SQLite kennt kein
// "ALTER TABLE ... DROP/MODIFY CONSTRAINT" -- einzig moeglicher Weg ist Tabelle
// neu anlegen + Daten kopieren + umbenennen, hier als atomare Transaktion mit
// kurzzeitig abgeschalteten Foreign Keys (noetig, da drafts/crawl_runs per
// fact_id auf facts verweisen und SQLite sonst das DROP verweigert).
(function migrateFactsSourceTypeCheck() {
  var row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='facts'").get();
  if (!row || !row.sql || row.sql.indexOf('sgb12_html') !== -1) return;
  db.pragma('foreign_keys = OFF');
  var tx = db.transaction(function () {
    db.exec(`
      CREATE TABLE facts_new (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        label TEXT NOT NULL,
        current_value TEXT NOT NULL,
        legal_basis TEXT NOT NULL,
        source_type TEXT NOT NULL CHECK (source_type IN ('sgbxi_html','sgb12_html','bmg_pdf','mdbund_pdf')),
        source_url TEXT NOT NULL,
        last_crawl_hash TEXT,
        last_verified_at TEXT
      );
    `);
    db.exec(
      'INSERT INTO facts_new (id, section_id, label, current_value, legal_basis, source_type, source_url, last_crawl_hash, last_verified_at) ' +
      'SELECT id, section_id, label, current_value, legal_basis, source_type, source_url, last_crawl_hash, last_verified_at FROM facts'
    );
    db.exec('DROP TABLE facts');
    db.exec('ALTER TABLE facts_new RENAME TO facts');
  });
  tx();
  db.pragma('foreign_keys = ON');
})();

// Additive Migration fuer bereits bestehende DB-Dateien von vor der approved_new_value-
// Spalte (SQLite kann Spalten nicht per "ADD COLUMN IF NOT EXISTS" pruefen -- daher
// manuell gegen pragma table_info prueofen, analog AERIS' additivem Migrations-Muster).
(function migrateApprovedNewValue() {
  var cols = db.prepare('PRAGMA table_info(drafts)').all().map(function (c) { return c.name; });
  if (cols.indexOf('approved_new_value') === -1) {
    db.exec('ALTER TABLE drafts ADD COLUMN approved_new_value TEXT');
  }
})();

function uuid() {
  return crypto.randomUUID();
}

// Seed: NUR 5-8 Beispiel-Fakten zum Testen (bewusst kein vollstaendiger ~30-40
// Fact-Katalog -- das ist laut Auftrag ein separater, eigener Folgeauftrag).
// Werte stammen aus index.html / bereits von René freigegebenen SGB-XI-Primaerquellen
// (Stand 2026, s. README "Seed-Daten"), KEIN frei erfundener Platzhalter.
var SEED_FACTS = [
  {
    id: 'leistungen.pflegegeld.pg2',
    section_id: 'leistungen',
    label: 'Pflegegeld Pflegegrad 2',
    current_value: '347 Euro/Monat',
    legal_basis: '§ 37 Abs. 1 SGB XI',
    source_type: 'sgbxi_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_11/__37.html'
  },
  {
    id: 'leistungen.pflegegeld.pg3',
    section_id: 'leistungen',
    label: 'Pflegegeld Pflegegrad 3',
    current_value: '599 Euro/Monat',
    legal_basis: '§ 37 Abs. 1 SGB XI',
    source_type: 'sgbxi_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_11/__37.html'
  },
  {
    id: 'leistungen.pflegegeld.pg4',
    section_id: 'leistungen',
    label: 'Pflegegeld Pflegegrad 4',
    current_value: '800 Euro/Monat',
    legal_basis: '§ 37 Abs. 1 SGB XI',
    source_type: 'sgbxi_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_11/__37.html'
  },
  {
    id: 'leistungen.pflegegeld.pg5',
    section_id: 'leistungen',
    label: 'Pflegegeld Pflegegrad 5',
    current_value: '990 Euro/Monat',
    legal_basis: '§ 37 Abs. 1 SGB XI',
    source_type: 'sgbxi_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_11/__37.html'
  },
  {
    id: 'leistungen.entlastungsbetrag',
    section_id: 'entlastungsbetrag',
    label: 'Entlastungsbetrag § 45b SGB XI',
    current_value: '131 Euro/Monat',
    legal_basis: '§ 45b Abs. 1 SGB XI',
    source_type: 'sgbxi_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_11/__45b.html'
  },
  {
    // Seit 1.7.2025 EIN gemeinsamer Jahresbetrag fuer Verhinderungs- UND
    // Kurzzeitpflege zusammen (ab Pflegegrad 2) -- KEIN zwei getrennte Toepfe
    // mehr (Rechtslage vor der Reform). Quelle: index.html Zeile 1336-1337.
    id: 'leistungen.verhinderungs_kurzzeitpflege_kombiniert',
    section_id: 'versorgungsformen',
    label: 'Verhinderungs- und Kurzzeitpflege (gemeinsamer Jahresbetrag)',
    current_value: '3.539 Euro/Jahr',
    legal_basis: '§ 42a SGB XI',
    source_type: 'sgbxi_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_11/__42a.html'
  },
  {
    id: 'leistungen.pflegehilfsmittel',
    section_id: 'pflegehilfsmittel',
    label: 'Zum Verbrauch bestimmte Pflegehilfsmittel',
    current_value: '42 Euro/Monat',
    legal_basis: '§ 40 Abs. 2 SGB XI',
    source_type: 'bmg_pdf',
    source_url: 'https://www.bundesgesundheitsministerium.de/fileadmin/Dateien/3_Downloads/Gesetze_und_Verordnungen/GuV/P/Pflegehilfsmittelverzeichnis.pdf'
  }
];

// Nachtrag 2026-11-27 (René-Auftrag): Fakten fuer den neuen Themenabschnitt
// "Haushaltshilfe ueber das Sozialamt" (index.html id="haushaltshilfe-sozialamt").
// Werte bereits in dieser Session per WebSearch gegen echte Primaerquellen
// verifiziert (s. handoff.md Nachtrag 2026-11-27, Regelbedarfsstufe 1 2026 /
// Schonvermoegen-Grenzen), hier nur als eigene facts-Zeilen nachgezogen, damit
// der bestehende crawl.js/Newsletter-Mechanismus auch diese Werte ueberwacht.
var SGB12_FACTS = [
  {
    id: 'sgb12.regelbedarfsstufe1',
    section_id: 'haushaltshilfe-sozialamt',
    label: 'Regelbedarfsstufe 1 (SGB XII)',
    current_value: '563 Euro/Monat',
    legal_basis: '§ 28 SGB XII i. V. m. Regelbedarfsstufen-Bekanntmachung',
    source_type: 'sgb12_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_12/__28.html'
  },
  {
    id: 'sgb12.schonvermoegen',
    section_id: 'haushaltshilfe-sozialamt',
    label: 'Schonvermögen (Hilfe zur Pflege, § 90 SGB XII)',
    current_value: '10.000 Euro (Grundfreibetrag), 20.000 Euro im Rahmen der Hilfe zur Pflege',
    legal_basis: '§ 90 Abs. 2 Nr. 9 SGB XII',
    source_type: 'sgb12_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_12/__90.html'
  },
  {
    id: 'sgb12.einkommensgrenze',
    section_id: 'haushaltshilfe-sozialamt',
    label: 'Einkommensgrenze § 85 SGB XII',
    current_value: '1.126 Euro zuzüglich der tatsächlichen Warmmiete',
    legal_basis: '§ 85 SGB XII',
    source_type: 'sgb12_html',
    source_url: 'https://www.gesetze-im-internet.de/sgb_12/__85.html'
  }
];

function seedIfEmpty() {
  var count = db.prepare('SELECT COUNT(*) AS n FROM facts').get().n;
  if (count > 0) return 0;
  var insert = db.prepare(
    'INSERT INTO facts (id, section_id, label, current_value, legal_basis, source_type, source_url, last_crawl_hash, last_verified_at) ' +
    'VALUES (?,?,?,?,?,?,?,NULL,?)'
  );
  var now = new Date().toISOString();
  var tx = db.transaction(function (rows) {
    rows.forEach(function (f) {
      insert.run(f.id, f.section_id, f.label, f.current_value, f.legal_basis, f.source_type, f.source_url, now);
    });
  });
  tx(SEED_FACTS);
  return SEED_FACTS.length;
}

// Additiv (kein count===0-Gate wie seedIfEmpty): fuegt die SGB12_FACTS-Zeilen
// nur ein, wenn ihre id noch nicht existiert -- sicher gegen Mehrfachaufruf bei
// jedem Serverstart UND gegen einen bereits befuellten Produktivbestand.
function seedSgb12IfMissing() {
  var insert = db.prepare(
    'INSERT INTO facts (id, section_id, label, current_value, legal_basis, source_type, source_url, last_crawl_hash, last_verified_at) ' +
    'VALUES (?,?,?,?,?,?,?,NULL,?)'
  );
  var exists = db.prepare('SELECT 1 FROM facts WHERE id = ?');
  var now = new Date().toISOString();
  var added = 0;
  SGB12_FACTS.forEach(function (f) {
    if (!exists.get(f.id)) {
      insert.run(f.id, f.section_id, f.label, f.current_value, f.legal_basis, f.source_type, f.source_url, now);
      added++;
    }
  });
  return added;
}

module.exports = { db: db, uuid: uuid, seedIfEmpty: seedIfEmpty, seedSgb12IfMissing: seedSgb12IfMissing };
