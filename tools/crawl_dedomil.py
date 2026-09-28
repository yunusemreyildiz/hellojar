#!/usr/bin/env python3
"""Builds hellojar's game directory from dedomil.net's public listings.

hellojar never hosts or proxies game files: the directory only lists names,
vendors, available resolutions and a small thumbnail, and sends players to
dedomil's own download page for the game.

Steps (all resumable, cached under catalog/dedomil-cache/, which git ignores):
  1. walk the "all resolutions" listing of each J2ME brand category
  2. fetch every game's page (thumbnail URL, vendor, downloads) and its
     "screens" page (every resolution, with the id of its download page)
  3. fetch each thumbnail and shrink it to public/dd/t/<id>.webp
  4. write public/dd/games.json

Politeness: a few requests at a time with a pause between them, and a
descriptive User-Agent. robots.txt allows everything.

Usage: python3 tools/crawl_dedomil.py [--build-only]
"""
import concurrent.futures as cf
import html
import io
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "catalog" / "dedomil-cache"
OUT = ROOT / "public" / "dd"
THUMBS = OUT / "t"

BASE = "http://dedomil.net"
UA = "hellojar-directory/1.0 (+https://hellojar.yunolabz.xyz; links back to dedomil)"
WORKERS = 3
PAUSE = 0.35  # seconds each worker waits after a request

# J2ME brands only (Android, N-Gage, Windows Mobile and BlackBerry left out)
CATEGORIES = {1: "Nokia", 2: "SonyEricsson", 3: "Motorola", 4: "Samsung", 8: "LG",
              10: "Alcatel", 11: "ZTE", 12: "Amoi", 13: "Panasonic"}

THUMB_SIZE = 112

_print_lock = threading.Lock()


def log(*args):
    with _print_lock:
        print(*args, flush=True)


def fetch(path: str, binary=False, tries=4):
    url = path if path.startswith("http") else BASE + path
    # thumbnail paths come straight from HTML: "&amp;", spaces...
    url = urllib.parse.quote(html.unescape(url), safe=":/?=&%")
    attempt = 0
    while True:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as res:
                data = res.read()
            time.sleep(PAUSE)
            return data if binary else data.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:  # the page itself is broken: give up on it
            attempt += 1
            if attempt >= tries:
                log(f"  ! {url}: {e}")
                return None
            time.sleep(2 * attempt)
        except urllib.error.URLError as e:
            # no network (laptop asleep, wifi dropped): wait for it instead of
            # skipping half the site
            attempt += 1
            if attempt % 10 == 1:
                log(f"  … network problem ({e}), waiting")
            time.sleep(min(60, 3 * attempt))
        except Exception as e:  # malformed URL and the like: not worth retrying
            log(f"  ! {url}: {e}")
            return None


# ---------- 1. listings ----------

LIST_ITEM = re.compile(r'href="/games/(\d+)/category/\d+" class="bluelink">([^<]+)</a>\s*<span class="DATE">([\d.]+)</span>')
LAST_PAGE = re.compile(r'/all/page/(\d+)" class="PAGES2">&#x00BB;&#x00BB;')


def crawl_listings():
    path = CACHE / "listing.json"
    games = json.loads(path.read_text()) if path.exists() else {}
    done_path = CACHE / "listing-done.json"
    done = set(json.loads(done_path.read_text())) if done_path.exists() else set()

    for cat, brand in CATEGORIES.items():
        if str(cat) in done:
            continue
        first = fetch(f"/games/category/{cat}/all/page/1") or ""
        m = LAST_PAGE.search(first)
        pages = int(m.group(1)) if m else 1
        log(f"{brand}: {pages} pages")

        def page(n):
            return n, first if n == 1 else fetch(f"/games/category/{cat}/all/page/{n}")

        with cf.ThreadPoolExecutor(WORKERS) as ex:
            for n, text in ex.map(page, range(1, pages + 1)):
                for gid, name, date in LIST_ITEM.findall(text or ""):
                    g = games.setdefault(gid, {"id": int(gid), "name": html.unescape(name).strip(), "cats": []})
                    if cat not in g["cats"]:
                        g["cats"].append(cat)
                    d, mth, y = date.split(".")
                    g["added"] = f"{y}-{mth}-{d}"
                if n % 50 == 0:
                    log(f"  {brand} page {n}/{pages}")

        done.add(str(cat))
        path.write_text(json.dumps(games))
        done_path.write_text(json.dumps(sorted(done)))
    log(f"listing: {len(games)} unique games")
    return games


# ---------- 2. game pages ----------

SPLASH = re.compile(r'<div class="SPLASH">\s*<a href="([^"]+)"')
DOWNLOADS = re.compile(r'<b>Downloads</b>:\s*(\d+)')
VENDOR = re.compile(r'<b>Vendor</b>:\s*([^<]+)<')
# on /games/<id>/screens: one link per resolution, to /games/<id>/screen/<sid>
SCREEN = re.compile(r'/games/\d+/screen/(\d+)" class="bluelink">(\d+x\d+)<')


def parse_game(text):
    info = {}
    m = SPLASH.search(text)
    if m:
        info["img"] = m.group(1)
    m = DOWNLOADS.search(text)
    info["dl"] = int(m.group(1)) if m else 0
    m = VENDOR.search(text)
    if m:
        info["vendor"] = html.unescape(m.group(1)).strip()
    return info


def parse_screens(text):
    # [[resolution, screen id], ...]
    return [[res, int(sid)] for sid, res in SCREEN.findall(text)]


def crawl_games(games):
    path = CACHE / "games.jsonl"
    have = {}
    if path.exists():
        for line in path.read_text().splitlines():
            if line.strip():
                d = json.loads(line)
                have[str(d["id"])] = d
    todo = [g for gid, g in games.items() if gid not in have]
    log(f"game pages: {len(have)} cached, {len(todo)} to fetch")

    def one(g):
        page = fetch(f"/games/{g['id']}/category/{g['cats'][0]}")
        screens = fetch(f"/games/{g['id']}/screens")
        if page is None or screens is None:
            return None
        return {"id": g["id"], **parse_game(page), "res": parse_screens(screens)}

    with open(path, "a") as out, cf.ThreadPoolExecutor(WORKERS) as ex:
        for i, d in enumerate(ex.map(one, todo), 1):
            if d:
                out.write(json.dumps(d) + "\n")
                out.flush()
                have[str(d["id"])] = d
            if i % 200 == 0:
                log(f"  game pages {i}/{len(todo)}")
    return have


# ---------- 3. thumbnails ----------

def crawl_thumbs(details):
    THUMBS.mkdir(parents=True, exist_ok=True)
    missing_path = CACHE / "thumbs-missing.json"
    missing = set(json.loads(missing_path.read_text())) if missing_path.exists() else set()
    todo = [d for d in details.values()
            if d.get("img") and not (THUMBS / f"{d['id']}.webp").exists() and d["id"] not in missing]
    log(f"thumbnails: {len(todo)} to fetch")

    def one(d):
        data = fetch(d["img"], binary=True)
        if not data:
            return d["id"], False
        try:
            im = Image.open(io.BytesIO(data))
            im.seek(0)
            im = im.convert("RGB")
            im.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
            im.save(THUMBS / f"{d['id']}.webp", "WEBP", quality=72, method=6)
            return d["id"], True
        except Exception:
            return d["id"], False

    with cf.ThreadPoolExecutor(WORKERS) as ex:
        for i, (gid, ok) in enumerate(ex.map(one, todo), 1):
            if not ok:
                missing.add(gid)
            if i % 200 == 0:
                log(f"  thumbnails {i}/{len(todo)}")
                missing_path.write_text(json.dumps(sorted(missing)))
    missing_path.write_text(json.dumps(sorted(missing)))


# ---------- 4. output ----------

# keep the directory family-friendly: dedomil lists some adult "games" too
ADULT = re.compile(r"\b(sex\w*|xxx|porn\w*|erotic\w*|nude|naked|strip (club|poker|show)|stripper\w*|striptease|babes?|playboy|hentai|adult|"
                   r"bikini|kamasutra|topless|hot (asian|girls?|babes?|chicks?)|18\+|lingerie|boobs?|"
                   r"calendar girls?|pin[- ]?up|milf|seduc\w*)\b", re.I)


def fold(s):
    """Same idea as fold() in public/src/directory.js: case/accent/punctuation-free."""
    import unicodedata
    s = unicodedata.normalize("NFD", s.lower().replace("ı", "i"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def match_key(name):
    # "Prince of Persia (2008)" / "The Prince of Persia" / "Prince-of-Persia 3D" -> "princeofpersia3d"
    name = re.sub(r"\([^)]*\)", "", name)
    words = [w for w in fold(name).split() if w not in ("the", "mobile", "java", "game")]
    return "".join(words)


RES_TOKEN = re.compile(r"(\d{3})\s*[x×]\s*(\d{3})", re.I)


def pack_name(path):
    # "828 Java Games/Asphalt3_240x320.jar" -> "Asphalt3"
    base = path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    base = RES_TOKEN.sub(" ", base)
    base = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", base)
    return re.sub(r"[_\-.]+", " ", base).strip()


def archive_sources():
    """Playable-in-browser jars from tools/crawl_archive.py, keyed for matching."""
    path = ROOT / "catalog" / "archive-index.json"
    if not path.exists():
        return [], []
    index = json.loads(path.read_text())
    return index.get("games", []), index.get("packs", [])


def build(games, details):
    vendors, rows = [], []
    vendor_idx = {}
    for gid, g in games.items():
        d = details.get(gid)
        if not d or not d.get("res"):
            continue  # nothing downloadable
        if ADULT.search(g["name"]):
            continue
        v = d.get("vendor") or ""
        if v not in vendor_idx:
            vendor_idx[v] = len(vendors)
            vendors.append(v)
        cats = sum(1 << c for c in g["cats"])
        rows.append([
            g["id"], g["name"], vendor_idx[v], d.get("dl", 0), g.get("added", ""),
            cats, " ".join(f"{r}:{sid}" for r, sid in d["res"]), 1 if (THUMBS / f"{g['id']}.webp").exists() else 0,
        ])
    # ---- one-tap sources from the Internet Archive ----
    ia_games, ia_packs = archive_sources()
    sources = []          # [item, zip, path, (screen size if known)]
    by_key = {}
    for r in rows:
        by_key.setdefault(match_key(r[1]), r)

    def add_source(row, item, zip_name, inner, screen=None):
        sources.append([item, zip_name, inner] + ([screen] if screen else []))
        row[8].append(len(sources) - 1)

    for r in rows:
        r.append([])  # [8]: indexes into "sources"

    extra = 0
    for g in ia_games:
        if ADULT.search(g["name"]):
            continue
        row = by_key.get(match_key(g["name"]))
        if row is None:
            # not on dedomil: list it anyway, it's playable
            v = g.get("vendor") or ""
            if v not in vendor_idx:
                vendor_idx[v] = len(vendors)
                vendors.append(v)
            extra += 1
            icon = (f"https://archive.org/download/{g['item']}/{urllib.parse.quote(g['icon'])}"
                    if g.get("icon") else f"https://archive.org/services/img/{g['item']}")
            row = [-extra, g["name"], vendor_idx[v], int(g.get("downloads") or 0), "", 0, "", icon, []]
            rows.append(row)
            by_key[match_key(g["name"])] = row
        add_source(row, g["item"], g["zip"], g["path"], g.get("screen"))

    matched_packs = 0
    for j in ia_packs:
        row = by_key.get(match_key(pack_name(j["path"])))
        if row is not None and row[0] > 0 and len(row[8]) < 4:
            add_source(row, j["item"], j["zip"], j["path"])
            matched_packs += 1

    playable = sum(1 for r in rows if r[8])
    log(f"archive.org: {playable} playable in one tap ({extra} not on dedomil, {matched_packs} pack jars matched)")

    rows.sort(key=lambda r: -r[3])
    OUT.mkdir(parents=True, exist_ok=True)
    featured_path = ROOT / "catalog" / "dedomil-featured.json"
    featured = json.loads(featured_path.read_text()).get("featured", []) if featured_path.exists() else []
    doc = {
        "source": "dedomil.net",
        "featured": [i for i in featured if any(r[0] == i for r in rows)],
        "updated": time.strftime("%Y-%m-%d"),
        "fields": ["id", "name", "vendor", "downloads", "added", "brands", "resolutions", "thumb", "sources"],
        "sources": sources,
        "brands": {str(k): v for k, v in CATEGORIES.items()},
        "vendors": vendors,
        "games": rows,
    }
    (OUT / "games.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
    log(f"wrote public/dd/games.json: {len(rows)} games, {len(vendors)} vendors")


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    games = json.loads((CACHE / "listing.json").read_text()) if "--build-only" in sys.argv else crawl_listings()
    details = crawl_games(games) if "--build-only" not in sys.argv else {
        str(json.loads(l)["id"]): json.loads(l)
        for l in (CACHE / "games.jsonl").read_text().splitlines() if l.strip()}
    if "--build-only" not in sys.argv:
        crawl_thumbs(details)
    build(games, details)


if __name__ == "__main__":
    main()
