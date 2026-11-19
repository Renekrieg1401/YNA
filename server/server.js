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
var crypto = require('crypto');
var mailer = require('./mailer');

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

// --- Public: Newsletter (Rene-Auftrag 2026-11-16, Double-Opt-In + 1-Klick-Abmeldung) ---

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var CONFIRM_TOKEN_GUELTIG_MS = 48 * 60 * 60 * 1000; // 48h
var RESEND_SPERRE_MS = 5 * 60 * 1000; // verhindert Mail-Bombing einer fremden Adresse

function brandSeite(titel, text) {
  return '<!doctype html><html lang="de"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + titel + ' — Pflege-Faktencheck</title>' +
    '<meta name="robots" content="noindex, nofollow"></head>' +
    '<body style="margin:0;background:#131B27;color:#E7E2D6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;' +
    'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
    '<div style="max-width:420px;text-align:center">' +
    '<div style="font-weight:800;font-size:18px;background:linear-gradient(135deg,#6B4423,#B87333,#E8C39E);' +
    '-webkit-background-clip:text;background-clip:text;color:#B87333;margin-bottom:18px">Pflege-Faktencheck</div>' +
    '<h1 style="font-size:1.1rem">' + titel + '</h1><p style="color:#9CADC9;font-size:.9rem">' + text + '</p>' +
    '<p><a href="/" style="color:#B87333;font-size:.85rem">← Zurück zur Seite</a></p></div></body></html>';
}

// Rate-Limit + Antwort-Vereinheitlichung (security-privacy-Fund 2026-11-19):
// (1) kein Limit existierte -- beliebige Drittadressen liessen sich per Skript
// mit Bestaetigungsmails ueber Renés eigenes Gmail-Postfach "bomben". Einfacher
// In-Memory-Sliding-Window (kein neues DB-Schema/Paket noetig fuer diesen
// Low-Traffic-Endpunkt) -- 5 Versuche je IP pro 10 Minuten reichen fuer echte
// Formularnutzung, blockieren aber Skript-Spam.
// (2) Die Response verriet bisher per unterschiedlichem "status"-Feld, ob eine
// E-Mail-Adresse bereits Abonnent ist (Subscriber-Enumeration) -- alle
// Erfolgsfaelle liefern jetzt dieselbe generische Antwort, das interne
// Verhalten (Resend-Sperre, kein Mehrfachversand) bleibt unveraendert.
var NEWSLETTER_RATE_MAX = 5;
var NEWSLETTER_RATE_FENSTER_MS = 10 * 60 * 1000;
var newsletterVersucheProIp = new Map();
function newsletterRateLimitErreicht(ip) {
  var jetzt = Date.now();
  var eintrag = newsletterVersucheProIp.get(ip);
  if (!eintrag || jetzt - eintrag.start > NEWSLETTER_RATE_FENSTER_MS) {
    newsletterVersucheProIp.set(ip, { start: jetzt, anzahl: 1 });
    return false;
  }
  eintrag.anzahl++;
  return eintrag.anzahl > NEWSLETTER_RATE_MAX;
}

app.post('/api/newsletter/subscribe', function (req, res) {
  var ip = req.ip || 'unknown';
  if (newsletterRateLimitErreicht(ip)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  var email = String((req.body && req.body.email) || '').trim().toLowerCase();
  var consent = req.body && req.body.consent === true;
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!consent) {
    return res.status(400).json({ error: 'consent_required' });
  }

  var ANTWORT_OK = { ok: true, status: 'request_received' };
  var now = new Date();
  var nowIso = now.toISOString();
  var existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email);

  if (existing && existing.status === 'confirmed') {
    return res.json(ANTWORT_OK);
  }
  if (existing && existing.status === 'pending_confirmation') {
    var zuletzt = new Date(existing.created_at).getTime();
    if (now.getTime() - zuletzt < RESEND_SPERRE_MS) {
      return res.json(ANTWORT_OK);
    }
    var neuerToken = crypto.randomBytes(24).toString('hex');
    db.prepare('UPDATE subscribers SET confirm_token = ?, confirm_token_expires = ?, created_at = ? WHERE email = ?')
      .run(neuerToken, new Date(now.getTime() + CONFIRM_TOKEN_GUELTIG_MS).toISOString(), nowIso, email);
    mailer.sendConfirmationMail({ email: email, confirm_token: neuerToken }).catch(function () {});
    return res.json(ANTWORT_OK);
  }

  var row = {
    id: uuid(),
    email: email,
    confirm_token: crypto.randomBytes(24).toString('hex'),
    confirm_token_expires: new Date(now.getTime() + CONFIRM_TOKEN_GUELTIG_MS).toISOString(),
    unsubscribe_token: crypto.randomBytes(24).toString('hex'),
    consent_given_at: nowIso,
    consent_ip: req.ip || null,
    created_at: nowIso
  };
  db.prepare(
    'INSERT INTO subscribers (id, email, confirm_token, confirm_token_expires, unsubscribe_token, consent_given_at, consent_ip, created_at) ' +
    'VALUES (?,?,?,?,?,?,?,?)'
  ).run(row.id, row.email, row.confirm_token, row.confirm_token_expires, row.unsubscribe_token, row.consent_given_at, row.consent_ip, row.created_at);

  mailer.sendConfirmationMail(row).catch(function (err) {
    console.error('[newsletter] Bestätigungsmail-Fehler: ' + err.message);
  });
  res.json(ANTWORT_OK);
});

app.get('/api/newsletter/confirm', function (req, res) {
  var token = String(req.query.token || '');
  var sub = db.prepare('SELECT * FROM subscribers WHERE confirm_token = ?').get(token);
  if (!sub) {
    return res.status(404).send(brandSeite('Link ungültig', 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.'));
  }
  if (new Date(sub.confirm_token_expires).getTime() < Date.now()) {
    return res.status(410).send(brandSeite('Link abgelaufen', 'Dieser Bestätigungslink ist abgelaufen. Bitte melde dich erneut auf der Seite an.'));
  }
  db.prepare("UPDATE subscribers SET status = 'confirmed', confirmed_at = ?, confirm_token = NULL WHERE id = ?")
    .run(new Date().toISOString(), sub.id);
  mailer.sendWelcomeMail(sub).catch(function (err) {
    console.error('[newsletter] Willkommensmail-Fehler: ' + err.message);
  });
  res.send(brandSeite('Angemeldet', 'Deine Anmeldung zum Pflege-Faktencheck-Newsletter ist bestätigt. Du erhältst künftig eine Mail, wenn eine mögliche Rechtsänderung erkannt wird.'));
});

app.get('/api/newsletter/unsubscribe', function (req, res) {
  var token = String(req.query.token || '');
  var sub = db.prepare('SELECT * FROM subscribers WHERE unsubscribe_token = ?').get(token);
  if (!sub) {
    return res.status(404).send(brandSeite('Link ungültig', 'Dieser Abmelde-Link ist ungültig.'));
  }
  if (sub.status !== 'unsubscribed') {
    db.prepare("UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ? WHERE id = ?")
      .run(new Date().toISOString(), sub.id);
  }
  res.send(brandSeite('Abgemeldet', 'Du erhältst keine weiteren Newsletter-Mails von Pflege-Faktencheck mehr.'));
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
