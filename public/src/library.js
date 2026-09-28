// Library / discover page.

import { listGames, getGame, saveGame, updateGame, removeGame, loadCatalog } from "./store.js";
import { SCREEN_SIZES, PHONE_TYPES, recommendedSizes } from "./detect.js";
import {
    loadEmulator, analyseJar, install, readSettings, saveSettings,
    uninstall, wipeSaves, TOUCH_SIZES,
} from "./emu.js";

const $ = sel => document.querySelector(sel);
const fileInput = $('#file-input');

const SIZE_NOTES = {
    '128x160': 'eski S40', '176x208': 'S60 / N-Gage', '176x220': 'Sony Ericsson',
    '240x320': 'en yaygın', '352x416': 'Nokia N80/N90', '360x640': 'dokunmatik',
};

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
        more.setAttribute('aria-label', game.name + ' ayarları');
        more.textContent = '⋯';
        more.onclick = () => openManage(game.id);

        card.append(link, more);
        container.appendChild(card);
    }
}

// ---------- discover ----------

async function renderCatalog() {
    const all = await loadCatalog();
    const games = all.filter(g => !g.external);
    renderRecommendations(all.filter(g => g.external));

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
        meta.textContent = [g.genre, g.vendor, g.year].filter(Boolean).join(' · ');
        const desc = document.createElement('p');
        desc.className = 'desc';
        desc.textContent = g.desc || '';
        info.append(h, meta, desc);
        if (g.source) {
            const lic = document.createElement('p');
            lic.className = 'license';
            lic.append((g.license || 'Açık kaynak') + ' · ');
            const a = document.createElement('a');
            a.href = g.source;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = 'kaynak kodu';
            lic.appendChild(a);
            info.appendChild(lic);
        }

        const play = document.createElement('a');
        play.className = 'btn primary';
        play.href = playUrl(g.id);
        play.textContent = getGame(g.id) ? 'Devam' : 'Oyna';

        item.append(info, play);
        list.appendChild(item);
    }
}

// games we don't host: link to their page, the player adds the jar afterwards
function renderRecommendations(games) {
    $('#recs-block').hidden = games.length === 0;
    const list = $('#recs');
    list.innerHTML = '';

    for (const g of games) {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        item.appendChild(iconEl(g, true));

        const info = document.createElement('div');
        info.className = 'info';
        const h = document.createElement('h3');
        h.textContent = g.name;
        const meta = document.createElement('p');
        meta.textContent = [g.genre, g.vendor, g.year].filter(Boolean).join(' · ');
        const desc = document.createElement('p');
        desc.className = 'desc';
        desc.textContent = g.desc || '';
        info.append(h, meta, desc);

        const open = document.createElement('a');
        open.className = 'btn';
        open.href = g.external;
        open.target = '_blank';
        open.rel = 'noopener';
        open.textContent = 'İndir';

        item.append(info, open);
        list.appendChild(item);
    }
}

function initDiscover() {
    $('#rec-sizes').textContent = recommendedSizes().join(', ');

    if (!/android/i.test(navigator.userAgent)) {
        document.querySelectorAll('.step-android').forEach(el => el.remove());
    }

    $('#search').addEventListener('submit', e => {
        e.preventDefault();
        const q = e.target.q.value.trim();
        if (!q) return;
        // dedomil's own search form redirects to this URL
        window.open('http://dedomil.net/games/search/' + encodeURIComponent(q) + '/page/1', '_blank', 'noopener');
    });
}

// ---------- sheets ----------

function openSheet(id) {
    $(id).hidden = false;
}

function closeSheets() {
    document.querySelectorAll('.sheet-backdrop').forEach(el => { el.hidden = true; });
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

async function addFile(file) {
    if (busy) return;
    closeSheets();

    if (/\.jad$/i.test(file.name)) {
        toast('Bu bir JAD dosyası. Oyunun kendisi olan .jar dosyasını seç.');
        return;
    }

    busy = true;
    pending = null;
    openSheet('#add-sheet');
    $('#add-loading').hidden = false;
    $('#add-form').hidden = true;
    $('#add-error').hidden = true;
    $('#add-loading-text').textContent = emulatorReady
        ? 'Oyun inceleniyor…'
        : 'Emülatör hazırlanıyor… (ilk seferde biraz sürebilir)';

    try {
        const buffer = await file.arrayBuffer();
        const magic = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
        if (magic[0] !== 0x50 || magic[1] !== 0x4b) { // "PK"
            throw new Error('not-a-jar');
        }

        await loadEmulator();
        emulatorReady = true;
        $('#add-loading-text').textContent = 'Oyun inceleniyor…';

        pending = await analyseJar(buffer, file.name);
        showAddForm(pending);
    } catch (e) {
        console.error(e);
        $('#add-loading').hidden = true;
        const box = $('#add-error');
        box.hidden = false;
        box.textContent = e?.message === 'not-a-jar'
            ? 'Bu dosya bir J2ME oyunu (.jar) değil ya da bozuk.'
            : navigator.onLine === false
                ? 'Emülatör yüklenemedi: internet bağlantısı gerekiyor.'
                : 'Oyun okunamadı. Dosya bozuk olabilir ya da bu oyun desteklenmiyor olabilir.';
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

    fillSelect($('#add-size'), SCREEN_SIZES, p.size, SIZE_NOTES);
    $('#add-size-badge').hidden = !p.sizeDetected;
    $('#add-size').onchange = () => { $('#add-size-badge').hidden = $('#add-size').value !== p.size || !p.sizeDetected; };
    fillSelect($('#add-phone'), PHONE_TYPES, p.phone);

    $('#add-exists').hidden = !p.exists;
    const replace = document.querySelector('input[name="mode"][value="replace"]');
    if (replace) replace.checked = true;
}

$('#add-confirm').addEventListener('click', async () => {
    if (!pending || busy) return;
    busy = true;
    const btn = $('#add-confirm');
    btn.disabled = true;
    btn.textContent = 'Ekleniyor…';

    try {
        const size = $('#add-size').value;
        const phone = $('#add-phone').value;
        const mode = pending.exists ? document.querySelector('input[name="mode"]:checked').value : 'new';

        const id = await install(pending, { size, phone, mode });
        const previous = getGame(id);
        saveGame({
            ...(previous || {}),
            id,
            name: pending.name + (id !== pending.appId ? ` (${size})` : ''),
            vendor: pending.vendor || null,
            icon: pending.icon,
            size, phone,
            keypad: previous?.keypad || (TOUCH_SIZES.includes(size) ? 'none' : 'full'),
            fileName: pending.fileName,
            source: 'user',
            addedAt: previous?.addedAt || Date.now(),
        });
        location.href = playUrl(id);
    } catch (e) {
        console.error(e);
        toast('Oyun eklenemedi. Tekrar dener misin?');
        btn.disabled = false;
        btn.textContent = 'Ekle ve oyna';
        busy = false;
    }
});

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
        fillSelect($('#manage-size'), SCREEN_SIZES, size, SIZE_NOTES);
        fillSelect($('#manage-phone'), PHONE_TYPES, settings.phone || game.phone || 'Nokia');
        $('#manage-keypad').value = game.keypad || 'full';
        $('#manage-sound').checked = (settings.sound || 'on') === 'on';
        $('#manage-loading').hidden = true;
        $('#manage-form').hidden = false;
    } catch (e) {
        console.error(e);
        closeSheets();
        toast('Ayarlar okunamadı.');
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
        toast('Kaydedildi.');
    } catch (e) {
        console.error(e);
        toast('Kaydedilemedi.');
    } finally {
        busy = false;
    }
});

$('#manage-wipe').addEventListener('click', async () => {
    if (!managed || busy) return;
    if (!confirm(`${managed.name} için kayıtlı ilerleme silinsin mi?`)) return;
    busy = true;
    try {
        await wipeSaves(managed.id);
        toast('Kayıtlar silindi.');
    } catch {
        toast('Silinemedi.');
    } finally {
        busy = false;
    }
});

$('#manage-remove').addEventListener('click', async () => {
    if (!managed || busy) return;
    if (!confirm(`${managed.name} kütüphaneden kaldırılsın mı? Kayıtları da silinir.`)) return;
    busy = true;
    try {
        await uninstall(managed.id);
        try { localStorage.removeItem('tuslu.bundle.' + managed.id); } catch {}
        removeGame(managed.id);
        closeSheets();
        renderLibrary();
        renderCatalog();
        toast('Oyun kaldırıldı.');
    } catch {
        toast('Kaldırılamadı.');
    } finally {
        busy = false;
    }
});

// ---------- ways a file can arrive ----------

function pickFile() {
    warmUpEmulator();
    fileInput.value = '';
    fileInput.click();
}

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) addFile(file);
});

// "Share → Tuşlu" on Android (installed app): sw.js stashes the file
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
        toast('Paylaşılan dosya alınamadı.');
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
});
document.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-action="add"]')) warmUpEmulator();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

initDiscover();
renderLibrary();
renderCatalog();
showTab(location.hash === '#kesfet' || listGames().length === 0 && !new URLSearchParams(location.search).has('shared') ? 'discover' : 'library');
takeSharedFile();

// coming back from a game (bfcache) should show fresh play order
window.addEventListener('pageshow', e => { if (e.persisted) { renderLibrary(); renderCatalog(); } });
