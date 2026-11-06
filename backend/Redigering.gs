/**
 * RC Portal – editing saved inspections and self-declarations.
 *
 * Separate file in the Apps Script project (File → + → Script → "Redigering").
 * Self-contained: reads column positions from the header row of each sheet, so the
 * column order in the sheet does not matter. Missing log columns are added automatically.
 *
 * Hook-up in doPost (Code.gs): next to the existing line that handles 'lagreKontroll',
 * add two lines with the same pattern, calling
 *     endreKontroll_(<logged-in user object>, <request body>)
 *     endreEgenerklaering_(<logged-in user object>, <request body>)
 * The user object must have telefon, navn, rolle and avdeling (the same one hentData returns as "bruker").
 * Both functions return a plain object { id, ingenEndring } and throw an Error with a readable message on failure.
 */

var RED_ARK_KONTROLL = 'Kontroller';
var RED_ARK_EGEN = 'Egenerklaeringer';
var RED_ARK_SYKLER = 'Sykler';
var RED_TZ = 'Europe/Oslo';

// Full inspection: points per group (same as SEKSJONER in index.html)
var RED_GRUPPER = {
  sum_lys: ['lys_naer', 'lys_fjern', 'lys_brems', 'blink_f', 'blink_b'],
  sum_dekk: ['dekk_f', 'dekk_b'],
  sum_bremser: ['brems_f', 'brems_b'],
  sum_ramme: ['hjullager_f', 'hjullager_b', 'foring_baksving', 'styrelager', 'demper_f', 'demper_b'],
  sum_motor: ['belt_kjede']
};
var RED_PUNKTER = [].concat(RED_GRUPPER.sum_dekk, RED_GRUPPER.sum_bremser, ['hjullager_f', 'hjullager_b', 'foring_baksving', 'styrelager', 'demper_f', 'demper_b'],
  RED_GRUPPER.sum_lys, RED_GRUPPER.sum_motor);
var RED_STOR_EKSTRA = ['dekk_f_mm', 'dekk_f_dato', 'dekk_b_mm', 'dekk_b_dato', 'brems_f_belegg', 'brems_b_belegg', 'batteri_dato', 'batteri_ok',
  'olje_primaer', 'olje_primaer_ok', 'olje_clutch', 'olje_clutch_ok', 'olje_hydr', 'olje_hydr_ok', 'olje_motor', 'olje_motor_ok', 'kjolevaeske', 'kjolevaeske_ok'];
var RED_OLJE_OK = ['olje_primaer_ok', 'olje_clutch_ok', 'olje_hydr_ok', 'olje_motor_ok', 'kjolevaeske_ok', 'batteri_ok'];
var RED_ENKEL = ['sum_lys', 'sum_dekk', 'sum_bremser', 'sum_ramme', 'sum_motor', 'allmenn_tilstand'];
var RED_EGEN_FELT = ['reiseforsikring', 'reiseforsikring_selskap', 'forerkort_klasse', 'forerkort_merknad', 'helsetrygdekort', 'helsetrygdekort_utloper',
  'mc_forsikring_selskap', 'km', 'merknad', 'sykkel_id',
  'brems_f', 'brems_b', 'dekk_f', 'dekk_b', 'lys_naer', 'lys_fjern', 'lys_brems', 'blinklys', 'demper_f', 'demper_b', 'olje_byttet'];

// ─── Inspection ─────────────────────────────────────────────
function endreKontroll_(bruker, body) {
  var inn = body.kontroll || {};
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var t = redTabell_(RED_ARK_KONTROLL, ['endringer', 'endret_av', 'endret_tid']);
    var rad = redFinnRad_(t, body.id);
    if (!rad) throw new Error('Fant ikke kontrollen. Den kan være slettet.');
    var gml = rad.obj;
    if (!redKanEndreAvd_(bruker, gml.avdeling)) throw new Error('Du har ikke tilgang til å endre denne kontrollen.');
    var status = String(gml.status || '');
    if (status === 'venter') throw new Error('Kontrollen venter på godkjenning – bruk «Rett og godkjenn».');
    if (status === 'avvist') throw new Error('En avvist kontroll kan ikke endres.');
    if (String(gml.skjema) === 'ekstra') throw new Error('Ekstra kontroller kan ikke endres ennå.');

    var skjema = inn.skjema === 'stor' ? 'stor' : 'enkel';
    var ny = {};
    ny.skjema = skjema;
    ny.dato = redDato_(inn.dato) || redDato_(gml.dato);
    ny.maaned = /^\d{4}-\d{2}$/.test(String(inn.maaned || '')) ? String(inn.maaned) : redTekst_(gml.maaned);
    ny.km = redTall_(inn.km);
    ny.km_byttet = inn.km_byttet ? 'Ja' : '';
    ny.frist = redDato_(inn.frist);
    ny.merknad = String(inn.merknad || '').trim();

    var maks = 0;
    if (skjema === 'stor') {
      RED_PUNKTER.forEach(function (p) {
        var v = redSkala_(inn[p]);
        if (v === '') throw new Error('Alle punkter må vurderes (mangler ' + p + ').');
        ny[p] = v;
      });
      RED_STOR_EKSTRA.forEach(function (f) { ny[f] = String(inn[f] == null ? '' : inn[f]).trim(); });
      ny.bilde_avis = inn.bilde_avis === 'Ja' ? 'Ja' : inn.bilde_avis === 'Nei' ? 'Nei' : '';
      Object.keys(RED_GRUPPER).forEach(function (g) {
        ny[g] = Math.max.apply(null, RED_GRUPPER[g].map(function (p) { return ny[p]; }));
      });
      if (RED_OLJE_OK.some(function (f) { return ny[f] === 'Ikke OK'; })) ny.sum_motor = Math.max(ny.sum_motor, 1);
      ny.allmenn_tilstand = '';
      maks = Math.max(ny.sum_lys, ny.sum_dekk, ny.sum_bremser, ny.sum_ramme, ny.sum_motor);
    } else {
      RED_ENKEL.forEach(function (p) {
        var v = redSkala_(inn[p]);
        if (v === '') throw new Error('Alle punkter må vurderes (mangler ' + p + ').');
        ny[p] = v;
      });
      // fields that only belong to the full form are emptied when it is changed to a quick one
      RED_PUNKTER.concat(RED_STOR_EKSTRA).forEach(function (f) { ny[f] = ''; });
      ny.bilde_avis = '';
      maks = Math.max.apply(null, RED_ENKEL.map(function (p) { return ny[p]; }));
    }
    var forbud = maks === 2 || inn.kjoreforbud === true || inn.kjoreforbud === 'Ja';
    ny.kjoreforbud = forbud ? 'Ja' : 'Nei';
    ny.sum_allmenn = forbud ? 2 : maks;

    return redLagre_(t, rad, ny, bruker);
  } finally { lock.releaseLock(); }
}

// ─── Self-declaration ───────────────────────────────────────
function endreEgenerklaering_(bruker, body) {
  var inn = body.egenerklaering || {};
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var t = redTabell_(RED_ARK_EGEN, ['endringer', 'endret_av', 'endret_tid']);
    var rad = redFinnRad_(t, body.id);
    if (!rad) throw new Error('Fant ikke egenerklæringen.');
    var gml = rad.obj;
    var eier = redTlf_(gml.telefon) === redTlf_(bruker.telefon);
    var sammeAar = String(redDato_(gml.dato)).slice(0, 4) === Utilities.formatDate(new Date(), RED_TZ, 'yyyy');
    if (!(redKanEndreAvd_(bruker, gml.avdeling) || (eier && sammeAar)))
      throw new Error(eier ? 'Egenerklæringer fra tidligere sesonger kan bare endres av Road Captain.' : 'Du har ikke tilgang til å endre denne egenerklæringen.');
    if (eier && !redKanEndreAvd_(bruker, gml.avdeling) && !inn.bekreftet) throw new Error('Bekreft at opplysningene stemmer.');

    var ny = {};
    RED_EGEN_FELT.forEach(function (f) { if (f in inn) ny[f] = String(inn[f] == null ? '' : inn[f]).trim(); });
    if ('km' in ny) ny.km = redTall_(ny.km);
    if ('helsetrygdekort_utloper' in ny) ny.helsetrygdekort_utloper = redDato_(ny.helsetrygdekort_utloper);

    // another bike: must belong to the same member; copy regnr/model/year with it
    if (ny.sykkel_id && ny.sykkel_id !== String(gml.sykkel_id)) {
      var st = redTabell_(RED_ARK_SYKLER, []);
      var s = redFinnRad_(st, ny.sykkel_id);
      if (!s || redTlf_(s.obj.telefon) !== redTlf_(gml.telefon)) throw new Error('Sykkelen tilhører ikke dette medlemmet.');
      ['regnr', 'modell', 'aarsmodell'].forEach(function (f) { if (f in s.obj) ny[f] = s.obj[f]; });
    } else delete ny.sykkel_id;

    return redLagre_(t, rad, ny, bruker);
  } finally { lock.releaseLock(); }
}

// ─── Helpers ────────────────────────────────────────────────
function redKanEndreAvd_(bruker, avdeling) {
  var r = String(bruker.rolle || '');
  return r === 'admin' || ((r === 'rc' || r === 'officer') && String(bruker.avdeling) === String(avdeling));
}

/** Sheet + header map; adds missing columns at the end of the header row. */
function redTabell_(navn, trengs) {
  var ark = SpreadsheetApp.getActive().getSheetByName(navn);
  if (!ark) throw new Error('Fant ikke arket ' + navn + '.');
  var hode = ark.getRange(1, 1, 1, ark.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  trengs.forEach(function (k) {
    if (hode.indexOf(k) < 0) { hode.push(k); ark.getRange(1, hode.length).setValue(k); }
  });
  var kol = {}; hode.forEach(function (h, i) { if (h) kol[h] = i; });
  if (!('id' in kol)) throw new Error('Arket ' + navn + ' mangler kolonnen id.');
  return { ark: ark, hode: hode, kol: kol };
}

function redFinnRad_(t, id) {
  if (!id) return null;
  var n = t.ark.getLastRow() - 1;
  if (n < 1) return null;
  var ider = t.ark.getRange(2, t.kol.id + 1, n, 1).getValues();
  for (var i = 0; i < ider.length; i++) {
    if (String(ider[i][0]) === String(id)) {
      var rnr = i + 2;
      var verdier = t.ark.getRange(rnr, 1, 1, t.hode.length).getValues()[0];
      var obj = {}; t.hode.forEach(function (h, j) { if (h) obj[h] = verdier[j]; });
      return { rnr: rnr, verdier: verdier, obj: obj };
    }
  }
  return null;
}

/** Writes only fields that exist as columns and have actually changed; appends the change to «endringer». */
function redLagre_(t, rad, ny, bruker) {
  var fra = {};
  var verdier = rad.verdier.slice();
  Object.keys(ny).forEach(function (f) {
    if (!(f in t.kol)) return;
    var gammel = redNorm_(rad.obj[f]), nyV = redNorm_(ny[f]);
    if (gammel === nyV) return;
    fra[f] = [gammel, nyV];
    verdier[t.kol[f]] = ny[f];
  });
  if (!Object.keys(fra).length) return { id: rad.obj.id, ingenEndring: true };

  var tid = Utilities.formatDate(new Date(), RED_TZ, 'yyyy-MM-dd HH:mm');
  var logg = [];
  try { logg = JSON.parse(rad.obj.endringer || '[]'); if (!Array.isArray(logg)) logg = []; } catch (e) { logg = []; }
  logg.push({ av: String(bruker.navn || bruker.telefon), tlf: String(bruker.telefon), tid: tid, fra: fra });
  var tekst = JSON.stringify(logg);
  while (tekst.length > 45000 && logg.length > 1) { logg.shift(); tekst = JSON.stringify(logg); }   // cell limit is 50 000 characters
  verdier[t.kol.endringer] = tekst;
  verdier[t.kol.endret_av] = String(bruker.navn || bruker.telefon);
  verdier[t.kol.endret_tid] = tid;

  t.ark.getRange(rad.rnr, 1, 1, verdier.length).setValues([verdier]);
  return { id: rad.obj.id, endret: Object.keys(fra) };
}

function redNorm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, RED_TZ, 'yyyy-MM-dd');
  if (v === null || v === undefined) return '';
  return String(v).trim();
}
function redTekst_(v) { return redNorm_(v); }
function redDato_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, RED_TZ, 'yyyy-MM-dd');
  var s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}
function redTall_(v) {
  var s = String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.');
  if (s === '') return '';
  var n = Number(s);
  if (isNaN(n) || n < 0) throw new Error('Ugyldig kilometerstand.');
  return Math.round(n);
}
function redSkala_(v) {
  if (v === '' || v === null || v === undefined) return '';
  var n = Number(v);
  if ([0, 1, 2].indexOf(n) < 0) throw new Error('Ugyldig verdi på skalaen.');
  return n;
}
function redTlf_(v) { return String(v || '').replace(/\D/g, '').slice(-8); }
