// The game player: runs one installed app (play.html?app=<id>) on freej2me-web
// with a touch keypad. Derived from freej2me-web's src/main.js.

import { LibMedia } from "../libmedia/libmedia.js";
import { LibMidi, createUnlockingAudioContext } from "../libmidi/libmidi.js";
import { codeMap, KeyRepeatManager } from "./key.js";
import { EventQueue } from "./eventqueue.js";

import canvasFontNatives from "../libjs/libcanvasfont.js";
import canvasGraphicsNatives from "../libjs/libcanvasgraphics.js";
import gles2Natives from "../libjs/libgles2.js";
import jsReferenceNatives from "../libjs/libjsreference.js";
import mediaBridgeNatives from "../libjs/libmediabridge.js";
import midiBridgeNatives from "../libjs/libmidibridge.js";

import { getGame, saveGame, updateGame, loadCatalog } from "./store.js";
import { TOUCH_SIZES } from "./emu.js";
import { t, getLang, setLang, applyI18n } from "./i18n.js";

const APP_ID = new URLSearchParams(location.search).get('app');
if (!APP_ID) location.replace('./');

const evtQueue = new EventQueue();
window.evtQueue = evtQueue;

const cheerpjWebRoot = '/app' + location.pathname.replace(/\/[^/]*$/, '');

const display = document.getElementById('display');
const screenCtx = display.getContext('2d');
const screenArea = document.getElementById('screen-area');
const loader = document.getElementById('loader');
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const menuEl = document.getElementById('menu');

const keyRepeatManager = new KeyRepeatManager();

const prefs = {
    get(k, d) { try { const v = localStorage.getItem('tuslu.' + k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tuslu.' + k, v); } catch {} },
};
let haptics = prefs.get('haptics', '1') === '1';

const KEYPAD_MODES = ['full', 'nav', 'none'];
const KEYPAD_LABELS = { full: 'play.kpFull', nav: 'play.kpNav', none: 'play.kpNone' };
let game = getGame(APP_ID);
let keypadMode = game?.keypad || 'full';

// ---------- loading UI ----------

function setStatus(text, pct) {
    statusEl.textContent = text;
    if (pct != null) progressEl.style.width = pct + '%';
}

function hideLoader() {
    if (loader.classList.contains('done')) return;
    progressEl.style.width = '100%';
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 500);
    display.focus();
}

// the emulator sets the canvas size well before the game draws its first frame,
// so wait until something other than black shows up
function waitForFirstFrame() {
    const started = Date.now();
    let pct = 80;
    const tick = () => {
        if (!loader.isConnected) return;
        const w = display.width, h = display.height;
        let drawn = false;
        try {
            const data = screenCtx.getImageData(0, 0, w, h).data;
            for (let i = 0; i < data.length; i += 4 * 97) {
                if (data[i] | data[i + 1] | data[i + 2]) { drawn = true; break; }
            }
        } catch {}
        if (drawn || Date.now() - started > 40000) {
            hideLoader();
        } else {
            pct = Math.min(98, pct + 0.6);
            progressEl.style.width = pct + '%';
            setTimeout(tick, 250);
        }
    };
    tick();
}

// ---------- scaling ----------

function autoscale() {
    const rect = screenArea.getBoundingClientRect();
    const style = getComputedStyle(screenArea);
    const availW = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 8;
    const availH = rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 8;

    let scale = Math.min(availW / display.width, availH / display.height);
    // snap to a whole-pixel multiple when that loses little space - sharper pixels
    const whole = Math.floor(scale);
    if (whole >= 1 && whole / scale > 0.9) scale = whole;
    scale = Math.max(scale, 0.25);

    display.style.width = Math.floor(display.width * scale) + 'px';
    display.style.height = Math.floor(display.height * scale) + 'px';
}

// ---------- input ----------

function postKey(isDown, code) {
    const symbol = code.startsWith('Digit') ? code.substring(5).charCodeAt(0) : '\x00';
    keyRepeatManager.post(isDown, code, { symbol, ctrlKey: false, shiftKey: false });
}

function tapKey(code) {
    postKey(true, code);
    setTimeout(() => postKey(false, code), 80);
}

function buzz() {
    if (haptics && navigator.vibrate) {
        try { navigator.vibrate(12); } catch {}
    }
}

function initKeypad() {
    const pad = document.getElementById('pad');
    const active = new Map(); // pointerId -> key element

    const keyAt = (x, y) => document.elementFromPoint(x, y)?.closest('#pad .key');

    function press(el) {
        el.classList.add('active');
        if (el.dataset.key) {
            buzz();
            postKey(true, el.dataset.key);
        }
    }
    function release(el, fire) {
        el.classList.remove('active');
        if (el.dataset.key) {
            postKey(false, el.dataset.key);
        } else if (fire && el.dataset.action === 'menu') {
            openMenu();
        }
    }

    pad.addEventListener('pointerdown', e => {
        const el = e.target.closest('.key');
        if (!el) return;
        e.preventDefault();
        // let the pointer slide across keys (e.g. rolling from ← to ↑ on the navi key)
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
        active.set(e.pointerId, el);
        press(el);
    });

    pad.addEventListener('pointermove', e => {
        const prev = active.get(e.pointerId);
        if (!prev) return;
        const el = keyAt(e.clientX, e.clientY);
        if (el === prev) return;
        // don't let a slide open the menu or leave it pressed
        release(prev, false);
        if (el && el.dataset.key) {
            active.set(e.pointerId, el);
            press(el);
        } else {
            active.delete(e.pointerId);
        }
    });

    const end = e => {
        const el = active.get(e.pointerId);
        if (!el) return;
        active.delete(e.pointerId);
        release(el, e.type === 'pointerup');
    };
    // listen on window: once capture is released, pointerup may land anywhere
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    pad.addEventListener('contextmenu', e => e.preventDefault());
}

function initInput() {
    initKeypad();

    keyRepeatManager.register((kind, key, args) => {
        if (kind === 'click' || !codeMap[key]) return;
        evtQueue.queueEvent({
            kind: kind === 'up' ? 'keyup' : 'keydown',
            args: [codeMap[key], args.symbol, args.ctrlKey, args.shiftKey]
        });
    });

    // physical keyboard (desktop / bluetooth keyboards)
    const onKey = e => {
        if (!menuEl.hidden) return;
        if (codeMap[e.code]) {
            keyRepeatManager.post(e.type === 'keydown', e.code, {
                symbol: e.key.length == 1 ? e.key.charCodeAt(0) : '\x00',
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey
            });
            e.preventDefault();
        }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // the game has no touch support, but forward taps anyway (harmless for N80 games)
    const toGame = e => {
        const r = display.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * display.width / r.width | 0,
            y: (e.clientY - r.top) * display.height / r.height | 0,
        };
    };
    let down = false;
    display.addEventListener('pointerdown', e => {
        down = true;
        display.setPointerCapture(e.pointerId);
        evtQueue.queueEvent({ kind: 'pointerpressed', ...toGame(e) });
        e.preventDefault();
    });
    display.addEventListener('pointermove', e => {
        if (!down) return;
        evtQueue.queueEvent({ kind: 'pointerdragged', ...toGame(e) });
    });
    display.addEventListener('pointerup', e => {
        if (!down) return;
        down = false;
        evtQueue.queueEvent({ kind: 'pointerreleased', ...toGame(e) });
    });

    // block pinch-zoom / double-tap zoom on iOS
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());

    window.addEventListener('resize', autoscale);
    screen.orientation?.addEventListener?.('change', () => setTimeout(autoscale, 100));
    new ResizeObserver(autoscale).observe(screenArea);
}

// ---------- menu ----------

function syncMenuLabels() {
    document.getElementById('haptics-state').textContent = haptics ? t('play.on') : t('play.off');
    document.getElementById('keypad-state').textContent = t(KEYPAD_LABELS[keypadMode]);
    document.getElementById('lang-state').textContent = getLang() === 'tr' ? 'Türkçe' : 'English';
    for (const m of KEYPAD_MODES) document.body.classList.toggle('kp-' + m, m === keypadMode);
    const fsBtn = menuEl.querySelector('[data-menu="fullscreen"]');
    const canFs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    fsBtn.hidden = !canFs;
    fsBtn.textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? t('play.exitFullscreen') : t('play.fullscreen');
}

let menuOpenedAt = 0;

function openMenu() {
    syncMenuLabels();
    menuEl.hidden = false;
    menuOpenedAt = performance.now();
}

function closeMenu() {
    menuEl.hidden = true;
    display.focus();
}

function toggleFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        req?.call(el, { navigationUI: 'hide' })?.catch?.(() => {});
    }
}

function initMenu() {
    applyI18n();
    window.addEventListener('langchange', syncMenuLabels);
    document.querySelector('.float-menu').addEventListener('click', openMenu);
    menuEl.addEventListener('click', e => {
        // the click synthesized from the tap that opened the menu lands here too
        if (performance.now() - menuOpenedAt < 400) return;
        if (e.target === menuEl) return closeMenu();
        const btn = e.target.closest('button');
        if (!btn) return;
        switch (btn.dataset.menu) {
            case 'fullscreen': toggleFullscreen(); closeMenu(); break;
            case 'haptics': haptics = !haptics; prefs.set('haptics', haptics ? '1' : '0'); buzz(); syncMenuLabels(); break;
            case 'keypad':
                keypadMode = KEYPAD_MODES[(KEYPAD_MODES.indexOf(keypadMode) + 1) % KEYPAD_MODES.length];
                updateGame(APP_ID, { keypad: keypadMode });
                syncMenuLabels();
                autoscale();
                break;
            case 'library': location.href = './'; break;
            case 'lang': setLang(getLang() === 'tr' ? 'en' : 'tr'); syncMenuLabels(); break;
            case 'emu': closeMenu(); tapKey('Escape'); break;
            case 'reload': location.reload(); break;
            case 'close': closeMenu(); break;
        }
    });
    syncMenuLabels();
}

// keep the screen on while playing
let wakeLock = null;
async function keepAwake() {
    try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wakeLock) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
    } catch {}
}
document.addEventListener('visibilitychange', keepAwake);
document.addEventListener('pointerdown', keepAwake);

// iOS suspends/interrupts the AudioContext when the page goes to the background;
// the first touch after coming back brings the sound back
document.addEventListener('pointerdown', () => {
    const ctx = window.libmidi?.context;
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
});

// ---------- emulator ----------

function setFaviconFromBuffer() {
    // we ship our own icons, ignore the one from the jar
}

async function fetchCatalogEntry() {
    return (await loadCatalog()).find(g => g.id === APP_ID) || null;
}

// Catalog games ship as apps/<id>.zip. CheerpJ keeps the installed copy (and
// the game's saves under rms/) in IndexedDB; reinstall when the bundle changed.
// Unzipping over the old copy replaces the jar and config but leaves rms/ alone.
// Returns false when the app is neither installed nor in the catalog.
async function ensureAppInstalled(lib, entry) {
    const appFile = await cjFileBlob("/files/" + APP_ID + "/app.jar");
    const bundleKey = 'bundle.' + APP_ID;

    if (entry && (!appFile || prefs.get(bundleKey, null) !== entry.version)) {
        const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;
        await launcherUtil.installFromBundle(cheerpjWebRoot + "/apps/", APP_ID);
        prefs.set(bundleKey, entry.version);
        return true;
    }
    return !!appFile;
}

function showGameInfo(info) {
    if (!info) return;
    document.title = info.name + ' · hellojar';
    document.getElementById('loader-name').textContent = info.name;
    const sub = [info.vendor, info.year, info.size].filter(Boolean).join(' · ');
    document.getElementById('loader-sub').textContent = sub || '\u00a0';
    if (info.icon) document.getElementById('loader-icon').src = info.icon;
    if (info.size) {
        const [w, h] = info.size.split('x').map(Number);
        display.width = w;
        display.height = h;
        autoscale();
    }
}

function fail(message) {
    loader.classList.add('error');
    setStatus(message);
    document.getElementById('loader-hint').hidden = true;
    document.getElementById('loader-back').hidden = false;
}

async function init() {
    initInput();
    initMenu();
    showGameInfo(game);
    autoscale();

    const catalogEntry = fetchCatalogEntry();

    setStatus(t('play.loadingAudio'), 10);
    window.libmidi = new LibMidi(createUnlockingAudioContext());
    await window.libmidi.init();
    window.libmidi.midiPlayer.addEventListener('end-of-media', e => {
        window.evtQueue.queueEvent({ kind: 'player-eom', player: e.target });
    });
    window.libmedia = new LibMedia();

    setStatus(t('play.loadingJava'), 25);
    await cheerpjInit({
        enableDebug: false,
        natives: {
            ...canvasFontNatives,
            ...canvasGraphicsNatives,
            ...gles2Natives,
            ...jsReferenceNatives,
            ...mediaBridgeNatives,
            ...midiBridgeNatives,
            async Java_pl_zb3_freej2me_bridge_shell_Shell_setTitle(lib, title) {
                document.title = title;
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_setIcon(lib, iconBytes) {
                setFaviconFromBuffer(iconBytes);
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_getScreenCtx(lib) {
                return screenCtx;
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_setCanvasSize(lib, width, height) {
                const first = !display.dataset.ready;
                display.dataset.ready = '1';
                screenCtx.canvas.width = width;
                screenCtx.canvas.height = height;
                autoscale();
                if (first) {
                    setStatus(t('play.starting'), 80);
                    waitForFirstFrame();
                }
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_waitForAndDispatchEvents(lib, listener) {
                const KeyEvent = await lib.pl.zb3.freej2me.bridge.shell.KeyEvent;
                const PointerEvent = await lib.pl.zb3.freej2me.bridge.shell.PointerEvent;

                const evt = await evtQueue.waitForEvent();
                if (evt.kind == 'keydown') {
                    await listener.keyPressed(await new KeyEvent(...evt.args));
                } else if (evt.kind == 'keyup') {
                    await listener.keyReleased(await new KeyEvent(...evt.args));
                } else if (evt.kind == 'pointerpressed') {
                    await listener.pointerPressed(await new PointerEvent(evt.x, evt.y));
                } else if (evt.kind == 'pointerdragged') {
                    await listener.pointerDragged(await new PointerEvent(evt.x, evt.y));
                } else if (evt.kind == 'pointerreleased') {
                    await listener.pointerReleased(await new PointerEvent(evt.x, evt.y));
                } else if (evt.kind == 'player-eom') {
                    await listener.playerEOM(evt.player);
                } else if (evt.kind == 'player-video-frame') {
                    await listener.playerVideoFrame(evt.player);
                }
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_restart(lib) {
                location.reload();
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_exit(lib) {
                location.href = './';
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_sthop(lib) {},
            async Java_pl_zb3_freej2me_bridge_shell_Shell_say(lib, sth) {
                console.log('[say]', sth);
            },
            async Java_pl_zb3_freej2me_bridge_shell_Shell_sayObject(lib, label, obj) {
                console.log('[sayobject]', label, obj);
            }
        }
    });

    setStatus(t('play.loadingEmu'), 45);
    const lib = await cheerpjRunLibrary(cheerpjWebRoot + "/freej2me-web.jar");
    const FreeJ2ME = await lib.org.recompile.freej2me.FreeJ2ME;

    setStatus(t('play.preparingGame'), 65);
    const entry = await catalogEntry;
    if (!game && entry) {
        // first time a catalog game is opened: put it in the library
        game = {
            id: APP_ID, name: entry.name, vendor: entry.vendor, year: entry.year,
            icon: 'apps/' + entry.icon, size: entry.size, phone: entry.phone,
            keypad: entry.keypad || (TOUCH_SIZES.includes(entry.size) ? 'none' : 'full'),
            source: 'catalog', addedAt: Date.now(),
        };
        saveGame(game);
        keypadMode = game.keypad;
        syncMenuLabels();
        showGameInfo(game);
    }
    if (!(await ensureAppInstalled(lib, entry))) {
        fail(t('play.notInstalled'));
        return;
    }
    updateGame(APP_ID, { playedAt: Date.now() });

    setStatus(t('play.opening'), 72);
    FreeJ2ME.main(['app', APP_ID]).catch(e => {
        e.printStackTrace?.();
        fail(t('play.crashed'));
    });
}

if (APP_ID) {
    init().catch(e => {
        console.error(e);
        fail(navigator.onLine === false
            ? t('play.offline')
            : t('play.loadFailed', { error: e?.message || e }));
    });
}
