<p align="center">
  <a href="https://hellojar.netlify.app"><img src="docs/banner.png" alt="hellojar — old keypad-phone games, right in your browser" width="100%"></a>
</p>

<p align="center">
  <a href="https://hellojar.netlify.app"><b>▶ Play now</b></a>
  &nbsp;·&nbsp;
  <a href="#features">Features</a>
  &nbsp;·&nbsp;
  <a href="#how-it-works">How it works</a>
  &nbsp;·&nbsp;
  <a href="#run-it-yourself">Run it yourself</a>
  &nbsp;·&nbsp;
  <a href="README.tr.md">🇹🇷 Türkçe</a>
</p>

<p align="center">
  <a href="https://hellojar.netlify.app"><img alt="Live" src="https://img.shields.io/badge/live-hellojar.netlify.app-e0a040?style=flat-square"></a>
  <img alt="J2ME" src="https://img.shields.io/badge/J2ME-MIDP_2.0-5ec8e5?style=flat-square">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-2b3038?style=flat-square">
  <img alt="No build step" src="https://img.shields.io/badge/build-none-2b3038?style=flat-square">
  <a href="LICENSE-freej2me"><img alt="GPL-3.0 emulator" src="https://img.shields.io/badge/emulator-GPL--3.0-2b3038?style=flat-square"></a>
</p>

---

Remember **Snake II**, **Asphalt**, **LOST** on a Nokia with a D-pad? **hellojar** runs those Java ME (J2ME) games in any modern browser, with a keypad built for thumbs. There's nothing to install: open the site, pick a game, play.

<p align="center">
  <img src="docs/screens.png" alt="Discover tab, Abo in play, Reversi, and the in-game menu" width="100%">
</p>

## Features

- **📱 A phone in your phone.** An N80-style 5-way navi key, soft keys and a 0–9 / * / # pad. You can slide your thumb across keys and press several at once, and Android vibrates on each press. Portrait puts the keys below the screen; landscape puts them on both sides.
- **🗂 A real library.** Add any `.jar` (or a `.zip` with one inside). The screen size and key layout are guessed from the file (`LOST_NokiaN80` → 352×416, `K800i` → 240×320 Sony Ericsson…). Games and save data stay on your device.
- **🔎 A catalog of 5,500+ games.** Search in Turkish or English without worrying about accents, filter by brand, and sort by popularity, date or name. Pick a game and hellojar opens its download page for the resolution that suits your screen; the downloaded file comes straight back into your library.
- **▶ One-tap games.** A handful of GPL-licensed titles (Abo, MilCity, Reversi) ship with the site and start instantly.
- **⚡ Fixes old games that would otherwise freeze the page.** Many J2ME games busy-wait or spin in `while (true)` loops. That was fine on a phone, but it freezes a browser tab. hellojar patches their bytecode as they load (see [below](#how-it-works)).
- **🌍 Türkçe / English.** Switch from the top-right corner or the in-game menu; your choice is remembered.
- **📲 Installable.** Add it to your home screen and it runs full screen. On Android, *Share → hellojar* opens a downloaded jar directly.

## How it works

```
 your .jar ──► zip.js (unwrap) ──► freej2me-web (Java, compiled to JS/Wasm by CheerpJ)
                                        │
                     MIDletLoader rewrites game bytecode with ASM:
                       Thread.yield()/sleep(0) ─► ThreadCompat (sleep ≥ 1 ms)
                       every loop back-edge    ─► ThreadCompat.loop()
                                        │
             canvas + WebAudio (MIDI) ◄─┴─► touch keypad (play.js)
```

- **Emulator:** [freej2me-web](https://github.com/zb3/freej2me-web) (FreeJ2ME, run in the browser by [CheerpJ](https://cheerpj.com/)).
- **Why games crawled or froze:** CheerpJ runs every Java thread *cooperatively* on the browser's main thread. A Gameloft sound thread spinning on `Thread.yield()` ate ~100% CPU (LOST ran at ~1 fps). A game whose main loop never blocks froze the tab completely.
- **The fix** lives in [`emulator/src`](emulator/src/org/recompile/mobile). Yields and zero-length sleeps become 1 ms sleeps, and every loop checks in with `ThreadCompat.loop()`, which gives the browser a turn after 25 ms without a break. Result: LOST went from ~1 → 14 fps (the game's own cap), with CPU dropping from 100% to ~15%.
- **Catalog:** [`tools/crawl_dedomil.py`](tools/crawl_dedomil.py) builds a compact index of names, vendors, resolutions and 112 px WebP thumbnails from [dedomil.net](http://dedomil.net)'s public listings (adult titles filtered out). hellojar never hosts or proxies game files; downloads happen on dedomil's own pages.

## Run it yourself

```bash
git clone https://github.com/yunusemreyildiz/hellojar.git
cd hellojar
npm install
npm start            # → http://localhost:8080
```

It's a static site: serve `public/` from anything that supports HTTP `Range` requests (Netlify, nginx, Cloudflare Pages, GitHub Pages…). [`netlify.toml`](netlify.toml) is already set up.

| Task | Command |
| --- | --- |
| Rebuild the emulator jar after editing `emulator/src` (needs a JDK) | `./tools/build_emulator.sh` |
| Rebuild the one-tap catalog from `catalog/games.json` | `python3 tools/build_catalog.py` |
| Refresh the dedomil catalog (resumable, polite) | `python3 tools/crawl_dedomil.py` |
| Pin games to the top of *Popular* | edit `catalog/dedomil-featured.json`, then `python3 tools/crawl_dedomil.py --build-only` |

<details>
<summary><b>Project layout</b></summary>

| Path | What |
| --- | --- |
| `public/index.html`, `src/library.js`, `src/directory.js` | Library, Discover and the catalog |
| `public/play.html`, `src/play.js` | The player (`play.html?app=<id>`) |
| `public/src/emu.js` | Talks to the Java side: analyse, install, settings |
| `public/src/detect.js` | Guesses screen size and phone type from file names |
| `public/src/i18n.js` | Turkish / English strings |
| `public/src/zip.js` | Pulls a `.jar` out of a `.zip` in the browser |
| `public/sw.js`, `manifest.webmanifest` | PWA and the Android share target |
| `emulator/` | Our changes to freej2me-web |
| `catalog/` | One-tap games (with their licenses) and catalog settings |
| `tools/` | Build and crawl scripts |

</details>

## Notes

- **Compatibility:** Most 2D MIDP games run well. Some 3D (M3G / Mascot Capsule) and vendor-specific games may not, and Symbian `.sis` files never will.
- **Online:** The CheerpJ runtime loads from its CDN, so an internet connection is needed. CheerpJ is free for personal and non-commercial use.
- **Sound on iPhone:** iOS mutes Web Audio when the silent switch is on.
- **Rights:** Games belong to their authors and publishers. hellojar only ships titles whose licenses allow it (see [`catalog/free`](catalog/free/README.md)) and isn't affiliated with dedomil.net.

## Credits

[freej2me-web](https://github.com/zb3/freej2me-web) by zb3 (GPL-3.0) · [FreeJ2ME](https://github.com/hex007/freej2me) · [CheerpJ](https://cheerpj.com/) by Leaning Technologies · [dedomil.net](http://dedomil.net) for keeping the J2ME era alive · Abo, MilCity and Reversi by their respective authors (GPL).

<p align="center"><sub>Built by <a href="https://yunolabz.xyz">YunoLabz</a> · <a href="https://hellojar.netlify.app"><b>hello</b>jar</a></sub></p>
