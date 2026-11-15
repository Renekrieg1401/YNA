// Scraper fuer BMG-PDF-Quellen (z.B. Referentenentwuerfe, Verzeichnisse).
// Strukturell NUR ein Binaer-Aenderungs-Radar: erkennt "unter dieser URL liegt
// jetzt eine andere Datei", extrahiert NIEMALS Text/Zahlenwerte aus dem PDF.
// proposed_new_value UND proposed_effective_date bleiben beim Aufrufer IMMER
// NULL fuer diesen Quelltyp (s. crawl.js) -- jeder Fund braucht Renés manuelle
// Pruefung.

var crawlBinary = require('./binaryHash').crawlBinary;

async function crawl(fact) {
  return crawlBinary(fact, 'BMG');
}

module.exports = { crawl: crawl };
