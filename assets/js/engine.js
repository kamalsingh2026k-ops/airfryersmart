/* ==========================================================================
   AirFryerSmart — Conversion Engine
   --------------------------------------------------------------------------
   Pure, dependency-free conversion math shared by:
     - the main converter UI (converter.js)
     - the recipe paste-and-convert parser (parser.js)
     - every generated food page

   All internal math is done in FAHRENHEIT and MINUTES.
   Celsius is a display-layer conversion only, so rounding never compounds.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------
     1. FOOD CATEGORY PROFILES
     ---------------------------------------------------------------------
     tempDrop  : °F to subtract from the oven temperature.
                 Baseline is the well-known "minus 25°F" rule. Dense foods
                 that need the interior to catch up get a bigger drop so the
                 outside does not scorch; thin/quick foods need less.
     timeFactor: multiplier applied to the oven time (the 0.7–0.8 rule,
                 widened slightly at both ends where the food demands it).
     note      : plain-English reason shown in the UI (E-E-A-T signal).
     --------------------------------------------------------------------- */
  var CATEGORIES = {
    general:    { label: 'General / Not sure',        tempDrop: 25, timeFactor: 0.78, note: 'Standard conversion: 25°F lower, about 20% less time.' },
    poultry:    { label: 'Chicken & Poultry',         tempDrop: 25, timeFactor: 0.75, note: 'Poultry browns fast in circulating air — check for 165°F early.' },
    redmeat:    { label: 'Beef, Pork & Lamb',         tempDrop: 25, timeFactor: 0.75, note: 'Use a thermometer: 145°F for whole cuts, 160°F for anything ground.' },
    seafood:    { label: 'Fish & Seafood',            tempDrop: 20, timeFactor: 0.70, note: 'Delicate and fast — seafood can overcook in under a minute.' },
    frozen:     { label: 'Frozen Convenience Foods',  tempDrop: 15, timeFactor: 0.72, note: 'Par-fried frozen food needs high heat to crisp, so we drop temp less.' },
    vegetables: { label: 'Vegetables',                tempDrop: 25, timeFactor: 0.72, note: 'Toss in oil so the edges caramelise instead of drying out.' },
    potatoes:   { label: 'Potatoes & Root Veg',       tempDrop: 20, timeFactor: 0.75, note: 'Dense and starchy — the interior needs time to turn fluffy.' },
    baked:      { label: 'Baked Goods & Desserts',    tempDrop: 40, timeFactor: 0.80, note: 'The fan is aggressive. Drop 40°F or tops burn before centres set.' },
    casserole:  { label: 'Casseroles & Bakes',        tempDrop: 30, timeFactor: 0.85, note: 'A solid dish blocks airflow, so time savings are smaller here.' },
    reheat:     { label: 'Reheating Leftovers',       tempDrop: 25, timeFactor: 0.45, note: 'Reheating only needs to reach 165°F — far quicker than cooking.' }
  };

  /* ---------------------------------------------------------------------
     2. AIR FRYER BRAND / MODEL CALIBRATION
     ---------------------------------------------------------------------
     Basket-style units have a small chamber and a fan directly above the
     food, so they run effectively hotter than their dial says. Oven-style
     units have a larger cavity and more thermal mass, so they need a nudge
     up in both temperature and time.
     --------------------------------------------------------------------- */
  var BRANDS = {
    generic_basket: { label: 'Generic basket air fryer', tempAdj:  0, timeAdj: 1.00, style: 'basket', note: 'Baseline calibration for a standard basket unit.' },
    ninja:          { label: 'Ninja Foodi / Ninja AF',   tempAdj: -5, timeAdj: 0.95, style: 'basket', note: 'Ninja units run hot and cook fast — we trim temp and time slightly.' },
    cosori:         { label: 'Cosori',                   tempAdj:  0, timeAdj: 0.98, style: 'basket', note: 'Cosori baskets track their dial closely; only a small time trim.' },
    philips:        { label: 'Philips Airfryer',         tempAdj: -5, timeAdj: 0.97, style: 'basket', note: 'Philips Rapid Air is efficient — slightly lower temp avoids over-browning.' },
    instant:        { label: 'Instant Vortex',           tempAdj:  0, timeAdj: 1.00, style: 'basket', note: 'Instant Vortex sits right on the baseline for basket units.' },
    gourmia:        { label: 'Gourmia',                  tempAdj:  5, timeAdj: 1.03, style: 'basket', note: 'Gourmia units often read a little cool — we add a small margin.' },
    generic_oven:   { label: 'Oven-style / toaster air fryer', tempAdj: 10, timeAdj: 1.12, style: 'oven', note: 'Larger cavity, weaker airflow — needs more heat and more time.' },
    ninja_oven:     { label: 'Ninja Foodi Oven / XL',    tempAdj: 10, timeAdj: 1.08, style: 'oven', note: 'Oven-style Ninja: bigger chamber, so add a little time.' },
    dualzone:       { label: 'Dual-basket (DualZone)',   tempAdj:  0, timeAdj: 1.05, style: 'basket', note: 'Running both drawers loaded adds a little time per side.' }
  };

  /* ---------------------------------------------------------------------
     3. BATCH SIZE — crowding reduces airflow, which costs time
     --------------------------------------------------------------------- */
  var BATCHES = {
    small:  { label: 'Small — under 1 lb (1 serving)',  mult: 0.92, note: 'A light load cooks a touch faster than the standard estimate.' },
    normal: { label: 'Standard — about 1 lb (2 servings)', mult: 1.00, note: 'A comfortable single layer. This is the baseline.' },
    large:  { label: 'Large — about 2 lb (3–4 servings)', mult: 1.13, note: 'A fuller basket restricts airflow, so add roughly 13% more time.' },
    family: { label: 'Family — 3 lb or more (5+)',        mult: 1.26, note: 'Heavily loaded. Cook in two batches if you want maximum crispiness.' }
  };

  /* ---------------------------------------------------------------------
     4. FROZEN PENALTY — scales with cook length, capped to stay sensible
     --------------------------------------------------------------------- */
  function frozenBonus(baseMinutes) {
    if (baseMinutes <= 0) return 0;
    var bonus = Math.round(baseMinutes * 0.35);   // ~35% longer from frozen
    return Math.max(5, Math.min(bonus, 15));      // clamp to the 5–15 min band
  }

  /* ---------------------------------------------------------------------
     5. UNIT HELPERS
     --------------------------------------------------------------------- */
  function fToC(f) { return (f - 32) * 5 / 9; }
  function cToF(c) { return c * 9 / 5 + 32; }

  /** Round °F to the nearest 5 — air fryer dials do not do odd numbers. */
  function roundF(f) { return Math.round(f / 5) * 5; }

  /** Round °C to the nearest 5 — matches how EU/UK/AU appliances are marked. */
  function roundC(c) { return Math.round(c / 5) * 5; }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /** Format minutes as a friendly "1 hr 5 min" / "18 min" string. */
  function formatMinutes(min) {
    min = Math.max(1, Math.round(min));
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return m === 0 ? h + ' hr' : h + ' hr ' + m + ' min';
  }

  /* ---------------------------------------------------------------------
     6. THE CONVERSION
     ---------------------------------------------------------------------
     opts = {
       ovenF      : Number  oven temperature in °F (required)
       ovenMinutes: Number  oven time in minutes   (required)
       category   : key of CATEGORIES  (default 'general')
       brand      : key of BRANDS      (default 'generic_basket')
       batch      : key of BATCHES     (default 'normal')
       frozen     : Boolean            (default false)
     }
     --------------------------------------------------------------------- */
  function convert(opts) {
    var cat   = CATEGORIES[opts.category] || CATEGORIES.general;
    var brand = BRANDS[opts.brand]        || BRANDS.generic_basket;
    var batch = BATCHES[opts.batch]       || BATCHES.normal;

    var ovenF       = clamp(Number(opts.ovenF) || 350, 150, 550);
    var ovenMinutes = clamp(Number(opts.ovenMinutes) || 20, 1, 240);

    /* --- temperature ------------------------------------------------- */
    var rawF = ovenF - cat.tempDrop + brand.tempAdj;
    // No consumer air fryer usefully runs below 180°F or above 400°F.
    var airF = clamp(roundF(rawF), 180, 400);

    /* --- time --------------------------------------------------------- */
    var baseTime  = ovenMinutes * cat.timeFactor;   // category rule
    var withBrand = baseTime * brand.timeAdj;       // model calibration
    var withBatch = withBrand * batch.mult;         // crowding penalty
    var bonus     = opts.frozen ? frozenBonus(withBatch) : 0;
    var airTime   = Math.max(1, Math.round(withBatch + bonus));

    /* --- shake / flip point ------------------------------------------- */
    // Halfway is the standard advice; for long cooks a third of the way in
    // is more useful because that is when sticking actually happens.
    var shakeAt = airTime >= 25 ? Math.round(airTime / 3) : Math.round(airTime / 2);

    /* --- human-readable reasoning ------------------------------------- */
    var reasons = [];
    reasons.push('Base rule: ' + ovenF + '°F − ' + cat.tempDrop + '°F and ×' +
                 cat.timeFactor.toFixed(2) + ' time (' + cat.label + ').');
    if (brand.tempAdj !== 0 || brand.timeAdj !== 1) {
      reasons.push(brand.label + ': ' +
        (brand.tempAdj !== 0 ? (brand.tempAdj > 0 ? '+' : '') + brand.tempAdj + '°F, ' : '') +
        '×' + brand.timeAdj.toFixed(2) + ' time. ' + brand.note);
    }
    if (batch.mult !== 1) {
      reasons.push(batch.label + ': ×' + batch.mult.toFixed(2) + ' time. ' + batch.note);
    }
    if (bonus > 0) {
      reasons.push('Cooking from frozen: +' + bonus + ' minutes. Do not thaw breaded or par-fried foods first.');
    }

    return {
      airF: airF,
      airC: roundC(fToC(airF)),
      ovenF: Math.round(ovenF),
      ovenC: roundC(fToC(ovenF)),
      airMinutes: airTime,
      ovenMinutes: Math.round(ovenMinutes),
      shakeAt: Math.max(1, shakeAt),
      frozenBonus: bonus,
      timeSaved: Math.max(0, Math.round(ovenMinutes) - airTime),
      category: cat,
      brand: brand,
      batch: batch,
      reasons: reasons
    };
  }

  /* ---------------------------------------------------------------------
     7. USDA SAFE MINIMUM INTERNAL TEMPERATURES
     ---------------------------------------------------------------------
     Source: USDA FSIS "Safe Minimum Internal Temperature Chart" and
     FoodSafety.gov. These are safety minimums, not preference targets.
     --------------------------------------------------------------------- */
  var SAFE_TEMPS = [
    { food: 'Chicken & turkey (all cuts, whole or ground)', f: 165, c: 74, note: 'No rest time required.' },
    { food: 'Ground beef, pork, veal and lamb',             f: 160, c: 71, note: 'Grinding spreads surface bacteria throughout — no exceptions.' },
    { food: 'Beef, pork, veal, lamb (steaks, chops, roasts)', f: 145, c: 63, note: 'Plus a 3-minute rest before carving or eating.' },
    { food: 'Fish and shellfish',                           f: 145, c: 63, note: 'Or cook until the flesh is opaque and flakes easily.' },
    { food: 'Ham, fresh or smoked (uncooked)',              f: 145, c: 63, note: 'Plus a 3-minute rest.' },
    { food: 'Fully cooked ham (to reheat)',                 f: 165, c: 74, note: '140°F is sufficient for USDA-inspected, ready-to-eat ham.' },
    { food: 'Egg dishes and casseroles',                    f: 160, c: 71, note: 'Cook eggs until both yolk and white are firm.' },
    { food: 'Leftovers and reheated food',                  f: 165, c: 74, note: 'Reheat throughout, not just at the edges.' }
  ];

  /* ---------------------------------------------------------------------
     8. EXPORT
     --------------------------------------------------------------------- */
  global.AFS = global.AFS || {};
  global.AFS.engine = {
    CATEGORIES: CATEGORIES,
    BRANDS: BRANDS,
    BATCHES: BATCHES,
    SAFE_TEMPS: SAFE_TEMPS,
    convert: convert,
    fToC: fToC,
    cToF: cToF,
    roundF: roundF,
    roundC: roundC,
    clamp: clamp,
    formatMinutes: formatMinutes,
    frozenBonus: frozenBonus
  };
})(typeof window !== 'undefined' ? window : globalThis);
