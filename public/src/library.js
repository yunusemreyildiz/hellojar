// Library / discover page.

import { listGames, getGame, saveGame, updateGame, removeGame, loadCatalog } from "./store.js";
import { SCREEN_SIZES, PHONE_TYPES } from "./detect.js";
import { initDirectory, pendingDownload, clearPending } from "./directory.js";
import { unwrapJar, guessScreenFromJar } from "./zip.js";
import { t, tHtml, localized, applyI18n, initLangSwitch } from "./i18n.js";
import {
    loadEmulator, analyseJar, install, readSettings, saveSettings,
    uninstall, wipeSaves, TOUCH_SIZES,
} from "./emu.js";

const $ = sel => document.querySelector(sel);
const fileInput = $('#file-input');

const NOTED_SIZES = ['128x160', '176x208', '176x220', '240x320', '352x416', '360x640'];
function sizeNotes() {
    return Object.fromEntries(NOTED_SIZES.map(s => [s, t('size.' + s)]));
}

let emulatorReady = false;
function warmUpEmulator() {
    loadEmulator().then(() => { emulatorReady = true; }, () => {});
}

// ---------- small helpers ----------

function toast(text, ms = 3200) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, ms);
}

function iconEl(game, big = false) {
    if (game.icon) {
        const img = document.createElement('img');
        img.className = 'icon' + (big ? ' big' : '');
        img.src = game.icon;
        img.alt = '';
        img.onerror = () => img.replaceWith(placeholderIcon(game, big));
        return img;
    }
    return placeholderIcon(game, big);
}

function placeholderIcon(game, big) {
    const div = document.createElement('div');
    div.className = 'icon placeholder' + (big ? ' big' : '');
    div.textContent = (game.name || '?').trim().charAt(0).toUpperCase();
    return div;
}

function metaText(game) {
    return [game.size, game.vendor].filter(Boolean).join(' · ');
}

function fillSelect(select, values, selected, labels = {}) {
    select.innerHTML = '';
    const all = values.includes(selected) || !selected ? values : [selected, ...values];
    for (const v of all) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = labels[v] ? `${v} — ${labels[v]}` : v;
        opt.selected = v === selected;
        select.appendChild(opt);
    }
}

function playUrl(id) {
    return 'play.html?app=' + encodeURIComponent(id);
}

// ---------- tabs ----------

function showTab(name) {
    for (const btn of document.querySelectorAll('.tabs button')) {
        btn.setAttribute('aria-selected', String(btn.dataset.tab === name));
    }
    $('#tab-library').hidden = name !== 'library';
    $('#tab-discover').hidden = name !== 'discover';
    history.replaceState(null, '', name === 'discover' ? '#kesfet' : location.pathname + location.search);
    if (name === 'discover') startDirectory();
}

// ---------- library ----------

function renderLibrary() {
    const container = $('#games');
    container.querySelectorAll('.game-card').forEach(el => el.remove());

    const games = listGames();
    $('#empty').hidden = games.length > 0;
    container.hidden = games.length === 0;

    for (const game of games) {
        const card = document.createElement('article');
        card.className = 'game-card';

        const link = document.createElement('a');
        link.href = playUrl(game.id);
        link.appendChild(iconEl(game));

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = game.name;
        link.appendChild(name);

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = metaText(game);
        link.appendChild(meta);

        const more = document.createElement('button');
        more.className = 'more';
        more.setAttribute('aria-label', t('lib.settingsFor', { name: game.name }));
        more.textContent = '⋯';
        more.onclick = () => openManage(game.id);

        card.append(link, more);
        container.appendChild(card);
    }
}

// ---------- discover ----------

async function renderCatalog() {
    const games = (await loadCatalog()).filter(g => !g.external);

    $('#catalog-block').hidden = games.length === 0;
    const list = $('#catalog');
    list.innerHTML = '';

    for (const g of games) {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        item.appendChild(iconEl({ ...g, icon: g.icon ? 'apps/' + g.icon : null }, true));

        const info = document.createElement('div');
        info.className = 'info';
        const h = document.createElement('h3');
        h.textContent = g.name;
        const meta = document.createElement('p');
        meta.textContent = [localized(g, 'genre'), g.vendor, g.year].filter(Boolean).join(' · ');
        const desc = document.createElement('p');
        desc.className = 'desc';
        desc.textContent = localized(g, 'desc');
        info.append(h, meta, desc);
        if (g.source) {
            const lic = document.createElement('p');
            lic.className = 'license';
            lic.append((g.license || t('cat.openSource')) + ' · ');
            const a = document.createElement('a');
            a.href = g.source;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = t('cat.sourceCode');
            lic.appendChild(a);
            info.appendChild(lic);
        }

        const play = document.createElement('a');
        play.className = 'btn primary';
        play.href = playUrl(g.id);
        play.textContent = getGame(g.id) ? t('cat.continue') : t('cat.play');

        item.append(info, play);
        list.appendChild(item);
    }
}

let directoryStarted = false;
function startDirectory() {
    if (directoryStarted) return;
    directoryStarted = true;
    initDirectory({ onPick: hint => pickFile(hint), onPlay: (hint, urls) => playFromArchive(hint, urls) });
}

// back from dedomil (possibly after the browser reloaded this tab)
function showPendingBar() {
    const p = pendingDownload();
    const bar = $('#pending-bar');
    if (!p || !$('#dir-sheet').hidden || !$('#add-sheet').hidden) {
        bar.hidden = true;
        return;
    }
    $('#pending-text').innerHTML = tHtml('pending.text', { name: p.name });
    bar.hidden = false;
}

// ---------- sheets ----------

function openSheet(id) {
    $(id).hidden = false;
}

function closeSheets() {
    document.querySelectorAll('.sheet-backdrop').forEach(el => { el.hidden = true; });
    showPendingBar();
}

document.addEventListener('click', e => {
    if (e.target.classList.contains('sheet-backdrop') || e.target.closest('[data-action="close-sheet"]')) {
        if (!busy) closeSheets();
    }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !busy) closeSheets();
});

let busy = false;

// ---------- adding a game ----------

let pending = null;

// hint: the directory game the player went to download ({ id, name, thumb, size })
// auto: install straight away with the best guesses and start playing (one-tap play)
async function addFile(file, hint = null, { auto = false, archive = null } = {}) {
    if (busy) return;
    closeSheets();
    $('#pending-bar').hidden = true;

    if (/\.jad$/i.test(file.name)) {
        toast(t('add.isJad'));
        return;
    }

    busy = true;
    pending = null;
    openSheet('#add-sheet');
    $('#add-loading').hidden = false;
    $('#add-form').hidden = true;
    $('#add-error').hidden = true;
    $('#add-loading-text').textContent = emulatorReady ? t('add.analysing') : t('add.preparing');

    try {
        let buffer = await file.arrayBuffer();
        let fileName = file.name;
        const magic = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
        if (magic[0] !== 0x50 || magic[1] !== 0x4b) { // "PK"
            throw new Error('not-a-jar');
        }
        // some downloads come as a .zip with the .jar inside
        const inner = await unwrapJar(buffer).catch(() => null);
        if (inner) {
            buffer = inner.buffer;
            fileName = inner.name;
        } else if (/\.zip$/i.test(fileName)) {
            throw new Error('not-a-jar');
        }

        await loadEmulator();
        emulatorReady = true;
        $('#add-loading-text').textContent = t('add.analysing');

        pending = await analyseJar(buffer, fileName);
        pending.archive = archive;
        if (!pending.sizeDetected) {
            // nothing in the name or manifest: look at the game's artwork
            const guess = await guessScreenFromJar(buffer).catch(() => null);
            if (guess && SCREEN_SIZES.includes(guess)) pending.size = guess;
        }
        if (hint) {
            // the version they picked on dedomil, unless the jar itself says otherwise
            if (!pending.sizeDetected && hint.size && SCREEN_SIZES.includes(hint.size)) {
                pending.size = hint.size;
                pending.sizeDetected = true;
            }
            if (!pending.icon && hint.thumb) pending.icon = hint.thumb;
            pending.dedomilId = hint.id > 0 ? hint.id : null;
            pending.hintName = hint.name;
        }
        if (auto) {
            // nothing says what size it is: the most common one (changeable from the game menu)
            if (!pending.sizeDetected) pending.size = '240x320';
            if (pending.exists) {
                // already installed under this id: just play it
                busy = false;
                clearPending();
                if (!getGame(pending.appId)) saveGame(libraryEntry(pending.appId, pending, pending.size, pending.phone, null));
                location.href = playUrl(pending.appId);
                return;
            }
            $('#add-loading-text').textContent = t('add.installing');
            await finishInstall({ size: pending.size, phone: pending.phone, mode: 'new' });
            return;
        }
        showAddForm(pending);
    } catch (e) {
        console.error(e);
        $('#add-loading').hidden = true;
        const box = $('#add-error');
        box.hidden = false;
        box.textContent = e?.message === 'not-a-jar'
            ? t('add.notJar')
            : navigator.onLine === false ? t('add.offline') : t('add.unreadable');
    } finally {
        busy = false;
    }
}

function showAddForm(p) {
    $('#add-loading').hidden = true;
    $('#add-form').hidden = false;

    const icon = $('#add-icon');
    icon.src = p.icon || 'icons/icon-192.png';
    $('#add-title').textContent = p.name;
    $('#add-meta').textContent = [p.vendor, p.fileName].filter(Boolean).join(' · ');

    fillSelect($('#add-size'), SCREEN_SIZES, p.size, sizeNotes());
    $('#add-size-badge').hidden = !p.sizeDetected;
    $('#add-size').onchange = () => { $('#add-size-badge').hidden = $('#add-size').value !== p.size || !p.sizeDetected; };
    fillSelect($('#add-phone'), PHONE_TYPES, p.phone);

    $('#add-exists').hidden = !p.exists;
    const replace = document.querySelector('input[name="mode"][value="replace"]');
    if (replace) replace.checked = true;
}

function libraryEntry(id, p, size, phone, previous) {
    return {
        ...(previous || {}),
        id,
        name: p.name + (id !== p.appId ? ` (${size})` : ''),
        vendor: p.vendor || null,
        icon: p.icon,
        size, phone,
        keypad: previous?.keypad || (TOUCH_SIZES.includes(size) ? 'none' : 'full'),
        fileName: p.fileName,
        dedomilId: p.dedomilId || previous?.dedomilId || null,
        archive: p.archive || previous?.archive || null,
        source: 'user',
        addedAt: previous?.addedAt || Date.now(),
    };
}

// installs `pending` and opens the game; throws on failure
async function finishInstall({ size, phone, mode }) {
    const id = await install(pending, { size, phone, mode });
    saveGame(libraryEntry(id, pending, size, phone, getGame(id)));
    clearPending();
    location.href = playUrl(id);
}

$('#add-confirm').addEventListener('click', async () => {
    if (!pending || busy) return;
    busy = true;
    const btn = $('#add-confirm');
    btn.disabled = true;
    btn.textContent = t('add.adding');

    try {
        const mode = pending.exists ? document.querySelector('input[name="mode"]:checked').value : 'new';
        await finishInstall({ size: $('#add-size').value, phone: $('#add-phone').value, mode });
    } catch (e) {
        console.error(e);
        toast(t('add.failed'));
        btn.disabled = false;
        btn.textContent = t('add.confirm');
        busy = false;
    }
});

// ---------- one-tap play from archive.org ----------

async function fetchWithProgress(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const total = Number(res.headers.get('content-length')) || 0;
    if (!res.body || !total) return res.arrayBuffer();
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        onProgress(Math.min(99, Math.round(got * 100 / total)));
    }
    const out = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out.buffer;
}

// sources: [{ url, screen }] — screen is the size archive.org's description names, if any
async function playFromArchive(hint, sources) {
    if (busy) return;

    // installed before from the same file: open it right away
    const known = listGames().find(g => g.archive && sources.some(src => src.url === g.archive));
    if (known) {
        location.href = playUrl(known.id);
        return;
    }

    closeSheets();
    busy = true;
    openSheet('#add-sheet');
    $('#add-loading').hidden = false;
    $('#add-form').hidden = true;
    $('#add-error').hidden = true;
    const status = $('#add-loading-text');
    status.textContent = t('add.fetching', { pct: '' });
    warmUpEmulator();

    let buffer = null, used = null;
    for (const src of sources) {
        try {
            buffer = await fetchWithProgress(src.url, pct => { status.textContent = t('add.fetching', { pct: pct + '%' }); });
            used = src;
            break;
        } catch (e) {
            console.warn('archive.org source failed', src.url, e);
        }
    }
    busy = false;
    if (!buffer) {
        $('#add-loading').hidden = true;
        const box = $('#add-error');
        box.hidden = false;
        box.textContent = t('add.fetchFailed');
        return;
    }
    const name = decodeURIComponent(used.url.split('/').pop()).split('/').pop() || 'game.jar';
    await addFile(new File([buffer], name), { ...hint, size: used.screen || null }, { auto: true, archive: used.url });
}

// ---------- managing a game ----------

let managed = null;

async function openManage(id) {
    const game = getGame(id);
    if (!game) return;
    managed = game;

    const head = $('#manage-icon');
    head.src = game.icon || 'icons/icon-192.png';
    $('#manage-title').textContent = game.name;
    $('#manage-meta').textContent = metaText(game);
    $('#manage-loading').hidden = false;
    $('#manage-form').hidden = true;
    openSheet('#manage-sheet');

    try {
        const settings = await readSettings(id);
        if (managed?.id !== id) return;
        const size = settings.width ? `${settings.width}x${settings.height}` : game.size;
        fillSelect($('#manage-size'), SCREEN_SIZES, size, sizeNotes());
        fillSelect($('#manage-phone'), PHONE_TYPES, settings.phone || game.phone || 'Nokia');
        $('#manage-keypad').value = game.keypad || 'full';
        $('#manage-sound').checked = (settings.sound || 'on') === 'on';
        $('#manage-loading').hidden = true;
        $('#manage-form').hidden = false;
    } catch (e) {
        console.error(e);
        closeSheets();
        toast(t('manage.readFailed'));
    }
}

$('#manage-save').addEventListener('click', async () => {
    if (!managed || busy) return;
    busy = true;
    try {
        const size = $('#manage-size').value;
        const [width, height] = size.split('x');
        const phone = $('#manage-phone').value;
        await saveSettings(managed.id, {
            width, height, phone,
            sound: $('#manage-sound').checked ? 'on' : 'off',
        });
        updateGame(managed.id, { size, phone, keypad: $('#manage-keypad').value });
        closeSheets();
        renderLibrary();
        toast(t('manage.saved'));
    } catch (e) {
        console.error(e);
        toast(t('manage.saveFailed'));
    } finally {
        busy = false;
    }
});

$('#manage-wipe').addEventListener('click', async () => {
    if (!managed || busy) return;
    if (!confirm(t('manage.wipeConfirm', { name: managed.name }))) return;
    busy = true;
    try {
        await wipeSaves(managed.id);
        toast(t('manage.wiped'));
    } catch {
        toast(t('manage.wipeFailed'));
    } finally {
        busy = false;
    }
});

$('#manage-remove').addEventListener('click', async () => {
    if (!managed || busy) return;
    if (!confirm(t('manage.removeConfirm', { name: managed.name }))) return;
    busy = true;
    try {
        await uninstall(managed.id);
        try { localStorage.removeItem('tuslu.bundle.' + managed.id); } catch {}
        removeGame(managed.id);
        closeSheets();
        renderLibrary();
        renderCatalog();
        toast(t('manage.removed'));
    } catch {
        toast(t('manage.removeFailed'));
    } finally {
        busy = false;
    }
});

// ---------- ways a file can arrive ----------

let pickHint = null;

function pickFile(hint = null) {
    warmUpEmulator();
    pickHint = hint;
    fileInput.value = '';
    fileInput.click();
}

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) addFile(file, pickHint);
    pickHint = null;
});

// "Share → hellojar" on Android (installed app): sw.js stashes the file
async function takeSharedFile() {
    const params = new URLSearchParams(location.search);
    if (!params.has('shared')) return;
    history.replaceState(null, '', location.pathname);
    try {
        const cache = await caches.open('tuslu-share');
        const res = await cache.match('shared-file');
        if (!res) return;
        await cache.delete('shared-file');
        const name = decodeURIComponent(res.headers.get('X-File-Name') || 'oyun.jar');
        addFile(new File([await res.blob()], name));
    } catch (e) {
        console.error(e);
        toast(t('add.sharedFailed'));
    }
}

// "Open with" on desktop Chrome (installed app, manifest file_handlers)
if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async params => {
        const handle = params.files?.[0];
        if (handle) addFile(await handle.getFile());
    });
}

// drag & drop on desktop
let dragDepth = 0;
window.addEventListener('dragenter', e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepth++;
    $('#drop-hint').hidden = false;
});
window.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) { dragDepth = 0; $('#drop-hint').hidden = true; }
});
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
    e.preventDefault();
    dragDepth = 0;
    $('#drop-hint').hidden = true;
    const file = e.dataTransfer?.files?.[0];
    if (file) addFile(file);
});

// ---------- boot ----------

document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab], [data-tab-link]');
    if (tab) showTab(tab.dataset.tab || tab.dataset.tabLink);
    if (e.target.closest('[data-action="add"]')) pickFile();
    if (e.target.closest('#pending-pick')) pickFile(pendingDownload());
    if (e.target.closest('#pending-dismiss')) { clearPending(); $('#pending-bar').hidden = true; }
});
document.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-action="add"]')) warmUpEmulator();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

applyI18n();
initLangSwitch();
window.addEventListener('langchange', () => {
    renderLibrary();
    renderCatalog();
    showPendingBar();
});

renderLibrary();
renderCatalog();
showTab(location.hash === '#kesfet' || listGames().length === 0 && !new URLSearchParams(location.search).has('shared') ? 'discover' : 'library');
takeSharedFile();
showPendingBar();
document.addEventListener('visibilitychange', () => { if (!document.hidden) showPendingBar(); });

// coming back from a game (bfcache) should show fresh play order
window.addEventListener('pageshow', e => { if (e.persisted) { renderLibrary(); renderCatalog(); } });
