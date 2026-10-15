const VERSION='afs-v1';
const CORE=[
  '/','/index.html','/foods.html','/blog.html','/cheat-sheet.html','/about.html','/privacy.html','/terms.html','/contact.html','/disclosure.html','/404.html',
  '/assets/js/config.js','/assets/js/engine.js','/assets/js/parser.js','/assets/js/site.js','/assets/js/converter.js',
  '/assets/css/site.css',
  '/assets/img/icon-192.png','/assets/img/icon-512.png','/assets/img/favicon.svg',
  '/manifest.json',
  '/downloads/air-fryer-conversion-cheat-sheet.pdf'
];
const CDN_CACHE=/^https:\/\/(cdn\.tailwindcss\.com|cdn\.jsdelivr\.net)/;

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
    if(/\/assets\/|\/manifest\.json/.test(url.pathname)){
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
});