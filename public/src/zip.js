// Just enough zip reading to pull a game's .jar out of the .zip some sites
// (dedomil, for Symbian-era games) wrap it in.

function findEnd(view) {
    // end of central directory record: last 22..65557 bytes
    for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
        if (view.getUint32(i, true) === 0x06054b50) return i;
    }
    return -1;
}

function listEntries(buffer) {
    const view = new DataView(buffer);
    const end = findEnd(view);
    if (end < 0) return [];

    const count = view.getUint16(end + 10, true);
    let p = view.getUint32(end + 16, true);
    const decoder = new TextDecoder();
    const entries = [];

    for (let i = 0; i < count && p + 46 <= view.byteLength; i++) {
        if (view.getUint32(p, true) !== 0x02014b50) break;
        const method = view.getUint16(p + 10, true);
        const compSize = view.getUint32(p + 20, true);
        const size = view.getUint32(p + 24, true);
        const nameLen = view.getUint16(p + 28, true);
        const extraLen = view.getUint16(p + 30, true);
        const commentLen = view.getUint16(p + 32, true);
        const localOffset = view.getUint32(p + 42, true);
        const name = decoder.decode(new Uint8Array(buffer, p + 46, nameLen));
        entries.push({ name, method, compSize, size, localOffset });
        p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
}

async function extract(buffer, entry) {
    const view = new DataView(buffer);
    const lo = entry.localOffset;
    const start = lo + 30 + view.getUint16(lo + 26, true) + view.getUint16(lo + 28, true);
    const raw = new Uint8Array(buffer, start, entry.compSize);

    if (entry.method === 0) return raw.slice().buffer;
    if (entry.method !== 8) throw new Error('unsupported zip compression');

    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer();
}

/**
 * If `buffer` is a zip wrapping a game (a .jar inside, no manifest of its own),
 * returns { buffer, name } for the biggest .jar in it; otherwise null.
 */
export async function unwrapJar(buffer) {
    const entries = listEntries(buffer);
    if (!entries.length || entries.some(e => e.name.toUpperCase() === 'META-INF/MANIFEST.MF')) {
        return null; // a jar already (or not a zip at all)
    }
    const jars = entries.filter(e => /\.jar$/i.test(e.name) && !e.name.startsWith('__MACOSX'));
    if (!jars.length) return null;
    const jar = jars.sort((a, b) => b.size - a.size)[0];
    return { buffer: await extract(buffer, jar), name: jar.name.split('/').pop() };
}

// ---------- screen size from a jar's artwork ----------

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47];

// typical full-screen widths and the height each implies
const SCREENS = {
    128: ['128x160', '128x128'], 132: ['132x176'], 176: ['176x208', '176x220'],
    208: ['208x208'], 240: ['240x320', '240x400'], 320: ['320x240'],
    352: ['352x416'], 360: ['360x640'],
};

/**
 * Guesses a game's screen size from its images: backgrounds and splash
 * screens are usually exactly as wide as the screen. Returns e.g. '240x320',
 * or null when the artwork doesn't say.
 */
export async function guessScreenFromJar(buffer) {
    // images may be plain .png files or packed inside the game's own data
    // files (Gameloft does this), so look for PNG headers in any resource
    const entries = listEntries(buffer).filter(e => !/\.class$/i.test(e.name) && !e.name.endsWith('/') && e.size > 200);
    entries.sort((a, b) => b.size - a.size);
    const dims = [];
    for (const e of entries.slice(0, 40)) {
        try {
            const bytes = new Uint8Array(await extract(buffer, e));
            const v = new DataView(bytes.buffer, bytes.byteOffset);
            for (let i = 0; i + 24 <= bytes.length && dims.length < 400; i++) {
                if (bytes[i] === 0x89 && PNG_SIG.every((b, k) => bytes[i + k] === b) &&
                    bytes[i + 12] === 0x49 && bytes[i + 13] === 0x48) { // "IH"DR
                    dims.push([v.getUint32(i + 16), v.getUint32(i + 20)]);
                    i += 24;
                }
            }
        } catch {}
    }

    const score = {};
    const heights = new Set(dims.map(d => d[1]));
    for (const [w, h] of dims) {
        if (SCREENS[w] && h >= w * 0.4) score[w] = (score[w] || 0) + w * h;
    }
    const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;

    const [primary, alternative] = SCREENS[best[0]];
    if (alternative) {
        const altH = Number(alternative.split('x')[1]);
        const priH = Number(primary.split('x')[1]);
        if (heights.has(altH) && !heights.has(priH)) return alternative;
    }
    return primary;
}

// ---------- which phone's key codes a game expects ----------

const int32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);

// Lowest cases of the game's key-handling switches: a switch whose cases run
// from negative (soft/navigation) codes up to the digit keys '1'/'2' (49/50).
function keySwitchLows(b, out) {
    const n = b.length;
    for (let i = 4; i + 8 <= n; i++) {
        // tableswitch: default offset, low, high
        const low = int32(b, i);
        if (low >= -70 && low <= -1) {
            const high = int32(b, i + 4);
            const def = int32(b, i - 4);
            if (high >= 49 && high <= 60 && def > 0 && def < 65536) out.add(low);
        }
        // lookupswitch: sorted (key, offset) pairs; find 49 followed by 50
        if (b[i] === 0 && b[i + 1] === 0 && b[i + 2] === 0 && b[i + 3] === 49 &&
            i + 12 <= n && int32(b, i + 8) === 50) {
            let prev = 49;
            for (let j = i - 8; j >= 0; j -= 8) {
                const k = int32(b, j);
                if (k >= prev || k < -300) break;
                if (k < 0) out.add(k);
                prev = k;
            }
        }
    }
}

/**
 * 'Motorola' or 'Siemens' when the game's key tables use that vendor's soft-key
 * codes (and not Nokia's -6/-7); null otherwise (Nokia/Sony Ericsson layout).
 */
export async function guessPhoneFromJar(buffer) {
    const keys = new Set();
    for (const e of listEntries(buffer)) {
        if (!/\.class$/i.test(e.name)) continue;
        try {
            keySwitchLows(new Uint8Array(await extract(buffer, e)), keys);
        } catch {}
    }
    const nokia = keys.has(-6) || keys.has(-7);
    if (!nokia && (keys.has(-21) || keys.has(-22))) return 'Motorola';
    if (!nokia && [-59, -60, -61, -62].some(k => keys.has(k))) return 'Siemens';
    return null;
}
