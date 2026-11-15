// Gemeinsamer Kern fuer die beiden PDF-Scraper (bmgPdf.js/mdBundPdf.js) --
// beide sind strukturell identisch (Binaerhash einer PDF-URL), bleiben aber als
// zwei eigene Dateien bestehen (Auftrag: ein eigenes Modul je Quelltyp), damit
// jede Quelle unabhaengig voneinander angepasst werden kann, falls sich das
// Zielformat einer der beiden Institutionen (BMG/MD Bund) spaeter unterscheidet.

var crypto = require('crypto');

async function crawlBinary(fact, label) {
  var res;
  try {
    res = await fetch(fact.source_url, { headers: { 'User-Agent': 'Pflege-Fakten-Crawler/1.0 (+r.krieg.home@gmail.com)' } });
  } catch (err) {
    return { changed: false, snapshot: null, hash: null, httpStatus: null, error: 'fetch_failed: ' + err.message };
  }
  if (!res.ok) {
    return { changed: false, snapshot: null, hash: null, httpStatus: res.status, error: 'http_' + res.status };
  }
  var buf = Buffer.from(await res.arrayBuffer());
  var hash = crypto.createHash('sha256').update(buf).digest('hex');
  var changed = !!fact.last_crawl_hash && fact.last_crawl_hash !== hash;
  // Strukturell nur ein Aenderungs-Radar: kein Text/PDF-Parsing, kein Wert-Extrakt.
  var snapshot = 'Neues Dokument unter dieser URL erkannt (' + label + '). Bitte manuell pruefen: ' + fact.source_url;
  return { changed: changed, snapshot: snapshot, hash: hash, httpStatus: res.status, error: null };
}

module.exports = { crawlBinary: crawlBinary };
