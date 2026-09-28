// The game directory on the Discover tab: every J2ME game listed on dedomil.net
// (built by tools/crawl_dedomil.py). We only show names/thumbnails and send the
// player to dedomil's download page; the jar comes back through the add flow.

import { t, num, locale } from "./i18n.js";

const PAGE = 48;

// resolutions that look and play best here, most preferred first
const PREFERRED = ['240x320', '352x416', '240x400', '360x640', '176x220', '176x208',
    '320x240', '208x208', '240x432', '128x160', '128x128'];

const $ = sel => document.querySelector(sel);

// { vendors, sources, games: [[id, name, vendor, dl, added, brands, res, thumb, sources, (search key)]] }
// id > 0: a dedomil game; id < 0: only on archive.org. thumb: 1 = ours, or a URL
let data = null;
let loading = null;
let results = [];
let shown = 0;
let brand = '';
let playableOnly = false;
let onPlay = () => {};
let onPick = () => {};

// "Çılgın Kuşlar" and "cilgin kuslar" should match
export function fold(s) {
    return s.toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function parseRes(str) {
    return str.split(' ').filter(Boolean).map(pair => {
        const [res, sid] = pair.split(':');
        return { res, sid: Number(sid) };
    });
}

export function bestRes(list) {
    const rank = r => {
        const i = PREFERRED.indexOf(r.res);
        return i === -1 ? PREFERRED.length : i;
    };
    return [...list].sort((a, b) => rank(a) - rank(b));
}

export function dedomilUrl(id, sid) {
    return sid ? `http://dedomil.net/games/${id}/screen/${sid}` : `http://dedomil.net/games/${id}/screens`;
}

function thumbUrl(g) {
    if (typeof g[7] === 'string') return g[7];
    return g[7] ? `dd/t/${g[0]}.webp` : null;
}

const SEARCH = 9;

function sourcesOf(g) {
    return (g[8] || []).map(i => data.sources[i]).filter(Boolean);
}

// archive.org serves files inside a zip with CORS headers
export function archiveUrl([item, zip, path]) {  // (a 4th element, the screen size, is ignored here)
    return `https://archive.org/download/${item}/${encodeURIComponent(zip)}/${encodeURIComponent(path)}`;
}

async function load() {
    if (!loading) {
        loading = fetch('dd/games.json')
            .then(r => (r.ok ? r.json() : null))
            .then(doc => {
                if (!doc) return null;
                for (const g of doc.games) {
                    if (!g[8]) g[8] = [];
                    g[SEARCH] = fold(g[1] + ' ' + (doc.vendors[g[2]] || ''));
                }
                doc.sources = doc.sources || [];
                data = doc;
                return doc;
            })
            .catch(() => null);
    }
    return loading;
}

function applyFilters() {
    const q = fold($('#dir-q').value);
    const sort = $('#dir-sort').value;
    const words = q ? q.split(' ') : [];

    results = data.games.filter(g =>
        (!brand || (g[5] & (1 << Number(brand)))) &&
        (!playableOnly || g[8].length > 0) &&
        words.every(w => g[SEARCH].includes(w)));

    if (sort === 'pop') {
        // our picks first, in the order listed
        const featured = data.featured || [];
        const rank = g => { const i = featured.indexOf(g[0]); return i === -1 ? featured.length : i; };
        results.sort((a, b) => rank(a) - rank(b));
    } else if (sort === 'new') results.sort((a, b) => (b[4] > a[4] ? 1 : b[4] < a[4] ? -1 : 0));
    else if (sort === 'az') results.sort((a, b) => a[1].localeCompare(b[1], locale()));
    // otherwise "pop" is the file's own order (most downloaded first)

    shown = 0;
    $('#dir-grid').innerHTML = '';
    $('#dir-count').textContent = t('dir.count', { count: num(results.length) });
    $('#dir-empty').hidden = results.length > 0;
    renderMore();
}

function card(g) {
    const el = document.createElement('button');
    el.className = 'dir-card';
    el.dataset.id = g[0];

    const src = thumbUrl(g);
    if (src) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = '';
        img.src = src;
        el.appendChild(img);
    } else {
        const ph = document.createElement('div');
        ph.className = 'ph';
        ph.textContent = g[1].charAt(0).toUpperCase();
        el.appendChild(ph);
    }

    if (data.featured?.includes(g[0])) {
        el.classList.add('featured');
        const star = document.createElement('span');
        star.className = 'star';
        star.textContent = '★';
        star.title = t('dir.featured');
        el.appendChild(star);
    }

    if (g[8].length) {
        const play = document.createElement('span');
        play.className = 'playable-badge';
        play.textContent = '▶';
        play.title = t('dir.playableTitle');
        el.appendChild(play);
    }

    const name = document.createElement('span');
    name.className = 'n';
    name.textContent = g[1];
    const vendor = document.createElement('span');
    vendor.className = 'v';
    vendor.textContent = data.vendors[g[2]] || '';
    el.append(name, vendor);
    return el;
}

function renderMore() {
    const grid = $('#dir-grid');
    const next = results.slice(shown, shown + PAGE);
    const frag = document.createDocumentFragment();
    for (const g of next) frag.appendChild(card(g));
    grid.appendChild(frag);
    shown += next.length;
    $('#dir-more').hidden = shown >= results.length;
}

// ---------- game sheet ----------

let current = null;

function openGame(id) {
    const g = data.games.find(x => x[0] === id);
    if (!g) return;
    const options = bestRes(parseRes(g[6]));
    current = { id: g[0], name: g[1], vendor: data.vendors[g[2]] || '', thumb: thumbUrl(g), options, sources: sourcesOf(g) };

    $('#dir-thumb').src = current.thumb || 'icons/icon-192.png';
    $('#dir-title').textContent = current.name;
    $('#dir-meta').textContent = [current.vendor, g[3] ? t('dir.downloads', { count: num(g[3]) }) : ''].filter(Boolean).join(' · ');

    // one tap from archive.org when we can; dedomil (if listed there) as the fallback
    const onDedomil = current.id > 0 && options.length > 0;
    $('#dir-play-block').hidden = current.sources.length === 0;
    $('#dir-or').hidden = !onDedomil;

    const sel = $('#dir-res');
    sel.innerHTML = '';
    options.forEach((o, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = i === 0 ? t('dir.recommendedOpt', { res: o.res }) : o.res;
        sel.appendChild(opt);
    });
    sel.onchange = () => { $('#dir-rec-badge').hidden = sel.value !== '0'; };
    $('#dir-rec-badge').hidden = false;

    $('#dir-step1').hidden = !onDedomil;
    $('#dir-step2').hidden = true;
    $('#dir-sheet').hidden = false;
}

function chosen() {
    return current.options[Number($('#dir-res').value)] || current.options[0];
}

function goToDedomil() {
    const opt = chosen();
    window.open(dedomilUrl(current.id, opt?.sid), '_blank', 'noopener');
    const pending = { id: current.id, name: current.name, thumb: current.thumb, size: opt?.res, at: Date.now() };
    try { sessionStorage.setItem('hellojar.pending', JSON.stringify(pending)); } catch {}
    $('#dir-step1').hidden = true;
    $('#dir-step2').hidden = false;
}

// the game the player went to download, if they left recently
export function pendingDownload() {
    try {
        const p = JSON.parse(sessionStorage.getItem('hellojar.pending') || 'null');
        return p && Date.now() - p.at < 60 * 60 * 1000 ? p : null;
    } catch {
        return null;
    }
}

export function clearPending() {
    try { sessionStorage.removeItem('hellojar.pending'); } catch {}
}

// ---------- boot ----------

export async function initDirectory(opts) {
    onPick = opts.onPick;
    onPlay = opts.onPlay;

    const doc = await load();
    if (!doc) {
        $('#dir-count').textContent = t('dir.loadError');
        return;
    }
    const subtitle = () => { $('#dir-sub').textContent = t('dir.subCount', { count: num(doc.games.length) }); };
    subtitle();
    window.addEventListener('langchange', () => {
        subtitle();
        applyFilters();
    });

    let typing;
    $('#dir-q').addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(applyFilters, 150); });
    $('#dir-sort').addEventListener('change', applyFilters);
    $('#dir-brands').addEventListener('click', e => {
        const chip = e.target.closest('[data-brand]');
        if (!chip) return;
        brand = chip.dataset.brand;
        for (const c of document.querySelectorAll('#dir-brands .chip')) {
            c.setAttribute('aria-pressed', String(c === chip));
        }
        applyFilters();
    });
    $('#dir-grid').addEventListener('click', e => {
        const c = e.target.closest('.dir-card');
        if (c) openGame(Number(c.dataset.id));
    });

    new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting) && shown < results.length) renderMore();
    }, { rootMargin: '600px' }).observe($('#dir-more'));

    $('#dir-go').addEventListener('click', goToDedomil);
    $('#dir-play').addEventListener('click', () => {
        if (!current?.sources.length) return;
        onPlay({ id: current.id, name: current.name, thumb: current.thumb, vendor: current.vendor },
            current.sources.map(src => ({ url: archiveUrl(src), screen: src[3] || null })));
    });
    $('#dir-playable').addEventListener('click', e => {
        playableOnly = !playableOnly;
        e.currentTarget.setAttribute('aria-pressed', String(playableOnly));
        applyFilters();
    });
    $('#dir-again').addEventListener('click', () => {
        const opt = chosen();
        window.open(dedomilUrl(current.id, opt?.sid), '_blank', 'noopener');
    });
    $('#dir-pick').addEventListener('click', () => onPick(pendingDownload()));

    applyFilters();
}
