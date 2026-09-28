// The game library as the UI sees it: names, icons, sizes, play times.
// The games themselves (jar, config, saves) live in CheerpJ's IndexedDB file
// system under /files/<appId>/; this is just an index so the library page can
// render without booting Java.

const KEY = 'tuslu.library';

function read() {
    try {
        const list = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function listGames() {
    return read().sort((a, b) => (b.playedAt || b.addedAt || 0) - (a.playedAt || a.addedAt || 0));
}

export function getGame(id) {
    return read().find(g => g.id === id) || null;
}

export function saveGame(game) {
    const list = read().filter(g => g.id !== game.id);
    list.push(game);
    write(list);
}

export function updateGame(id, patch) {
    const game = getGame(id);
    if (game) saveGame({ ...game, ...patch });
}

export function removeGame(id) {
    write(read().filter(g => g.id !== id));
}

// Built-in games: apps/catalog.json, plus apps/catalog.local.json for games
// that are only on this machine (not committed, see tools/build_catalog.py).
export async function loadCatalog() {
    const games = [];
    for (const file of ['apps/catalog.json', 'apps/catalog.local.json']) {
        try {
            const res = await fetch(file, { cache: 'no-cache' });
            if (res.ok) games.push(...((await res.json()).games || []));
        } catch {}
    }
    return games;
}
