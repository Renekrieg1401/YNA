// Pflege-Faktencheck -- Besucher-Statistik-Aggregator (René-Auftrag 2026-11-16,
// "Dashboard zur Monetarisierungs-Ueberwachung: Aufrufe, Regionen, 12-Monats-Prognose").
//
// Liest das EIGENE Nginx-Access-Log dieser Domain (seit 2026-11-16 per eigenem
// access_log-Direktive von den uebrigen Silos auf demselben Server getrennt -- vorher
// gab es KEINE isolierbare Datenquelle, das Server-weite Default-Log mischte alle
// vhosts). Kein Tracking-Pixel, kein externer Analytics-Dienst, kein GDPR-Zusatzrisiko
// ueber das bereits bestehende Server-Log hinaus.
//
// GeoIP: geoip-lite (offline, MaxMind-GeoLite2-Datenbasis gebuendelt) -- KEINE externe
// API pro Besucher-IP, kein zusaetzlicher Kostenpunkt, keine IP-Weitergabe an Dritte.
// Nur Land/Region wird abgeleitet, nie gespeichert als eigener Personenbezug ueber das
// Log hinaus (das Log selbst unterliegt ohnehin der bestehenden, im Server-Betrieb
// ueblichen Protokollierung).
//
// IP-Validierung VOR geoip.lookup(): bekannte ip-address-Bibliotheks-Schwachstellen
// (ReDoS/Parsing bei manipulierten IPv6-Strings) behoben durch npm audit fix, zusaetzlich
// hier defensiv nur syntaktisch gueltige IPv4/IPv6-Strings an geoip-lite weitergereicht.
var fs = require('fs');
var path = require('path');
var geoip = require('geoip-lite');

var LOG_PATH = '/var/log/nginx/pflege-faktencheck-access.log';
var OUT_PATH = path.join(__dirname, 'public', 'stats.json');
var LAUNCH_DATE = '2026-11-15'; // Domain-Live-Schaltung, s. handoff.md Nachtrag (5)
// Eigenes Access-Log existiert erst ab diesem Zeitpunkt (René-Auftrag 2026-11-16) -- VORHER
// liefen alle vhosts auf diesem Server im SELBEN geteilten Default-Log ohne Host-Trennung,
// eine zuverlaessige Zuordnung "das war wirklich diese Domain" war nicht moeglich. Bewusst
// KEIN Backfill aus dem alten geteilten Log -- darin waren auch eigene Verifikations-
// Abrufe (curl/Playwright) nicht von echtem Publikum unterscheidbar. Ehrlicher Nullpunkt
// statt einer geschoenten/erfundenen Vorgeschichte.
var LOG_START = '2026-11-16T04:26:00Z';

var LOG_RE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d{3}) (\d+) "([^"]*)" "([^"]*)"/;
var IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
var IPV6_RE = /^[0-9a-fA-F:]+$/;

function istGueltigeIp(ip) {
  if (!ip || ip.length > 45) return false; // RFC-Maximallaenge, Schutz gegen ueberlange Strings
  return IPV4_RE.test(ip) || IPV6_RE.test(ip);
}

// Stadt -> Bundesland (Rene-Entscheidung 2026-11-16: kostenlose geoip-lite-Datenbasis
// liefert KEINE echten Verwaltungsbezirke/Landkreise -- die feinste erreichbare Stufe
// ist ein Stadtname. Bundesland wird ueber diese verifizierbare, oeffentlich bekannte
// Stadt-Zuordnung abgeleitet, nicht ueber den opaken numerischen geoip-lite-Regioncode
// (dessen Kodierung nicht zuverlaessig dokumentiert ist -- Raten verboten, s. CLAUDE.md
// "Never guess, verify against source").
var STADT_ZU_BUNDESLAND = {
  'Berlin':'Berlin',
  'Hamburg':'Hamburg',
  'Bremen':'Bremen','Bremerhaven':'Bremen',
  'München':'Bayern','Nürnberg':'Bayern','Augsburg':'Bayern','Regensburg':'Bayern',
  'Ingolstadt':'Bayern','Würzburg':'Bayern','Fürth':'Bayern','Erlangen':'Bayern',
  'Köln':'Nordrhein-Westfalen','Düsseldorf':'Nordrhein-Westfalen','Dortmund':'Nordrhein-Westfalen',
  'Essen':'Nordrhein-Westfalen','Duisburg':'Nordrhein-Westfalen','Bochum':'Nordrhein-Westfalen',
  'Wuppertal':'Nordrhein-Westfalen','Bielefeld':'Nordrhein-Westfalen','Bonn':'Nordrhein-Westfalen',
  'Münster':'Nordrhein-Westfalen','Gelsenkirchen':'Nordrhein-Westfalen','Mönchengladbach':'Nordrhein-Westfalen',
  'Aachen':'Nordrhein-Westfalen','Krefeld':'Nordrhein-Westfalen','Oberhausen':'Nordrhein-Westfalen',
  'Hagen':'Nordrhein-Westfalen','Hamm':'Nordrhein-Westfalen','Leverkusen':'Nordrhein-Westfalen',
  'Solingen':'Nordrhein-Westfalen','Herne':'Nordrhein-Westfalen','Neuss':'Nordrhein-Westfalen',
  'Paderborn':'Nordrhein-Westfalen','Bottrop':'Nordrhein-Westfalen','Recklinghausen':'Nordrhein-Westfalen',
  'Bergisch Gladbach':'Nordrhein-Westfalen','Remscheid':'Nordrhein-Westfalen','Moers':'Nordrhein-Westfalen',
  'Siegen':'Nordrhein-Westfalen','Mülheim an der Ruhr':'Nordrhein-Westfalen',
  'Frankfurt am Main':'Hessen','Wiesbaden':'Hessen','Kassel':'Hessen','Darmstadt':'Hessen',
  'Offenbach am Main':'Hessen',
  'Stuttgart':'Baden-Württemberg','Karlsruhe':'Baden-Württemberg','Mannheim':'Baden-Württemberg',
  'Freiburg im Breisgau':'Baden-Württemberg','Heidelberg':'Baden-Württemberg','Ulm':'Baden-Württemberg',
  'Heilbronn':'Baden-Württemberg','Pforzheim':'Baden-Württemberg','Reutlingen':'Baden-Württemberg',
  'Leipzig':'Sachsen','Dresden':'Sachsen','Chemnitz':'Sachsen',
  'Hannover':'Niedersachsen','Braunschweig':'Niedersachsen','Oldenburg':'Niedersachsen',
  'Osnabrück':'Niedersachsen','Wolfsburg':'Niedersachsen','Göttingen':'Niedersachsen',
  'Hildesheim':'Niedersachsen','Salzgitter':'Niedersachsen',
  'Kiel':'Schleswig-Holstein','Lübeck':'Schleswig-Holstein',
  'Halle (Saale)':'Sachsen-Anhalt','Magdeburg':'Sachsen-Anhalt',
  'Erfurt':'Thüringen','Jena':'Thüringen',
  'Mainz':'Rheinland-Pfalz','Ludwigshafen am Rhein':'Rheinland-Pfalz','Trier':'Rheinland-Pfalz',
  'Koblenz':'Rheinland-Pfalz',
  'Rostock':'Mecklenburg-Vorpommern',
  'Saarbrücken':'Saarland',
  'Potsdam':'Brandenburg'
};

function bundeslandFuerStadt(stadt) {
  return STADT_ZU_BUNDESLAND[stadt] || null;
}

// Zugriffsquelle aus dem HTTP-Referer (Rene-Auftrag 2026-11-16 Nachtrag: "woher wurde
// die Seite aufgerufen -- Suche oder Social Media"). Nutzt NUR den bereits im Nginx-Log
// vorhandenen Referer-Header -- kein zusaetzlicher Tracking-Code auf der oeffentlichen
// Seite, kein neuer Datenschutz-Mehraufwand.
var SUCHMASCHINEN_RE = /google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\.|startpage\.|qwant\.|yandex\.|baidu\./i;
var SOCIAL_MEDIA_RE = /facebook\.|instagram\.|twitter\.|\bx\.com|t\.co\b|tiktok\.|linkedin\.|pinterest\.|reddit\.|whatsapp\.|telegram\.|threads\.net|youtube\./i;
var EIGENE_DOMAIN_RE = /pflege-faktencheck\.de/i;

function quelleFuerReferer(referer) {
  if (!referer || referer === '-') return { kategorie: 'Direkt', host: null };
  if (EIGENE_DOMAIN_RE.test(referer)) return { kategorie: 'Direkt', host: null };
  var host = null;
  try { host = new URL(referer).hostname; } catch (e) { /* kaputter Referer-String, bleibt ohne Host */ }
  if (SUCHMASCHINEN_RE.test(referer)) return { kategorie: 'Suchmaschine', host: host };
  if (SOCIAL_MEDIA_RE.test(referer)) return { kategorie: 'Social Media', host: host };
  return { kategorie: 'Sonstige Verweise', host: host };
}

// Bot-/Crawler-Erkennung: grobe, konservative Liste bekannter Nicht-Menschen-User-Agents --
// zieht die Aufrufzahlen NICHT kuenstlich hoch (waere bei einer "Monetarisierungs-
// Ueberwachung" grimmig gesagt: Selbstbetrug ueber die eigene Reichweite).
var BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|ahrefs|semrush|mj12|petalbot|yandex|baidu|duckduckbot|ia_archiver|uptime|monitor|pingdom|curl\/|python-requests|headlesschrome/i;

function parseZeile(line) {
  var m = LOG_RE.exec(line);
  if (!m) return null;
  return {
    ip: m[1], zeit: m[2], methode: m[3], pfad: m[4],
    status: parseInt(m[5], 10), bytes: parseInt(m[6], 10),
    referer: m[7], userAgent: m[8]
  };
}

function istEchterSeitenaufruf(e) {
  if (e.methode !== 'GET') return false;
  if (e.status !== 200) return false;
  if (BOT_RE.test(e.userAgent)) return false;
  // Nur echte Dokument-Aufrufe zaehlen, keine Assets/Favicons/robots.txt etc.
  return e.pfad === '/' || e.pfad === '/index.html';
}

function parseNginxZeit(zeit) {
  // Format: 15/Nov/2026:18:07:21 +0000
  var monate = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  var mm = /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/.exec(zeit);
  if (!mm) return null;
  return new Date(Date.UTC(parseInt(mm[3],10), monate[mm[2]], parseInt(mm[1],10), parseInt(mm[4],10), parseInt(mm[5],10), parseInt(mm[6],10)));
}

function main() {
  var raw;
  try { raw = fs.readFileSync(LOG_PATH, 'utf8'); } catch (e) {
    raw = '';
  }
  var zeilen = raw.split('\n').filter(Boolean);
  var eintraege = zeilen.map(parseZeile).filter(Boolean);
  var aufrufe = eintraege.filter(istEchterSeitenaufruf);

  var proTag = {}; // YYYY-MM-DD -> count
  var proLand = {}; // ISO-Code -> count
  var proBundesland = {}; // Name -> count (nur DE, nur wenn Stadt aufloesbar)
  var proStadt = {}; // Stadtname -> count (feinste erreichbare Stufe ohne kostenpflichtigen Dienst)
  var proQuelle = {}; // Direkt/Suchmaschine/Social Media/Sonstige Verweise -> count
  var proVerweisHost = {}; // externe Domain -> count (nur "Sonstige Verweise")
  var eindeutigeIps = new Set();
  var gesamt = 0;

  aufrufe.forEach(function (e) {
    var dt = parseNginxZeit(e.zeit);
    if (!dt) return;
    var tag = dt.toISOString().slice(0, 10);
    proTag[tag] = (proTag[tag] || 0) + 1;
    gesamt++;
    eindeutigeIps.add(e.ip);
    if (istGueltigeIp(e.ip)) {
      var geo = geoip.lookup(e.ip);
      var land = (geo && geo.country) || 'unbekannt';
      proLand[land] = (proLand[land] || 0) + 1;
      if (land === 'DE' && geo && geo.city) {
        proStadt[geo.city] = (proStadt[geo.city] || 0) + 1;
        var bl = bundeslandFuerStadt(geo.city);
        proBundesland[bl || 'unbekannt'] = (proBundesland[bl || 'unbekannt'] || 0) + 1;
      }
    } else {
      proLand['unbekannt'] = (proLand['unbekannt'] || 0) + 1;
    }
    var quelle = quelleFuerReferer(e.referer);
    proQuelle[quelle.kategorie] = (proQuelle[quelle.kategorie] || 0) + 1;
    if (quelle.kategorie === 'Sonstige Verweise' && quelle.host) {
      proVerweisHost[quelle.host] = (proVerweisHost[quelle.host] || 0) + 1;
    }
  });

  var tage = Object.keys(proTag).sort();
  var anzahlTageMitDaten = tage.length;
  var alterInTagen = Math.max(1, Math.round((Date.now() - new Date(LAUNCH_DATE + 'T00:00:00Z').getTime()) / 86400000));

  // Ehrliche Prognose-Sperre: unter 14 echten Beobachtungstagen ist jede Hochrechnung auf
  // 12 Monate reine Erfindung, keine reale Prognose (René-Direktive "grimmiges Framing" --
  // lieber "noch keine Aussage moeglich" als eine erfundene Zahl zeigen).
  var MIN_TAGE_FUER_PROGNOSE = 14;
  var prognose = null;
  if (anzahlTageMitDaten >= MIN_TAGE_FUER_PROGNOSE) {
    var letzte14 = tage.slice(-14).reduce(function (s, t) { return s + proTag[t]; }, 0);
    var taeglicherSchnitt = letzte14 / 14;
    prognose = [];
    for (var i = 1; i <= 12; i++) {
      var tageImMonat = 30.4;
      prognose.push({ monat: i, geschaetzteAufrufe: Math.round(taeglicherSchnitt * tageImMonat * i) });
    }
  }

  var out = {
    generiertAm: new Date().toISOString(),
    logPfad: LOG_PATH,
    liveSeit: LAUNCH_DATE,
    datenerfassungSeit: LOG_START,
    seiteIstSeitTagenLive: alterInTagen,
    gesamtAufrufe: gesamt,
    eindeutigeBesucherIps: eindeutigeIps.size,
    aufrufeProTag: tage.map(function (t) { return { datum: t, aufrufe: proTag[t] }; }),
    aufrufeProLand: Object.keys(proLand).sort(function (a, b) { return proLand[b] - proLand[a]; })
      .map(function (l) { return { land: l, aufrufe: proLand[l] }; }),
    aufrufeProBundesland: Object.keys(proBundesland).sort(function (a, b) { return proBundesland[b] - proBundesland[a]; })
      .map(function (b) { return { bundesland: b, aufrufe: proBundesland[b] }; }),
    aufrufeProStadt: Object.keys(proStadt).sort(function (a, b) { return proStadt[b] - proStadt[a]; })
      .map(function (s) { return { stadt: s, aufrufe: proStadt[s] }; }),
    aufrufeProQuelle: Object.keys(proQuelle).sort(function (a, b) { return proQuelle[b] - proQuelle[a]; })
      .map(function (q) { return { quelle: q, aufrufe: proQuelle[q] }; }),
    topVerweisDomains: Object.keys(proVerweisHost).sort(function (a, b) { return proVerweisHost[b] - proVerweisHost[a]; })
      .slice(0, 10).map(function (h) { return { host: h, aufrufe: proVerweisHost[h] }; }),
    bezirksHinweis: 'Echte Landkreise/Stadtbezirke liefert die kostenlose Offline-GeoIP-' +
      'Datenbasis nicht -- feinste erreichbare Stufe ohne kostenpflichtigen Drittanbieter ' +
      'ist der Stadtname. Bundesland wird daraus abgeleitet, nicht aus einem direkten Feld.',
    prognose: prognose,
    prognoseHinweis: prognose ? null :
      'Noch keine seriöse 12-Monats-Prognose möglich — erst ' + anzahlTageMitDaten +
      ' Tag(e) mit echten Daten vorhanden (Mindestanforderung: ' + MIN_TAGE_FUER_PROGNOSE + ' Tage). ' +
      'Eine Hochrechnung aus so wenigen Daten wäre erfunden, keine reale Prognose.'
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log('Aktualisiert:', OUT_PATH, '| Gesamtaufrufe:', gesamt, '| Tage mit Daten:', anzahlTageMitDaten);
}

main();
