/* ==========================================================================
   AirFryerSmart — SITE CONFIGURATION
   --------------------------------------------------------------------------
   ★★★ THIS IS THE ONLY FILE YOU NEED TO EDIT BEFORE GOING LIVE ★★★
   Replace each placeholder below with your real IDs. Every page reads from
   this single file, so you never have to hunt through HTML.
   ========================================================================== */
window.AFS_CONFIG = {

  /* --- Your live domain (no trailing slash) ------------------------------
     Used for canonical URLs, Open Graph tags and sitemap.xml.
     Currently set to the free Cloudflare Pages URL. If you name the Pages
     project differently (e.g. my-airfryer), use that name here.
     When you buy a custom domain, change this and re-run `node tools/build.js`
     to regenerate every page with the correct URLs. */
  SITE_URL: 'https://airfryersmart.pages.dev',

  /* --- Root path. Leave as '/' unless you deploy to a sub-folder. -------- */
  BASE_PATH: '/',

  /* --- Google AdSense ----------------------------------------------------
     Find this in AdSense → Account → Settings → Account information.
     Format: 'ca-pub-1234567890123456'
     While this is the placeholder value, ad slots render as visible dashed
     outlines so you can check placement without violating AdSense policy. */
  ADSENSE_CLIENT: 'ca-pub-XXXXXXXXXXXXXXXX',

  /* Individual ad unit slot IDs (AdSense → Ads → By ad unit → create unit).
     Each is the 10-digit number in the generated snippet's data-ad-slot. */
  ADSENSE_SLOTS: {
    leaderboard: '0000000001',   // above the fold, below the header
    inContent:   '0000000002',   // after the converter, before the chart
    inFeed:      '0000000003',   // between FAQ items
    sidebar:     '0000000004'    // food pages / blog sidebar
  },

  /* --- Show empty ad-slot outlines? --------------------------------------
     false (recommended for a live site): ad containers are hidden until you
     add a real ADSENSE_CLIENT, so visitors never see an empty box.
     true: dashed "Ad slot" outlines appear — handy while developing. */
  SHOW_AD_PLACEHOLDERS: false,

  /* --- Amazon Associates -------------------------------------------------
     Your tracking ID, e.g. 'airfryersmart-20' for amazon.com.
     Each marketplace needs its own tag; the helper below picks the right
     domain automatically for US / UK / CA / AU visitors. */
  AMAZON_TAG: 'youraffiliateid-20',
  AMAZON_TAG_UK: 'youraffiliateid-21',
  AMAZON_TAG_CA: 'youraffiliateid-20',
  AMAZON_TAG_AU: 'youraffiliateid-22',

  /* --- Google Analytics 4 ------------------------------------------------
     GA4 → Admin → Data streams → your stream → Measurement ID ('G-XXXXXXX'). */
  GA4_ID: 'G-XXXXXXXXXX',

  /* --- Google Search Console --------------------------------------------
     Use the HTML tag verification method and paste only the content value. */
  GSC_VERIFICATION: 'REPLACE_WITH_SEARCH_CONSOLE_TOKEN',

  /* --- Newsletter (Mailchimp or ConvertKit) ------------------------------
     Mailchimp: Audience → Signup forms → Embedded form → copy the <form action>.
     ConvertKit: Grow → Landing Pages & Forms → your form → HTML embed action.
     Leave blank to run in local-capture mode (emails stored in localStorage,
     PDF still delivered) — useful for testing before you pick an ESP. */
  NEWSLETTER_ACTION: '',

  /* --- Contact address shown on Contact / Privacy / Terms pages ---------- */
  CONTACT_EMAIL: 'hello@airfryersmart.com',

  /* --- Business details used in legal pages and schema ------------------- */
  SITE_NAME: 'AirFryerSmart',
  ORG_COUNTRY: 'United States'
};

/* --------------------------------------------------------------------------
   Amazon link helper — builds a correctly tagged, geo-aware affiliate URL.
   Usage in HTML:  <a href="#" data-asin="B07XXXXXXX">Buy on Amazon</a>
   -------------------------------------------------------------------------- */
(function () {
  var C = window.AFS_CONFIG;

  function marketplace() {
    var lang = (navigator.language || 'en-US').toUpperCase();
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    if (lang.indexOf('-GB') > -1 || tz.indexOf('London') > -1) return { host: 'amazon.co.uk', tag: C.AMAZON_TAG_UK };
    if (lang.indexOf('-CA') > -1 || tz.indexOf('Toronto') > -1 || tz.indexOf('Vancouver') > -1) return { host: 'amazon.ca', tag: C.AMAZON_TAG_CA };
    if (lang.indexOf('-AU') > -1 || tz.indexOf('Sydney') > -1 || tz.indexOf('Melbourne') > -1) return { host: 'amazon.com.au', tag: C.AMAZON_TAG_AU };
    return { host: 'amazon.com', tag: C.AMAZON_TAG };
  }

  window.AFS = window.AFS || {};
  window.AFS.amazonUrl = function (asin, searchTerm) {
    var m = marketplace();
    if (asin) return 'https://www.' + m.host + '/dp/' + asin + '/?tag=' + m.tag;
    return 'https://www.' + m.host + '/s?k=' + encodeURIComponent(searchTerm || 'air fryer') + '&tag=' + m.tag;
  };

  /* Rewrite every affiliate link on the page once the DOM is ready. */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[data-asin],a[data-amazon-search]').forEach(function (a) {
      a.href = window.AFS.amazonUrl(a.getAttribute('data-asin'), a.getAttribute('data-amazon-search'));
      a.setAttribute('rel', 'nofollow sponsored noopener');
      a.setAttribute('target', '_blank');
    });
  });
})();
