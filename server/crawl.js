#!/usr/bin/env node
// Eigenstaendiges Crawl-Skript: einmal alle Facts durchlaufen, Drafts/E-Mails
// erzeugen. Startet SELBST keinen Scheduler/Cron -- Aufruf per `node crawl.js`.
// Wiederkehrende Ausfuehrung (woechentlich) wird separat per systemd-Timer
// eingerichtet (devops-infra-Aufgabe, analog aeris-backup.timer) -- s. README.

require('dotenv').config();

var dbMod = require('./db');
var db = dbMod.db;
var uuid = dbMod.uuid;
var crawlFact = require('./scrapers').crawlFact;
var notifyNewDraft = require('./mailer').notifyNewDraft;

async function run() {
  dbMod.seedIfEmpty();
  var facts = db.prepare('SELECT * FROM facts').all();
  var now = new Date().toISOString();

  for (var i = 0; i < facts.length; i++) {
    var fact = facts[i];
    var result;
    try {
      result = await crawlFact(fact);
    } catch (err) {
      result = { changed: false, snapshot: null, hash: null, httpStatus: null, error: 'crawl_threw: ' + err.message };
    }

    db.prepare(
      'INSERT INTO crawl_runs (id, fact_id, source_type, target_url, http_status, content_hash, changed_vs_previous, run_at, error_text) ' +
      'VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(uuid(), fact.id, fact.source_type, fact.source_url, result.httpStatus, result.hash, result.changed ? 1 : 0, now, result.error);

    if (result.error) {
      console.error('[crawl] Fehler bei ' + fact.id + ': ' + result.error);
      continue;
    }

    // Baseline/Hash immer fortschreiben, unabhaengig davon ob sich etwas
    // geaendert hat -- last_verified_at zeigt, dass der Crawl erfolgreich lief.
    db.prepare('UPDATE facts SET last_crawl_hash = ?, last_verified_at = ? WHERE id = ?').run(result.hash, now, fact.id);

    if (!result.changed) continue;

    var draftId = uuid();
    var draft = {
      id: draftId,
      fact_id: fact.id,
      detected_at: now,
      source_snapshot: result.snapshot,
      source_url: fact.source_url,
      proposed_new_value: null, // kein Scraper extrahiert automatisch einen Wert (s. Auftrag)
      proposed_effective_date: null,
      status: 'pending_review'
    };
    db.prepare(
      'INSERT INTO drafts (id, fact_id, detected_at, source_snapshot, source_url, proposed_new_value, proposed_effective_date, status) ' +
      'VALUES (?,?,?,?,?,?,?,?)'
    ).run(draft.id, draft.fact_id, draft.detected_at, draft.source_snapshot, draft.source_url, draft.proposed_new_value, draft.proposed_effective_date, draft.status);

    db.prepare(
      'INSERT INTO change_history (id, draft_id, fact_id, from_status, to_status, changed_at, note) VALUES (?,?,?,?,?,?,?)'
    ).run(uuid(), draft.id, fact.id, null, 'pending_review', now, 'Neuer Entwurf durch Crawl erkannt');

    console.log('[crawl] Aenderung erkannt: ' + fact.id + ' -> Draft ' + draft.id);

    try {
      var mailResult = await notifyNewDraft(fact, draft);
      if (!mailResult.sent) {
        console.error('[crawl] Mailversand nicht erfolgt (' + mailResult.reason + ') -- Crawl-Lauf wird dadurch NICHT abgebrochen.');
      }
    } catch (err) {
      console.error('[crawl] Mailversand warf einen Fehler: ' + err.message + ' -- Crawl-Lauf wird dadurch NICHT abgebrochen.');
    }
  }

  console.log('[crawl] Lauf abgeschlossen: ' + facts.length + ' Facts geprueft.');
}

run().then(function () {
  process.exit(0);
}).catch(function (err) {
  console.error('[crawl] Unerwarteter Fehler im Lauf: ' + err.message);
  process.exit(1);
});
