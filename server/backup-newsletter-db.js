#!/usr/bin/env node
// Eigenstaendiges Backup-Skript fuer die Newsletter-SQLite-DB (business-consultant-
// Fund 2026-11-19: kein Backup-Mechanismus vorhanden -- ein Festplattenausfall
// loescht den gesamten Abonnentenstamm + alle Double-Opt-In-Einwilligungsnachweise
// ersatzlos). Startet SELBST keinen Scheduler -- Aufruf per
// `node backup-newsletter-db.js`. Wiederkehrende Ausfuehrung (taeglich) per
// systemd-Timer, analog pflege-fakten-cleanup.timer/pflege-fakten-crawl.timer.
//
// Nutzt `sqlite3 .backup` (nicht ein simples `cp`) -- WAL-sicher, liefert auch
// bei gleichzeitigen Schreibzugriffen durch den laufenden Server einen
// konsistenten Snapshot statt einer moeglicherweise korrupten Kopie.
// Retention: die letzten 14 taeglichen Backups bleiben erhalten, aeltere werden
// entfernt -- verhindert unbegrenztes Plattenwachstum ohne komplett ohne
// Verlaufshistorie dazustehen.

var fs = require('fs');
var path = require('path');
var execFileSync = require('child_process').execFileSync;

var DB_PATH = process.env.NEWSLETTER_DB_PATH || path.join(__dirname, 'pflege-fakten.db');
var BACKUP_DIR = process.env.NEWSLETTER_BACKUP_DIR || path.join(__dirname, 'backups');
var RETENTION_TAGE = 14;

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('[backup] DB nicht gefunden: ' + DB_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  }

  var stempel = new Date().toISOString().replace(/[:.]/g, '-');
  var zielPfad = path.join(BACKUP_DIR, 'pflege-fakten-' + stempel + '.db');

  execFileSync('sqlite3', [DB_PATH, '.backup ' + "'" + zielPfad + "'"], { timeout: 30000 });
  fs.chmodSync(zielPfad, 0o600);

  var groesse = fs.statSync(zielPfad).size;
  console.log('[backup] Erstellt: ' + zielPfad + ' (' + groesse + ' Bytes)');

  // Retention: nur die letzten RETENTION_TAGE Backups behalten.
  var alle = fs.readdirSync(BACKUP_DIR)
    .filter(function (f) { return /^pflege-fakten-.*\.db$/.test(f); })
    .map(function (f) { return { name: f, zeit: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }; })
    .sort(function (a, b) { return b.zeit - a.zeit; });
  alle.slice(RETENTION_TAGE).forEach(function (f) {
    fs.unlinkSync(path.join(BACKUP_DIR, f.name));
    console.log('[backup] Alt entfernt: ' + f.name);
  });
}

main();
