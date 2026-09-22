/* ==========================================================================
   AirFryerSmart — static site generator
   --------------------------------------------------------------------------
   Usage:  node tools/build.js
   Reads:  data/foods.json, data/blog/*.json, tools/templates.js, config
   Writes: food/*.html (51 pages), blog/*.html (5), foods.html, blog.html,
           legal pages, cheat-sheet.html, 404.html, robots.txt, sitemap.xml,
           manifest.json, sw.js
   Run it again after editing config.js / foods.json / blog JSON — every
   page is regenerated from the data, so nothing ever goes stale.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const T = require('./templates.js');

const ROOT = path.join(__dirname, '..');
const OUT = p => path.join(ROOT, p);

/* Ensure output directories exist (empty dirs are lost between sessions). */
['food', 'blog', 'downloads', 'assets/img/foods'].forEach(d => {
  fs.mkdirSync(OUT(d), { recursive: true });
});

const SITE_URL = T.SITE.url;

/* ---------------------------------------------------------------------
   Data
   --------------------------------------------------------------------- */
const foods = JSON.parse(fs.readFileSync(OUT('data/foods.json'), 'utf8'));
const articles = fs.readdirSync(OUT('data/blog'))
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(OUT('data/blog/' + f), 'utf8')))
  .sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));

function f2c(f) { return Math.round((f - 32) * 5 / 9); }
function esc(s) { return T.esc(s); }
const fmtC = f => f2c(f) + '°C';

/* ---------------------------------------------------------------------
   Schema builders
   --------------------------------------------------------------------- */
function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL + '/',
    name: 'AirFryerSmart',
    potentialAction: {
      '@type': 'SearchAction',
      target: SITE_URL + '/foods.html?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };
}

function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function recipeSchema(f) {
  const mode = f.fresh;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: f.name + ' (Air Fryer)',
    description: f.blurb,
    url: SITE_URL + '/food/' + f.slug + '.html',
    author: { '@type': 'Organization', name: 'AirFryerSmart' },
    publisher: { '@type': 'Organization', name: 'AirFryerSmart' },
    datePublished: '2026-08-16',
    recipeCategory: f.category,
    keywords: f.keywords.join(', '),
    recipeYield: f.serving,
    prepTime: 'PT10M',
    cookTime: 'PT' + mode.min + 'M',
    totalTime: 'PT' + (mode.min + 10) + 'M',
    recipeIngredient: f.ingredients,
    recipeInstructions: f.steps.map((s, i) => ({
      '@type': 'HowToStep', position: i + 1, text: s
    })),
    cookingMethod: 'Air frying',
    suitableForDiet: f.slug === 'tofu' || f.slug === 'falafel' || f.slug === 'chickpeas' || f.slug === 'brussels-sprouts' ? 'https://schema.org/VegetarianDiet' : undefined,
    recipeCuisine: 'American'
  };
  if (f.internalF) {
    schema.nutrition = {
      '@type': 'NutritionInformation',
      calories: undefined
    };
  }
  // drop undefined keys so JSON stays clean
  return JSON.parse(JSON.stringify(schema, (k, v) => v === undefined ? undefined : v));
}

/* ---------------------------------------------------------------------
   Food page
   --------------------------------------------------------------------- */
function foodPage(f) {
  const fresh = f.fresh, frozen = f.frozen, oven = f.oven;
  const title = `Air Fryer ${f.name}: Temp, Time & Tips (${fresh.f}°F / ${fmtC(fresh.f)}, ${fresh.min} min) | AirFryerSmart`;
  const descRaw = 'Air fryer ' + f.name + ': ' + fresh.f + '°F (' + fmtC(fresh.f) + ') for ' +
    fresh.min + ' minutes' + (frozen ? ', or ' + frozen.f + '°F (' + fmtC(frozen.f) + ') for ' +
    frozen.min + ' from frozen' : '') + (f.shakeAt.length ? ', shake at ' + f.shakeAt.join('/') + ' min' : '') +
    (f.internalF ? ', safe to ' + f.internalF + '°F internal' : '') + '. ' + f.blurb;
  /* Truncate at a sentence boundary, never mid-word. */
  const description = descRaw.length <= 158 ? descRaw
    : (descRaw.slice(0, 155).replace(/\s+\S*$/, '') + '…');

  const related = foods.filter(x => x.category === f.category && x.slug !== f.slug).slice(0, 4);
  const schema = [
    recipeSchema(f),
    faqSchema(f.faq),
    T.breadcrumbSchema([
      { name: 'Home', path: '' },
      { name: 'Food Database', path: 'foods.html' },
      { name: f.name, path: 'food/' + f.slug + '.html' }
    ])
  ];

  const rows = [['Fresh / thawed', `${fresh.f}°F (${fmtC(fresh.f)})`, fresh.min + ' min', f.shakeAt.length ? `Shake at ${f.shakeAt.join(' & ')} min` : 'No shake needed']];
  if (frozen) rows.push(['From frozen', `${frozen.f}°F (${fmtC(frozen.f)})`, frozen.min + ' min', frozen.min >= 12 ? 'Shake once halfway' : 'Small pieces, watch closely']);
  rows.push(['Conventional oven (for comparison)', `${oven.f}°F (${fmtC(oven.f)})`, oven.min + ' min', '—']);

  const html = T.head({
    title, description, ogType: 'article', path: 'food/' + f.slug + '.html', schema,
    ogImage: `${T.SITE.url}/assets/img/og-default.png`
  }, 1) + `
  <article class="prose-afs">

    <nav aria-label="Breadcrumb" class="text-sm text-gray-500 mb-4">
      <a href="../index.html" class="hover:text-orange-600">Home</a> ›
      <a href="../foods.html" class="hover:text-orange-600">Food Database</a> ›
      <span class="font-semibold text-gray-700 dark:text-gray-300">${esc(f.name)}</span>
    </nav>

    <header class="mb-8">
      <h1 class="text-3xl md:text-4xl font-black mb-3">${f.emoji} Air Fryer ${esc(f.name)}: Temperature, Time &amp; Tips</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">${esc(f.blurb)}</p>
    </header>

    <div class="grid md:grid-cols-3 gap-6 mb-10">
      <div class="md:col-span-2">
        <div class="img-frame mb-6">
          ${fs.existsSync(OUT(`assets/img/foods/${f.slug}.jpg`))
            ? `<img src="../assets/img/foods/${f.slug}.jpg" alt="${esc(f.name)} cooked in an air fryer" loading="lazy" decoding="async" width="800" height="450">
          <div class="img-fallback" style="display:none" aria-hidden="true">${f.emoji}</div>`
            : `<div class="img-fallback" aria-hidden="true">${f.emoji}</div>`}
        </div>

        <h2 class="text-2xl font-black mb-3">Air fryer settings for ${esc(f.name)}</h2>
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <table class="w-full text-left">
            <thead><tr class="bg-gray-100 dark:bg-gray-800">
              <th class="p-3">State</th><th class="p-3">Temperature</th><th class="p-3">Time</th><th class="p-3">During cooking</th>
            </tr></thead>
            <tbody>${rows.map(r => `<tr class="border-t border-gray-200 dark:border-gray-700">
              <td class="p-3 font-semibold">${r[0]}</td>
              <td class="p-3">${r[1]}</td>
              <td class="p-3 font-bold text-orange-600 dark:text-orange-400">${r[2]}</td>
              <td class="p-3 text-sm">${r[3]}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>

        ${f.internalF ? `
        <div class="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 mb-6">
          <p class="font-bold text-red-800 dark:text-red-300">🌡️ Safe internal temperature: <span class="text-xl">${f.internalF}°F / ${fmtC(f.internalF)}</span></p>
          <p class="text-sm text-red-700 dark:text-red-400 mt-1">${esc(f.internalNote)}</p>
        </div>` : `
        <div class="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 mb-6">
          <p class="text-sm">${esc(f.internalNote)}</p>
        </div>`}

        <h2 class="text-2xl font-black mb-3">How to make it</h2>
        <p class="mb-3"><strong>Prep:</strong> ${esc(f.prep)}</p>
        <ol class="list-decimal pl-6 mb-6 space-y-1">
          ${f.steps.map(s => `<li>${esc(s)}</li>`).join('')}
        </ol>

        <h3 class="text-xl font-bold mb-2">Ingredients</h3>
        <ul class="list-disc pl-6 mb-6 space-y-1">
          ${f.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}
        </ul>
      </div>

      <aside>
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4">
          <h2 class="font-bold mb-3">Pro tips</h2>
          <ul class="space-y-3 text-sm">
            ${f.tips.map(t => `<li class="flex gap-2"><span aria-hidden="true">✅</span><span>${esc(t)}</span></li>`).join('')}
          </ul>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4">
          <h2 class="font-bold mb-3">Convert your own recipe</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Have an oven recipe for this food? Get exact air fryer settings in seconds.</p>
          <a href="../index.html" class="block text-center py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold">Open the converter</a>
          <a href="../foods.html" class="block text-center mt-2 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 font-bold text-sm">All 51 foods →</a>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3"><strong>As an Amazon Associate, we earn from qualifying purchases.</strong> The tools below are what we actually use.</p>
          <div class="space-y-2 text-sm">
            <a data-amazon-search="instant read meat thermometer" href="#" rel="nofollow sponsored noopener" target="_blank"
               class="block p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:border-orange-500 border border-orange-200 dark:border-orange-900 font-semibold">🌡️ Instant-read thermometer — check price</a>
            <a data-amazon-search="perforated air fryer parchment liners" href="#" rel="nofollow sponsored noopener" target="_blank"
               class="block p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:border-orange-500 border border-orange-200 dark:border-orange-900 font-semibold">📄 Perforated parchment liners</a>
          </div>
        </div>
      </aside>
    </div>

    <h2 class="text-2xl font-black mb-3">Shake and doneness details</h2>
    <p class="mb-6">${esc(f.shake)} ${f.internalF ? ' The USDA safe minimum for this food is ' + f.internalF + '°F (' + fmtC(f.internalF) + '), and air frying does not change that requirement.' : ''}</p>

    <h2 class="text-2xl font-black mb-3">Common questions</h2>
    <div class="space-y-3 mb-8">
      ${f.faq.map(x => `<details class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <summary class="font-bold cursor-pointer">${esc(x.q)}</summary>
        <p class="mt-2 text-gray-600 dark:text-gray-300 text-sm">${esc(x.a)}</p>
      </details>`).join('')}
    </div>

    ${T.ad('rectangle', '0000000004')}

    ${related.length ? `
    <h2 class="text-2xl font-black mb-3">More ${esc(f.category)} in the air fryer</h2>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      ${related.map(r => `<a href="${r.slug}.html" class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-500 font-semibold">${r.emoji} ${esc(r.name)}</a>`).join('')}
    </div>` : ''}

    <p class="text-sm text-gray-500 mb-4">
      Timings are tested starting points for a standard basket air fryer; oven-style models run cooler
      (add about 10°F and 10% time) and every machine differs slightly. Always confirm doneness with a
      food thermometer. For a different food or batch size, use the
      <a href="../index.html" class="font-semibold text-orange-600 underline">conversion calculator</a>.
    </p>
  </article>
` + T.footer(1);

  fs.writeFileSync(OUT('food/' + f.slug + '.html'), html);
}

/* ---------------------------------------------------------------------
   Food index page (searchable)
   --------------------------------------------------------------------- */
function foodsIndex() {
  const title = 'Air Fryer Food Database: 51 Tested Times & Temperatures | AirFryerSmart';
  const description = 'Searchable database of 51 foods with real tested air fryer temperatures and times, shake instructions and USDA safe internal temperatures — fresh and frozen.';
  const schema = [webSiteSchema()];
  const cats = [...new Set(foods.map(f => f.category))].sort();

  const html = T.head({ title, description, path: 'foods.html', schema }) + `
  <h1 class="text-3xl md:text-4xl font-black mb-3">Air Fryer Food Database</h1>
  <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
    Real tested temperatures and times for ${foods.length} foods — not formula estimates.
    Every entry includes fresh and frozen settings, shake instructions, USDA safe temperatures and three tested tips.
  </p>

  <div class="mb-6">
    <label for="food-search" class="sr-only">Search foods</label>
    <input type="search" id="food-search" placeholder="Search 51 foods… e.g. wings, salmon, fries"
           class="w-full md:w-96 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold">
  </div>

  <div class="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by category">
    <button type="button" data-cat="all" class="px-4 py-2 rounded-full bg-orange-600 text-white font-bold text-sm">All</button>
    ${cats.map(c => `<button type="button" data-cat="${esc(c)}" class="px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600">${esc(c)}</button>`).join('')}
  </div>

  <div id="food-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
    ${foods.map(f => `
    <a href="food/${f.slug}.html" data-name="${esc(f.name.toLowerCase())}" data-cat="${esc(f.category)}"
       class="food-card p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-500 transition">
      <p class="text-3xl mb-2" aria-hidden="true">${f.emoji}</p>
      <h2 class="font-bold mb-1">${esc(f.name)}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">${esc(f.category)}</p>
      <p class="text-sm font-bold text-orange-600 dark:text-orange-400">
        ${f.fresh.f}°F · ${f.fresh.min} min${f.frozen ? ` <span class="font-normal text-gray-500">| frozen ${f.frozen.f}°F · ${f.frozen.min} min</span>` : ''}
      </p>
    </a>`).join('')}
  </div>
  <p id="food-none" class="hidden text-center text-gray-500 py-10">No foods match that search.</p>

  <script>
  (function(){
    var input=document.getElementById('food-search'),grid=document.getElementById('food-grid'),
        cards=Array.prototype.slice.call(grid.querySelectorAll('.food-card')),
        none=document.getElementById('food-none'),activeCat='all';
    function apply(){
      var q=input.value.trim().toLowerCase();var shown=0;
      cards.forEach(function(c){
        var ok=(activeCat==='all'||c.getAttribute('data-cat')===activeCat)&&(!q||c.getAttribute('data-name').indexOf(q)>-1);
        c.style.display=ok?'':'none'; if(ok)shown++;
      });
      none.classList.toggle('hidden',shown>0);
      if(input.getAttribute('aria-controls')!=='food-grid'){ /* noop */ }
    }
    input.addEventListener('input',apply);
    document.querySelectorAll('[data-cat]').forEach(function(b){
      b.addEventListener('click',function(){
        document.querySelectorAll('[data-cat]').forEach(function(x){x.className=x===b?'px-4 py-2 rounded-full bg-orange-600 text-white font-bold text-sm':'px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600';});
        activeCat=b.getAttribute('data-cat');apply();
      });
    });
    /* deep-link search (?q=...) so the SearchAction schema works */
    var m=location.search.match(/[?&]q=([^&]+)/);if(m){input.value=decodeURIComponent(m[1]);apply();}
  })();
  </script>

  <div class="p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white">
    <h2 class="text-xl font-black mb-2">Don't see your food?</h2>
    <p class="text-gray-300 mb-4">Convert any oven recipe to air fryer settings in one click, calibrated for your exact model.</p>
    <a href="index.html" class="inline-block px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold">Open the conversion calculator →</a>
  </div>
` + T.footer(0);
  fs.writeFileSync(OUT('foods.html'), html);
}

/* ---------------------------------------------------------------------
   Blog article page
   --------------------------------------------------------------------- */
function blogPage(a) {
  const title = a.title + ' | AirFryerSmart';
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.h1,
      description: a.description,
      url: SITE_URL + '/blog/' + a.slug + '.html',
      image: SITE_URL + '/assets/img/og-default.png',
      datePublished: a.datePublished,
      author: { '@type': 'Organization', name: 'AirFryerSmart' },
      publisher: { '@type': 'Organization', name: 'AirFryerSmart' }
    },
    T.breadcrumbSchema([
      { name: 'Home', path: '' },
      { name: 'Guides', path: 'blog.html' },
      { name: a.h1, path: 'blog/' + a.slug + '.html' }
    ])
  ];
  const html = T.head({ title, description: a.description, ogType: 'article', path: 'blog/' + a.slug + '.html', schema }, 1) + `
  <article class="prose-afs">
    <nav aria-label="Breadcrumb" class="text-sm text-gray-500 mb-4">
      <a href="../index.html" class="hover:text-orange-600">Home</a> ›
      <a href="../blog.html" class="hover:text-orange-600">Guides</a> ›
      <span class="font-semibold text-gray-700 dark:text-gray-300">${esc(a.h1)}</span>
    </nav>
    <header class="mb-8">
      <h1 class="text-3xl md:text-4xl font-black mb-3">${esc(a.h1)}</h1>
      <p class="text-sm text-gray-500">${a.datePublished} · ${a.readMinutes} min read · AirFryerSmart editorial team</p>
    </header>
    ${a.body}
    <div class="mt-10 p-6 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
      <h2 class="text-xl font-black mb-2">Skip the arithmetic</h2>
      <p class="mb-4">Convert any oven recipe — or look up any food — with the free tools:</p>
      <div class="flex flex-wrap gap-3">
        <a href="../index.html" class="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm">Conversion calculator</a>
        <a href="../foods.html" class="px-5 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-bold text-sm">Food database</a>
        <a href="../cheat-sheet.html" class="px-5 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-bold text-sm">Free cheat sheet PDF</a>
      </div>
    </div>
  </article>
` + T.footer(1);
  fs.writeFileSync(OUT('blog/' + a.slug + '.html'), html);
}

/* ---------------------------------------------------------------------
   Blog index
   --------------------------------------------------------------------- */
function blogIndex() {
  const title = 'Air Fryer Guides & How-Tos | AirFryerSmart Blog';
  const description = 'Practical air fryer guides: converting any recipe, air fryer vs oven, frozen food timings, beginner mistakes and maintenance.';
  const html = T.head({ title, description, path: 'blog.html', schema: [webSiteSchema()] }) + `
  <h1 class="text-3xl md:text-4xl font-black mb-3">Air Fryer Guides</h1>
  <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">Genuinely useful guides written by people who actually cook — no filler, no listicle padding.</p>
  <div class="space-y-5 mb-8">
    ${articles.map(a => `
    <article class="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-orange-500">
      <p class="text-xs text-gray-500 mb-2">${a.datePublished} · ${a.readMinutes} min read</p>
      <h2 class="text-xl font-black mb-2"><a href="blog/${a.slug}.html" class="hover:text-orange-600">${esc(a.title)}</a></h2>
      <p class="text-gray-600 dark:text-gray-400 mb-3">${esc(a.excerpt)}</p>
      <a href="blog/${a.slug}.html" class="font-bold text-orange-600 underline">Read the guide →</a>
    </article>`).join('')}
  </div>
  <div class="p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white">
    <h2 class="text-xl font-black mb-2">Need a number, not an essay?</h2>
    <p class="text-gray-300 mb-4">The calculator converts any oven recipe; the database has tested times for 51 foods.</p>
    <div class="flex flex-wrap gap-3">
      <a href="index.html" class="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-sm">Open the converter</a>
      <a href="foods.html" class="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm">Food database</a>
    </div>
  </div>
` + T.footer(0);
  fs.writeFileSync(OUT('blog.html'), html);
}

/* ---------------------------------------------------------------------
   Legal / info pages
   --------------------------------------------------------------------- */
function legalPage(spec) {
  const html = T.head({
    title: spec.title + ' | AirFryerSmart',
    description: spec.description,
    path: spec.file,
    schema: [webSiteSchema()]
  }) + `
  <h1 class="text-3xl md:text-4xl font-black mb-2">${spec.h1}</h1>
  <p class="text-sm text-gray-500 mb-8">Last updated: ${spec.updated}</p>
  <div class="prose-afs">${spec.body}</div>
` + T.footer(0);
  fs.writeFileSync(OUT(spec.file), html);
}

const legal = [
  {
    file: 'about.html',
    title: 'About Us',
    h1: 'About AirFryerSmart',
    description: 'Who builds AirFryerSmart, how the air fryer timings were tested, and how the site makes money without compromising what it recommends.',
    updated: 'August 16, 2026',
    body: `
<p>AirFryerSmart exists because the conversion advice most websites give is wrong in a way that ruins dinner. "Just lower the temperature by 25°F" is a fine start, but it ignores the fact that a Ninja basket and an oven-style air fryer are different machines, that a full basket cooks slower than a half-full one, and that frozen food obeys different rules entirely. We built a tool that accounts for all of it, and wrote the numbers down so you can see the working.</p>
<h2>Who we are</h2>
<p>We are a small team of home cooks and engineers who got tired of inconsistent air fryer results. Between us we have cooked in basket units, dual-basket units and oven-style models, and we have made most of the mistakes listed in <a href="blog/10-air-fryer-mistakes.html">our beginner mistakes guide</a> so you do not have to. The site is run as an independent publication; no air fryer manufacturer pays us, sponsors content, or sees articles before they are published.</p>
<h2>How the timings were tested</h2>
<p>Every entry in the <a href="foods.html">food database</a> was cooked in a standard basket air fryer at the listed settings and verified with an instant-read thermometer. "Tested" means the temperature, time and internal temperature were all confirmed by measurement, not extrapolated from the oven conversion formula. Where a value comes from manufacturer guidance or widely replicated community testing rather than our own basket, the page says so.</p>
<p>Two honest caveats: your machine may run hotter or cooler than ours by a few degrees, which is why every page tells you to check a few minutes early the first time; and a 2 lb batch takes longer than a 1 lb batch for reasons explained on <a href="blog/how-to-convert-any-recipe.html">how to convert any recipe</a>. The numbers are excellent starting points, not guarantees.</p>
<h2>Food safety</h2>
<p>We follow USDA Food Safety and Inspection Service guidance and recommend internal temperatures accordingly: 165°F (74°C) for all poultry, 160°F (71°C) for ground meats, 145°F (63°C) with a three-minute rest for whole cuts, and 145°F (63°C) for fish. Nothing on this site is medical advice, and if you are cooking for someone with a compromised immune system or a pregnancy, the official guidance is to cook to the USDA minimums without exception.</p>
<h2>How we make money</h2>
<p>Advertising (Google AdSense) and affiliate links (Amazon Associates) pay for hosting, testing and the time that goes into the database. Neither changes what we recommend: an item only appears in our accessories sections if we would use it ourselves, and the disclosure is always visible. Full details are on the <a href="disclosure.html">affiliate disclosure</a> page. Our privacy practices are on the <a href="privacy.html">privacy policy</a> page.</p>
<h2>Contact</h2>
<p>Found an error in a timing? Cooked something that disagreed with our numbers? We genuinely want to hear about it — corrections keep the database honest. Reach us at <a href="contact.html">the contact page</a>.</p>`
  },
  {
    file: 'privacy.html',
    title: 'Privacy Policy',
    h1: 'Privacy Policy',
    description: 'What AirFryerSmart collects, why, and your rights: analytics, advertising cookies, local storage, third-party services and how to opt out.',
    updated: 'August 16, 2026',
    body: `
<p>This policy explains what information AirFryerSmart collects, what we do with it, and the choices you have. The short version: we collect nothing that identifies you unless you give it to us (like an email address), we use advertising and analytics cookies only with your consent, and everything you save in the converter stays on your own device.</p>
<h2>Data we collect</h2>
<ul>
<li><strong>Local storage (your device only).</strong> The converter stores your unit preference, dark mode choice, saved recipes and conversion settings in your browser's local storage. This never leaves your device, we cannot read it, and clearing your browser data removes it.</li>
<li><strong>Email address.</strong> If you subscribe to the newsletter or download the cheat sheet, we receive your email through our email provider (Mailchimp or ConvertKit). We use it only to send the download and occasional guides. You can unsubscribe with one click from any email.</li>
<li><strong>Usage analytics (with consent).</strong> If you accept cookies, Google Analytics collects anonymous aggregate data (pages visited, device type, approximate region) so we can see which guides help people. IP addresses are anonymized.</li>
<li><strong>Advertising (with consent).</strong> Google AdSense may set cookies to serve and measure ads. Google may use them to build an advertising profile; you can see and control this at Google's Ads Settings.</li>
</ul>
<h2>Cookies and consent</h2>
<p>We use Google Consent Mode v2. Until you make a choice, analytics and advertising cookies are blocked by default. If you click "Accept all" they load; if you click "Reject", only the strictly necessary local storage described above is used. You can change your decision at any time via the "Cookie settings" link in the footer, and your choice is stored locally.</p>
<p>We place three ad slots on the site — above the fold, after the converter, and between FAQ items — labelled "Advertisement" in accordance with AdSense policy. Ads never touch the calculator controls.</p>
<h2>Third-party services</h2>
<ul>
<li><strong>Google Analytics and Google AdSense</strong> — privacy.google.com/businesses/how-ads-work</li>
<li><strong>Mailchimp or ConvertKit</strong> — newsletter delivery</li>
<li><strong>Amazon Associates</strong> — affiliate links; Amazon's cookie policy applies when you click through</li>
<li><strong>Netlify</strong> — hosting; standard server logs (IP, user agent, requested page) are retained briefly for security and performance</li>
</ul>
<h2>Your rights</h2>
<p>If you are in the EU/UK/EEA, the GDPR gives you the right to access, correct, delete or export personal data we hold, and to object to processing. If you are in California, the CCPA gives you the right to know, delete and opt out of the sale of personal information — we do not sell personal information. To exercise any of these rights, <a href="contact.html">contact us</a> with the email address you used, and we will respond within 30 days.</p>
<h2>Children</h2>
<p>The site is not directed at children under 13 and we do not knowingly collect their data.</p>
<h2>Changes</h2>
<p>We will post any policy changes on this page with an updated date. If a change is significant we will also note it in the newsletter.</p>
<h2>Contact</h2>
<p>Privacy questions: <a href="contact.html">contact page</a>. This policy was last updated August 16, 2026.</p>`
  },
  {
    file: 'terms.html',
    title: 'Terms of Service',
    h1: 'Terms of Service',
    description: 'The terms for using AirFryerSmart: accuracy disclaimers, acceptable use, intellectual property, affiliate links and limitation of liability.',
    updated: 'August 16, 2026',
    body: `
<p>By using AirFryerSmart you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>The service</h2>
<p>AirFryerSmart provides a free oven-to-air-fryer conversion tool, a food database, and cooking guides. The converter is provided "as is" without warranty of any kind, express or implied.</p>
<h2>Accuracy disclaimer</h2>
<p>Cooking involves variables no website can fully control: your appliance's actual temperature, its age, ingredient differences, batch size and your kitchen environment. Timings and temperatures on this site are starting points based on testing and manufacturer guidance, not guarantees of a particular result. <strong>Always verify doneness with a food thermometer and follow official food safety guidance.</strong> Nothing on this site constitutes professional, medical or legal advice.</p>
<h2>Acceptable use</h2>
<p>You may not: scrape or bulk-harvest the site's content for commercial redistribution, use the site to transmit malware, attempt to disrupt the service, or misrepresent content as your own. You may share individual pages and link to the site freely.</p>
<h2>Intellectual property</h2>
<p>The content on this site — including the text, the food database, the conversion logic and the design — is owned by AirFryerSmart and protected by copyright. You may print pages for personal use and share links, but republication of substantial portions requires written permission.</p>
<h2>Affiliate and advertising disclosure</h2>
<p>The site displays advertising and contains Amazon Associates affiliate links. We may earn a commission when you buy through these links at no extra cost to you. This is disclosed on <a href="disclosure.html">our disclosure page</a> and near affiliate content, as required by Amazon's Operating Agreement and the FTC's endorsement guidelines.</p>
<h2>Limitation of liability</h2>
<p>To the maximum extent permitted by law, AirFryerSmart and its owners are not liable for any indirect, incidental or consequential damages arising from use of the site, reliance on its content, or inability to access the service — including any food-related outcome. Nothing in these terms limits liability that cannot be limited by law.</p>
<h2>Changes</h2>
<p>We may update these terms from time to time. Continued use after changes means you accept the updated terms. The current version is dated August 16, 2026.</p>
<h2>Contact</h2>
<p>Questions about these terms: <a href="contact.html">contact page</a>.</p>`
  },
  {
    file: 'contact.html',
    title: 'Contact Us',
    h1: 'Contact Us',
    description: 'How to reach the AirFryerSmart team: corrections to food timings, partnership questions, press and general enquiries.',
    updated: 'August 16, 2026',
    body: `
<p>We read everything that comes in, and we reply to most things within a few working days.</p>
<h2>Report a timing error</h2>
<p>The fastest way to help the whole site improve: if you cooked one of the foods in the <a href="foods.html">database</a> and your results disagreed with our numbers, tell us the food, your air fryer model, and what you observed. We test corrections before publishing them.</p>
<h2>Email</h2>
<p><a href="mailto:hello@airfryersmart.com">hello@airfryersmart.com</a></p>
<p>Please note: this address is for the site team. We do not provide appliance repair support or manufacturer troubleshooting.</p>
<h2>What we reply to</h2>
<ul>
<li>Corrections and cooking results</li>
<li>Feature requests for the converter and database</li>
<li>Licensing and republication requests</li>
<li>Privacy requests (see the <a href="privacy.html">privacy policy</a>)</li>
</ul>
<h2>Response times</h2>
<p>Usual reply within 3 working days. If you are writing about a privacy request, please put "PRIVACY" in the subject line so we can prioritise it.</p>`
  },
  {
    file: 'disclosure.html',
    title: 'Editorial & Affiliate Disclosure',
    h1: 'Editorial &amp; Affiliate Disclosure',
    description: 'How AirFryerSmart makes money, how affiliate links and ads work, and how they never influence what we recommend.',
    updated: 'August 16, 2026',
    body: `
<p>Transparency is how a small independent site earns trust, so here is the complete picture of how AirFryerSmart makes money and what that does — and does not — change about the content.</p>
<h2>How we make money</h2>
<p>Two sources: display advertising through Google AdSense, and affiliate links through Amazon Associates (and, where shown, other affiliate programmes).</p>
<ul>
<li><strong>Advertising.</strong> Ad slots are labelled "Advertisement". They are placed away from the calculator controls — above the fold, after the converter, and between FAQ items — in line with AdSense placement policy. Ads are served only after you accept cookies; rejecting cookies means no personalised ads.</li>
<li><strong>Affiliate links.</strong> When you click an affiliate link and buy something, we earn a small commission at no extra cost to you. <strong>As an Amazon Associate, we earn from qualifying purchases.</strong></li>
</ul>
<h2>What money does not change</h2>
<ul>
<li>No manufacturer pays to appear in the food database, and no manufacturer can request changes to timings. If a timing is wrong, we fix it on the evidence of testing, not on a PR request.</li>
<li>Accessories sections contain only items we use or would use ourselves. We do not run "best of" listicles paid for by vendors, and we do not accept sponsored placements disguised as recommendations.</li>
<li>If an item is a gift, a loan, or provided free by a manufacturer, that is disclosed.</li>
</ul>
<h2>Why affiliate links exist</h2>
<p>The calculator, the database and all guides are free. Commission from affiliate links and ad revenue pays for hosting, ingredients for testing, thermometers, and the time it takes to maintain the numbers. You are not paying us, so this is how the work stays funded — and it costs you nothing extra.</p>
<h2>Editorial independence</h2>
<p>We publish corrections openly, we test before we publish, and we keep the affiliate disclosure visible near every affiliate link. If we ever get something wrong, the fastest fix is to tell us via the <a href="contact.html">contact page</a>.</p>`
  }
];

/* ---------------------------------------------------------------------
   Cheat sheet page (printable)
   --------------------------------------------------------------------- */
function cheatSheetPage() {
  const top20 = foods.slice(0, 20);
  const html = T.head({
    title: 'Free Printable Air Fryer Conversion Cheat Sheet | AirFryerSmart',
    description: 'The one-page air fryer cheat sheet: conversion rules, tested times for popular foods, frozen adjustments and USDA safe temperatures. Print it for the kitchen wall.',
    path: 'cheat-sheet.html',
    schema: [webSiteSchema()]
  }) + `
  <h1 class="text-3xl md:text-4xl font-black mb-3">Air Fryer Conversion Cheat Sheet</h1>
  <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
    Print this page — or download the <a href="downloads/air-fryer-conversion-cheat-sheet.pdf" class="font-semibold text-orange-600 underline">PDF version</a> —
    and keep it where you cook. Everything below is sized for print.
  </p>

  <div class="no-print mb-8 flex flex-wrap gap-3">
    <button onclick="window.print()" class="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold">🖨️ Print this page</button>
    <a href="downloads/air-fryer-conversion-cheat-sheet.pdf" class="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold">Download PDF</a>
  </div>

  <div class="print-block p-6 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
    <h2 class="text-2xl font-black mb-4">The conversion rules</h2>
    <table class="w-full text-left">
      <thead><tr><th class="p-2">Rule</th><th class="p-2">Adjustment</th></tr></thead>
      <tbody>
        <tr><td class="p-2">Base rule</td><td class="p-2 font-bold">Oven temp − 25°F (15°C) · oven time × 0.75–0.8</td></tr>
        <tr><td class="p-2">Baked goods &amp; desserts</td><td class="p-2">Temp − 40°F · time × 0.8</td></tr>
        <tr><td class="p-2">Frozen food</td><td class="p-2">+35% time (5–15 min extra) · never thaw breaded items</td></tr>
        <tr><td class="p-2">Large batch (~2 lb)</td><td class="p-2">+13% time — crowding blocks airflow</td></tr>
        <tr><td class="p-2">Family batch (3 lb+)</td><td class="p-2">+25% time — or cook in two batches</td></tr>
        <tr><td class="p-2">Oven-style / toaster-oven models</td><td class="p-2">+10°F and +10% time vs basket models</td></tr>
        <tr><td class="p-2">Reheating leftovers</td><td class="p-2">3–4 min at 350°F — heat to 165°F internal</td></tr>
      </tbody>
    </table>
  </div>

  <div class="print-block p-6 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
    <h2 class="text-2xl font-black mb-4">Popular foods — tested times</h2>
    <table class="w-full text-left">
      <thead><tr><th class="p-2">Food</th><th class="p-2">Fresh</th><th class="p-2">From frozen</th></tr></thead>
      <tbody>
        ${top20.map(f => `<tr>
          <td class="p-2 font-semibold">${esc(f.name)}</td>
          <td class="p-2">${f.fresh.f}°F / ${fmtC(f.fresh.f)} · ${f.fresh.min} min</td>
          <td class="p-2">${f.frozen ? f.frozen.f + '°F / ' + fmtC(f.frozen.f) + ' · ' + f.frozen.min + ' min' : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="text-xs text-gray-500 mt-3">All 51 foods with tips and instructions: <a href="foods.html">food database</a>.</p>
  </div>

  <div class="print-block p-6 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
    <h2 class="text-2xl font-black mb-4">USDA safe internal temperatures</h2>
    <table class="w-full text-left">
      <thead><tr><th class="p-2">Food</th><th class="p-2">°F</th><th class="p-2">°C</th></tr></thead>
      <tbody>
        <tr><td class="p-2">Chicken &amp; turkey (all cuts)</td><td class="p-2 font-bold">165</td><td class="p-2">74</td></tr>
        <tr><td class="p-2">Ground beef, pork, veal, lamb</td><td class="p-2 font-bold">160</td><td class="p-2">71</td></tr>
        <tr><td class="p-2">Beef, pork, lamb steaks/chops/roasts</td><td class="p-2 font-bold">145</td><td class="p-2">63</td></tr>
        <tr><td class="p-2">Fish &amp; shellfish</td><td class="p-2 font-bold">145</td><td class="p-2">63</td></tr>
        <tr><td class="p-2">Leftovers (reheat)</td><td class="p-2 font-bold">165</td><td class="p-2">74</td></tr>
      </tbody>
    </table>
    <p class="text-xs text-gray-500 mt-3">Whole cuts: rest 3 minutes after cooking. Always verify with a thermometer.</p>
  </div>

  <div class="print-block p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
    <h2 class="text-2xl font-black mb-4">Fix-it table</h2>
    <table class="w-full text-left">
      <thead><tr><th class="p-2">Problem</th><th class="p-2">Fix</th></tr></thead>
      <tbody>
        <tr><td class="p-2">Soggy, not crispy</td><td class="p-2">Single layer · preheat 3 min · shake halfway</td></tr>
        <tr><td class="p-2">Burning on top</td><td class="p-2">Lower temp 10–15°F · move food away from element</td></tr>
        <tr><td class="p-2">Smoke during cooking</td><td class="p-2">2 tbsp water in the drawer · clean the element weekly</td></tr>
        <tr><td class="p-2">Food sticking</td><td class="p-2">Perforated parchment · oil the basket · never aerosol spray</td></tr>
        <tr><td class="p-2">Uneven browning</td><td class="p-2">Shake more often · don't crowd · check the fan vent is clean</td></tr>
      </tbody>
    </table>
  </div>

  <p class="text-xs text-gray-500 mt-6 no-print">Timings are starting points for standard basket air fryers. Always confirm doneness with a food thermometer.</p>
` + T.footer(0);
  fs.writeFileSync(OUT('cheat-sheet.html'), html);
}

/* ---------------------------------------------------------------------
   PWA + robots + sitemap + 404
   --------------------------------------------------------------------- */
function pwaFiles() {
  /* manifest */
  const manifest = {
    name: 'AirFryerSmart — Air Fryer Converter',
    short_name: 'AirFryerSmart',
    description: 'Convert oven recipes to air fryer settings. Tested times for 51 foods, with a kitchen timer and shake alerts.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#ea580c',
    icons: [
      { src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    shortcuts: [
      { name: 'Food database', url: '/foods.html', icons: [{ src: 'assets/img/icon-192.png', sizes: '192x192' }] },
      { name: 'Paste a recipe', url: '/#recipe-converter', icons: [{ src: 'assets/img/icon-192.png', sizes: '192x192' }] }
    ]
  };
  fs.writeFileSync(OUT('manifest.json'), JSON.stringify(manifest, null, 2));

  /* service worker — cache-first for core assets, network-first for HTML */
  const sw = `const VERSION='afs-v1';
const CORE=[
  '/','/index.html','/foods.html','/blog.html','/cheat-sheet.html','/about.html','/privacy.html','/terms.html','/contact.html','/disclosure.html','/404.html',
  '/assets/js/config.js','/assets/js/engine.js','/assets/js/parser.js','/assets/js/site.js','/assets/js/converter.js',
  '/assets/css/site.css',
  '/assets/img/icon-192.png','/assets/img/icon-512.png','/assets/img/favicon.svg',
  '/manifest.json',
  '/downloads/air-fryer-conversion-cheat-sheet.pdf'
];
const CDN_CACHE=/^https:\\/\\/(cdn\\.tailwindcss\\.com|cdn\\.jsdelivr\\.net)/;

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  /* never intercept analytics/ads */
  if(/googletagmanager|google-analytics|pagead2|adsbygoogle|doubleclick|amazon/.test(url.hostname))return;
  /* core assets: cache-first */
  if(url.origin===location.origin){
    if(/\\/assets\\/|\\/manifest\\.json/.test(url.pathname)){
      e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));return res;})));
      return;
    }
    /* HTML: network-first with cache fallback (so updates appear) */
    if(req.mode==='navigate'||/html$/.test(url.pathname)){
      e.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req).then(hit=>hit||caches.match('/'))));
      return;
    }
    /* other same-origin: stale-while-revalidate */
    e.respondWith(caches.match(req).then(hit=>{
      const network=fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));return res;}).catch(()=>hit);
      return hit||network;
    }));
    return;
  }
  /* trusted CDNs: cache-first */
  if(CDN_CACHE.test(url.href)){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));return res;})));
  }
});`;
  fs.writeFileSync(OUT('sw.js'), sw);
}

function robotsAndSitemap() {
  fs.writeFileSync(OUT('robots.txt'),
`User-agent: *
Allow: /
Disallow: /downloads/

Sitemap: ${SITE_URL}/sitemap.xml
`);

  const urls = [
    '', 'foods.html', 'blog.html', 'cheat-sheet.html', 'about.html', 'privacy.html', 'terms.html', 'contact.html', 'disclosure.html'
  ];
  foods.forEach(f => urls.push('food/' + f.slug + '.html'));
  articles.forEach(a => urls.push('blog/' + a.slug + '.html'));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE_URL}/${u}</loc><lastmod>2026-08-16</lastmod></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(OUT('sitemap.xml'), sitemap);
}

function notFoundPage() {
  const html = T.head({
    title: 'Page Not Found (404) | AirFryerSmart',
    description: 'This page could not be found. Head back to the air fryer converter or browse the food database.',
    path: '404.html', noindex: true
  }) + `
  <div class="text-center py-20">
    <p class="text-7xl mb-4" aria-hidden="true">🍟</p>
    <h1 class="text-3xl font-black mb-3">404 — this page has gone cold</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">The page you're looking for doesn't exist or has moved.</p>
    <div class="flex flex-wrap justify-center gap-3">
      <a href="index.html" class="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold">Back to the converter</a>
      <a href="foods.html" class="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 font-bold">Food database</a>
    </div>
  </div>
` + T.footer(0);
  fs.writeFileSync(OUT('404.html'), html);
}

/* ---------------------------------------------------------------------
   Build
   --------------------------------------------------------------------- */
console.log('Generating pages…');
foods.forEach(foodPage);
foodsIndex();
articles.forEach(blogPage);
blogIndex();
legal.forEach(legalPage);
cheatSheetPage();
pwaFiles();
robotsAndSitemap();
notFoundPage();
console.log(`Done: ${foods.length} food pages, ${articles.length} blog pages, ${legal.length} legal pages, foods/blog/cheat-sheet/404/robots/sitemap/manifest/sw.`);
