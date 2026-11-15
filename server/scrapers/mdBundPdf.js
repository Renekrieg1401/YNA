// Scraper fuer MD-Bund-PDF-Quellen (z.B. Qualitaetspruefungs-Richtlinien/QPR).
// Identisches Prinzip wie bmgPdf.js (reiner Binaer-Aenderungs-Radar, kein
// Text-/Wert-Extrakt) -- eigenes Modul, damit Anpassungen an die MD-Bund-Seite
// unabhaengig von der BMG-Seite moeglich bleiben.

var crawlBinary = require('./binaryHash').crawlBinary;

async function crawl(fact) {
  return crawlBinary(fact, 'MD Bund');
}

module.exports = { crawl: crawl };
