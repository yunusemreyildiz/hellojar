// Thin wrapper around the freej2me-web Java side (running in CheerpJ) for the
// library page: analysing jars, installing, changing settings, uninstalling.
// cheerpjInit may only run once per page, so everything goes through loadEmulator().

import { guessFromFileName } from "./detect.js";

export const cheerpjWebRoot = '/app' + location.pathname.replace(/\/[^/]*$/, '');

// sizes where the game almost certainly expects a touch screen
export const TOUCH_SIZES = ['360x640', '640x360', '480x800', '800x480', '240x400'];

let libPromise = null;

// the player boots CheerpJ itself (with its own natives); let it share that instance
export function useEmulator(lib) {
    libPromise = Promise.resolve(lib);
}

export function loadEmulator(natives = {}) {
    if (!libPromise) {
        libPromise = (async () => {
            await cheerpjInit({ enableDebug: false, natives });
            const lib = await cheerpjRunLibrary(cheerpjWebRoot + "/freej2me-web.jar");
            const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;
            await launcherUtil.resetTmpDir();
            return lib;
        })();
        libPromise.catch(() => { libPromise = null; });
    }
    return libPromise;
}

async function launcher() {
    const lib = await loadEmulator();
    return lib.pl.zb3.freej2me.launcher.LauncherUtil;
}

async function toJavaMap(lib, obj) {
    const HashMap = await lib.java.util.HashMap;
    const map = await new HashMap();
    for (const [k, v] of Object.entries(obj)) {
        await map.put(k, String(v));
    }
    return map;
}

export function bytesToDataUrl(bytes, type = 'image/png') {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(new Blob([bytes], { type }));
    });
}

export async function isInstalled(appId) {
    await loadEmulator();
    return !!(await cjFileBlob("/files/" + appId + "/app.jar"));
}

let tmpCounter = 0;

/**
 * Reads a jar and figures out what it is. Nothing is installed yet; pass the
 * result to install().
 */
export async function analyseJar(buffer, fileName) {
    const lib = await loadEmulator();
    const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;
    const File = await lib.java.io.File;
    const MIDletLoader = await lib.org.recompile.mobile.MIDletLoader;
    const AnalyserUtil = await lib.pl.zb3.freej2me.launcher.AnalyserUtil;

    const jarFile = await new File("/files/_tmp/" + Date.now() + "_" + (tmpCounter++) + ".jar");
    await launcherUtil.copyJar(new Int8Array(buffer), jarFile);

    const analysis = await AnalyserUtil.analyseFile(jarFile, fileName);
    const loader = await MIDletLoader.getMIDletLoader(jarFile);

    if (!(await loader.getAppId())) {
        // no MIDlet-Name in the manifest: fall back to the file name
        await launcherUtil.ensureAppId(loader, fileName);
    }

    const appId = await loader.getAppId();
    const name = (await loader.name) || appId;

    let vendor = null;
    try {
        const props = await loader.properties;
        vendor = props ? await props.get("MIDlet-Vendor") : null;
    } catch {}

    const iconBytes = await loader.getIconBytes();
    const icon = iconBytes ? await bytesToDataUrl(iconBytes) : null;

    const guess = guessFromFileName(fileName);
    const aw = await analysis.screenWidth, ah = await analysis.screenHeight;
    const size = guess.size || (aw > 0 ? `${aw}x${ah}` : null);
    const phone = guess.phone || (await analysis.phoneType) || 'Nokia';

    return {
        loader, jarFile, fileName,
        appId, name, vendor, icon,
        size: size || '240x320',
        sizeDetected: !!size,
        phone,
        phoneFromName: !!guess.phone,
        exists: await isInstalled(appId),
    };
}

export function defaultSettings({ size, phone }) {
    const [width, height] = size.split('x');
    return {
        width, height,
        phone,
        sound: 'on',
        rotate: 'off',
        fps: '0',
        fontSize: '0',
        dgFormat: '4444',
        forceFullscreen: 'off',
        queuedPaint: 'off',
        textureDisableFilter: 'off',
    };
}

/**
 * Installs an analysed jar. mode: 'new' (fresh id if taken), or 'replace'
 * (swap the jar of the existing install, keeping its save data).
 * Returns the app id it was installed under.
 */
export async function install(pending, { size, phone, mode = 'new' }) {
    const lib = await loadEmulator();
    const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;
    const File = await lib.java.io.File;

    let appId = pending.appId;
    if (pending.exists) {
        if (mode === 'replace') {
            // initApp won't overwrite an existing app.jar
            await (await new File("/files/" + appId + "/app.jar")).delete();
        } else {
            let n = 2;
            while (await cjFileBlob("/files/" + appId + "_" + n + "/app.jar")) n++;
            appId = appId + "_" + n;
            await pending.loader.setAppId(appId);
        }
    }

    const settings = await toJavaMap(lib, defaultSettings({ size, phone }));
    await launcherUtil.initApp(pending.jarFile, pending.loader, settings, null, null);
    await launcherUtil.resetTmpDir();
    return appId;
}

export async function saveSettings(appId, settings) {
    const lib = await loadEmulator();
    const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;
    await launcherUtil.saveApp(appId, await toJavaMap(lib, settings), null, null);
}

export async function readSettings(appId) {
    await loadEmulator();
    const blob = await cjFileBlob("/files/" + appId + "/config/settings.conf");
    const kv = {};
    if (blob) {
        for (const line of (await blob.text()).split("\n")) {
            const i = line.indexOf(':');
            if (i > 0) kv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
    }
    return kv;
}

export async function uninstall(appId) {
    await (await launcher()).uninstallApp(appId);
}

export async function wipeSaves(appId) {
    await (await launcher()).wipeAppData(appId);
}

// catalog games ship as apps/<id>.zip (see tools/build_catalog.py)
export async function installBundle(appId) {
    await (await launcher()).installFromBundle(cheerpjWebRoot + "/apps/", appId);
}

// ---------- backups ----------
// A backup is a zip of the emulator's whole file system (games, settings and
// the games' own save data under <id>/rms/), plus our library list.

const BACKUP_META = '_hellojar';

export async function exportBackup(libraryJson) {
    const lib = await loadEmulator();
    const launcherUtil = await lib.pl.zb3.freej2me.launcher.LauncherUtil;
    // saveApp creates the folder; the library list rides along as its meta.json
    await launcherUtil.saveApp(BACKUP_META, null, null, null);
    await launcherUtil.writeMetaJsonFile(BACKUP_META, libraryJson);
    const bytes = await launcherUtil.exportData();
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength).slice();
}

// Merges a backup into this device (games not in the backup are kept) and
// returns the library list stored in it, if any.
export async function importBackup(buffer) {
    const lib = await loadEmulator();
    const FilesUtil = await lib.pl.zb3.freej2me.launcher.FilesUtil;
    await FilesUtil.unzipToCurrentDirectory(new Int8Array(buffer));
    const meta = await cjFileBlob('/files/' + BACKUP_META + '/meta.json');
    try {
        return meta ? JSON.parse(await meta.text()) : null;
    } catch {
        return null;
    }
}

// Ask the browser not to clear our storage on its own (quota pressure, Safari's
// 7-day rule for sites not on the home screen). Returns whether it's persistent.
export async function requestPersistence() {
    try {
        if (!navigator.storage?.persist) return false;
        return (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch {
        return false;
    }
}
