#!/usr/bin/env python3
"""
Build the upload-ready site folder + ZIP for Cloudflare Pages / Netlify.

Run:  python3 tools/package.py

Creates:
  build/airfryersmart/          <- ready-to-drag folder (index.html at its root)
  airfryersmart-site.zip        <- ZIP of that folder for Direct Upload

Only files the live site needs are copied. Build inputs (tools/, data/blog/,
README) stay out of the package.
"""
import json, os, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGE = os.path.join(ROOT, "build", "airfryersmart")
ZIP = os.path.join(ROOT, "airfryersmart-site.zip")

# Pages that sit at the site root
ROOT_FILES = [
    "index.html", "foods.html", "blog.html", "cheat-sheet.html", "404.html",
    "about.html", "privacy.html", "terms.html", "contact.html", "disclosure.html",
    "manifest.json", "sw.js", "robots.txt", "sitemap.xml", "_headers", "_redirects",
]
# Folders copied whole
DIRS = ["assets", "food", "blog", "downloads"]
# Runtime data the converter fetches in the browser
EXTRA = ["data/foods.json"]


def main():
    if os.path.exists(STAGE):
        shutil.rmtree(STAGE)
    os.makedirs(STAGE)

    count = 0
    for f in ROOT_FILES:
        src = os.path.join(ROOT, f)
        if not os.path.exists(src):
            raise SystemExit("Missing required file: " + f)
        shutil.copy2(src, os.path.join(STAGE, f))
        count += 1

    for d in DIRS:
        src = os.path.join(ROOT, d)
        if not os.path.isdir(src):
            continue
        for dirpath, _, names in os.walk(src):
            rel = os.path.relpath(dirpath, ROOT)
            os.makedirs(os.path.join(STAGE, rel), exist_ok=True)
            for n in names:
                shutil.copy2(os.path.join(dirpath, n), os.path.join(STAGE, rel, n))
                count += 1

    for f in EXTRA:
        dst = os.path.join(STAGE, f)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, f), dst)
        count += 1

    if os.path.exists(ZIP):
        os.remove(ZIP)
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for dirpath, _, names in os.walk(STAGE):
            for n in names:
                full = os.path.join(dirpath, n)
                arc = os.path.join("airfryersmart", os.path.relpath(full, STAGE))
                z.write(full, arc)

    size = os.path.getsize(ZIP) / 1024 / 1024
    print(f"Staged {count} files -> build/airfryersmart/")
    print(f"ZIP: airfryersmart-site.zip ({size:.1f} MB)")


if __name__ == "__main__":
    main()
