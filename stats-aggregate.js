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
var execFileSync = require('child_process').execFileSync;

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

// René-Auftrag 2026-11-17: Downloads + Newsletter-Wachstum zusaetzlich zu den
// reinen Besucherzahlen im Dashboard zeigen.
var DOWNLOAD_PFADE = ['/flyer-pflege-faktencheck.pdf', '/vorlage-pflegetagebuch.pdf', '/vorlage-pflegetagebuch.docx', '/fristen-kalender.ics', '/checkliste-pflegedienst.pdf', '/checkliste-krankenhausentlassung.pdf'];
var SHARE_RE = /^\/beacon-share\?plattform=([a-z]+)/;
var NEWSLETTER_DB_PATH = process.env.NEWSLETTER_DB_PATH || '/opt/pflege-fakten-server/pflege-fakten.db';

// Accept-Language-Gruppe (9) ist optional -- aeltere Logzeilen von vor der
// Format-Erweiterung 2026-11-16 haben sie nicht, das ist KEIN Bot-Signal fuer diese
// Zeilen (undefined != leerer String, s. parseZeile).
var LOG_RE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d{3}) (\d+) "([^"]*)" "([^"]*)"(?: "([^"]*)")?/;
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

// Erweiterung (René-Auftrag 2026-11-16 Nachtrag: "Unbekannt-Quote senken") -- zusätzlich
// zu den größten Städten jetzt auch deutlich kleinere, aber oeffentlich eindeutig bekannte
// Mittelstädte je Bundesland, um mehr real aufgeloeste geoip-lite-Staedte abzudecken.
Object.assign(STADT_ZU_BUNDESLAND, {
  // Baden-Württemberg
  'Esslingen am Neckar':'Baden-Württemberg','Ludwigsburg':'Baden-Württemberg','Tübingen':'Baden-Württemberg',
  'Villingen-Schwenningen':'Baden-Württemberg','Konstanz':'Baden-Württemberg','Göppingen':'Baden-Württemberg',
  'Ravensburg':'Baden-Württemberg','Offenburg':'Baden-Württemberg','Sindelfingen':'Baden-Württemberg',
  'Böblingen':'Baden-Württemberg','Aalen':'Baden-Württemberg','Friedrichshafen':'Baden-Württemberg',
  'Waiblingen':'Baden-Württemberg','Schwäbisch Gmünd':'Baden-Württemberg','Rastatt':'Baden-Württemberg',
  'Baden-Baden':'Baden-Württemberg','Bruchsal':'Baden-Württemberg','Lörrach':'Baden-Württemberg',
  'Singen (Hohentwiel)':'Baden-Württemberg','Fellbach':'Baden-Württemberg','Backnang':'Baden-Württemberg',
  'Leonberg':'Baden-Württemberg','Ettlingen':'Baden-Württemberg','Kehl':'Baden-Württemberg',
  'Weinheim':'Baden-Württemberg','Nürtingen':'Baden-Württemberg','Tuttlingen':'Baden-Württemberg',
  'Rottweil':'Baden-Württemberg','Biberach an der Riß':'Baden-Württemberg','Schwäbisch Hall':'Baden-Württemberg',
  'Crailsheim':'Baden-Württemberg','Mosbach':'Baden-Württemberg','Neckarsulm':'Baden-Württemberg',
  'Freudenstadt':'Baden-Württemberg',
  // Bayern
  'Bamberg':'Bayern','Bayreuth':'Bayern','Aschaffenburg':'Bayern','Landshut':'Bayern',
  'Kempten (Allgäu)':'Bayern','Rosenheim':'Bayern','Neu-Ulm':'Bayern','Schweinfurt':'Bayern',
  'Passau':'Bayern','Freising':'Bayern','Straubing':'Bayern','Memmingen':'Bayern','Dachau':'Bayern',
  'Garmisch-Partenkirchen':'Bayern','Starnberg':'Bayern','Weiden in der Oberpfalz':'Bayern',
  'Amberg':'Bayern','Hof':'Bayern','Coburg':'Bayern','Ansbach':'Bayern','Kulmbach':'Bayern',
  'Forchheim':'Bayern','Günzburg':'Bayern','Neumarkt in der Oberpfalz':'Bayern','Traunstein':'Bayern',
  'Deggendorf':'Bayern','Bad Kissingen':'Bayern','Marktredwitz':'Bayern','Bad Reichenhall':'Bayern',
  'Lindau (Bodensee)':'Bayern','Schwabach':'Bayern','Erding':'Bayern',
  // Nordrhein-Westfalen
  'Lünen':'Nordrhein-Westfalen','Gütersloh':'Nordrhein-Westfalen','Witten':'Nordrhein-Westfalen',
  'Iserlohn':'Nordrhein-Westfalen','Hürth':'Nordrhein-Westfalen','Castrop-Rauxel':'Nordrhein-Westfalen',
  'Marl':'Nordrhein-Westfalen','Dinslaken':'Nordrhein-Westfalen','Troisdorf':'Nordrhein-Westfalen',
  'Datteln':'Nordrhein-Westfalen','Herford':'Nordrhein-Westfalen','Detmold':'Nordrhein-Westfalen',
  'Minden':'Nordrhein-Westfalen','Gummersbach':'Nordrhein-Westfalen','Viersen':'Nordrhein-Westfalen',
  'Dormagen':'Nordrhein-Westfalen','Rheine':'Nordrhein-Westfalen','Lüdenscheid':'Nordrhein-Westfalen',
  'Ibbenbüren':'Nordrhein-Westfalen','Ahlen':'Nordrhein-Westfalen','Grevenbroich':'Nordrhein-Westfalen',
  'Kamp-Lintfort':'Nordrhein-Westfalen','Bergkamen':'Nordrhein-Westfalen','Wesel':'Nordrhein-Westfalen',
  'Unna':'Nordrhein-Westfalen','Lippstadt':'Nordrhein-Westfalen','Soest':'Nordrhein-Westfalen',
  'Arnsberg':'Nordrhein-Westfalen','Werne':'Nordrhein-Westfalen','Bocholt':'Nordrhein-Westfalen',
  'Gladbeck':'Nordrhein-Westfalen','Kempen':'Nordrhein-Westfalen','Willich':'Nordrhein-Westfalen',
  'Monheim am Rhein':'Nordrhein-Westfalen','Langenfeld (Rheinland)':'Nordrhein-Westfalen',
  'Meerbusch':'Nordrhein-Westfalen','Erftstadt':'Nordrhein-Westfalen','Brühl':'Nordrhein-Westfalen',
  'Hennef (Sieg)':'Nordrhein-Westfalen','Düren':'Nordrhein-Westfalen','Jülich':'Nordrhein-Westfalen',
  'Eschweiler':'Nordrhein-Westfalen','Stolberg (Rheinland)':'Nordrhein-Westfalen','Bergheim':'Nordrhein-Westfalen',
  'Kerpen':'Nordrhein-Westfalen','Pulheim':'Nordrhein-Westfalen','Wermelskirchen':'Nordrhein-Westfalen',
  'Velbert':'Nordrhein-Westfalen','Ratingen':'Nordrhein-Westfalen','Haan':'Nordrhein-Westfalen',
  'Hilden':'Nordrhein-Westfalen','Mettmann':'Nordrhein-Westfalen','Heiligenhaus':'Nordrhein-Westfalen',
  'Werdohl':'Nordrhein-Westfalen','Plettenberg':'Nordrhein-Westfalen','Attendorn':'Nordrhein-Westfalen',
  'Olpe':'Nordrhein-Westfalen','Finnentrop':'Nordrhein-Westfalen','Schwerte':'Nordrhein-Westfalen',
  'Holzwickede':'Nordrhein-Westfalen','Waltrop':'Nordrhein-Westfalen','Selm':'Nordrhein-Westfalen',
  'Ennepetal':'Nordrhein-Westfalen','Wetter (Ruhr)':'Nordrhein-Westfalen','Gevelsberg':'Nordrhein-Westfalen',
  'Schwelm':'Nordrhein-Westfalen','Breckerfeld':'Nordrhein-Westfalen',
  // Hessen
  'Hanau':'Hessen','Gießen':'Hessen','Marburg':'Hessen','Fulda':'Hessen','Rüsselsheim am Main':'Hessen',
  'Bad Homburg vor der Höhe':'Hessen','Wetzlar':'Hessen','Hofheim am Taunus':'Hessen',
  'Limburg an der Lahn':'Hessen','Dreieich':'Hessen','Oberursel (Taunus)':'Hessen','Langen (Hessen)':'Hessen',
  'Neu-Isenburg':'Hessen','Friedberg (Hessen)':'Hessen','Bensheim':'Hessen','Gelnhausen':'Hessen',
  'Korbach':'Hessen','Lampertheim':'Hessen','Viernheim':'Hessen','Rodgau':'Hessen','Eschborn':'Hessen',
  'Bad Vilbel':'Hessen','Maintal':'Hessen','Michelstadt':'Hessen',
  // Niedersachsen
  'Celle':'Niedersachsen','Hameln':'Niedersachsen','Lüneburg':'Niedersachsen','Wilhelmshaven':'Niedersachsen',
  'Garbsen':'Niedersachsen','Langenhagen':'Niedersachsen','Nordhorn':'Niedersachsen','Emden':'Niedersachsen',
  'Delmenhorst':'Niedersachsen','Cuxhaven':'Niedersachsen','Peine':'Niedersachsen','Lingen (Ems)':'Niedersachsen',
  'Wolfenbüttel':'Niedersachsen','Goslar':'Niedersachsen','Stade':'Niedersachsen',
  'Buchholz in der Nordheide':'Niedersachsen','Melle':'Niedersachsen','Verden (Aller)':'Niedersachsen',
  'Walsrode':'Niedersachsen','Uelzen':'Niedersachsen','Nienburg (Weser)':'Niedersachsen',
  'Papenburg':'Niedersachsen','Leer (Ostfriesland)':'Niedersachsen','Wunstorf':'Niedersachsen',
  'Bad Pyrmont':'Niedersachsen','Northeim':'Niedersachsen','Einbeck':'Niedersachsen',
  'Hann. Münden':'Niedersachsen','Diepholz':'Niedersachsen','Vechta':'Niedersachsen','Meppen':'Niedersachsen',
  // Sachsen
  'Zwickau':'Sachsen','Plauen':'Sachsen','Görlitz':'Sachsen','Freiberg':'Sachsen','Bautzen':'Sachsen',
  'Pirna':'Sachsen','Radebeul':'Sachsen','Riesa':'Sachsen','Hoyerswerda':'Sachsen','Zittau':'Sachsen',
  'Meißen':'Sachsen','Delitzsch':'Sachsen','Torgau':'Sachsen','Grimma':'Sachsen',
  'Döbeln':'Sachsen','Weißwasser/O.L.':'Sachsen','Annaberg-Buchholz':'Sachsen','Marienberg':'Sachsen',
  'Limbach-Oberfrohna':'Sachsen','Werdau':'Sachsen','Glauchau':'Sachsen','Reichenbach im Vogtland':'Sachsen',
  // Schleswig-Holstein
  'Flensburg':'Schleswig-Holstein','Neumünster':'Schleswig-Holstein','Norderstedt':'Schleswig-Holstein',
  'Elmshorn':'Schleswig-Holstein','Pinneberg':'Schleswig-Holstein','Itzehoe':'Schleswig-Holstein',
  'Rendsburg':'Schleswig-Holstein','Ahrensburg':'Schleswig-Holstein','Wedel':'Schleswig-Holstein',
  'Reinbek':'Schleswig-Holstein','Bad Oldesloe':'Schleswig-Holstein','Geesthacht':'Schleswig-Holstein',
  'Schleswig':'Schleswig-Holstein','Husum':'Schleswig-Holstein','Eutin':'Schleswig-Holstein',
  'Heide':'Schleswig-Holstein','Glückstadt':'Schleswig-Holstein','Ratzeburg':'Schleswig-Holstein',
  // Rheinland-Pfalz
  'Kaiserslautern':'Rheinland-Pfalz','Worms':'Rheinland-Pfalz','Neuwied':'Rheinland-Pfalz',
  'Speyer':'Rheinland-Pfalz','Neustadt an der Weinstraße':'Rheinland-Pfalz','Bad Kreuznach':'Rheinland-Pfalz',
  'Frankenthal (Pfalz)':'Rheinland-Pfalz','Landau in der Pfalz':'Rheinland-Pfalz','Zweibrücken':'Rheinland-Pfalz',
  'Andernach':'Rheinland-Pfalz','Idar-Oberstein':'Rheinland-Pfalz','Pirmasens':'Rheinland-Pfalz',
  'Bingen am Rhein':'Rheinland-Pfalz','Montabaur':'Rheinland-Pfalz','Lahnstein':'Rheinland-Pfalz',
  // Sachsen-Anhalt
  'Dessau-Roßlau':'Sachsen-Anhalt','Wittenberg (Lutherstadt)':'Sachsen-Anhalt','Halberstadt':'Sachsen-Anhalt',
  'Stendal':'Sachsen-Anhalt','Wernigerode':'Sachsen-Anhalt','Schönebeck (Elbe)':'Sachsen-Anhalt',
  'Bitterfeld-Wolfen':'Sachsen-Anhalt','Merseburg':'Sachsen-Anhalt','Zeitz':'Sachsen-Anhalt',
  'Naumburg (Saale)':'Sachsen-Anhalt','Sangerhausen':'Sachsen-Anhalt','Burg':'Sachsen-Anhalt',
  // Thüringen
  'Gera':'Thüringen','Weimar':'Thüringen','Gotha':'Thüringen','Nordhausen':'Thüringen',
  'Eisenach':'Thüringen','Suhl':'Thüringen','Mühlhausen/Thüringen':'Thüringen','Altenburg':'Thüringen',
  'Pößneck':'Thüringen','Saalfeld/Saale':'Thüringen','Apolda':'Thüringen','Sondershausen':'Thüringen',
  'Arnstadt':'Thüringen',
  // Brandenburg
  'Cottbus':'Brandenburg','Brandenburg an der Havel':'Brandenburg','Frankfurt (Oder)':'Brandenburg',
  'Oranienburg':'Brandenburg','Falkensee':'Brandenburg','Eberswalde':'Brandenburg',
  'Königs Wusterhausen':'Brandenburg','Bernau bei Berlin':'Brandenburg','Rathenow':'Brandenburg',
  'Neuruppin':'Brandenburg','Schwedt/Oder':'Brandenburg','Senftenberg':'Brandenburg',
  'Luckenwalde':'Brandenburg','Teltow':'Brandenburg','Spremberg':'Brandenburg','Fürstenwalde/Spree':'Brandenburg',
  // Mecklenburg-Vorpommern
  'Schwerin':'Mecklenburg-Vorpommern','Neubrandenburg':'Mecklenburg-Vorpommern','Stralsund':'Mecklenburg-Vorpommern',
  'Greifswald':'Mecklenburg-Vorpommern','Wismar':'Mecklenburg-Vorpommern','Güstrow':'Mecklenburg-Vorpommern',
  'Waren (Müritz)':'Mecklenburg-Vorpommern','Neustrelitz':'Mecklenburg-Vorpommern','Anklam':'Mecklenburg-Vorpommern',
  'Bergen auf Rügen':'Mecklenburg-Vorpommern','Pasewalk':'Mecklenburg-Vorpommern','Parchim':'Mecklenburg-Vorpommern',
  // Saarland
  'Neunkirchen (Saar)':'Saarland','Homburg':'Saarland','Völklingen':'Saarland','Merzig':'Saarland',
  'St. Ingbert':'Saarland','Saarlouis':'Saarland','Lebach':'Saarland','Dillingen/Saar':'Saarland'
});

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

// Fund (testing-qa-Gegenpruefung 2026-11-18): EIGENE_DOMAIN_RE/SUCHMASCHINEN_RE/
// SOCIAL_MEDIA_RE pruefen gegen den KOMPLETTEN Referer-String statt nur den Host --
// Instagrams eigener Redirector (z.B. "https://l.instagram.com/?u=https%3A%2F%2F
// pflege-faktencheck.de%2F...") enthaelt die eigene Domain als URL-kodierten
// Querystring-Teil und wurde dadurch faelschlich als "Direkt" statt "Social Media"
// gezaehlt. Jetzt: wenn der Referer als echte URL parsbar ist, zaehlt NUR der Host.
function quelleFuerReferer(referer) {
  if (!referer || referer === '-') return { kategorie: 'Direkt', host: null };
  var host = null;
  try { host = new URL(referer).hostname; } catch (e) { /* kaputter Referer-String, bleibt ohne Host */ }
  var pruefstring = host || referer;
  if (EIGENE_DOMAIN_RE.test(pruefstring)) return { kategorie: 'Direkt', host: null };
  if (SUCHMASCHINEN_RE.test(pruefstring)) return { kategorie: 'Suchmaschine', host: host };
  if (SOCIAL_MEDIA_RE.test(pruefstring)) return { kategorie: 'Social Media', host: host };
  return { kategorie: 'Sonstige Verweise', host: host };
}

// Bot-/Crawler-Erkennung: grobe, konservative Liste bekannter Nicht-Menschen-User-Agents --
// zieht die Aufrufzahlen NICHT kuenstlich hoch (waere bei einer "Monetarisierungs-
// Ueberwachung" grimmig gesagt: Selbstbetrug ueber die eigene Reichweite).
// Funde Forensik 2026-11-18: "ModatScanner" (modat.io, Internet-weiter Asset-Scanner)
// und "Chrome-Lighthouse" (Googles Performance-Audit-Tool, fuehrt echtes JS aus,
// kein Mensch) hatten KEIN Keyword-Match -- beide rutschten bisher nur ueber die
// (jetzt gefixte) Accept-Language-Luecke durch, nicht ueber BOT_RE selbst.
var BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|ahrefs|semrush|mj12|petalbot|yandex|baidu|duckduckbot|ia_archiver|uptime|monitor|pingdom|curl\/|python-requests|headlesschrome|aiohttp|axios\/|go-http-client|okhttp|libwww-perl|wget\/|scrapy|node-fetch|java\/|apache-httpclient|compatible;|checker|research|rankingcoach|rc-crawler|modatscanner|lighthouse|python-httpx/i;

// Echte Browser senden IMMER einen User-Agent, der mit "Mozilla/" beginnt (historische
// Konvention seit den 1990ern, bis heute ausnahmslos eingehalten) -- Rene-Fund 2026-11-16:
// zwei Bots ("understory/0.1 (CT research...)") hatten GAR KEIN "Mozilla/"-Praefix und
// wurden von BOT_RE bisher nicht erkannt. Harte Positiv-Pruefung statt weiterer Schluessel-
// woerter schliesst diese ganze Klasse ab.
function hatEchtesBrowserPraefix(userAgent) {
  return /^Mozilla\//.test(userAgent || '');
}

// Bekannte Cloud-/CDN-IP-Bereiche, die NICHT in der grossen Hosting-Liste (s. unten)
// stehen, weil sie dort bewusst anders kategorisiert sind (Cloudflare ist primaer ein
// CDN/Reverse-Proxy vor echten fremden Webseiten, kein klassischer Hosting-Anbieter --
// die X4BNet-Liste listet es deshalb nicht als "Datacenter"). Rene-Entscheidung
// 2026-11-16 (nach Verhaltensmuster-Indiz: identischer User-Agent, wiederholte
// Selbst-Referer-Treffer innerhalb weniger Minuten): Cloudflare wird trotzdem
// ausgeschlossen, bewusst trotz des Risikos, dass dadurch vereinzelt ein echter
// deutscher Leser mit Apple iCloud Private Relay faelschlich nicht gezaehlt wird --
// Rene hat dieses Risiko nach Abwaegung explizit akzeptiert. AWS/GCP/Fastly/Subnet
// Digital etc. kommen jetzt aus der grossen Liste unten, keine Handarbeit mehr noetig.
var CLOUD_IP_PREFIXE = [
  /^104\.(1[6-9]|2[0-9]|3[01])\./,            // Cloudflare 104.16.0.0/12
  /^172\.6[4-9]\./, /^172\.7[01]\./           // Cloudflare 172.64.0.0/13 (grob)
];

// Einzeln per WHOIS bestaetigte Hosting-/VPS-IPs, die auch in der grossen Liste unten
// NICHT auftauchen (z.B. Sundance International LLC -- kleinerer Anbieter, nicht in
// jeder Community-Liste erfasst). Bei neuen Funden hier ergaenzen.
var BEKANNTE_HOSTING_IPS = [
  '216.38.230.121' // Sundance International LLC (AS40355, Hosting-ASN)
];

// Grosse, offline gebuendelte Liste bekannter Hosting-/Rechenzentrums-IP-Bereiche
// (Rene-Auftrag 2026-11-16 "skalierbare Loesung statt einzelner IPs von Hand" --
// nach dem fuenften einzeln per WHOIS entlarvten Bot an einem Tag). Quelle: X4BNet/
// lists_vpn (oeffentlich, Community-gepflegt, MIT-aehnliche Lizenz), Datacenter-Teil,
// einmalig heruntergeladen und lokal in hosting-ranges.txt gebuendelt -- KEIN
// Live-API-Call pro Besucher-IP, genau wie bei geoip-lite. Deckt u.a. die bisher
// manuell gepflegten AWS-/GCP-/Fastly-/Subnet-Digital-Bereiche automatisch ab
// (per Stichprobe gegen alle bisher bestaetigten Faelle verifiziert: 7 von 9 Treffern
// bereits in der Liste enthalten, deutlich praeziser als die vorherige Hand-Regex).
var HOSTING_RANGES = (function () {
  var pfad = path.join(__dirname, 'hosting-ranges.txt');
  var zeilen;
  try { zeilen = fs.readFileSync(pfad, 'utf8').split('\n'); } catch (e) { return []; }
  var ergebnis = [];
  zeilen.forEach(function (zeile) {
    var z = zeile.trim();
    if (!z || z.indexOf('/') === -1) return;
    var teile = z.split('/');
    var ipTeile = teile[0].split('.').map(Number);
    if (ipTeile.length !== 4 || ipTeile.some(function (n) { return isNaN(n) || n < 0 || n > 255; })) return;
    var netzInt = ((ipTeile[0] << 24) | (ipTeile[1] << 16) | (ipTeile[2] << 8) | ipTeile[3]) >>> 0;
    var praefix = parseInt(teile[1], 10);
    if (isNaN(praefix) || praefix < 0 || praefix > 32) return;
    var maske = praefix === 0 ? 0 : (0xFFFFFFFF << (32 - praefix)) >>> 0;
    ergebnis.push({ netz: netzInt & maske, maske: maske });
  });
  return ergebnis;
})();

function ipv4ZuInt(ip) {
  var teile = (ip || '').split('.').map(Number);
  if (teile.length !== 4 || teile.some(function (n) { return isNaN(n) || n < 0 || n > 255; })) return null;
  return ((teile[0] << 24) | (teile[1] << 16) | (teile[2] << 8) | teile[3]) >>> 0;
}

// IPv6-Gegenstueck (Rene-Fund 2026-11-16 "warum nur IPv4" -- berechtigt, dieselbe
// X4BNet-Liste gibt es auch fuer IPv6). 128 Bit passen nicht in normale JS-Zahlen/
// Bitoperatoren (die sind auf 32 Bit begrenzt), daher BigInt statt der >>>/&-Tricks
// oben bei IPv4.
function ipv6ZuBigInt(ip) {
  if (!ip || ip.indexOf(':') === -1) return null;
  var teile = ip.split('::');
  if (teile.length > 2) return null;
  var kopf = teile[0] ? teile[0].split(':') : [];
  var fuss = teile.length === 2 && teile[1] ? teile[1].split(':') : [];
  var fehlende = 8 - kopf.length - fuss.length;
  if (teile.length === 1 && kopf.length !== 8) return null;
  if (teile.length === 2 && fehlende < 0) return null;
  var gruppen = teile.length === 2
    ? kopf.concat(new Array(fehlende).fill('0')).concat(fuss)
    : kopf;
  if (gruppen.length !== 8) return null;
  var ergebnis = 0n;
  for (var i = 0; i < 8; i++) {
    var wert = parseInt(gruppen[i] || '0', 16);
    if (isNaN(wert) || wert < 0 || wert > 0xFFFF) return null;
    ergebnis = (ergebnis << 16n) | BigInt(wert);
  }
  return ergebnis;
}

var HOSTING_RANGES_V6 = (function () {
  var pfad = path.join(__dirname, 'hosting-ranges-v6.txt');
  var zeilen;
  try { zeilen = fs.readFileSync(pfad, 'utf8').split('\n'); } catch (e) { return []; }
  var VOLLE_MASKE_V6 = (1n << 128n) - 1n;
  var ergebnis = [];
  zeilen.forEach(function (zeile) {
    var z = zeile.trim();
    if (!z || z.indexOf('/') === -1) return;
    var teile = z.split('/');
    var netzBig = ipv6ZuBigInt(teile[0]);
    var praefix = parseInt(teile[1], 10);
    if (netzBig === null || isNaN(praefix) || praefix < 0 || praefix > 128) return;
    var maske = praefix === 0 ? 0n : (VOLLE_MASKE_V6 << BigInt(128 - praefix)) & VOLLE_MASKE_V6;
    ergebnis.push({ netz: netzBig & maske, maske: maske });
  });
  return ergebnis;
})();

function istInHostingListeV6(ip) {
  var ipBig = ipv6ZuBigInt(ip);
  if (ipBig === null) return false;
  return HOSTING_RANGES_V6.some(function (bereich) { return (ipBig & bereich.maske) === bereich.netz; });
}

function istInHostingListe(ip) {
  if ((ip || '').indexOf(':') !== -1) return istInHostingListeV6(ip);
  var ipInt = ipv4ZuInt(ip);
  if (ipInt === null) return false;
  return HOSTING_RANGES.some(function (bereich) { return (ipInt & bereich.maske) === bereich.netz; });
}

// Apple iCloud Private Relay (Rene-Fund 2026-11-18): echte iPhone-Besucher mit
// aktiviertem Private Relay erscheinen mit Fastly-/Akamai-Egress-IPs, die auf der
// X4BNet-Hosting-Liste korrekt als Rechenzentrum gelistet sind -- fuer normale Bot-
// Erkennung richtig, hier aber ein echter Mensch hinter einer Datenschutzfunktion.
// Quelle: Apples eigene, offizielle Liste https://mask-api.icloud.com/egress-ip-ranges.csv
// (einmalig geladen, lokal gebuendelt wie hosting-ranges.txt, kein Live-API-Call pro
// Besucher-IP). Bewusst NUR aus dem Hosting-Flag herausgenommen, nicht komplett von
// allen Bot-Checks befreit -- ROTIERENDE_UA/BOT_RE/Accept-Language greifen unverändert.
var APPLE_RELAY_RANGES = (function () {
  var pfad = path.join(__dirname, 'apple-private-relay-ranges.txt');
  var zeilen;
  try { zeilen = fs.readFileSync(pfad, 'utf8').split('\n'); } catch (e) { return []; }
  var ergebnis = [];
  zeilen.forEach(function (zeile) {
    var z = zeile.trim();
    if (!z || z.indexOf('/') === -1) return;
    var teile = z.split('/');
    var ipTeile = teile[0].split('.').map(Number);
    if (ipTeile.length !== 4 || ipTeile.some(function (n) { return isNaN(n) || n < 0 || n > 255; })) return;
    var netzInt = ((ipTeile[0] << 24) | (ipTeile[1] << 16) | (ipTeile[2] << 8) | ipTeile[3]) >>> 0;
    var praefix = parseInt(teile[1], 10);
    if (isNaN(praefix) || praefix < 0 || praefix > 32) return;
    var maske = praefix === 0 ? 0 : (0xFFFFFFFF << (32 - praefix)) >>> 0;
    ergebnis.push({ netz: netzInt & maske, maske: maske });
  });
  return ergebnis;
})();

function istAppleRelayIp(ip) {
  var ipInt = ipv4ZuInt(ip);
  if (ipInt === null) return false;
  return APPLE_RELAY_RANGES.some(function (bereich) { return (ipInt & bereich.maske) === bereich.netz; });
}

// Rene-Fund 2026-11-18: Laender-Statistik zeigte fuer Private-Relay-Besuche oft "US"
// statt dem echten Egress-Land, weil geoip-lite die Fastly-/Akamai-Bloecke anders
// geolokalisiert als Apples eigene Liste. Apples CSV liefert pro Bereich ein echtes
// Laenderkuerzel mit -- separat gebuendelt (apple-private-relay-laender.txt), damit
// genau diese IPs ihr echtes Land statt des CDN-Standardlandes bekommen.
var APPLE_RELAY_LAENDER = (function () {
  var pfad = path.join(__dirname, 'apple-private-relay-laender.txt');
  var zeilen;
  try { zeilen = fs.readFileSync(pfad, 'utf8').split('\n'); } catch (e) { return []; }
  var ergebnis = [];
  zeilen.forEach(function (zeile) {
    var z = zeile.trim();
    if (!z) return;
    var kommaTeile = z.split(',');
    if (kommaTeile.length !== 2 || kommaTeile[0].indexOf('/') === -1) return;
    var teile = kommaTeile[0].split('/');
    var ipTeile = teile[0].split('.').map(Number);
    if (ipTeile.length !== 4 || ipTeile.some(function (n) { return isNaN(n) || n < 0 || n > 255; })) return;
    var netzInt = ((ipTeile[0] << 24) | (ipTeile[1] << 16) | (ipTeile[2] << 8) | ipTeile[3]) >>> 0;
    var praefix = parseInt(teile[1], 10);
    if (isNaN(praefix) || praefix < 0 || praefix > 32) return;
    var maske = praefix === 0 ? 0 : (0xFFFFFFFF << (32 - praefix)) >>> 0;
    ergebnis.push({ netz: netzInt & maske, maske: maske, land: kommaTeile[1] });
  });
  return ergebnis;
})();

function appleRelayLandFuerIp(ip) {
  var ipInt = ipv4ZuInt(ip);
  if (ipInt === null) return null;
  var treffer = APPLE_RELAY_LAENDER.find(function (bereich) { return (ipInt & bereich.maske) === bereich.netz; });
  return treffer ? treffer.land : null;
}

function landFuerIp(ip) {
  var relayLand = appleRelayLandFuerIp(ip);
  if (relayLand) return { country: relayLand, city: null };
  return geoip.lookup(ip);
}

function istCloudHostingIp(ip) {
  if (istAppleRelayIp(ip)) return false;
  return CLOUD_IP_PREFIXE.some(function (re) { return re.test(ip); })
    || BEKANNTE_HOSTING_IPS.indexOf(ip) !== -1
    || istInHostingListe(ip);
}

// Verweildauer (Rene-Auftrag 2026-11-16): Beacon-Request /beacon-dauer?ms=<N> wird
// beim Verlassen der Seite per navigator.sendBeacon() ausgeloest (s. index.html) und
// landet als normale Logzeile im selben Nginx-Access-Log -- kein neuer Server, kein
// Tracking-Pixel. Obergrenze schuetzt gegen Ausreisser durch Tage offen gelassene Tabs.
var VERWEILDAUER_RE = /^\/beacon-dauer\?ms=(\d+)$/;
var MAX_PLAUSIBLE_VERWEILDAUER_MS = 2 * 60 * 60 * 1000;

function parseZeile(line) {
  var m = LOG_RE.exec(line);
  if (!m) return null;
  return {
    ip: m[1], zeit: m[2], methode: m[3], pfad: m[4],
    status: parseInt(m[5], 10), bytes: parseInt(m[6], 10),
    referer: m[7], userAgent: m[8],
    acceptLanguage: m[9] === undefined ? null : m[9]
  };
}

// Fehlender Accept-Language-Header ist ein starkes Bot-Signal -- echte Browser senden
// ihn ausnahmslos automatisch mit jedem Request. 'null' (altes Log-Format vor der
// Erweiterung 2026-11-16) zaehlt NICHT als verdaechtig, nur ein tatsaechlich leerer/
// fehlender Wert bei einer Zeile im neuen Format.
//
// KRITISCHER Fund (Forensik 2026-11-18): dieser Filter war seit Einfuehrung komplett
// wirkungslos -- nginx schreibt einen fehlenden Header NICHT als leeren String (''),
// sondern als literalen Bindestrich ('-') ins Log (Standardverhalten fuer alle leeren
// Variablen, s. auch Referer "-"). Verifiziert am echten Server-Log: 459 von ~2200
// Zeilen haben acceptLanguage === '-', GENAU 0 haben ''. Jeder Bot/Scanner ohne
// Accept-Language-Header (CensysInspect, CMS-Checker, ModatScanner, Chrome-Lighthouse
// u.a.) ist seit 2026-11-16 durch diese Luecke gerutscht, sofern kein anderer Filter
// griff. Fix: beide Werte gelten als "fehlend".
function hatFehlendenAcceptLanguage(e) {
  return e.acceptLanguage === '' || e.acceptLanguage === '-';
}

// Fund (Forensik 2026-11-18, Rene-Auftrag "Aufruf-Probleme pruefen"): echte
// Facebook/Instagram-Besucher landen mit angehaengtem "?fbclid=..."-Tracking-
// Parameter auf der Startseite (Facebooks eigener Mechanismus, kein Bot-Signal)
// -- der bisherige EXAKTE Pfadvergleich ('/' bzw. '/index.html') verwarf diese
// Aufrufe komplett, obwohl JS_AUSGEFUEHRT_IPS/beacon-dauer/beacon-share fuer
// dieselbe IP direkt danach echtes Browser-Verhalten belegen. 11 von 11 im
// Live-Log gefundenen "/?..."-Aufrufen waren echte Browser, 0 Bots -- also
// Unterzaehlung echter Menschen, nicht Ueberzaehlung von Bots.
function pfadOhneQuery(pfad) {
  var i = (pfad || '').indexOf('?');
  return i === -1 ? pfad : pfad.slice(0, i);
}

// Bekannte eigene IP(s) -- Rene-Auftrag 2026-11-16 "meine IP als bekannt markieren und
// ausschliessen", damit das eigene Testen/Verifizieren nicht als echter Publikums-
// Aufruf gezaehlt wird. Per Umgebungsvariable konfigurierbar (kommagetrennt), da sich
// eine private IP durch den Internetanbieter aendern kann. 79.207.63.73 ist Renés
// echte Heimnetz-IP (diese Session laeuft lokal auf seinem Mac, jeder Curl-/Playwright-
// Testaufruf lief darueber) -- fruehere Notiz "das ist Claudes Sandbox" war ein Irrtum,
// hiermit korrigiert.
// 46.88.104.196 (Rene-Bestaetigung 2026-11-18): Deutsche Telekom, Dautphetal -- Renes
// eigener Mac, live per Log-Korrelation identifiziert (60s-Polling-Muster passt exakt
// zum eigenen Dashboard-Code) und von Rene explizit bestaetigt.
var BEKANNTE_IPS = (process.env.BEKANNTE_IPS || '79.207.63.73,46.88.104.196').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

// User-Agent-Rotation pro IP (Rene-Fund 2026-11-16): dieselbe IP schickte innerhalb
// kurzer Zeit zwei unterschiedliche Windows/Chrome-Kombinationen -- ein echtes
// einzelnes Geraet wechselt niemals mitten in einer Sitzung Betriebssystem UND
// Browserversion. Klassisches Scraper-Muster (rotierender UA-Pool). Wird einmal pro
// Lauf in main() befuellt, bevor gefiltert wird.
var ROTIERENDE_UA_IPS = {};
function findeRotierendeUaIps(eintraege) {
  var uaProIp = {};
  eintraege.forEach(function (e) {
    if (e.methode !== 'GET' || e.status !== 200) return;
    var pfad = pfadOhneQuery(e.pfad);
    if (pfad !== '/' && pfad !== '/index.html') return;
    if (!uaProIp[e.ip]) uaProIp[e.ip] = {};
    uaProIp[e.ip][e.userAgent] = true;
  });
  var ergebnis = {};
  Object.keys(uaProIp).forEach(function (ip) {
    if (Object.keys(uaProIp[ip]).length > 1) ergebnis[ip] = true;
  });
  return ergebnis;
}

// JS-Lade-Signal (Rene-Auftrag 2026-11-16, "Barriere ohne echte Nutzer zu blockieren"):
// nur IPs, die mindestens einmal den per JavaScript ausgeloesten /beacon-geladen-Request
// gesendet haben, zaehlen als echter Seitenaufruf -- reine HTTP-Tools ohne Browser-Engine
// koennen diesen Request nicht aussenden, egal wie gut sie Header faelschen. Grenze
// ehrlich benannt: ein Bot, der den Beacon-Aufruf gezielt nachbaut, waere davon nicht
// betroffen -- das filtert nur Tools, die kein JavaScript ausfuehren (die meisten
// bisher gefundenen Faelle heute).
var JS_AUSGEFUEHRT_IPS = {};
function findeJsAusgefuehrtIps(eintraege) {
  var ergebnis = {};
  eintraege.forEach(function (e) {
    if (e.methode === 'POST' && e.pfad === '/beacon-geladen' && e.status === 204) {
      ergebnis[e.ip] = true;
    }
  });
  return ergebnis;
}

function istEchterSeitenaufruf(e) {
  if (ROTIERENDE_UA_IPS[e.ip]) return false;
  if (!JS_AUSGEFUEHRT_IPS[e.ip]) return false;
  if (e.methode !== 'GET') return false;
  if (e.status !== 200) return false;
  if (BOT_RE.test(e.userAgent)) return false;
  if (!hatEchtesBrowserPraefix(e.userAgent)) return false;
  if (hatFehlendenAcceptLanguage(e)) return false;
  if (istCloudHostingIp(e.ip)) return false;
  if (BEKANNTE_IPS.indexOf(e.ip) !== -1) return false;
  // Nur echte Dokument-Aufrufe zaehlen, keine Assets/Favicons/robots.txt etc.
  // pfadOhneQuery: s. Fund oben -- "?fbclid=..."/"?utm_..." ist kein Bot-Signal.
  var pfad = pfadOhneQuery(e.pfad);
  return pfad === '/' || pfad === '/index.html';
}

function istEchterDownload(e) {
  if (ROTIERENDE_UA_IPS[e.ip]) return false;
  if (!JS_AUSGEFUEHRT_IPS[e.ip]) return false;
  if (e.methode !== 'GET') return false;
  if (e.status !== 200) return false;
  if (BOT_RE.test(e.userAgent)) return false;
  if (!hatEchtesBrowserPraefix(e.userAgent)) return false;
  if (hatFehlendenAcceptLanguage(e)) return false;
  if (istCloudHostingIp(e.ip)) return false;
  if (BEKANNTE_IPS.indexOf(e.ip) !== -1) return false;
  // Konsistenz zu istEchterSeitenaufruf: ein geteilter Download-Link kann
  // ebenso ein fbclid/utm-Anhaengsel tragen -- exakter Match wuerde das verwerfen.
  return DOWNLOAD_PFADE.indexOf(pfadOhneQuery(e.pfad)) !== -1;
}

function istEchterShareBeacon(e) {
  if (ROTIERENDE_UA_IPS[e.ip]) return false;
  if (!JS_AUSGEFUEHRT_IPS[e.ip]) return false;
  if (e.methode !== 'POST') return false;
  if (e.status !== 204) return false;
  if (BOT_RE.test(e.userAgent)) return false;
  if (!hatEchtesBrowserPraefix(e.userAgent)) return false;
  if (hatFehlendenAcceptLanguage(e)) return false;
  if (istCloudHostingIp(e.ip)) return false;
  if (BEKANNTE_IPS.indexOf(e.ip) !== -1) return false;
  return SHARE_RE.test(e.pfad);
}

function zaehleBestaetigteAbonnenten() {
  try {
    var out = execFileSync('sqlite3', [NEWSLETTER_DB_PATH, "SELECT COUNT(*) FROM subscribers WHERE status='confirmed';"], { encoding: 'utf8', timeout: 5000 });
    var n = parseInt(String(out).trim(), 10);
    return isNaN(n) ? null : n;
  } catch (e) {
    return null;
  }
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
  ROTIERENDE_UA_IPS = findeRotierendeUaIps(eintraege);
  JS_AUSGEFUEHRT_IPS = findeJsAusgefuehrtIps(eintraege);
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
      var geo = landFuerIp(e.ip);
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

  // Verweildauer je einzelnem Aufruf (Rene-Auftrag 2026-11-16 Nachtrag: "pro User",
  // nicht nur der Durchschnitt). KEINE rohe IP in der Ausgabe -- nur Land (wie in den
  // uebrigen Dashboard-Bereichen auch), konsistent mit dem bisherigen Datenschutz-
  // Ansatz dieses Dashboards.
  //
  // Fix (Rene-Fund 2026-11-18): Liste zeigte ~41 Eintraege bei nur 20 echten Aufrufen.
  // Ursache per Rohlog verifiziert (nicht geraten): dieselbe IP feuert mehrfach
  // /beacon-dauer fuer denselben Seitenaufruf (z.B. 104.28.62.43: ein GET / 200 um
  // 14:27:31, dann ZWEI beacon-dauer-POSTs um 14:27:31 und 14:28:13 -- iOS Safaris
  // visibilitychange/pagehide-Zyklus bei App-Wechseln feuert das clientseitige
  // "gesendet"-Dedup-Flag nicht zuverlaessig aus). Jeder Beacon wird jetzt dem
  // zeitlich naechsten VOR ihm liegenden echten Aufruf (aufrufe, bereits gefiltert)
  // derselben IP zugeordnet (Fenster 4h); mehrere Beacons fuer denselben Aufruf
  // werden zu einem Eintrag zusammengefasst (laengster Wert = vollstaendigste
  // Messung). Ein Beacon ohne zugehoerigen gezaehlten Aufruf zaehlt nicht mit.
  var MAX_BEACON_ZUORDNUNG_MS = 4 * 60 * 60 * 1000;
  var aufrufeNachIp = {};
  aufrufe.forEach(function (e) {
    var dt = parseNginxZeit(e.zeit);
    if (!dt) return;
    (aufrufeNachIp[e.ip] = aufrufeNachIp[e.ip] || []).push(dt.getTime());
  });
  Object.keys(aufrufeNachIp).forEach(function (ip) {
    aufrufeNachIp[ip].sort(function (a, b) { return a - b; });
  });
  function findeZugehoerigenAufruf(ip, beaconZeitMs) {
    var liste = aufrufeNachIp[ip];
    if (!liste) return null;
    var treffer = null;
    for (var i = 0; i < liste.length; i++) {
      if (liste[i] <= beaconZeitMs && (beaconZeitMs - liste[i]) <= MAX_BEACON_ZUORDNUNG_MS) {
        treffer = liste[i];
      }
    }
    return treffer;
  }

  var verweildauerProAufruf = {};
  eintraege.forEach(function (e) {
    if (e.methode !== 'POST' || BOT_RE.test(e.userAgent)) return;
    if (!hatEchtesBrowserPraefix(e.userAgent) || hatFehlendenAcceptLanguage(e)) return;
    if (istCloudHostingIp(e.ip) || BEKANNTE_IPS.indexOf(e.ip) !== -1 || ROTIERENDE_UA_IPS[e.ip]) return;
    var m = VERWEILDAUER_RE.exec(e.pfad);
    if (!m) return;
    var ms = parseInt(m[1], 10);
    if (!(ms > 0 && ms < MAX_PLAUSIBLE_VERWEILDAUER_MS)) return;
    var dt = parseNginxZeit(e.zeit);
    if (!dt) return;
    var aufrufZeitMs = findeZugehoerigenAufruf(e.ip, dt.getTime());
    if (aufrufZeitMs === null) return;
    var land = 'unbekannt';
    if (istGueltigeIp(e.ip)) {
      var geo = landFuerIp(e.ip);
      land = (geo && geo.country) || 'unbekannt';
    }
    var key = e.ip + '|' + aufrufZeitMs;
    var bestehend = verweildauerProAufruf[key];
    if (!bestehend || ms > bestehend.ms) {
      verweildauerProAufruf[key] = { ms: ms, land: land, zeit: new Date(aufrufZeitMs).toISOString() };
    }
  });
  var verweildauerWerteMs = [];
  var verweildauerListe = [];
  Object.keys(verweildauerProAufruf).forEach(function (key) {
    var v = verweildauerProAufruf[key];
    verweildauerWerteMs.push(v.ms);
    verweildauerListe.push({ zeit: v.zeit, land: v.land, sekunden: Math.round(v.ms / 1000) });
  });
  verweildauerListe.sort(function (a, b) { return (b.zeit || '').localeCompare(a.zeit || ''); });
  verweildauerListe = verweildauerListe.slice(0, 50); // letzte 50, Payload-Groesse begrenzen
  var verweildauerDurchschnittSekunden = verweildauerWerteMs.length
    ? Math.round(verweildauerWerteMs.reduce(function (s, v) { return s + v; }, 0) / verweildauerWerteMs.length / 1000)
    : null;

  // Fund (testing-qa-Gegenpruefung 2026-11-18): istEchterDownload() vergleicht bereits
  // gegen pfadOhneQuery(e.pfad), aber hier wurde weiterhin der ROHE Pfad (inkl. evtl.
  // Query-String) als Schluessel verwendet -- ein Download mit angehaengtem Tracking-
  // Parameter haette den Filter bestanden, waere aber beim Nachschlagen gegen die
  // saubere DOWNLOAD_PFADE-Liste (Zeile ~780) spurlos verschwunden. Jetzt konsistent.
  var downloadsProDatei = {};
  eintraege.filter(istEchterDownload).forEach(function (e) {
    var p = pfadOhneQuery(e.pfad);
    downloadsProDatei[p] = (downloadsProDatei[p] || 0) + 1;
  });

  var teilenProPlattform = {};
  eintraege.filter(istEchterShareBeacon).forEach(function (e) {
    var m = SHARE_RE.exec(e.pfad);
    var p = m ? m[1] : 'unbekannt';
    teilenProPlattform[p] = (teilenProPlattform[p] || 0) + 1;
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
    verweildauerDurchschnittSekunden: verweildauerDurchschnittSekunden,
    verweildauerAnzahlMessungen: verweildauerWerteMs.length,
    verweildauerJeAufruf: verweildauerListe,
    downloadsProDatei: DOWNLOAD_PFADE.map(function (p) { return { datei: p, downloads: downloadsProDatei[p] || 0 }; }),
    teilenProPlattform: Object.keys(teilenProPlattform).sort(function (a, b) { return teilenProPlattform[b] - teilenProPlattform[a]; })
      .map(function (p) { return { plattform: p, anzahl: teilenProPlattform[p] }; }),
    newsletterBestaetigteAbonnenten: zaehleBestaetigteAbonnenten(),
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
