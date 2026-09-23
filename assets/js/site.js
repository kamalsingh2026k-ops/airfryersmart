/* ==========================================================================
   AirFryerSmart — shared site behaviour
   Dark mode, cookie consent, consent-gated analytics/ads, toast, newsletter,
   service worker registration, mobile nav.
   Loaded with `defer` on every page.
   ========================================================================== */
(function () {
  'use strict';

  var LS = {
    theme:   'afs.theme',
    consent: 'afs.consent',
    unit:    'afs.unit',
    saved:   'afs.savedRecipes',
    prefs:   'afs.prefs',
    email:   'afs.emailCaptured'
  };

  /* =====================================================================
     1. DARK MODE
     The <head> inline script sets the class before paint to avoid a flash;
     this only wires up the toggle buttons.
     ===================================================================== */
  function currentTheme() {
    try { return localStorage.getItem(LS.theme); } catch (e) { return null; }
  }
  function applyTheme(theme) {
    var dark = theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem(LS.theme, dark ? 'dark' : 'light'); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(dark));
      var icon = btn.querySelector('[data-theme-icon]');
      if (icon) icon.textContent = dark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
    document.dispatchEvent(new CustomEvent('afs:themechange', { detail: { dark: dark } }));
  }
  function initTheme() {
    var saved = currentTheme();
    var dark = saved ? saved === 'dark'
      : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(dark ? 'dark' : 'light');
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
      });
    });
  }

  /* =====================================================================
     2. COOKIE CONSENT (GDPR / UK GDPR)
     Analytics and personalised ads must not load until the visitor accepts.
     We use Google Consent Mode v2 defaults of "denied", then update.
     ===================================================================== */
  function getConsent() {
    try { return localStorage.getItem(LS.consent); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(LS.consent, value); } catch (e) {}
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        ad_storage:              value === 'accepted' ? 'granted' : 'denied',
        ad_user_data:            value === 'accepted' ? 'granted' : 'denied',
        ad_personalization:      value === 'accepted' ? 'granted' : 'denied',
        analytics_storage:       value === 'accepted' ? 'granted' : 'denied'
      });
    }
    if (value === 'accepted') loadMonetisation();
    hideBanner();
  }

  function hideBanner() {
    var b = document.getElementById('cookie-banner');
    if (b) { b.hidden = true; b.style.display = 'none'; }
  }

  /* Injects GA4 + AdSense only after consent (or immediately for
     non-personalised ads if you prefer — see README). */
  var monetisationLoaded = false;
  function loadMonetisation() {
    if (monetisationLoaded) return;
    monetisationLoaded = true;

    var cfg = window.AFS_CONFIG || {};

    /* --- Google Analytics 4 ------------------------------------------ */
    if (cfg.GA4_ID && cfg.GA4_ID.indexOf('G-') === 0 && cfg.GA4_ID !== 'G-XXXXXXXXXX') {
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + cfg.GA4_ID;
      document.head.appendChild(ga);
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', cfg.GA4_ID, { anonymize_ip: true });
    }

    /* --- Google AdSense ---------------------------------------------- */
    if (cfg.ADSENSE_CLIENT && cfg.ADSENSE_CLIENT.indexOf('ca-pub-') === 0 &&
        cfg.ADSENSE_CLIENT !== 'ca-pub-XXXXXXXXXXXXXXXX') {
      /* Push real publisher + slot IDs from config into every unit, so the
         page HTML never needs hand-editing for AdSense. */
      document.querySelectorAll('ins.adsbygoogle').forEach(function (ins) {
        ins.setAttribute('data-ad-client', cfg.ADSENSE_CLIENT);
        var format = ins.getAttribute('data-ad-format');
        if (format === 'fluid') {
          if (cfg.ADSENSE_SLOTS && cfg.ADSENSE_SLOTS.inFeed) ins.setAttribute('data-ad-slot', cfg.ADSENSE_SLOTS.inFeed);
        } else if (cfg.ADSENSE_SLOTS) {
          var slotMap = { horizontal: 'leaderboard', rectangle: 'inContent' };
          var kind = slotMap[format];
          if (kind && cfg.ADSENSE_SLOTS[kind]) ins.setAttribute('data-ad-slot', cfg.ADSENSE_SLOTS[kind]);
          else if (cfg.ADSENSE_SLOTS.sidebar) ins.setAttribute('data-ad-slot', cfg.ADSENSE_SLOTS.sidebar);
        }
      });
      var ad = document.createElement('script');
      ad.async = true;
      ad.crossOrigin = 'anonymous';
      ad.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + cfg.ADSENSE_CLIENT;
      document.head.appendChild(ad);
      ad.onload = function () {
        document.querySelectorAll('ins.adsbygoogle').forEach(function () {
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        });
      };
    } else if (cfg.SHOW_AD_PLACEHOLDERS) {
      /* No publisher ID configured yet. When SHOW_AD_PLACEHOLDERS is true,
         draw the reserved slot outline so you can check placement while
         developing. In production leave the flag false so visitors never
         see an empty "insert your ID" box. */
      document.querySelectorAll('.ad-slot[data-placeholder]').forEach(function (el) {
        el.innerHTML = '<span class="ad-label">Advertisement</span>' +
          '<div style="border:2px dashed #d1d5db;border-radius:.5rem;padding:1.5rem;' +
          'color:#9ca3af;font-size:.85rem">Ad slot — insert your AdSense publisher ID ' +
          'in <code>assets/js/config.js</code></div>';
      });
    } else {
      /* Production with no AdSense yet: collapse the empty ad containers so
         the page looks finished and leaves no awkward blank gaps. */
      document.querySelectorAll('.ad-slot').forEach(function (el) {
        el.style.display = 'none';
      });
    }
  }

  function initConsent() {
    var banner = document.getElementById('cookie-banner');
    var choice = getConsent();

    if (choice === 'accepted') { loadMonetisation(); if (banner) hideBanner(); }
    else if (choice === 'rejected') { hideBanner(); }
    else if (banner) {
      banner.hidden = false;
      /* Focus the banner so screen readers announce it. */
      setTimeout(function () {
        var btn = banner.querySelector('[data-consent="accept"]');
        if (btn) btn.focus();
      }, 400);
    }

    document.querySelectorAll('[data-consent]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setConsent(btn.getAttribute('data-consent') === 'accept' ? 'accepted' : 'rejected');
      });
    });

    /* Footer link that lets visitors change their mind (GDPR requirement). */
    document.querySelectorAll('[data-consent-reopen]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        try { localStorage.removeItem(LS.consent); } catch (err) {}
        if (banner) { banner.hidden = false; banner.style.display = ''; }
      });
    });
  }

  /* =====================================================================
     3. TOAST
     ===================================================================== */
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* =====================================================================
     4. MOBILE NAVIGATION
     ===================================================================== */
  function initNav() {
    var btn = document.getElementById('nav-toggle');
    var menu = document.getElementById('nav-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', String(open));
    });
    /* Close on Escape for keyboard users. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  /* =====================================================================
     5. NEWSLETTER / LEAD MAGNET
     Posts to your ESP (Mailchimp or ConvertKit) if configured, otherwise
     stores locally and still delivers the PDF so the flow is testable.
     ===================================================================== */
  function initNewsletter() {
    document.querySelectorAll('form[data-newsletter]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        var cfg = window.AFS_CONFIG || {};
        var input = form.querySelector('input[type=email]');
        var email = input ? input.value.trim() : '';
        var status = form.querySelector('[data-newsletter-status]');
        var isLeadMagnet = form.hasAttribute('data-lead-magnet');

        if (!email || email.indexOf('@') === -1) {
          e.preventDefault();
          if (status) status.textContent = 'Please enter a valid email address.';
          return;
        }

        /* A real ESP action URL is configured → let the browser submit
           the form natively to Mailchimp/ConvertKit. */
        var hasRealAction = form.action && form.action.indexOf('list-manage.com') > -1 ||
                            form.action && form.action.indexOf('convertkit.com') > -1;

        if (!hasRealAction) {
          e.preventDefault();
          try {
            var list = JSON.parse(localStorage.getItem('afs.subscribers') || '[]');
            if (list.indexOf(email) === -1) list.push(email);
            localStorage.setItem('afs.subscribers', JSON.stringify(list));
            localStorage.setItem(LS.email, '1');
          } catch (err) {}
          if (status) {
            status.textContent = isLeadMagnet
              ? 'Thanks! Your cheat sheet download is starting…'
              : 'Thanks for subscribing!';
          }
          toast('Subscribed — check your downloads');
        }

        if (isLeadMagnet) {
          /* Deliver the real PDF immediately. */
          setTimeout(function () {
            var a = document.createElement('a');
            a.href = (cfg.BASE_PATH || '') + 'downloads/air-fryer-conversion-cheat-sheet.pdf';
            a.download = 'air-fryer-conversion-cheat-sheet.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, 300);
        }
        if (!hasRealAction) form.reset();
      });
    });
  }

  /* =====================================================================
     6. SERVICE WORKER (PWA)
     ===================================================================== */
  function initSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register((window.AFS_CONFIG && window.AFS_CONFIG.BASE_PATH || '/') + 'sw.js')
        .catch(function (err) { console.warn('SW registration failed:', err); });
    });
  }

  /* =====================================================================
     7. LAZY IMAGE FALLBACK
     Every food photo is a placeholder until you drop in real images.
     If the file is missing we show the emoji tile instead of a broken icon.
     ===================================================================== */
  function initImages() {
    document.querySelectorAll('.img-frame img').forEach(function (img) {
      img.addEventListener('error', function () {
        img.style.display = 'none';
        var fb = img.parentElement.querySelector('.img-fallback');
        if (fb) fb.style.display = 'flex';
      });
      if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
    });
  }

  /* =====================================================================
     8. CURRENT YEAR + ACTIVE NAV LINK
     ===================================================================== */
  function initChrome() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
    var path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a[href]').forEach(function (a) {
      var href = a.getAttribute('href').split('/').pop();
      if (href === path) {
        a.classList.add('text-orange-600', 'dark:text-orange-400', 'font-bold');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  function boot() {
    initTheme();
    initConsent();
    initNav();
    initNewsletter();
    initImages();
    initChrome();
    initSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }

  /* Expose small helpers for page-level scripts. */
  window.AFS = window.AFS || {};
  window.AFS.toast = toast;
  window.AFS.LS = LS;
  window.AFS.applyTheme = applyTheme;
})();
