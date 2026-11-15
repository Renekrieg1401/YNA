// Pflege-Fakten — eigenstaendiger Fact-Change-Radar-Server.
// KEIN AERIS-Produkt, KEIN Code-/Auth-Sharing mit Projekte/aeris/server.
// Privates, nicht-kommerzielles Informationsangebot von René Krieg.

require('dotenv').config();

var express = require('express');
var cors = require('cors');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var dbMod = require('./db');
var db = dbMod.db;
var uuid = dbMod.uuid;
var resolveEffectiveValue = require('./lib/resolveEffectiveValue').resolveEffectiveValue;

var app = express();

// Genau EIN vertrauenswuerdiger Hop (der nginx-Reverse-Proxy von devops-infra) --
// analog AERIS-Server-Konvention (2026-11-02-Fix dort: 'true' ist zu permissiv,
// erlaubt XFF-Faelschung zur Lockout-Umgehung). Hier Wert 1 von Anfang an korrekt.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '256kb' }));

dbMod.seedIfEmpty();

var JWT_SECRET = process.env.JWT_SECRET;
var ADMIN_PIN_HASH = process.env.ADMIN_PIN_HASH;

// --- Login-Lockout (identisches Prinzip wie AERIS' login_sperre, art='ip' --
// es gibt nur einen einzigen Admin-Zugang, kein User-Konto-Konzept). ---
var LOCKOUT_MAX_FEHLVERSUCHE = 5;
var LOCKOUT_DAUER_MS = 15 * 60 * 1000;

function istGesperrt(key) {
  var row = db.prepare('SELECT bis FROM login_sperre WHERE art = ? AND schluessel = ?').get('ip', key);
  if (!row || !row.bis) return 0; // kein Lockout-Zeitpunkt gesetzt -- NICHT loeschen, Fehlzaehler soll weiterlaufen
  var bis = new Date(row.bis).getTime();
  if (bis <= Date.now()) {
    db.prepare('DELETE FROM login_sperre WHERE art = ? AND schluessel = ?').run('ip', key);
    return 0;
  }
  return bis;
}

function fehlversuchZaehlen(key) {
  var row = db.prepare('SELECT fehl FROM login_sperre WHERE art = ? AND schluessel = ?').get('ip', key);
  var fehl = (row ? row.fehl : 0) + 1;
  var bis = '';
  if (fehl >= LOCKOUT_MAX_FEHLVERSUCHE) { bis = new Date(Date.now() + LOCKOUT_DAUER_MS).toISOString(); fehl = 0; }
  db.prepare(
    'INSERT INTO login_sperre (art, schluessel, fehl, bis) VALUES (?,?,?,?) ' +
    'ON CONFLICT(art, schluessel) DO UPDATE SET fehl = excluded.fehl, bis = excluded.bis'
  ).run('ip', key, fehl, bis);
}

function entsperren(key) {
  db.prepare('DELETE FROM login_sperre WHERE art = ? AND schluessel = ?').run('ip', key);
}

app.post('/admin/login', function (req, res) {
  var ip = req.ip || 'unknown';
  var gesperrtBis = istGesperrt(ip);
  if (gesperrtBis) {
    return res.status(429).json({ error: 'locked', retryAfter: gesperrtBis });
  }
  if (!ADMIN_PIN_HASH) {
    return res.status(500).json({ error: 'server_not_configured' });
  }
  var pin = (req.body && req.body.pin) || '';
  if (!bcrypt.compareSync(String(pin), ADMIN_PIN_HASH)) {
    fehlversuchZaehlen(ip);
    return res.status(401).json({ error: 'invalid_pin' });
  }
  entsperren(ip);
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'server_not_configured' });
  }
  var token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token: token });
});

function requireAdmin(req, res, next) {
  var header = req.headers.authorization || '';
  var token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !JWT_SECRET) return res.status(401).json({ error: 'unauthorized' });
  try {
    var payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('wrong_role');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

// --- Admin: Drafts ---

app.get('/admin/drafts', requireAdmin, function (req, res) {
  var rows = db.prepare(
    'SELECT d.*, f.label AS fact_label, f.section_id AS fact_section_id FROM drafts d ' +
    'JOIN facts f ON f.id = d.fact_id ORDER BY d.detected_at DESC'
  ).all();
  res.json(rows);
});

app.get('/admin/drafts/:id', requireAdmin, function (req, res) {
  var row = db.prepare(
    'SELECT d.*, f.label AS fact_label, f.current_value AS fact_current_value FROM drafts d ' +
    'JOIN facts f ON f.id = d.fact_id WHERE d.id = ?'
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});

app.post('/admin/drafts/:id/approve', requireAdmin, function (req, res) {
  var draft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);
  if (!draft) return res.status(404).json({ error: 'not_found' });
  if (draft.status !== 'pending_review') return res.status(409).json({ error: 'not_pending' });

  var effectiveDate = req.body && req.body.effectiveDate;
  var prosText = req.body && req.body.prosText;
  var consText = req.body && req.body.consText;
  var newValue = req.body && req.body.newValue;
  if (!effectiveDate || !String(prosText || '').trim() || !String(consText || '').trim() || !String(newValue || '').trim()) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['effectiveDate', 'prosText', 'consText', 'newValue'] });
  }
  if (isNaN(new Date(effectiveDate).getTime())) {
    return res.status(400).json({ error: 'invalid_effective_date' });
  }

  var now = new Date().toISOString();
  var tx = db.transaction(function () {
    db.prepare(
      'UPDATE drafts SET status = ?, approved_effective_date = ?, approved_new_value = ?, approved_at = ?, pros_text = ?, cons_text = ? WHERE id = ?'
    ).run('approved', effectiveDate, newValue, now, prosText, consText, draft.id);
    db.prepare(
      'INSERT INTO change_history (id, draft_id, fact_id, from_status, to_status, changed_at, note) VALUES (?,?,?,?,?,?,?)'
    ).run(uuid(), draft.id, draft.fact_id, draft.status, 'approved', now, 'Freigegeben, Stichtag ' + effectiveDate);
  });
  tx();
  res.json({ ok: true });
});

app.post('/admin/drafts/:id/reject', requireAdmin, function (req, res) {
  var draft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id);
  if (!draft) return res.status(404).json({ error: 'not_found' });
  if (draft.status !== 'pending_review') return res.status(409).json({ error: 'not_pending' });

  var now = new Date().toISOString();
  var note = (req.body && req.body.note) || null;
  var tx = db.transaction(function () {
    db.prepare('UPDATE drafts SET status = ? WHERE id = ?').run('rejected', draft.id);
    db.prepare(
      'INSERT INTO change_history (id, draft_id, fact_id, from_status, to_status, changed_at, note) VALUES (?,?,?,?,?,?,?)'
    ).run(uuid(), draft.id, draft.fact_id, draft.status, 'rejected', now, note);
  });
  tx();
  res.json({ ok: true });
});

// --- Admin: Crawl-Diagnose ---

app.get('/admin/crawl-runs', requireAdmin, function (req, res) {
  // Letzter Lauf je Fact (jeder Fact hat genau eine Quelle/URL).
  var rows = db.prepare(
    'SELECT cr.* FROM crawl_runs cr ' +
    'WHERE cr.run_at = (SELECT MAX(cr2.run_at) FROM crawl_runs cr2 WHERE cr2.fact_id = cr.fact_id) ' +
    'ORDER BY cr.run_at DESC'
  ).all();
  res.json(rows);
});

// --- Public: Fakten ---

app.get('/api/public/facts', function (req, res) {
  var facts = db.prepare('SELECT * FROM facts').all();
  var now = new Date();
  var result = facts.map(function (fact) {
    var drafts = db.prepare("SELECT * FROM drafts WHERE fact_id = ? AND status = 'approved'").all(fact.id);
    var resolved = resolveEffectiveValue(fact, drafts, now);
    return {
      id: fact.id,
      section_id: fact.section_id,
      label: fact.label,
      value: resolved.value,
      legal_basis: fact.legal_basis,
      pendingOverlay: resolved.pendingOverlay
    };
  });
  res.json(result);
});

app.get('/health', function (req, res) {
  res.json({ ok: true, service: 'pflege-fakten-server' });
});

var PORT = process.env.PORT || 4100;
if (require.main === module) {
  app.listen(PORT, function () {
    console.log('pflege-fakten-server listening on :' + PORT);
  });
}

module.exports = app;
