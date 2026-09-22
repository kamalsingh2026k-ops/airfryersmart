/* ==========================================================================
   AirFryerSmart — shared HTML fragments for the static generator
   ========================================================================== */
'use strict';

const SITE = {
  url: 'https://airfryersmart.pages.dev',
  name: 'AirFryerSmart',
  gsc: 'REPLACE_WITH_SEARCH_CONSOLE_TOKEN',
  adsense: 'ca-pub-XXXXXXXXXXXXXXXX'
};

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * @param {object} o
 * @param {number} depth 0 = site root, 1 = inside /food/ or /blog/
 */
function head(o, depth) {
  const p = depth ? '../' : '';
  const url = SITE.url + '/' + (o.path || '');
  const ogImage = o.ogImage || `${SITE.url}/assets/img/og-default.png`;
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#ea580c">
<meta name="robots" content="${o.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="google-site-verification" content="${SITE.gsc}">
<link rel="manifest" href="${p}manifest.json">
<link rel="apple-touch-icon" href="${p}assets/img/icon-192.png">
<link rel="icon" href="${p}assets/img/favicon.svg" type="image/svg+xml">
<script>
(function(){try{var t=localStorage.getItem('afs.theme');
var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
if(d)document.documentElement.classList.add('dark');}catch(e){}})();
</script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',
ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
</script>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={darkMode:'class'}</script>
<link rel="stylesheet" href="${p}assets/css/site.css">
${(o.schema || []).map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 1)}\n</script>`).join('\n')}
</head>
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
<a href="#main" class="skip-link">Skip to main content</a>
${header(depth)}
<main id="main" class="max-w-4xl mx-auto px-4 py-8">`;
}

function header(depth) {
  const p = depth ? '../' : '';
  const link = (href, label) =>
    `<a href="${p}${href}" class="hover:text-orange-600">${label}</a>`;
  const mlink = (href, label) =>
    `<a href="${p}${href}" class="py-2 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">${label}</a>`;
  return `<header class="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
  <div class="max-w-6xl mx-auto px-4">
    <div class="flex items-center justify-between h-16 gap-3">
      <a href="${p}index.html" class="flex items-center gap-2 font-black text-xl shrink-0">
        <span aria-hidden="true">🔥</span><span>AirFryer<span class="text-orange-600">Smart</span></span>
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm font-semibold" aria-label="Main navigation">
        ${link('index.html', 'Converter')}
        ${link('foods.html', 'Food Database')}
        ${link('blog.html', 'Guides')}
        ${link('cheat-sheet.html', 'Free Cheat Sheet')}
        ${link('about.html', 'About')}
      </nav>
      <div class="flex items-center gap-2">
        <button type="button" data-theme-toggle aria-pressed="false" aria-label="Switch to dark mode"
                class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-lg">
          <span data-theme-icon aria-hidden="true">🌙</span>
        </button>
        <button type="button" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu"
                class="md:hidden w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-lg">☰</button>
      </div>
    </div>
    <nav id="nav-menu" class="hidden md:hidden pb-4 flex flex-col gap-1 text-sm font-semibold" aria-label="Mobile navigation">
      ${mlink('index.html', 'Converter')}
      ${mlink('foods.html', 'Food Database')}
      ${mlink('blog.html', 'Guides')}
      ${mlink('cheat-sheet.html', 'Free Cheat Sheet')}
      ${mlink('about.html', 'About')}
    </nav>
  </div>
</header>`;
}

function footer(depth) {
  const p = depth ? '../' : '';
  return `</main>
<footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-10">
  <div class="max-w-6xl mx-auto px-4 py-10">
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
      <div>
        <p class="font-black text-lg mb-2">🔥 AirFryer<span class="text-orange-600">Smart</span></p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          A free, accurate oven-to-air-fryer converter with tested times for 51 foods.
          Built by people who cook, not by a content farm.
        </p>
      </div>
      <div>
        <h2 class="font-bold mb-3">Tools</h2>
        <ul class="space-y-2 text-sm">
          <li><a href="${p}index.html" class="hover:text-orange-600">Conversion calculator</a></li>
          <li><a href="${p}index.html#recipe-converter" class="hover:text-orange-600">Paste a recipe</a></li>
          <li><a href="${p}foods.html" class="hover:text-orange-600">Food database</a></li>
          <li><a href="${p}cheat-sheet.html" class="hover:text-orange-600">Printable cheat sheet</a></li>
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-3">Guides</h2>
        <ul class="space-y-2 text-sm">
          <li><a href="${p}blog/air-fryer-vs-oven.html" class="hover:text-orange-600">Air fryer vs oven</a></li>
          <li><a href="${p}blog/how-to-convert-any-recipe.html" class="hover:text-orange-600">Convert any recipe</a></li>
          <li><a href="${p}blog/10-air-fryer-mistakes.html" class="hover:text-orange-600">10 beginner mistakes</a></li>
          <li><a href="${p}blog.html" class="hover:text-orange-600">All guides</a></li>
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-3">Site</h2>
        <ul class="space-y-2 text-sm">
          <li><a href="${p}about.html" class="hover:text-orange-600">About us</a></li>
          <li><a href="${p}contact.html" class="hover:text-orange-600">Contact</a></li>
          <li><a href="${p}privacy.html" class="hover:text-orange-600">Privacy policy</a></li>
          <li><a href="${p}terms.html" class="hover:text-orange-600">Terms of service</a></li>
          <li><a href="${p}disclosure.html" class="hover:text-orange-600">Affiliate disclosure</a></li>
          <li><a href="#" data-consent-reopen class="hover:text-orange-600">Cookie settings</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
      <form data-newsletter class="flex flex-col sm:flex-row gap-3 max-w-lg" novalidate>
        <label for="footer-email" class="sr-only">Email address for the newsletter</label>
        <input type="email" id="footer-email" name="EMAIL" required autocomplete="email"
               placeholder="Get new air fryer guides by email"
               class="flex-1 min-w-0 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
        <button type="submit" class="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold">Subscribe</button>
      </form>
      <p data-newsletter-status role="status" aria-live="polite" class="mt-2 text-sm text-orange-600 min-h-[1.25rem]"></p>
    </div>
    <div class="border-t border-gray-200 dark:border-gray-700 pt-6 text-sm text-gray-500 dark:text-gray-400 space-y-2">
      <p><strong>As an Amazon Associate, we earn from qualifying purchases.</strong>
        Some links on this site are affiliate links. This never affects the price you pay or what we recommend.</p>
      <p>Cooking times are starting points based on testing and manufacturer guidance. Every appliance differs —
        always verify doneness with a food thermometer. Temperature guidance follows USDA Food Safety and Inspection Service recommendations.</p>
      <p>&copy; <span data-year>2026</span> AirFryerSmart. All rights reserved.</p>
    </div>
  </div>
</footer>

<div id="cookie-banner" hidden role="dialog" aria-modal="false" aria-labelledby="cookie-title"
     class="fixed bottom-0 inset-x-0 z-50 bg-gray-900 text-white p-4 md:p-5 shadow-2xl">
  <div class="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
    <div class="flex-1 text-sm">
      <h2 id="cookie-title" class="font-bold mb-1">We use cookies</h2>
      <p class="text-gray-300">
        We use cookies for analytics and to show advertising that keeps this tool free.
        You can accept or reject non-essential cookies — the calculator works fully either way.
        See our <a href="${p}privacy.html" class="underline">Privacy Policy</a>.
      </p>
    </div>
    <div class="flex gap-2 shrink-0">
      <button type="button" data-consent="reject"
              class="px-5 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold text-sm">Reject non-essential</button>
      <button type="button" data-consent="accept"
              class="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold text-sm">Accept all</button>
    </div>
  </div>
</div>

<div id="toast" role="status" aria-live="polite"></div>

<script src="${p}assets/js/config.js" defer></script>
<script src="${p}assets/js/engine.js" defer></script>
<script src="${p}assets/js/site.js" defer></script>
${(depth ? [] : []).join('')}
</body>
</html>`;
}

/** Reusable AdSense slot markup. */
function ad(format, slot) {
  const fmt = { leaderboard: 'horizontal', rectangle: 'rectangle', 'in-feed': 'fluid' }[format] || 'auto';
  return `<div class="ad-slot" data-format="${format}" data-placeholder aria-hidden="true">
  <span class="ad-label">Advertisement</span>
  <ins class="adsbygoogle" style="display:block" data-ad-client="${SITE.adsense}"
       data-ad-slot="${slot}" data-ad-format="${fmt}" data-full-width-responsive="true"></ins>
</div>`;
}

/** Standard Amazon affiliate disclosure block, per Amazon Operating Agreement. */
function affiliateNotice() {
  return `<p class="text-xs text-gray-500 dark:text-gray-400 mb-6 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
  <strong>Affiliate disclosure:</strong> As an Amazon Associate, we earn from qualifying purchases.
  This page contains affiliate links, which cost you nothing extra.
</p>`;
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: SITE.url + '/' + it.path
    }))
  };
}

module.exports = { SITE, esc, head, footer, ad, affiliateNotice, breadcrumbSchema };
