// Pflege-Faktencheck — Scriptable-Widget (René-Auftrag 2026-11-16, v2: mehr Infos +
// Design 1:1 aus dem echten Dashboard übertragen — Kartenverlauf `.kpi{background:
// linear-gradient(135deg,var(--card),#1E2B40)}`, Live-Dot `.dot{background:var(--ok)}`,
// Balkenfarbe `.bar{fill:var(--bronze2)}` aus dashboard/index.html, keine erfundene
// eigene Palette).
//
// Installation:
// 1. "Scriptable"-App aus dem App Store installieren (kostenlos).
// 2. In Scriptable: "+" -> neues Skript -> diesen gesamten Inhalt einfügen
//    -> Skript umbenennen in "Pflege-Faktencheck".
// 3. Auf dem Home-Bildschirm: lange drücken -> "+" -> "Scriptable" suchen
//    -> Größe "Mittel" oder "Groß" wählen (für Balkendiagramm + Bundesländer
//    reicht "klein" nicht) -> hinzufügen.
// 4. Widget selbst lange drücken -> "Widget bearbeiten" -> bei "Skript"
//    "Pflege-Faktencheck" auswählen.
// iOS aktualisiert Widgets nach eigenem Hintergrund-Zeitplan (meist alle
// 15-60 Minuten) -- nicht sekundengenau live, das gilt für jedes Widget.

var STATS_URL = "https://pflege-faktencheck.de/dash-6dc438e56c86f7909a376d1acbfc85c7e2363891/stats.json";
var DASHBOARD_URL = "https://pflege-faktencheck.de/dash-6dc438e56c86f7909a376d1acbfc85c7e2363891/";

var INK = new Color("#E7E2D6");
var MUTED = new Color("#9CADC9");
var BRONZE = new Color("#B87333");
var BRONZE_LIGHT = new Color("#E8C39E");
var CARD = new Color("#1A2536");
var LIVE_DOT = new Color("#6BBF8A");

function hintergrundVerlauf() {
  var g = new LinearGradient();
  g.colors = [new Color("#253349"), new Color("#1E2B40")];
  g.locations = [0, 1];
  return g;
}

async function ladeDaten() {
  var req = new Request(STATS_URL);
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

function heutigerEintrag(data) {
  var heute = new Date().toISOString().slice(0, 10);
  var treffer = (data.aufrufeProTag || []).filter(function (t) { return t.datum === heute; })[0];
  return treffer ? treffer.aufrufe : 0;
}

function baueKopf(widget, kompakt) {
  var kopf = widget.addStack();
  kopf.layoutHorizontally();
  kopf.centerAlignContent();
  var dot = kopf.addStack();
  dot.size = new Size(6, 6);
  dot.backgroundColor = LIVE_DOT;
  dot.cornerRadius = 3;
  kopf.addSpacer(6);
  var titel = kopf.addText("Pflege-Faktencheck");
  titel.font = Font.boldSystemFont(kompakt ? 12 : 13);
  titel.textColor = BRONZE;
  kopf.addSpacer();
}

function baueKpiKarte(stack, wert, label, farbe) {
  var karte = stack.addStack();
  karte.layoutVertically();
  karte.backgroundColor = CARD;
  karte.cornerRadius = 10;
  karte.setPadding(8, 12, 8, 12);
  var w = karte.addText(String(wert));
  w.font = Font.boldSystemFont(22);
  w.textColor = farbe;
  var l = karte.addText(label);
  l.font = Font.systemFont(9);
  l.textColor = MUTED;
  return karte;
}

function baueBalkenChart(widget, tage) {
  if (!tage.length) return;
  var heute = new Date().toISOString().slice(0, 10);
  var max = Math.max.apply(null, tage.map(function (t) { return t.aufrufe; })) || 1;
  var reihe = widget.addStack();
  reihe.layoutHorizontally();
  reihe.bottomAlignContent();
  reihe.size = new Size(0, 38);
  tage.forEach(function (t, i) {
    if (i > 0) reihe.addSpacer(5);
    var spalte = reihe.addStack();
    spalte.layoutVertically();
    spalte.bottomAlignContent();
    var h = Math.max(4, Math.round((t.aufrufe / max) * 32));
    var bar = spalte.addStack();
    bar.size = new Size(14, h);
    bar.backgroundColor = (t.datum === heute) ? BRONZE_LIGHT : BRONZE;
    bar.cornerRadius = 3;
  });
  widget.addSpacer(3);
  var labelReihe = widget.addStack();
  labelReihe.layoutHorizontally();
  tage.forEach(function (t, i) {
    if (i > 0) labelReihe.addSpacer(5);
    var l = labelReihe.addText(t.datum.slice(8, 10));
    l.font = Font.systemFont(8);
    l.textColor = MUTED;
    l.centerAlignText();
  });
}

function baueTopBundeslaender(widget, liste) {
  if (!liste || !liste.length) return;
  var top = liste.filter(function (b) { return b.bundesland !== "unbekannt"; }).slice(0, 3);
  if (!top.length) return;
  var titel = widget.addText("Top-Bundesländer");
  titel.font = Font.mediumSystemFont(10);
  titel.textColor = MUTED;
  widget.addSpacer(3);
  top.forEach(function (b) {
    var zeile = widget.addStack();
    zeile.layoutHorizontally();
    var name = zeile.addText(b.bundesland);
    name.font = Font.systemFont(11);
    name.textColor = INK;
    zeile.addSpacer();
    var anzahl = zeile.addText(String(b.aufrufe));
    anzahl.font = Font.mediumSystemFont(11);
    anzahl.textColor = BRONZE_LIGHT;
  });
}

function baueFehler(widget) {
  var fehlerText = widget.addText("Keine Verbindung zum Dashboard");
  fehlerText.font = Font.systemFont(12);
  fehlerText.textColor = MUTED;
}

function baueKleinesWidget(widget, data, fehler) {
  baueKopf(widget, true);
  widget.addSpacer(10);
  if (fehler) return baueFehler(widget);

  var gross = widget.addText(String(data.gesamtAufrufe));
  gross.font = Font.boldSystemFont(30);
  gross.textColor = INK;
  var label = widget.addText("Gesamtaufrufe");
  label.font = Font.systemFont(10);
  label.textColor = MUTED;

  widget.addSpacer(10);

  var heute = widget.addStack();
  heute.backgroundColor = CARD;
  heute.cornerRadius = 8;
  heute.setPadding(5, 10, 5, 10);
  var heuteText = heute.addText("Heute: " + heutigerEintrag(data));
  heuteText.font = Font.mediumSystemFont(11);
  heuteText.textColor = BRONZE_LIGHT;
}

function baueMittleresWidget(widget, data, fehler) {
  baueKopf(widget, false);
  widget.addSpacer(10);
  if (fehler) return baueFehler(widget);

  var reihe = widget.addStack();
  reihe.layoutHorizontally();
  baueKpiKarte(reihe, data.gesamtAufrufe, "Gesamtaufrufe", INK);
  reihe.addSpacer(8);
  baueKpiKarte(reihe, heutigerEintrag(data), "Heute", BRONZE_LIGHT);

  widget.addSpacer(12);
  baueBalkenChart(widget, (data.aufrufeProTag || []).slice(-7));

  widget.addSpacer(10);
  var fuss = widget.addText("Aktualisiert: " + new Date(data.generiertAm).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }));
  fuss.font = Font.systemFont(8);
  fuss.textColor = MUTED;
}

function baueGrossesWidget(widget, data, fehler) {
  baueKopf(widget, false);
  widget.addSpacer(12);
  if (fehler) return baueFehler(widget);

  var reihe = widget.addStack();
  reihe.layoutHorizontally();
  baueKpiKarte(reihe, data.gesamtAufrufe, "Gesamtaufrufe", INK);
  reihe.addSpacer(10);
  baueKpiKarte(reihe, data.eindeutigeBesucherIps, "Besucher", MUTED);
  reihe.addSpacer(10);
  baueKpiKarte(reihe, heutigerEintrag(data), "Heute", BRONZE_LIGHT);

  widget.addSpacer(16);
  baueBalkenChart(widget, (data.aufrufeProTag || []).slice(-7));

  widget.addSpacer(16);
  baueTopBundeslaender(widget, data.aufrufeProBundesland);

  widget.addSpacer(10);
  var fuss = widget.addText("Aktualisiert: " + new Date(data.generiertAm).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }));
  fuss.font = Font.systemFont(8);
  fuss.textColor = MUTED;
}

async function main() {
  var widget = new ListWidget();
  widget.backgroundGradient = hintergrundVerlauf();
  widget.url = DASHBOARD_URL;
  widget.setPadding(14, 14, 14, 14);

  var data = null, fehler = false;
  try {
    data = await ladeDaten();
  } catch (e) {
    fehler = true;
  }

  var family = config.widgetFamily || "small";
  if (family === "large" || family === "extraLarge") {
    baueGrossesWidget(widget, data || {}, fehler);
  } else if (family === "medium") {
    baueMittleresWidget(widget, data || {}, fehler);
  } else {
    baueKleinesWidget(widget, data || {}, fehler);
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else if (family === "large") {
    await widget.presentLarge();
  } else if (family === "medium") {
    await widget.presentMedium();
  } else {
    await widget.presentSmall();
  }
  Script.complete();
}

main();
