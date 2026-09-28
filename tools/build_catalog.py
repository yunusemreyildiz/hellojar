#!/usr/bin/env python3
"""Builds the built-in game catalog from catalog/games.json.

For every entry it writes, under public/apps/:
  <id>.zip      the bundle freej2me-web installs (jar + emulator settings)
  <id>.png      the game's icon, for the library/catalog pages
and finally catalog.json, which the pages read. Each entry's "version" is a
hash of its bundle, so players reinstall (keeping saves) when it changes.

Entries marked "private": true (games you own but may not redistribute) are
only built with --private, and go to catalog.local.json instead, which git
ignores along with their bundles. Leave them out of public deployments.

Usage: python3 tools/build_catalog.py [--private]
"""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "catalog" / "games.json"
OUT = ROOT / "public" / "apps"

DEFAULT_SETTINGS = {
    "sound": "on",
    "rotate": "off",
    "fps": "0",
    "fontSize": "0",
    "dgFormat": "4444",
    "forceFullscreen": "off",
    "queuedPaint": "off",
    "textureDisableFilter": "off",
}

FIXED_TIME = (2000, 1, 1, 0, 0, 0)  # deterministic zips -> stable versions

PUBLIC_FIELDS = ("id", "name", "vendor", "year", "size", "phone", "genre", "desc", "genre_en", "desc_en",
                 "license", "source", "keypad", "private", "external")


def manifest(jar: zipfile.ZipFile) -> dict:
    try:
        text = jar.read("META-INF/MANIFEST.MF").decode("utf-8", "replace")
    except KeyError:
        return {}
    props, last = {}, None
    for line in text.splitlines():
        if line.startswith(" ") and last:  # continuation line
            props[last] += line[1:]
        elif ":" in line:
            last, value = line.split(":", 1)
            last = last.strip()
            props[last] = value.strip()
    return props


def icon_path(props: dict):
    icon = props.get("MIDlet-Icon")
    if not icon and "MIDlet-1" in props:
        parts = [p.strip() for p in props["MIDlet-1"].split(",")]
        icon = parts[1] if len(parts) > 1 else None
    return icon.lstrip("/") if icon else None


def add(z: zipfile.ZipFile, name: str, data):
    info = zipfile.ZipInfo(name, FIXED_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    z.writestr(info, data)


def build(entry: dict) -> dict:
    jar_path = ROOT / entry["jar"]
    jar_bytes = jar_path.read_bytes()
    width, height = entry["size"].split("x")
    settings = {"width": width, "height": height, "phone": entry.get("phone", "Nokia"),
                **DEFAULT_SETTINGS, **entry.get("settings", {})}

    with zipfile.ZipFile(jar_path) as jar:
        props = manifest(jar)
        icon_name = icon_path(props)
        icon = jar.read(icon_name) if icon_name and icon_name in jar.namelist() else None

    zip_path = OUT / f"{entry['id']}.zip"
    with zipfile.ZipFile(zip_path, "w") as z:
        add(z, "app.jar", jar_bytes)
        add(z, "name", entry["name"])
        if icon:
            add(z, "icon", icon)
        add(z, "config/settings.conf", "".join(f"{k}:{v}\n" for k, v in settings.items()))
        add(z, "config/appproperties.conf", "")
        add(z, "config/systemproperties.conf", "")

    out = {k: entry[k] for k in PUBLIC_FIELDS if k in entry}
    out["version"] = hashlib.sha1(zip_path.read_bytes()).hexdigest()[:12]
    if icon:
        (OUT / f"{entry['id']}.png").write_bytes(icon)
        out["icon"] = f"{entry['id']}.png"
    return out


def main():
    include_private = "--private" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    for old in list(OUT.glob("*.zip")) + list(OUT.glob("*.png")):
        old.unlink()

    games, local = [], []
    for entry in json.loads(SOURCE.read_text()):
        if entry.get("private") and not include_private:
            print(f"skip {entry['id']} (private)")
            continue
        # "external": a recommendation that links to the game's page elsewhere;
        # nothing is bundled
        built = {k: entry[k] for k in PUBLIC_FIELDS if k in entry} if entry.get("external") else build(entry)
        (local if entry.get("private") else games).append(built)
        print(f"built {entry['id']} ({built.get('version', 'link')})")

    write(OUT / "catalog.json", games)
    local_path = OUT / "catalog.local.json"
    if local:
        write(local_path, local)
    elif local_path.exists():
        local_path.unlink()


def write(path: Path, games: list):
    path.write_text(json.dumps({"games": games}, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {path.relative_to(ROOT)} ({len(games)} games)")


if __name__ == "__main__":
    main()
