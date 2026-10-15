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
<body>
<a href="#main" class="skip-link">Skip to main content</a>
${header(depth)}
<main id="main" class="max-w-4xl mx-auto px-4 py-8">`;
}

function header(depth) {
  const p = depth ? '../' : '';
  const link = (href, label) =>
    `<a href="${p}${href}" class="nav-link">${label}</a>`;
  const mlink = (href, label) =>
    `<a href="${p}${href}" class="py-2.5 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">${label}</a>`;
  return `<header class="sticky top-0 z-40 backdrop-blur-md" style="background:color-mix(in srgb, var(--surface) 88%, transparent);border-bottom:1px solid var(--line)">
  <div class="max-w-6xl mx-auto px-4">
    <div class="flex items-center justify-between h-16 gap-3">
      <a href="${p}index.html" class="flex items-center gap-2 font-black text-lg tracking-tight shrink-0">
        <span class="tile-emoji" style="width:2rem;height:2rem;font-size:1.05rem" aria-hidden="true">🔥</span>
        <span>AirFryer<span class="grad-text">Smart</span></span>
      </a>
      <nav class="hidden md:flex items-center gap-7 text-sm" aria-label="Main navigation">
        ${link('index.html', 'Converter')}
        ${link('foods.html', 'Food Database')}
        ${link('blog.html', 'Guides')}
        ${link('cheat-sheet.html', 'Cheat Sheet')}
        ${link('about.html', 'About')}
      </nav>
      <div class="flex items-center gap-2">
        <a href="${p}cheat-sheet.html" class="btn btn-secondary btn-sm hidden sm:inline-flex">Free PDF</a>
        <button type="button" data-theme-toggle aria-pressed="false" aria-label="Switch to dark mode" class="icon-btn">
          <span data-theme-icon aria-hidden="true">🌙</span>
        </button>
        <button type="button" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu"
                class="md:hidden icon-btn">☰</button>
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
  const flink = (href, label) =>
    `<li><a href="${p}${href}" class="link" style="text-decoration:none;color:var(--text-2)">${label}</a></li>`;
  return `</main>
<footer class="mt-16" style="background:var(--surface);border-top:1px solid var(--line)">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
      <div>
        <p class="font-black text-lg mb-2 flex items-center gap-2">
          <span class="tile-emoji" style="width:2rem;height:2rem;font-size:1.05rem" aria-hidden="true">🔥</span>
          <span>AirFryer<span class="grad-text">Smart</span></span>
        </p>
        <p class="text-sm leading-relaxed" style="color:var(--text-2)">
          A free, accurate oven-to-air-fryer converter with tested times for 51 foods.
          Built by people who cook, not by a content farm.
        </p>
      </div>
      <div>
        <h2 class="font-bold mb-3 text-sm uppercase tracking-wider" style="color:var(--text-3)">Tools</h2>
        <ul class="space-y-2 text-sm">
          ${flink('index.html', 'Conversion calculator')}
          ${flink('index.html#recipe-converter', 'Paste a recipe')}
          ${flink('foods.html', 'Food database')}
          ${flink('cheat-sheet.html', 'Printable cheat sheet')}
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-3 text-sm uppercase tracking-wider" style="color:var(--text-3)">Guides</h2>
        <ul class="space-y-2 text-sm">
          ${flink('blog/air-fryer-vs-oven.html', 'Air fryer vs oven')}
          ${flink('blog/how-to-convert-any-recipe.html', 'Convert any recipe')}
          ${flink('blog/10-air-fryer-mistakes.html', '10 beginner mistakes')}
          ${flink('blog.html', 'All guides')}
        </ul>
      </div>
      <div>
        <h2 class="font-bold mb-3 text-sm uppercase tracking-wider" style="color:var(--text-3)">Site</h2>
        <ul class="space-y-2 text-sm">
          ${flink('about.html', 'About us')}
          ${flink('contact.html', 'Contact')}
          ${flink('privacy.html', 'Privacy policy')}
          ${flink('terms.html', 'Terms of service')}
          ${flink('disclosure.html', 'Affiliate disclosure')}
          <li><a href="#" data-consent-reopen class="link" style="text-decoration:none;color:var(--text-2)">Cookie settings</a></li>
        </ul>
      </div>
    </div>
    <div class="pt-6 mb-6" style="border-top:1px solid var(--line)">
      <form data-newsletter class="flex flex-col sm:flex-row gap-3 max-w-lg" novalidate>
        <label for="footer-email" class="sr-only">Email address for the newsletter</label>
        <input type="email" id="footer-email" name="EMAIL" required autocomplete="email"
               placeholder="Get new air fryer guides by email" class="flex-1 min-w-0 input">
        <button type="submit" class="btn btn-primary">Subscribe</button>
      </form>
      <p data-newsletter-status role="status" aria-live="polite" class="hint mt-2 min-h-[1.25rem]"></p>
    </div>
    <div class="pt-6 text-sm space-y-2" style="border-top:1px solid var(--line);color:var(--text-3)">
      <p><strong style="color:var(--text-2)">As an Amazon Associate, we earn from qualifying purchases.</strong>
        Some links on this site are affiliate links. This never affects the price you pay or what we recommend.</p>
      <p>Cooking times are starting points based on testing and manufacturer guidance. Every appliance differs —
        always verify doneness with a food thermometer. Temperature guidance follows USDA Food Safety and Inspection Service recommendations.</p>
      <p>&copy; <span data-year>2026</span> AirFryerSmart. All rights reserved.</p>
    </div>
  </div>
</footer>

<div id="cookie-banner" hidden role="dialog" aria-modal="false" aria-labelledby="cookie-title"
     class="fixed bottom-0 inset-x-0 z-50 p-4 md:p-5 text-white"
     style="background:#1c1917;box-shadow:0 -10px 40px rgba(0,0,0,.35);border-top:1px solid #292524">
  <div class="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
    <div class="flex-1 text-sm">
      <h2 id="cookie-title" class="font-bold mb-1 text-white">We use cookies</h2>
      <p style="color:#d6d3d1">
        We use cookies for analytics and to show advertising that keeps this tool free.
        You can accept or reject non-essential cookies — the calculator works fully either way.
        See our <a href="${p}privacy.html" class="underline">Privacy Policy</a>.
      </p>
    </div>
    <div class="flex gap-2 shrink-0">
      <button type="button" data-consent="reject" class="btn btn-secondary btn-sm"
              style="background:#292524;border-color:#44403c;color:#f5f5f4">Reject non-essential</button>
      <button type="button" data-consent="accept" class="btn btn-primary btn-sm">Accept all</button>
    </div>
  </div>
</div>

<div id="toast" role="status" aria-live="polite"></div>

<script src="${p}assets/js/config.js" defer></script>
<script src="${p}assets/js/engine.js" defer></script>
<script src="${p}assets/js/site.js" defer></script>
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
  return `<p class="note mb-6 text-xs">
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
