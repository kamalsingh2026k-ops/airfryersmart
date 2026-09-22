/* ==========================================================================
   AirFryerSmart — Recipe Paste & Convert Parser
   --------------------------------------------------------------------------
   Takes arbitrary pasted recipe text, finds every oven temperature and every
   cooking duration, and rewrites them as air fryer values while leaving the
   rest of the recipe untouched.

   Handles:
     350F / 350°F / 350 F / 350 degrees / 350 degrees F / 350 Fahrenheit
     180C / 180°C / 180 degrees celsius / 180 fan  (UK/AU fan-oven notation)
     gas mark 4 / gas 6                             (UK notation)
     25 minutes / 25 mins / 25 min / 25m
     1 hour / 1 hr / 1.5 hours / 1 hour 15 minutes
     ranges: 25-30 minutes / 25 to 30 mins / 350-375°F
   ========================================================================== */
(function (global) {
  'use strict';

  var E = global.AFS.engine;

  /* UK gas mark → °F. Standard British conversion table. */
  var GAS_MARK_F = {
    '1': 275, '2': 300, '3': 325, '4': 350, '5': 375,
    '6': 400, '7': 425, '8': 450, '9': 475
  };

  /* ------------------------------------------------------------------
     Token patterns. Order matters: the most specific pattern must be
     tried first, otherwise "1 hour 15 minutes" gets eaten as "1 hour".
     Every regex is global + case-insensitive and is rebuilt per parse so
     lastIndex state never leaks between runs.
     ------------------------------------------------------------------ */
  function patterns() {
    return [
      /* --- GAS MARK (UK) --------------------------------------------- */
      { type: 'temp', unit: 'gas',
        re: /\bgas(?:\s*mark)?\s*([1-9])\b/gi,
        read: function (m) { return { value: GAS_MARK_F[m[1]], hi: null }; } },

      /* --- TEMPERATURE RANGE: 350-375°F ------------------------------ */
      { type: 'temp', unit: 'range',
        re: /\b(\d{2,3})\s*(?:-|–|—|\bto\b)\s*(\d{2,3})\s*(?:°\s*|\s+)?(?:deg(?:rees)?\.?\s*)?([FC])\b/gi,
        read: function (m) {
          var u = m[3].toUpperCase();
          var lo = parseInt(m[1], 10), hi = parseInt(m[2], 10);
          return { value: u === 'C' ? E.cToF(lo) : lo, hi: u === 'C' ? E.cToF(hi) : hi, src: u };
        } },

      /* --- SINGLE TEMPERATURE ---------------------------------------- */
      { type: 'temp', unit: 'single',
        re: /\b(\d{2,3})\s*(?:°\s*([FC])?|\s*deg(?:rees)?\.?\s*(?:(F|C)(?:ahrenheit|elsius)?)?|\s*(F|C)(?:ahrenheit|elsius)?)\b/gi,
        read: function (m) {
          var n = parseInt(m[1], 10);
          var u = (m[2] || m[3] || m[4] || '').toUpperCase();
          /* No explicit unit: infer from magnitude. Anything at or above
             250 is almost certainly Fahrenheit; 100–249 is Celsius range. */
          if (!u) {
            if (n >= 250 && n <= 550) u = 'F';
            else if (n >= 100 && n < 250) u = 'C';
            else return null;
          }
          if (u === 'C' && (n < 80 || n > 300)) return null;
          if (u === 'F' && (n < 170 || n > 550)) return null;
          return { value: u === 'C' ? E.cToF(n) : n, hi: null, src: u };
        } },

      /* --- COMPOUND TIME: 1 hour 15 minutes -------------------------- */
      { type: 'time', unit: 'compound',
        re: /\b(\d+)\s*(?:hours?|hrs?|h)\s*(?:and\s*)?(\d{1,2})\s*(?:minutes?|mins?|m)\b/gi,
        read: function (m) { return { value: parseInt(m[1], 10) * 60 + parseInt(m[2], 10), hi: null }; } },

      /* --- HOURS (incl. decimals and 1 1/2) -------------------------- */
      { type: 'time', unit: 'hours',
        re: /\b(\d+(?:\.\d+)?)\s*(?:(?:1\/2|½)\s*)?(?:hours?|hrs?)\b/gi,
        read: function (m, raw) {
          var v = parseFloat(m[1]) * 60;
          if (/1\/2|½/.test(raw)) v += 30;
          return { value: v, hi: null };
        } },

      /* --- TIME RANGE: 25-30 minutes --------------------------------- */
      { type: 'time', unit: 'range',
        re: /\b(\d{1,3})\s*(?:-|–|—|\bto\b)\s*(\d{1,3})\s*(?:minutes?|mins?|m)\b/gi,
        read: function (m) { return { value: parseInt(m[1], 10), hi: parseInt(m[2], 10) }; } },

      /* --- SINGLE TIME ----------------------------------------------- */
      { type: 'time', unit: 'single',
        re: /\b(\d{1,3})\s*(?:minutes?|mins?\.?|min\.?)\b/gi,
        read: function (m) {
          var v = parseInt(m[1], 10);
          return (v < 1 || v > 600) ? null : { value: v, hi: null };
        } }
    ];
  }

  /* ------------------------------------------------------------------
     Collect non-overlapping matches, earlier patterns winning.
     ------------------------------------------------------------------ */
  function collect(text) {
    var found = [];
    patterns().forEach(function (p) {
      var m;
      p.re.lastIndex = 0;
      while ((m = p.re.exec(text)) !== null) {
        var start = m.index, end = m.index + m[0].length;
        var overlaps = found.some(function (f) { return start < f.end && end > f.start; });
        if (overlaps) continue;
        var data;
        try { data = p.read(m, m[0]); } catch (e) { data = null; }
        if (!data || !isFinite(data.value)) continue;
        found.push({
          start: start, end: end, raw: m[0],
          type: p.type, unit: p.unit,
          value: data.value, hi: data.hi, src: data.src || null
        });
      }
    });
    return found.sort(function (a, b) { return a.start - b.start; });
  }

  /* ------------------------------------------------------------------
     parse(text, opts)
       opts: { category, brand, batch, frozen, display: 'F' | 'C' }
     Returns { html, plain, matches, summary, stats }
     ------------------------------------------------------------------ */
  function parse(text, opts) {
    opts = opts || {};
    var display = opts.display === 'C' ? 'C' : 'F';
    var tokens = collect(text || '');

    /* A representative oven temp/time lets us report one headline result. */
    var firstTemp = null, firstTime = null;

    var out = [], plainOut = [], cursor = 0, summary = [];

    tokens.forEach(function (t) {
      out.push(escapeHtml(text.slice(cursor, t.start)));
      plainOut.push(text.slice(cursor, t.start));

      var replacement, tip;

      if (t.type === 'temp') {
        /* Convert using a nominal 20-minute cook: temperature output does
           not depend on time, so this is safe and keeps the call simple. */
        var rT = E.convert({
          ovenF: t.value, ovenMinutes: 20,
          category: opts.category, brand: opts.brand,
          batch: opts.batch, frozen: false
        });
        if (firstTemp === null) firstTemp = t.value;

        if (t.hi != null) {
          var rHi = E.convert({
            ovenF: t.hi, ovenMinutes: 20,
            category: opts.category, brand: opts.brand, batch: opts.batch, frozen: false
          });
          replacement = display === 'C'
            ? rT.airC + '–' + rHi.airC + '°C'
            : rT.airF + '–' + rHi.airF + '°F';
        } else {
          replacement = display === 'C' ? rT.airC + '°C' : rT.airF + '°F';
        }
        tip = 'Oven ' + (display === 'C' ? rT.ovenC + '°C' : rT.ovenF + '°F') + ' → air fryer ' + replacement;
        summary.push({ kind: 'Temperature', from: t.raw.trim(), to: replacement, note: tip });

      } else {
        var baseMin = t.value;
        var rTime = E.convert({
          ovenF: firstTemp || 350, ovenMinutes: baseMin,
          category: opts.category, brand: opts.brand,
          batch: opts.batch, frozen: !!opts.frozen
        });
        if (firstTime === null) firstTime = baseMin;

        if (t.hi != null) {
          var rTimeHi = E.convert({
            ovenF: firstTemp || 350, ovenMinutes: t.hi,
            category: opts.category, brand: opts.brand,
            batch: opts.batch, frozen: !!opts.frozen
          });
          replacement = rTime.airMinutes + '–' + rTimeHi.airMinutes + ' minutes';
        } else {
          replacement = E.formatMinutes(rTime.airMinutes);
        }
        tip = 'Oven ' + t.raw.trim() + ' → air fryer ' + replacement +
              (rTime.frozenBonus ? ' (includes +' + rTime.frozenBonus + ' min from frozen)' : '');
        summary.push({ kind: 'Time', from: t.raw.trim(), to: replacement, note: tip });
      }

      out.push('<mark class="afs-hit" title="' + escapeHtml(tip) + '">' + escapeHtml(replacement) +
               '</mark><span class="afs-was"> (was ' + escapeHtml(t.raw.trim()) + ')</span>');
      plainOut.push(replacement + ' (was ' + t.raw.trim() + ')');
      cursor = t.end;
    });

    out.push(escapeHtml(text.slice(cursor)));
    plainOut.push(text.slice(cursor));

    return {
      html: out.join(''),
      plain: plainOut.join(''),
      matches: tokens,
      summary: summary,
      stats: {
        temps: tokens.filter(function (t) { return t.type === 'temp'; }).length,
        times: tokens.filter(function (t) { return t.type === 'time'; }).length,
        firstTemp: firstTemp,
        firstTime: firstTime
      }
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  global.AFS.parser = { parse: parse, collect: collect, GAS_MARK_F: GAS_MARK_F };
})(typeof window !== 'undefined' ? window : globalThis);
