#!/usr/bin/env node
// Eigenstaendiges Cleanup-Skript: loescht Newsletter-Datensaetze, die laut
// Datenschutzerklaerung nicht laenger als noetig gespeichert werden duerfen
// (DSGVO Art. 5 Abs. 1 lit. e, Speicherbegrenzung). Startet SELBST keinen
// Scheduler -- Aufruf per `node cleanup-newsletter.js`. Wiederkehrende
// Ausfuehrung (taeglich) per systemd-Timer, analog pflege-fakten-crawl.timer.
//
// Zwei Faelle:
// 1. status='unsubscribed' UND unsubscribed_at laenger als 30 Tage her ->
//    vollstaendig geloescht. Die 30 Tage dienen als Nachweisfrist fuer den
//    Widerruf selbst (falls es Rueckfragen gibt), nicht als Marketing-Sperre.
// 2. status='pending_confirmation' UND confirm_token_expires laenger als
//    7 Tage abgelaufen -> vollstaendig geloescht (nie bestaetigte Anmeldung,
//    kein Grund zur Aufbewahrung ueber die Token-Gueltigkeit hinaus).

require('dotenv').config();

var dbMod = require('./db');
var db = dbMod.db;

var UNSUBSCRIBED_AUFBEWAHRUNG_TAGE = 30;
var PENDING_AUFBEWAHRUNG_TAGE = 7;

function run() {
  var jetzt = Date.now();
  var unsubscribedGrenze = new Date(jetzt - UNSUBSCRIBED_AUFBEWAHRUNG_TAGE * 24 * 60 * 60 * 1000).toISOString();
  var pendingGrenze = new Date(jetzt - PENDING_AUFBEWAHRUNG_TAGE * 24 * 60 * 60 * 1000).toISOString();

  var gel1 = db.prepare(
    "DELETE FROM subscribers WHERE status = 'unsubscribed' AND unsubscribed_at IS NOT NULL AND unsubscribed_at < ?"
  ).run(unsubscribedGrenze);

  var gel2 = db.prepare(
    "DELETE FROM subscribers WHERE status = 'pending_confirmation' AND confirm_token_expires IS NOT NULL AND confirm_token_expires < ?"
  ).run(pendingGrenze);

  console.log(
    new Date().toISOString() + ' cleanup-newsletter: ' +
    gel1.changes + ' abgemeldete (>' + UNSUBSCRIBED_AUFBEWAHRUNG_TAGE + 'd) + ' +
    gel2.changes + ' nie bestaetigte (>' + PENDING_AUFBEWAHRUNG_TAGE + 'd) Datensaetze geloescht.'
  );
}

run();
