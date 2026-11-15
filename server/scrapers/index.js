// Einheitliche Schnittstelle: crawl(fact) -> {changed, snapshot, hash, httpStatus, error}
// Routing nach fact.source_type auf das jeweils passende Scraper-Modul.

var sgbxiHtml = require('./sgbxiHtml');
var bmgPdf = require('./bmgPdf');
var mdBundPdf = require('./mdBundPdf');

var SCRAPERS = {
  sgbxi_html: sgbxiHtml,
  bmg_pdf: bmgPdf,
  mdbund_pdf: mdBundPdf
};

async function crawlFact(fact) {
  var scraper = SCRAPERS[fact.source_type];
  if (!scraper) {
    return { changed: false, snapshot: null, hash: null, httpStatus: null, error: 'unknown_source_type: ' + fact.source_type };
  }
  return scraper.crawl(fact);
}

module.exports = { crawlFact: crawlFact };
