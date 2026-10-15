/* ==========================================================================
   AirFryerSmart — Converter page controller
   Sliders, unit toggle, live results, Chart.js comparison, kitchen timer
   with Notifications, saved recipes, clipboard, print, recipe parser UI.
   ========================================================================== */
(function () {
  'use strict';

  var E = window.AFS.engine;
  var P = window.AFS.parser;
  var LS = window.AFS.LS;
  var toast = window.AFS.toast;

  var $ = function (id) { return document.getElementById(id); };

  /* =====================================================================
     STATE
     ===================================================================== */
  var state = {
    unit: 'F',            // display unit
    ovenF: 400,           // always stored in °F internally
    minutes: 30,
    category: 'general',
    brand: 'generic_basket',
    batch: 'normal',
    frozen: false
  };

  function loadPrefs() {
    try {
      var saved = JSON.parse(localStorage.getItem(LS.prefs) || '{}');
      Object.keys(saved).forEach(function (k) {
        if (k in state) state[k] = saved[k];
      });
    } catch (e) {}
  }
  function savePrefs() {
    try { localStorage.setItem(LS.prefs, JSON.stringify(state)); } catch (e) {}
  }

  /* =====================================================================
     POPULATE SELECTS FROM THE ENGINE
     Keeps UI and math in sync — no duplicated option lists.
     ===================================================================== */
  function fillSelect(el, obj, selected) {
    if (!el) return;
    el.innerHTML = '';
    Object.keys(obj).forEach(function (key) {
      var o = document.createElement('option');
      o.value = key;
      o.textContent = obj[key].label;
      if (key === selected) o.selected = true;
      el.appendChild(o);
    });
  }

  /* =====================================================================
     RENDER
     ===================================================================== */
  var chart = null;

  function render() {
    var r = E.convert({
      ovenF: state.ovenF, ovenMinutes: state.minutes,
      category: state.category, brand: state.brand,
      batch: state.batch, frozen: state.frozen
    });

    var isC = state.unit === 'C';

    /* --- slider read-outs --------------------------------------------- */
    $('oven-temp-display').textContent = isC ? r.ovenC + '°C' : r.ovenF + '°F';
    $('oven-time-display').textContent = E.formatMinutes(state.minutes);

    /* --- headline results --------------------------------------------- */
    $('result-temp').textContent = isC ? r.airC + '°C' : r.airF + '°F';
    $('result-time').textContent = r.airMinutes;
    $('result-time-unit').textContent = r.airMinutes === 1 ? 'minute' : 'minutes';
    $('result-shake').textContent = r.shakeAt;
    $('result-saved').textContent = r.timeSaved > 0 ? r.timeSaved + ' min faster' : 'about the same';

    /* --- explanation of the maths (transparency = trust) --------------- */
    var why = $('result-why');
    why.innerHTML = '';
    r.reasons.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      why.appendChild(li);
    });

    /* --- category note ------------------------------------------------- */
    $('category-note').textContent = r.category.note;

    /* --- frozen badge --------------------------------------------------- */
    $('frozen-badge').hidden = !r.frozenBonus;
    if (r.frozenBonus) {
      $('frozen-badge').textContent = 'From frozen: +' + r.frozenBonus + ' min included';
    }

    /* --- batch warning --------------------------------------------------- */
    var warn = $('crowd-warning');
    if (state.batch === 'large' || state.batch === 'family') {
      warn.hidden = false;
      warn.textContent = state.batch === 'family'
        ? 'Don\u2019t overcrowd the basket \u2014 with this much food, cook in two batches for genuinely crispy results.'
        : 'A fuller basket restricts airflow. Shake more often, or split into two batches for best crispiness.';
    } else { warn.hidden = true; }

    /* --- timer default ---------------------------------------------------- */
    if (!timer.running) {
      timer.total = r.airMinutes * 60;
      timer.remaining = timer.total;
      timer.shakeSeconds = (r.airMinutes - r.shakeAt) * 60;
      timer.shakeFired = false;
      paintTimer();
    }

    updateChart(r, isC);
    savePrefs();
    return r;
  }

  /* =====================================================================
     CHART — oven vs air fryer comparison
     ===================================================================== */
  function chartColors() {
    var dark = document.documentElement.classList.contains('dark');
    return {
      grid: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)',
      text: dark ? '#d1d5db' : '#374151'
    };
  }

  function updateChart(r, isC) {
    var canvas = $('compare-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    var c = chartColors();

    var data = {
      labels: ['Temperature (' + (isC ? '°C' : '°F') + ')', 'Time (minutes)'],
      datasets: [
        { label: 'Conventional oven',
          data: [isC ? r.ovenC : r.ovenF, r.ovenMinutes],
          backgroundColor: 'rgba(148,163,184,.75)', borderRadius: 6 },
        { label: 'Air fryer',
          data: [isC ? r.airC : r.airF, r.airMinutes],
          backgroundColor: 'rgba(234,88,12,.9)', borderRadius: 6 }
      ]
    };

    if (chart) {
      chart.data = data;
      chart.options.scales.x.grid.color = c.grid;
      chart.options.scales.y.grid.color = c.grid;
      chart.options.scales.x.ticks.color = c.text;
      chart.options.scales.y.ticks.color = c.text;
      chart.options.plugins.legend.labels.color = c.text;
      chart.update();
      return;
    }

    chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: data,
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { position: 'bottom', labels: { color: c.text, usePointStyle: true, padding: 16 } },
          tooltip: { callbacks: { label: function (ctx) {
            var unit = ctx.dataIndex === 0 ? (isC ? '°C' : '°F') : ' min';
            return ctx.dataset.label + ': ' + ctx.parsed.y + unit;
          } } }
        },
        scales: {
          x: { grid: { color: c.grid }, ticks: { color: c.text } },
          y: { beginAtZero: true, grid: { color: c.grid }, ticks: { color: c.text } }
        }
      }
    });
  }

  document.addEventListener('afs:themechange', function () {
    if (chart) { var isC = state.unit === 'C'; updateChart(render.last || E.convert(state), isC); }
  });

  /* =====================================================================
     KITCHEN TIMER
     Uses wall-clock deltas rather than counting ticks, so it stays accurate
     when the tab is backgrounded and browsers throttle setInterval.
     ===================================================================== */
  var timer = {
    id: null, running: false, total: 0, remaining: 0,
    endAt: 0, shakeSeconds: 0, shakeFired: false
  };

  function fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function paintTimer() {
    $('timer-display').textContent = fmtClock(timer.remaining);
    var pct = timer.total ? (1 - timer.remaining / timer.total) * 100 : 0;
    $('timer-bar').style.width = Math.min(100, Math.max(0, pct)) + '%';
    $('timer-display').setAttribute('aria-label',
      'Timer: ' + Math.floor(timer.remaining / 60) + ' minutes ' + (timer.remaining % 60) + ' seconds remaining');
    $('timer-start').textContent = timer.running ? '⏸ Pause' : '▶ Start timer';
    var next = $('timer-next');
    if (timer.shakeSeconds > 0 && !timer.shakeFired) {
      next.textContent = 'Shake alert at ' + fmtClock(timer.shakeSeconds) + ' remaining';
    } else if (timer.running) { next.textContent = 'Cooking…'; }
    else { next.textContent = ''; }
  }

  function notify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: 'assets/img/icon-192.png',
          badge: 'assets/img/icon-192.png',
          tag: 'afs-timer',
          requireInteraction: true
        });
      }
    } catch (e) {}
    beep();
    toast(title + ' — ' + body);
  }

  /* Short WebAudio chirp — no audio file needed, works offline. */
  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [0, 0.28, 0.56].forEach(function (offset) {
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.22);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.24);
      });
      setTimeout(function () { ctx.close(); }, 1200);
    } catch (e) {}
  }

  function tick() {
    timer.remaining = Math.max(0, (timer.endAt - Date.now()) / 1000);

    if (!timer.shakeFired && timer.shakeSeconds > 0 && timer.remaining <= timer.shakeSeconds) {
      timer.shakeFired = true;
      notify('Time to shake the basket! 🧺', 'Toss or flip your food now for even browning.');
    }

    if (timer.remaining <= 0) {
      stopTimer();
      timer.remaining = 0;
      paintTimer();
      notify('Your food is ready! 🍗', 'Check the internal temperature before serving.');
      return;
    }
    paintTimer();
  }

  function startTimer() {
    if (timer.remaining <= 0) timer.remaining = timer.total;
    /* Ask for notification permission on the user gesture, as browsers require. */
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    timer.endAt = Date.now() + timer.remaining * 1000;
    timer.running = true;
    clearInterval(timer.id);
    timer.id = setInterval(tick, 250);
    paintTimer();
  }

  function pauseTimer() {
    timer.running = false;
    clearInterval(timer.id);
    timer.id = null;
    paintTimer();
  }

  function stopTimer() {
    timer.running = false;
    clearInterval(timer.id);
    timer.id = null;
  }

  function resetTimer() {
    stopTimer();
    timer.remaining = timer.total;
    timer.shakeFired = false;
    paintTimer();
  }

  /* Re-sync immediately when the tab regains focus — throttled intervals
     may have drifted while backgrounded. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && timer.running) tick();
  });

  /* =====================================================================
     SAVED RECIPES
     ===================================================================== */
  function getSaved() {
    try { return JSON.parse(localStorage.getItem(LS.saved) || '[]'); } catch (e) { return []; }
  }
  function putSaved(list) {
    try { localStorage.setItem(LS.saved, JSON.stringify(list)); } catch (e) {}
    renderSaved();
  }

  function saveCurrent() {
    var name = ($('save-name').value || '').trim();
    if (!name) {
      $('save-name').focus();
      toast('Give your recipe a name first');
      return;
    }
    var r = render();
    var list = getSaved();
    list.unshift({
      id: 'r' + Date.now(),
      name: name,
      ovenF: state.ovenF, minutes: state.minutes,
      category: state.category, brand: state.brand,
      batch: state.batch, frozen: state.frozen,
      airF: r.airF, airC: r.airC, airMinutes: r.airMinutes, shakeAt: r.shakeAt,
      savedAt: new Date().toISOString()
    });
    putSaved(list.slice(0, 50));
    $('save-name').value = '';
    toast('Saved “' + name + '”');
  }

  function renderSaved() {
    var list = getSaved();
    var wrap = $('saved-list');
    var empty = $('saved-empty');
    var count = $('saved-count');
    wrap.innerHTML = '';
    count.textContent = list.length;
    empty.hidden = list.length > 0;

    list.forEach(function (item) {
      var isC = state.unit === 'C';
      var li = document.createElement('li');
      li.className = 'p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3 justify-between';
      li.innerHTML =
        '<div class="min-w-0">' +
          '<p class="font-bold truncate">' + esc(item.name) + '</p>' +
          '<p class="text-sm text-gray-600 dark:text-gray-400">' +
            (isC ? item.airC + '°C' : item.airF + '°F') + ' · ' + item.airMinutes + ' min · shake at ' + item.shakeAt + ' min' +
            (item.frozen ? ' · from frozen' : '') +
          '</p>' +
        '</div>' +
        '<div class="flex gap-2 shrink-0">' +
          '<button type="button" class="px-3 py-2 text-sm rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 font-semibold" data-load="' + item.id + '">Load</button>' +
          '<button type="button" class="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 font-semibold" data-rename="' + item.id + '">Rename</button>' +
          '<button type="button" class="px-3 py-2 text-sm rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold" data-delete="' + item.id + '">Delete</button>' +
        '</div>';
      wrap.appendChild(li);
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* =====================================================================
     COPY / PRINT / RESET
     ===================================================================== */
  function resultText() {
    var r = render();
    var isC = state.unit === 'C';
    return [
      'AIR FRYER CONVERSION — AirFryerSmart',
      '-------------------------------------',
      'Oven:       ' + (isC ? r.ovenC + '°C' : r.ovenF + '°F') + ' for ' + E.formatMinutes(r.ovenMinutes),
      'Air fryer:  ' + (isC ? r.airC + '°C' : r.airF + '°F') + ' for ' + E.formatMinutes(r.airMinutes),
      'Shake at:   ' + r.shakeAt + ' minutes in',
      'Food type:  ' + r.category.label,
      'Model:      ' + r.brand.label,
      'Batch size: ' + r.batch.label,
      state.frozen ? 'Cooking from frozen (+' + r.frozenBonus + ' min included)' : 'Fresh / thawed',
      '',
      'Always confirm doneness with a food thermometer.',
      (window.AFS_CONFIG && window.AFS_CONFIG.SITE_URL) || ''
    ].join('\n');
  }

  function copyResult() {
    var text = resultText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { toast('Copied to clipboard ✓'); })
        .catch(fallbackCopy);
    } else { fallbackCopy(); }

    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Copied to clipboard ✓'); }
      catch (e) { toast('Press Ctrl+C to copy'); }
      document.body.removeChild(ta);
    }
  }

  function resetAll() {
    if (!confirm('Reset all settings, saved recipes and preferences? This cannot be undone.')) return;
    try {
      [LS.prefs, LS.saved, LS.unit].forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    state = { unit: 'F', ovenF: 400, minutes: 30, category: 'general',
              brand: 'generic_basket', batch: 'normal', frozen: false };
    syncInputs();
    resetTimer();
    renderSaved();
    render();
    toast('Everything reset');
  }

  /* =====================================================================
     RECIPE PASTE & CONVERT
     ===================================================================== */
  function runParser() {
    var text = $('recipe-input').value;
    var out = $('recipe-output');
    var sum = $('recipe-summary');
    var wrap = $('recipe-result');

    if (!text.trim()) { toast('Paste a recipe first'); $('recipe-input').focus(); return; }

    var res = P.parse(text, {
      category: state.category, brand: state.brand,
      batch: state.batch, frozen: state.frozen,
      display: state.unit
    });

    wrap.hidden = false;
    out.innerHTML = res.html.replace(/\n/g, '<br>');

    sum.innerHTML = '';
    if (!res.summary.length) {
      sum.innerHTML = '<li class="text-amber-700 dark:text-amber-400">No oven temperatures or times were found. ' +
        'Check the text includes something like “bake at 400°F for 25 minutes”.</li>';
    } else {
      res.summary.forEach(function (s) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="font-semibold">' + esc(s.kind) + ':</span> ' +
          '<span class="line-through text-gray-500">' + esc(s.from) + '</span> → ' +
          '<span class="font-bold text-orange-600 dark:text-orange-400">' + esc(s.to) + '</span>';
        sum.appendChild(li);
      });
    }
    $('recipe-stats').textContent =
      res.stats.temps + ' temperature' + (res.stats.temps === 1 ? '' : 's') + ' and ' +
      res.stats.times + ' time' + (res.stats.times === 1 ? '' : 's') + ' converted';
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function copyRecipe() {
    var text = $('recipe-output').innerText;
    if (!text.trim()) return;
    navigator.clipboard && navigator.clipboard.writeText(text)
      .then(function () { toast('Converted recipe copied ✓'); })
      .catch(function () { toast('Copy failed — select and copy manually'); });
  }

  /* =====================================================================
     FOOD QUICK-PICK (loads real tested values from the database)
     ===================================================================== */
  var foods = [];
  function initFoodPicker() {
    var sel = $('food-quick');
    if (!sel) return;
    fetch('data/foods.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        foods = data;
        var byCat = {};
        data.forEach(function (f) { (byCat[f.category] = byCat[f.category] || []).push(f); });
        Object.keys(byCat).sort().forEach(function (cat) {
          var g = document.createElement('optgroup');
          g.label = cat;
          byCat[cat].forEach(function (f) {
            var o = document.createElement('option');
            o.value = f.slug;
            o.textContent = f.emoji + '  ' + f.name;
            g.appendChild(o);
          });
          sel.appendChild(g);
        });
      })
      .catch(function () {
        sel.parentElement.hidden = true;   // offline first load; fail quietly
      });

    sel.addEventListener('change', function () {
      var f = foods.find(function (x) { return x.slug === sel.value; });
      var panel = $('food-quick-result');
      if (!f) { panel.hidden = true; return; }

      var mode = state.frozen && f.frozen ? f.frozen : f.fresh;
      var isC = state.unit === 'C';
      panel.hidden = false;
      panel.innerHTML =
        '<p class="font-bold text-lg mb-1">' + f.emoji + ' ' + esc(f.name) +
          ' <span class="text-sm font-normal text-gray-500">— real tested values</span></p>' +
        '<p class="text-2xl font-black text-orange-600 dark:text-orange-400 mb-2">' +
          (isC ? E.roundC(E.fToC(mode.f)) + '°C' : mode.f + '°F') + ' · ' + mode.min + ' min' +
          (state.frozen && f.frozen ? ' <span class="text-sm font-semibold text-blue-600 dark:text-blue-400">(from frozen)</span>' : '') + '</p>' +
        '<p class="text-sm mb-2">' + esc(f.shake) + '</p>' +
        (f.internalF ? '<p class="text-sm font-semibold text-red-700 dark:text-red-400">🌡️ Cook to ' + f.internalF + '°F / ' +
          Math.round(E.fToC(f.internalF)) + '°C internal</p>' : '') +
        '<a class="inline-block mt-3 font-bold text-orange-600 dark:text-orange-400 underline" href="food/' + f.slug + '.html">' +
          'Full ' + esc(f.name) + ' guide →</a>';

      /* Also drive the sliders from the food's oven equivalent, so the
         calculator and the tested value are shown side by side. */
      if (f.oven) {
        state.ovenF = f.oven.f;
        state.minutes = f.oven.min;
        syncInputs();
        render();
      }
    });
  }

  /* =====================================================================
     INPUT WIRING
     ===================================================================== */
  function syncInputs() {
    var isC = state.unit === 'C';
    var tempSlider = $('oven-temp');

    /* Slider works in the displayed unit; state stays in °F. */
    if (isC) {
      tempSlider.min = 90; tempSlider.max = 260; tempSlider.step = 5;
      tempSlider.value = Math.round(E.clamp(E.roundC(E.fToC(state.ovenF)), 90, 260));
    } else {
      tempSlider.min = 200; tempSlider.max = 500; tempSlider.step = 5;
      tempSlider.value = Math.round(E.clamp(E.roundF(state.ovenF), 200, 500));
    }
    tempSlider.setAttribute('aria-valuetext', tempSlider.value + (isC ? '°C' : '°F'));

    $('oven-time').value = state.minutes;
    $('food-category').value = state.category;
    $('brand-select').value = state.brand;
    $('batch-select').value = state.batch;
    $('frozen-toggle').checked = state.frozen;
    $('frozen-toggle').setAttribute('aria-checked', String(state.frozen));

    document.querySelectorAll('[data-unit]').forEach(function (b) {
      var active = b.getAttribute('data-unit') === state.unit;
      b.setAttribute('aria-pressed', String(active));
      b.className = 'px-4 py-2 rounded-lg font-bold transition ' + (active
        ? 'bg-orange-600 text-white shadow'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300');
    });

    $('temp-unit-label').textContent = isC ? '°C' : '°F';
  }

  function wire() {
    /* Temperature slider — interpret its value in the current display unit. */
    $('oven-temp').addEventListener('input', function () {
      var v = Number(this.value);
      state.ovenF = state.unit === 'C' ? E.cToF(v) : v;
      this.setAttribute('aria-valuetext', v + (state.unit === 'C' ? '°C' : '°F'));
      render();
    });

    $('oven-time').addEventListener('input', function () {
      state.minutes = Number(this.value);
      render();
    });

    document.querySelectorAll('[data-unit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.unit = btn.getAttribute('data-unit');
        try { localStorage.setItem(LS.unit, state.unit); } catch (e) {}
        syncInputs(); render(); renderSaved();
      });
    });

    $('food-category').addEventListener('change', function () { state.category = this.value; render(); });
    $('brand-select').addEventListener('change', function () { state.brand = this.value; render(); });
    $('batch-select').addEventListener('change', function () { state.batch = this.value; render(); });

    $('frozen-toggle').addEventListener('change', function () {
      state.frozen = this.checked;
      this.setAttribute('aria-checked', String(this.checked));
      render();
      /* Refresh the quick-pick card if a food is selected. */
      var sel = $('food-quick');
      if (sel && sel.value) sel.dispatchEvent(new Event('change'));
    });

    /* Timer */
    $('timer-start').addEventListener('click', function () {
      timer.running ? pauseTimer() : startTimer();
    });
    $('timer-reset').addEventListener('click', resetTimer);
    $('timer-plus').addEventListener('click', function () {
      timer.remaining += 60; timer.total += 60;
      if (timer.running) timer.endAt += 60000;
      paintTimer();
    });
    $('timer-minus').addEventListener('click', function () {
      timer.remaining = Math.max(0, timer.remaining - 60);
      timer.total = Math.max(60, timer.total - 60);
      if (timer.running) timer.endAt -= 60000;
      paintTimer();
    });

    /* Actions */
    $('btn-save').addEventListener('click', saveCurrent);
    $('save-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveCurrent(); }
    });
    $('btn-copy').addEventListener('click', copyResult);
    $('btn-print').addEventListener('click', function () { window.print(); });
    $('btn-reset').addEventListener('click', resetAll);

    /* Saved list — event delegation */
    $('saved-list').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var list = getSaved();
      var id = btn.getAttribute('data-load') || btn.getAttribute('data-delete') || btn.getAttribute('data-rename');
      var item = list.find(function (x) { return x.id === id; });
      if (!item) return;

      if (btn.hasAttribute('data-load')) {
        state.ovenF = item.ovenF; state.minutes = item.minutes;
        state.category = item.category; state.brand = item.brand;
        state.batch = item.batch; state.frozen = item.frozen;
        syncInputs(); resetTimer(); render();
        toast('Loaded “' + item.name + '”');
        document.getElementById('converter').scrollIntoView({ behavior: 'smooth' });
      } else if (btn.hasAttribute('data-rename')) {
        var name = prompt('Rename this recipe:', item.name);
        if (name && name.trim()) { item.name = name.trim(); putSaved(list); toast('Renamed'); }
      } else {
        if (confirm('Delete “' + item.name + '”?')) {
          putSaved(list.filter(function (x) { return x.id !== id; }));
          toast('Deleted');
        }
      }
    });

    /* Recipe parser */
    $('btn-parse').addEventListener('click', runParser);
    $('btn-parse-copy').addEventListener('click', copyRecipe);
    $('btn-parse-clear').addEventListener('click', function () {
      $('recipe-input').value = '';
      $('recipe-result').hidden = true;
      $('recipe-input').focus();
    });
    $('btn-parse-sample').addEventListener('click', function () {
      $('recipe-input').value =
        'Classic Roast Chicken Thighs\n\n' +
        'Preheat the oven to 425°F. Pat 6 bone-in chicken thighs dry and season ' +
        'generously with salt, pepper and smoked paprika.\n\n' +
        'Arrange skin-side up on a rack and roast for 35-40 minutes, until the skin ' +
        'is crisp and the internal temperature reaches 165°F.\n\n' +
        'Meanwhile, toss baby potatoes in olive oil and roast at 400 degrees F for ' +
        '30 minutes, shaking halfway.\n\n' +
        'Rest for 5 minutes before serving.';
      runParser();
    });
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  function boot() {
    loadPrefs();
    try {
      var u = localStorage.getItem(LS.unit);
      if (u === 'C' || u === 'F') state.unit = u;
    } catch (e) {}

    fillSelect($('food-category'), E.CATEGORIES, state.category);
    fillSelect($('brand-select'), E.BRANDS, state.brand);
    fillSelect($('batch-select'), E.BATCHES, state.batch);

    /* Safe-temp table (USDA) */
    var tbody = $('safe-temp-body');
    if (tbody) {
      E.SAFE_TEMPS.forEach(function (row) {
        var tr = document.createElement('tr');
        tr.className = 'border-b border-gray-200 dark:border-gray-700';
        tr.innerHTML =
          '<td class="py-3 pr-3 font-semibold">' + esc(row.food) + '</td>' +
          '<td class="py-3 pr-3 whitespace-nowrap font-black text-red-700 dark:text-red-400">' + row.f + '°F</td>' +
          '<td class="py-3 pr-3 whitespace-nowrap font-bold">' + row.c + '°C</td>' +
          '<td class="py-3 text-sm text-gray-600 dark:text-gray-400">' + esc(row.note) + '</td>';
        tbody.appendChild(tr);
      });
    }

    syncInputs();
    wire();
    render();
    renderSaved();
    initFoodPicker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
