// Scraper fuer SGB-XI-Paragraphen auf gesetze-im-internet.de.
// Erkennt NUR "hat sich der Gesetzestext-Koerper veraendert" -- extrahiert NIEMALS
// automatisch einen neuen Zahlenwert. proposed_new_value bleibt beim Aufrufer immer
// NULL fuer diesen Quelltyp (s. crawl.js).

var cheerio = require('cheerio');
var crypto = require('crypto');

// Elemente, die zuverlaessig NICHT zum eigentlichen Paragraphentext gehoeren --
// vorab entfernen, sonst False Positives bei jeder kosmetischen Seitenaenderung
// (Navigation, Footer, Cookie-Banner, Datum-Widgets etc.).
var NOISE_SELECTORS = [
  'script', 'style', 'nav', 'header', 'footer',
  '[id*="nav" i]', '[class*="nav" i]',
  '[id*="footer" i]', '[class*="footer" i]',
  '[id*="header" i]', '[class*="header" i]',
  '[id*="breadcrumb" i]', '[class*="breadcrumb" i]',
  '[class*="banner" i]', '[class*="cookie" i]'
];

function extractParagraphText(html) {
  var $ = cheerio.load(html);
  NOISE_SELECTORS.forEach(function (sel) {
    try { $(sel).remove(); } catch (e) { /* ungueltiger Selektor je nach Seite -- ignorieren */ }
  });
  // gesetze-im-internet.de haelt den Normtext ueblicherweise in einem
  // Container mit Klasse "jnhtml" bzw. innerhalb von "#container" -- falls
  // dieser nicht gefunden wird, defensiv auf den restlichen <body>-Text
  // zurueckfallen (nach Noise-Entfernung immer noch brauchbar).
  var container = $('.jnhtml').length ? $('.jnhtml') : ($('#container').length ? $('#container') : $('body'));
  var text = container.text();
  // Whitespace normalisieren, damit reine Formatierungsaenderungen (doppelte
  // Leerzeichen, Zeilenumbrueche) nicht als inhaltliche Aenderung zaehlen.
  return text.replace(/\s+/g, ' ').trim();
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function crawl(fact) {
  var res;
  try {
    res = await fetch(fact.source_url, { headers: { 'User-Agent': 'Pflege-Fakten-Crawler/1.0 (+r.krieg.home@gmail.com)' } });
  } catch (err) {
    return { changed: false, snapshot: null, hash: null, httpStatus: null, error: 'fetch_failed: ' + err.message };
  }
  if (!res.ok) {
    return { changed: false, snapshot: null, hash: null, httpStatus: res.status, error: 'http_' + res.status };
  }
  var html = await res.text();
  var snapshot = extractParagraphText(html);
  var hash = sha256(snapshot);
  var changed = !!fact.last_crawl_hash && fact.last_crawl_hash !== hash;
  return { changed: changed, snapshot: snapshot.slice(0, 4000), hash: hash, httpStatus: res.status, error: null };
}

module.exports = { crawl: crawl };
