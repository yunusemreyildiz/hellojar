#!/usr/bin/env python3
"""Finds J2ME games on the Internet Archive that a browser can load directly.

archive.org serves files *inside* a .zip (…/download/<item>/<file>.zip/<path>)
with CORS headers, so hellojar can fetch those jars straight into the
player's browser: one tap, no download step, nothing hosted or relayed by us.
Loose .jar files are not CORS-enabled, so only zipped jars are indexed.

Sources:
  * "j2me-game-*" items: one game each (title, vendor, icon, a zip with app.jar)
  * game packs: big zips holding many jars (one entry per jar)

Output: catalog/archive-index.json, merged into the directory by
tools/crawl_dedomil.py --build-only. Cached and resumable under
catalog/archive-cache/.

Usage: python3 tools/crawl_archive.py
"""
import concurrent.futures as cf
import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "catalog" / "archive-cache"
OUT = ROOT / "catalog" / "archive-index.json"

UA = "hellojar-directory/1.0 (+https://hellojar.yunolabz.xyz)"
WORKERS = 3
PAUSE = 0.3

# game packs whose zips hold loose jars (checked by hand; add more here)
PACKS = ["1000_J2ME_Games_Pack", "J2mepacks", "800j2megames_201805", "J2ME-games",
         "nokia-hry.-jar-cca-560-her"]
MAX_ZIP = 2_500_000_000  # archive.org lists big zips fine, but skip absurd ones


def fetch(url, tries=6):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as res:
                data = res.read().decode("utf-8", "replace")
            time.sleep(PAUSE)
            return data
        except Exception as e:
            if attempt == tries - 1:
                print(f"  ! {url}: {e}", flush=True)
                return None
            time.sleep(min(60, 3 * (attempt + 1)))


def search(query, fields):
    url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
        [("q", query), ("rows", "5000"), ("output", "json")] + [("fl[]", f) for f in fields])
    text = fetch(url)
    return json.loads(text)["response"]["docs"] if text else []


ROW = re.compile(r'<tr><td><a href="([^"]+)">([^<]+)</a><td>.*?<td id="size">(\d+)</tr>', re.S)


def list_zip(item, zip_name):
    """[(inner path, size)] of the jars inside an archive.org zip."""
    url = f"https://archive.org/download/{item}/{urllib.parse.quote(zip_name)}/"
    text = fetch(url)
    if not text:
        return None
    out = []
    for href, name, size in ROW.findall(text):
        if name.lower().endswith(".jar"):
            prefix = f"/download/{item}/{urllib.parse.quote(zip_name)}/"
            inner = urllib.parse.unquote(href.split(prefix, 1)[-1]) if prefix in href else html.unescape(name)
            out.append((inner, int(size)))
    return out


def load_cache(name):
    path = CACHE / name
    return json.loads(path.read_text()) if path.exists() else {}


def save_cache(name, data):
    (CACHE / name).write_text(json.dumps(data))


# ---------- per-game items ----------

TITLE_SUFFIX = re.compile(r"\s*\((?:Java ME|J2ME)[^)]*\)\s*$", re.I)
SIZE_IN_TEXT = re.compile(r"\b(\d{3})\s*[x×]\s*(\d{3})\b")
SCREEN_SIZES = {"128x128", "128x160", "132x176", "176x208", "176x220", "208x208", "240x320",
                "320x240", "240x400", "352x416", "360x640", "640x360", "480x800", "800x480"}


def size_from_text(text):
    """'…optimized for 360x640 touchscreen displays…' -> '360x640'"""
    for w, h in SIZE_IN_TEXT.findall(text or ""):
        if f"{w}x{h}" in SCREEN_SIZES:
            return f"{w}x{h}"
    return None


def crawl_game_items():
    cache = load_cache("games.json")
    docs = search("identifier:j2me-game-*", ["identifier", "title", "creator", "downloads"])
    # items cached before descriptions were read get their metadata fetched again
    todo = [d for d in docs if d["identifier"] not in cache or "size_hint" not in cache[d["identifier"]]]
    print(f"game items: {len(docs)} found, {len(todo)} to fetch", flush=True)

    def one(doc):
        ident = doc["identifier"]
        meta = fetch(f"https://archive.org/metadata/{ident}")
        if not meta:
            return ident, None
        meta = json.loads(meta)
        files = meta.get("files", [])
        zips = [f["name"] for f in files if f["name"].lower().endswith(".zip")]
        pngs = [f["name"] for f in files if f["name"].lower().endswith(".png")]
        if ident in cache and cache[ident].get("jars"):
            jars = cache[ident]["jars"]  # already listed; zip listings are the slow part
        else:
            jars = []
            for z in zips:
                for inner, size in list_zip(ident, z) or []:
                    jars.append([z, inner, size])
        desc = meta.get("metadata", {}).get("description") or ""
        if isinstance(desc, list):
            desc = " ".join(desc)
        creator = doc.get("creator")
        return ident, {
            "title": TITLE_SUFFIX.sub("", doc.get("title") or ident).strip(),
            "vendor": creator[0] if isinstance(creator, list) else creator,
            "downloads": doc.get("downloads", 0),
            "icon": pngs[0] if pngs else None,
            "jars": jars,
            "size_hint": size_from_text(desc),
        }

    with cf.ThreadPoolExecutor(WORKERS) as ex:
        for i, (ident, rec) in enumerate(ex.map(one, todo), 1):
            if rec is not None:
                cache[ident] = rec
            if i % 50 == 0:
                print(f"  game items {i}/{len(todo)}", flush=True)
                save_cache("games.json", cache)
    save_cache("games.json", cache)
    return cache


# ---------- packs ----------

def crawl_packs():
    cache = load_cache("packs.json")
    for ident in PACKS:
        if ident in cache:
            continue
        meta = fetch(f"https://archive.org/metadata/{ident}")
        if not meta:
            continue
        files = json.loads(meta).get("files", [])
        entries = []
        for f in files:
            if f["name"].lower().endswith(".zip") and int(f.get("size") or 0) < MAX_ZIP:
                listed = list_zip(ident, f["name"])
                for inner, size in listed or []:
                    entries.append([f["name"], inner, size])
        cache[ident] = entries
        print(f"pack {ident}: {len(entries)} jars", flush=True)
        save_cache("packs.json", cache)
    return cache


# ---------- index ----------

def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    games = crawl_game_items()
    packs = crawl_packs()

    index = {"games": [], "packs": []}
    for ident, rec in sorted(games.items()):
        if not rec["jars"]:
            continue
        # one game per item; prefer the biggest jar if a zip holds several
        z, inner, size = max(rec["jars"], key=lambda j: j[2])
        index["games"].append({
            "item": ident, "zip": z, "path": inner, "size": size,
            "name": rec["title"], "vendor": rec["vendor"], "downloads": rec["downloads"],
            "icon": rec["icon"],
            "screen": rec.get("size_hint"),
        })
    for ident, entries in sorted(packs.items()):
        for z, inner, size in entries:
            index["packs"].append({"item": ident, "zip": z, "path": inner, "size": size})

    OUT.write_text(json.dumps(index, ensure_ascii=False, indent=0))
    print(f"wrote {OUT.relative_to(ROOT)}: {len(index['games'])} game items, {len(index['packs'])} pack jars")


if __name__ == "__main__":
    main()
