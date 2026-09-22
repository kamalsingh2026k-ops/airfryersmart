# AirFryerSmart 🔥

A complete, production-ready **oven-to-air-fryer recipe converter** website targeting
USA / UK / Canada / Australia. Monetized with Google AdSense + Amazon Associates,
built for Google approval: real content, schema markup, consent-gated scripts, PWA.

**Stack:** static HTML + Tailwind CDN + vanilla JS + Chart.js + localStorage.
No backend. Deploys free on **Cloudflare Pages** or Netlify (fully static — works on any static host).

---

## What's in the box

| Area | Files |
|---|---|
| Converter tool | `index.html` + `assets/js/converter.js` |
| Conversion engine | `assets/js/engine.js` (category/brand/batch/frozen math) |
| Recipe paste-and-convert | `assets/js/parser.js` (regex: °F, °C, ranges, gas marks) |
| Food database | `data/foods.json` → generated `food/*.html` (51 pages with Recipe + FAQ schema) |
| Blog | `data/blog/*.json` → generated `blog/*.html` (5 articles, Article schema) |
| Legal / info | `about.html`, `privacy.html`, `terms.html`, `contact.html`, `disclosure.html` |
| SEO plumbing | `robots.txt`, `sitemap.xml`, meta/OG/Twitter per page, canonical URLs |
| Monetization | 3 AdSense slots (leaderboard / in-content / in-feed), geo-aware Amazon links |
| PWA | `manifest.json`, `sw.js` (offline, installable), icons |
| Lead magnet | `downloads/air-fryer-conversion-cheat-sheet.pdf` (4 pages, real) |
| Generator | `tools/build.js` — regenerates every page from the data |

**Every generated page is reproducible.** Edit the data, re-run `node tools/build.js`,
and the whole site rebuilds consistently — nothing hand-edited, nothing stale.

---

## 1. Deploy to Cloudflare Pages (recommended, free)

Cloudflare Pages free plan: **500 builds/month and unlimited bandwidth** (vs Netlify
free 100 GB/month) — the better choice once ads start driving traffic. Everything on
this site (converter, parser, timer, PWA, localStorage, ads) is client-side, so it
runs identically on Cloudflare. HTTPS and the service worker work automatically.

### Option A — Direct upload (no git, fastest, 5 minutes)

1. Make sure the folder contains `index.html` at the top level (it does).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
3. Name the project, e.g. `airfryersmart`, then drag the **whole project folder** into
   the upload box (keep `index.html` at the folder root — don't upload the folder's
   parent).
4. Deploy → you get `https://airfryersmart.pages.dev` with automatic HTTPS.
5. Updates: rebuild locally (`node tools/build.js` etc.), then re-upload the folder.
   The `_headers` file is picked up automatically.

### Option B — GitHub integration (auto-deploys on every push, recommended long-term)

1. Create a repo on GitHub and push this folder.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick the repo. Build settings:
   - Framework preset: **None**
   - Build command: `node tools/build.js`  *(Node.js is preinstalled in the build image;
     the PDF and icons are already committed, so Python isn't needed at build time.
     To regenerate them too, run the two Python commands locally and commit the output.)*
   - Build output directory: `/`
4. Save and deploy. Every `git push` redeploys automatically (500 free builds/month).

### Custom domain (recommended for AdSense approval + rankings)

1. Cloudflare dashboard → your Pages project → **Custom domains** → **Set up a custom domain**.
2. Add `airfryersmart.com` (and `www`). If the domain's DNS is already on Cloudflare,
   records are created automatically; otherwise follow the nameserver steps.
3. SSL is automatic (Full). Then update `SITE_URL` in `assets/js/config.js` to your
   real domain and re-run `node tools/build.js` so every canonical URL, OG tag,
   sitemap URL and schema `@id` points at the live domain. Redeploy.

---

## 1b. Deploy to Netlify (alternative)

1. Push this folder to a GitHub/GitLab repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Build settings:
   - Build command: `node tools/build.js && python3 tools/make-icons.py && python3 tools/make-pdf.py` (optional — the generated files are committed, but this keeps everything fresh)
   - Publish directory: `.`
4. Deploy. Netlify gives you `https://<name>.netlify.app` with automatic HTTPS.

### Custom domain (recommended for AdSense approval + rankings)

1. Netlify → **Domain settings → Add custom domain** (e.g. `airfryersmart.com`).
2. Update your DNS: point `A` record to `75.2.60.5` and `CNAME` `www` to your Netlify site URL.
3. Set up the free **Netlify TLS certificate** for HTTPS.
4. **Update `SITE_URL` in `assets/js/config.js` to your real domain** and re-run
   `node tools/build.js` so every canonical URL, OG tag, sitemap URL and schema `@id`
   points at the live domain. Then re-deploy.

---

## 1c. Start free → buy a custom domain later (recommended path)

Launching on `airfryersmart.pages.dev` costs nothing and is fully monetizable —
Amazon affiliate links work on the free subdomain. Follow this order:

1. **Now:** deploy on the free subdomain, apply to Amazon Associates, verify the
   site in Google Search Console, submit the sitemap, and start earning.
2. **When income arrives:** buy the domain (Cloudflare Registrar sells at cost,
   no markup) and add it in Cloudflare Pages → Custom domains — it attaches to
   the **same project**, so there is no migration, nothing to re-upload.
3. Update `SITE_URL` in `assets/js/config.js`, run `node tools/build.js`, redeploy.
4. Uncomment the 301 rules in `_redirects` (template included) so every old
   `pages.dev` URL redirects permanently to the new domain — rankings and
   backlinks carry over.
5. Re-submit the sitemap in Search Console for the new domain. Then apply to
   AdSense — see the note below about why you should wait for the domain.

> **AdSense note:** Google's review process commonly rejects sites hosted on
> free subdomains (`.pages.dev`, `.netlify.app`, etc.). Apply to AdSense only
> **after** the custom domain is live, or expect a rejection you'll need to
> re-submit after moving. Amazon Associates has no such restriction.

---

## 2. Where to put your real IDs

Everything is centralized in **one file: `assets/js/config.js`** (also read by the
generator via `tools/templates.js` → `SITE` constant for static pages).

| What | Where | Notes |
|---|---|---|
| AdSense publisher ID | `ADSENSE_CLIENT: 'ca-pub-XXXXXXXX'` | AdSense → Settings → Account information |
| AdSense unit slots | `ADSENSE_SLOTS: { leaderboard, inContent, inFeed, sidebar }` | AdSense → Ads → By ad unit → create unit; copy each 10-digit `data-ad-slot` |
| Amazon affiliate tag | `AMAZON_TAG` (+ `_UK`, `_CA`, `_AU`) | Your tag e.g. `airfryersmart-20`; one per marketplace, geo-detected at runtime |
| Google Analytics 4 | `GA4_ID: 'G-XXXXXXX'` | GA4 → Admin → Data streams → Measurement ID |
| Search Console | `GSC_VERIFICATION` | HTML tag method — paste the token value only |
| Contact email | `CONTACT_EMAIL` | Shown on Contact/Privacy/Terms |
| Newsletter | `NEWSLETTER_ACTION` | See §6 |

After editing `config.js`, re-run `node tools/build.js` (static pages embed the IDs)
and re-deploy.

> **Placeholder behavior:** while `ADSENSE_CLIENT` is the placeholder value, ad slots
> render as *visible dashed outlines* so you can verify placement without triggering
> AdSense policy. They disappear automatically once you set a real `ca-pub-` ID.
> `G-XXXXXXXXXX` / `ca-pub-XXXXXXXXXXXXXXXX` are intentionally skipped by the loader.

---

## 3. Swap placeholder food images for real ones

Food pages reference `assets/img/foods/<slug>.jpg` (e.g. `chicken-wings.jpg`).
Drop real photos — ideally your own 800×450 JPEGs — into that folder.

- Filenames must match each food's `slug` in `data/foods.json`.
- If a file is missing, the page shows a styled emoji tile instead of a broken image
  (handled by `site.js`), so the site never looks broken.
- The image slots reserve aspect-ratio space (`aspect-ratio: 16/9`), so adding real
  images will not cause layout shift (CLS stays < 0.1).
- For lazy-loading, images use `loading="lazy"` already.

For the Open Graph social image, replace `assets/img/og-default.png` (1200×630)
with your own brand version, then re-run the build.

---

## 4. Pre-launch checklist (AdSense approval)

- [ ] Real `ca-pub-` ID + real slot IDs in `config.js`
- [ ] `SITE_URL` set to your live domain; build re-run
- [ ] Custom domain connected + HTTPS certificate issued (Netlify auto)
- [ ] Privacy Policy updated with your legal entity name/address and email
- [ ] About/Contact pages reflect your real details (AdSense reviews these)
- [ ] `GSC_VERIFICATION` token set; submit `sitemap.xml` in Search Console
- [ ] GA4 property live and showing your own traffic
- [ ] Amazon tag registered in Associates for each marketplace you target
- [ ] Newsletter form wired to your real ESP (see §6)

---

## 5. How the site works (for future edits)

- **Conversion math** lives only in `assets/js/engine.js`:
  - category profiles (temp drop + time factor), brand calibration, batch multipliers,
    frozen bonus (35%, clamped 5–15 min). Add a category/brand → add a key in the map,
    the dropdowns populate themselves.
- **Food data** lives only in `data/foods.json`. Add a food → re-run the build → its
  page, sitemap entry, index card and cheat-sheet PDF row all appear automatically.
- **Blog posts** live in `data/blog/*.json` (schema-driven). Add one → rebuild.
- **Legal pages** are generated from `tools/build.js` → `legal` array.
- **Consent flow:** all tracking/ads load through `assets/js/site.js` only after the
  GDPR banner is accepted (Consent Mode v2 defaults everything to *denied*).
- **Timer:** drift-proof (wall-clock based) — accurate when the tab is backgrounded,
  fires browser Notifications at the shake point and at 0:00.

---

## 6. Wire the newsletter to a real ESP

1. **Mailchimp:** Audience → Signup forms → Embedded forms → copy the `action` URL
   (contains `list-manage.com`). Paste into `NEWSLETTER_ACTION`.
2. **ConvertKit:** Grow → Landing Pages & Forms → your form → embed code → copy the
   `action` URL (contains `convertkit.com`).
3. Until a real action is set, submissions are captured in `localStorage`
   (`afs.subscribers`) and the cheat-sheet PDF still downloads — so the lead magnet
   works end-to-end in testing. The form detects a real ESP URL and submits natively.

The lead-magnet form (home page + cheat-sheet page) delivers
`downloads/air-fryer-conversion-cheat-sheet.pdf` automatically on signup.

---

## 7. Regenerate everything

```bash
node tools/build.js          # all HTML pages + robots/sitemap/manifest/sw
python3 tools/make-icons.py  # PWA icons + OG image (after brand changes)
python3 tools/make-pdf.py    # cheat-sheet PDF (stays in sync with foods.json)
```

## 8. Licensing notes

- Content, code and design © AirFryerSmart. Internal tools may be adapted freely.
- Tailwind CSS CDN, Chart.js and the icon set are MIT-licensed.
- Affiliate/advertising disclosures are in place per Amazon Operating Agreement and
  Google AdSense policy; keep them when customizing.
