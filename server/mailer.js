// E-Mail-Versand (nodemailer/Brevo-SMTP-Relay).
// Robust: ein Mailfehler darf den Crawl-Lauf NIEMALS abbrechen, nur loggen.
// Umstieg von privatem Gmail-SMTP auf Brevo (2026-11-19, Rene-Entscheidung
// nach AVV-Pruefung): ein kostenloses @gmail.com-Konto bietet KEINEN
// Auftragsverarbeitungsvertrag nach Art. 28 DSGVO (nur Google-Workspace-
// Kunden erhalten diesen, primaerquellen-verifiziert gegen Googles eigenen
// DPA-Vertragstext). Brevo stellt den AVV auch im kostenlosen Tarif
// automatisch im Setup bereit, Server-Standort EU/Deutschland. BREVO_SMTP_LOGIN/
// BREVO_SMTP_KEY muss Rene selbst im Brevo-Dashboard erzeugen (kein Secret
// von Claude geraten/erfunden) -- ohne beide Werte ist dieses Feature
// lauffaehig gebaut, aber nicht funktionsfaehig (s. README).

var nodemailer = require('nodemailer');
var crypto = require('crypto');

function buildTransport() {
  if (!process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_KEY) return null;
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY
    }
  });
}

async function notifyNewDraft(fact, draft) {
  var transport = buildTransport();
  var to = process.env.NOTIFY_TO || 'pflegefaktencheck@gmail.com';
  var adminUrl = (process.env.ADMIN_PANEL_URL || '') + '/drafts/' + draft.id;
  var subject = 'Pflege-Fakten: neuer Entwurf — ' + fact.label;
  var text =
    'Ein neuer Aenderungs-Entwurf wurde erkannt.\n\n' +
    'Fact: ' + fact.label + ' (' + fact.id + ')\n' +
    'Quelle: ' + draft.source_url + '\n' +
    'Erkannt am: ' + draft.detected_at + '\n\n' +
    'Admin-Panel: ' + adminUrl + '\n\n' +
    'Hinweis: Dieser Fund wurde NICHT automatisch uebernommen und ist auf der ' +
    'oeffentlichen Seite noch nicht sichtbar. Erst nach manueller Pruefung und ' +
    'Freigabe (Stichtag + Pro/Contra-Text) im Admin-Panel wird er wirksam.';

  if (!transport) {
    console.error('[mailer] BREVO_SMTP_LOGIN/BREVO_SMTP_KEY fehlt in .env -- Mail NICHT gesendet. Betroffen: ' + fact.id);
    return { sent: false, reason: 'missing_smtp_credentials' };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || 'pflegefaktencheck@gmail.com',
      to: to,
      subject: subject,
      text: text
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Mailversand fehlgeschlagen fuer Draft ' + draft.id + ': ' + err.message);
    return { sent: false, reason: err.message };
  }
}

// Newsletter (Rene-Auftrag 2026-11-16): Double-Opt-In-Bestaetigung + automatischer
// Broadcast bei erkannter Rechtsaenderung aus einer der bereits vertrauten Quellen
// (SGB-XI-Gesetzestext/BMG/MD-Bund -- exakt die drei source_type-Werte aus facts).
// Bewusst KEINE eigene Zusammenfassung/Interpretation des Fundes -- nur der
// Original-Snapshot aus dem Crawl (sgbxi_html: echter Gesetzestext-Auszug;
// bmg_pdf/mdbund_pdf: ehrlicher "neues Dokument erkannt"-Hinweis, kein erfundener
// Inhalt) wird im Pflege-Faktencheck-Brand verschickt (Rene-Entscheidung
// "Wortlaut im Oton, aber im Brand von Pflege-Faktencheck").
var db = require('./db').db;

var BRONZE_GRADIENT = 'linear-gradient(135deg,#6B4423,#B87333,#E8C39E)';

function brandWrap(innerHtml) {
  return '<!doctype html><html lang="de"><body style="margin:0;background:#131B27;' +
    'font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
    '<table role="presentation" width="100%" style="max-width:560px" cellpadding="0" cellspacing="0">' +
    '<tr><td style="padding:28px 24px 8px">' +
    '<div style="font-weight:800;font-size:18px;background:' + BRONZE_GRADIENT + ';-webkit-background-clip:text;' +
    'background-clip:text;color:#B87333">Pflege-Faktencheck</div>' +
    '</td></tr><tr><td style="padding:0 24px 28px;color:#E7E2D6;font-size:14px;line-height:1.6">' +
    innerHtml +
    '</td></tr></table></td></tr></table></body></html>';
}

function zufallsToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function sendConfirmationMail(subscriber) {
  var transport = buildTransport();
  var siteUrl = process.env.SITE_URL || 'https://pflege-faktencheck.de';
  var confirmUrl = siteUrl + '/api/newsletter/confirm?token=' + subscriber.confirm_token;
  var html = brandWrap(
    '<p>Fast fertig — bitte bestätige deine Anmeldung zum Pflege-Faktencheck-Newsletter.</p>' +
    '<p style="margin:20px 0"><a href="' + confirmUrl + '" style="display:inline-block;padding:12px 22px;' +
    'border-radius:999px;background:' + BRONZE_GRADIENT + ';color:#131B27;font-weight:700;text-decoration:none">' +
    'Anmeldung bestätigen</a></p>' +
    '<p style="color:#9CADC9;font-size:12px">Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach — es passiert nichts weiter.</p>'
  );
  var text = 'Bitte bestätige deine Anmeldung zum Pflege-Faktencheck-Newsletter: ' + confirmUrl +
    '\n\nFalls du dich nicht angemeldet hast, ignoriere diese E-Mail.';

  if (!transport) {
    console.error('[mailer] SMTP fehlt -- Bestätigungsmail NICHT gesendet an ' + subscriber.email);
    return { sent: false, reason: 'missing_smtp_credentials' };
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || 'pflegefaktencheck@gmail.com', to: subscriber.email,
      subject: 'Bitte bestätigen: Pflege-Faktencheck-Newsletter', html: html, text: text
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Bestätigungsmail fehlgeschlagen für ' + subscriber.email + ': ' + err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendWelcomeMail(subscriber) {
  var transport = buildTransport();
  var siteUrl = process.env.SITE_URL || 'https://pflege-faktencheck.de';
  var unsubUrl = siteUrl + '/api/newsletter/unsubscribe?token=' + subscriber.unsubscribe_token;
  var html = brandWrap(
    '<p>Willkommen! Deine Anmeldung zum Pflege-Faktencheck-Newsletter ist bestätigt.</p>' +
    '<p style="font-weight:700;margin:20px 0 8px">Was du künftig bekommst:</p>' +
    '<p>Wir beobachten automatisch den SGB-XI-Gesetzestext, Dokumente des ' +
    'Bundesgesundheitsministeriums und Richtlinien des MD Bund. Wird dort eine mögliche ' +
    'Änderung erkannt, bekommst du eine Mail mit dem Original-Wortlaut der Quelle und einem ' +
    'Link zum direkten Nachlesen.</p>' +
    '<p style="color:#9CADC9;font-size:13px;background:#1A2536;border:1px solid rgba(124,147,184,.3);' +
    'border-radius:10px;padding:14px 16px;margin:16px 0">Wichtig: Diese Mails zeigen eine ' +
    'automatisch erkannte, noch NICHT redaktionell geprüfte mögliche Änderung — keine fertige ' +
    'Rechtsberatung. Die öffentliche Seite zeigt einen Wert erst nach manueller Prüfung an.</p>' +
    '<p>Wie oft das passiert, hängt davon ab, wie oft sich die Quellen tatsächlich ändern — ' +
    'kein fester Rhythmus, keine zusätzlichen Mails außer bei einem echten Fund.</p>' +
    '<hr style="border:none;border-top:1px solid rgba(124,147,184,.25);margin:24px 0">' +
    '<p style="color:#9CADC9;font-size:11px">Fragen? ' + (process.env.NOTIFY_TO || 'pflegefaktencheck@gmail.com') + '. ' +
    '<a href="' + unsubUrl + '" style="color:#9CADC9">Newsletter abmelden</a></p>'
  );
  var text = 'Willkommen beim Pflege-Faktencheck-Newsletter! Du bekommst künftig eine Mail, ' +
    'wenn im SGB-XI-Gesetzestext, bei BMG-Dokumenten oder MD-Bund-Richtlinien eine mögliche ' +
    'Änderung automatisch erkannt wird -- Original-Wortlaut, noch nicht redaktionell geprüft. ' +
    'Abmelden: ' + unsubUrl;

  if (!transport) {
    console.error('[mailer] SMTP fehlt -- Willkommensmail NICHT gesendet an ' + subscriber.email);
    return { sent: false, reason: 'missing_smtp_credentials' };
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || 'pflegefaktencheck@gmail.com', to: subscriber.email,
      subject: 'Willkommen beim Pflege-Faktencheck-Newsletter', html: html, text: text
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Willkommensmail fehlgeschlagen für ' + subscriber.email + ': ' + err.message);
    return { sent: false, reason: err.message };
  }
}

function snapshotAuszug(fact, draft) {
  if (fact.source_type === 'sgbxi_html' && draft.source_snapshot) {
    var text = draft.source_snapshot.slice(0, 500);
    return '<p style="background:#1A2536;border:1px solid rgba(124,147,184,.3);border-radius:10px;' +
      'padding:14px 16px;font-size:13px;color:#9CADC9;font-style:italic">„' + text +
      (draft.source_snapshot.length > 500 ? '…' : '') + '"</p>';
  }
  return '<p style="color:#9CADC9;font-size:13px">' + (draft.source_snapshot || 'Neues Dokument an der Quelle erkannt.') + '</p>';
}

async function broadcastLegalChange(fact, draft) {
  var transport = buildTransport();
  if (!transport) {
    console.error('[mailer] SMTP fehlt -- Newsletter-Broadcast NICHT gesendet für Draft ' + draft.id);
    return { sent: 0, failed: 0, reason: 'missing_smtp_credentials' };
  }
  var siteUrl = process.env.SITE_URL || 'https://pflege-faktencheck.de';
  var subscribers = db.prepare("SELECT * FROM subscribers WHERE status = 'confirmed'").all();
  var sent = 0, failed = 0;

  for (var i = 0; i < subscribers.length; i++) {
    var sub = subscribers[i];
    var unsubUrl = siteUrl + '/api/newsletter/unsubscribe?token=' + sub.unsubscribe_token;
    var html = brandWrap(
      '<p style="color:#E8C39E;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em">' +
      'Automatisch erkannte mögliche Änderung — noch nicht redaktionell geprüft</p>' +
      '<p style="font-size:16px;font-weight:700;margin:6px 0">' + fact.label + '</p>' +
      '<p style="color:#9CADC9;font-size:13px">' + fact.legal_basis + '</p>' +
      snapshotAuszug(fact, draft) +
      '<p><a href="' + draft.source_url + '" style="color:#B87333">→ Quelle direkt ansehen</a></p>' +
      '<hr style="border:none;border-top:1px solid rgba(124,147,184,.25);margin:24px 0">' +
      '<p style="color:#9CADC9;font-size:11px">Pflege-Faktencheck — privates, nicht-kommerzielles Informationsangebot ' +
      'von René Krieg. <a href="' + siteUrl + '/#impressum" style="color:#9CADC9">Impressum</a> · ' +
      '<a href="' + unsubUrl + '" style="color:#9CADC9">Newsletter abmelden</a></p>'
    );
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM || 'pflegefaktencheck@gmail.com', to: sub.email,
        subject: 'Mögliche Änderung erkannt: ' + fact.label, html: html
      });
      sent++;
    } catch (err) {
      failed++;
      console.error('[mailer] Broadcast an ' + sub.email + ' fehlgeschlagen: ' + err.message);
    }
    // Brevo-Free-Versandlimit (300/Tag) -- defensive kleine Pause zwischen Sends,
    // bei Wachstum darueber hinaus waere ein bezahlter Brevo-Tarif noetig.
    await new Promise(function (r) { setTimeout(r, 300); });
  }
  return { sent: sent, failed: failed };
}

module.exports = {
  notifyNewDraft: notifyNewDraft,
  sendConfirmationMail: sendConfirmationMail,
  sendWelcomeMail: sendWelcomeMail,
  broadcastLegalChange: broadcastLegalChange,
  zufallsToken: zufallsToken
};
