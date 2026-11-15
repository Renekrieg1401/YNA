// Zustandslose Stichtag-Aufloesung. Bewusst OHNE Seiteneffekt/Schreibvorgang --
// wird bei JEDEM Request (Public-API + Admin-Vorschau) frisch ausgewertet.
// KEIN Cronjob, der `facts.current_value` am Stichtag ueberschreibt: Lehre aus
// einem frueheren Bug in einem Schwestersystem, bei dem zwei Code-Pfade denselben
// Zustand unterschiedlich ausgewertet haben (einer liest den Rohwert, einer den
// "schon ueberschriebenen" Wert -- Divergenz je nach Timing des Cronjobs).
//
// db.js legt eine Spalte `approved_effective_date` NICHT auf `facts` an -- das
// ist Absicht, der Stichtag lebt ausschliesslich im `drafts`-Datensatz. `facts.
// current_value` wird durch approve() NIE verändert (s. server.js).

function resolveEffectiveValue(fact, approvedDraftsForFact, now) {
  now = now || new Date();
  var nowMs = now.getTime();

  // Von allen 'approved' Drafts dieses Facts den juengsten bereits wirksamen
  // waehlen (approved_effective_date <= now). Mehrere approved+wirksame Drafts
  // koennen theoretisch existieren (Draft B approved, dann noch ein Draft C
  // approved) -- der mit dem spaetesten Stichtag <= now gewinnt.
  var effective = null;
  var pendingFuture = null;

  (approvedDraftsForFact || []).forEach(function (d) {
    if (d.status !== 'approved' || !d.approved_effective_date) return;
    var stichtagMs = new Date(d.approved_effective_date).getTime();
    if (isNaN(stichtagMs)) return;
    if (stichtagMs <= nowMs) {
      if (!effective || stichtagMs > new Date(effective.approved_effective_date).getTime()) {
        effective = d;
      }
    } else {
      // noch nicht wirksam -- Kandidat fuer das Overlay (Render-Entscheidung:
      // SOFORT nach Freigabe anzeigen, nicht erst X Tage vorher)
      if (!pendingFuture || stichtagMs < new Date(pendingFuture.approved_effective_date).getTime()) {
        pendingFuture = d;
      }
    }
  });

  var value = effective ? (effective.approved_new_value != null ? effective.approved_new_value : fact.current_value) : fact.current_value;

  var pendingOverlay = null;
  if (pendingFuture) {
    pendingOverlay = {
      prosText: pendingFuture.pros_text || null,
      consText: pendingFuture.cons_text || null,
      effectiveDate: pendingFuture.approved_effective_date,
      sourceUrl: pendingFuture.source_url
    };
  }

  return { value: value, pendingOverlay: pendingOverlay };
}

module.exports = { resolveEffectiveValue: resolveEffectiveValue };
