// E-Mail-Benachrichtigung bei neuem Draft (nodemailer/Gmail-SMTP).
// Robust: ein Mailfehler darf den Crawl-Lauf NIEMALS abbrechen, nur loggen.
// Echtes Gmail-App-Passwort kann nur René selbst erzeugen (Google-
// Kontoeinstellungen) -- ohne SMTP_USER/SMTP_APP_PASSWORD ist dieses Feature
// lauffaehig gebaut, aber nicht funktionsfaehig (s. README).

var nodemailer = require('nodemailer');

function buildTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD
    }
  });
}

async function notifyNewDraft(fact, draft) {
  var transport = buildTransport();
  var to = process.env.NOTIFY_TO || 'r.krieg.home@gmail.com';
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
    console.error('[mailer] SMTP_USER/SMTP_APP_PASSWORD fehlt in .env -- Mail NICHT gesendet. Betroffen: ' + fact.id);
    return { sent: false, reason: 'missing_smtp_credentials' };
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_USER,
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

module.exports = { notifyNewDraft: notifyNewDraft };
