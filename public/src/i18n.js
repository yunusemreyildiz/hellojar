// Turkish / English UI strings.
//
// Static markup is translated through attributes:
//   data-i18n="key"            -> textContent
//   data-i18n-html="key"       -> innerHTML (only for our own strings with <b>)
//   data-i18n-attr="placeholder:key; aria-label:key"
// Dynamic text calls t('key', { vars }). Changing the language fires a
// 'langchange' event on window so pages can re-render what they built in JS.

const STRINGS = {
    tr: {
        'meta.description': 'Eski tuşlu telefon (J2ME) oyunlarını tarayıcında oyna.',
        'brand.tagline': 'Eski cep oyunları, tarayıcında',
        'lang.label': 'Dil',

        'tab.library': 'Kütüphanem',
        'tab.discover': 'Keşfet',

        'lib.add': 'Oyun ekle',
        'lib.addSub': '.jar dosyası seç',
        'lib.emptyTitle': 'Kütüphanen boş',
        'lib.emptyText': 'Telefonuna indirdiğin bir <b>.jar</b> oyununu ekle ya da Keşfet\'ten hazır bir oyunla başla.',
        'lib.pickJar': 'Jar dosyası seç',
        'lib.findGame': 'Oyun bul',
        'lib.settingsFor': '{name} ayarları',
        'lib.dropHint': 'Jar dosyasını bırak',

        'cat.title': 'Hemen oyna',
        'cat.sub': 'Yazarlarının ücretsiz dağıttığı oyunlar. İndirmeye gerek yok, dokun ve oyna.',
        'cat.openSource': 'Açık kaynak',
        'cat.sourceCode': 'kaynak kodu',
        'cat.play': 'Oyna',
        'cat.continue': 'Devam',

        'dir.title': 'Oyun kataloğu',
        'dir.sub': 'Binlerce eski cep oyunu. Seç, dedomil\'den indir, burada oyna.',
        'dir.subCount': '{count} eski cep oyunu. Seç, dedomil\'den indir, burada oyna.',
        'dir.search': 'Oyun ara, ör. Asphalt',
        'dir.searchLabel': 'Oyun ara',
        'dir.sort': 'Sırala',
        'dir.sortPop': 'Popüler',
        'dir.sortNew': 'Yeni',
        'dir.sortAz': 'A-Z',
        'dir.brand': 'Marka',
        'dir.all': 'Tümü',
        'dir.count': '{count} oyun',
        'dir.empty': 'Sonuç yok. Başka bir isimle dene.',
        'dir.loadError': 'Katalog şu an yüklenemedi.',
        'dir.featured': 'Öne çıkan',
        'dir.downloads': '{count} indirme',
        'dir.playNow': '▶ Hemen oyna',
        'dir.playHint': 'Oyun archive.org\'dan doğrudan tarayıcına yüklenir. İndirme, reklam, dosya seçme yok.',
        'dir.otherVersion': 'Başka bir sürüm mü lazım? Dedomil\'den indir:',
        'dir.playable': '▶ Hemen oynanabilir',
        'dir.playableTitle': 'Tek dokunuşla oynanır',
        'add.fetching': 'archive.org\'dan yükleniyor… {pct}',
        'add.fetchFailed': 'Oyun archive.org\'dan yüklenemedi. Biraz sonra tekrar dene ya da dedomil\'den indir.',
        'add.installing': 'Oyun kuruluyor…',
        'dir.version': 'Sürüm (ekran boyutu)',
        'dir.recommended': 'önerilen',
        'dir.recommendedOpt': '{res} (önerilen)',
        'dir.go': 'Dedomil\'den indir',
        'dir.goHint': 'Dedomil yeni sekmede açılır. Oradaki <b>JAR</b> (ya da <b>download</b>) linkine dokun, JAD değil. İndirme bitince buraya dön.',
        'dir.adNote': 'Dedomil\'de ilk birkaç dokunuş reklam açabilir. Reklam sekmesini kapatıp dedomil\'e geri dön ve linke tekrar dokun; birkaç denemeden sonra indirme başlar.',
        'dir.step1': 'Açılan dedomil sayfasında <b>JAR</b> ya da <b>download</b> linkine dokun. Reklam açılırsa kapatıp geri dön ve tekrar dokun.',
        'dir.step2': 'İndirme bitince buraya dön ve dosyayı seç.',
        'dir.pick': 'İndirdiğim dosyayı seç',
        'dir.again': 'Sayfayı tekrar aç',
        'dir.later': 'Sonra',
        'dir.fineprint': 'Katalog <a href="http://dedomil.net/games" target="_blank" rel="noopener">dedomil.net</a> ve <a href="https://archive.org" target="_blank" rel="noopener">Internet Archive</a>\'ın herkese açık listelerinden derlenir. ▶ işaretli oyunlar doğrudan archive.org\'dan tarayıcına yüklenir; diğerleri dedomil\'in kendi sayfasından indirilir. hellojar oyun dosyası barındırmaz ve bu sitelerle bağlantılı değildir. Oyunlar cihazında kalır.',

        'add.analysing': 'Oyun inceleniyor…',
        'add.preparing': 'Emülatör hazırlanıyor… (ilk seferde biraz sürebilir)',
        'add.size': 'Ekran boyutu',
        'add.detected': 'algılandı',
        'add.phone': 'Tuş düzeni (telefon tipi)',
        'add.exists': 'Bu oyun zaten kütüphanende',
        'add.replace': 'Mevcut oyunu bununla değiştir',
        'add.replaceNote': '(kayıtlar korunur)',
        'add.separate': 'Ayrı bir oyun olarak ekle',
        'add.cancel': 'Vazgeç',
        'add.confirm': 'Ekle ve oyna',
        'add.adding': 'Ekleniyor…',
        'add.isJad': 'Bu bir JAD dosyası. Oyunun kendisi olan .jar (ya da .zip) dosyasını seç.',
        'add.notJar': 'Bu dosyada bir J2ME oyunu (.jar) bulunamadı ya da dosya bozuk. Symbian (.sis) oyunları çalışmaz.',
        'add.offline': 'Emülatör yüklenemedi: internet bağlantısı gerekiyor.',
        'add.unreadable': 'Oyun okunamadı. Dosya bozuk olabilir ya da bu oyun desteklenmiyor olabilir.',
        'add.failed': 'Oyun eklenemedi. Tekrar dener misin?',
        'add.sharedFailed': 'Paylaşılan dosya alınamadı.',

        'size.128x160': 'eski S40',
        'size.176x208': 'S60 / N-Gage',
        'size.176x220': 'Sony Ericsson',
        'size.240x320': 'en yaygın',
        'size.352x416': 'Nokia N80/N90',
        'size.360x640': 'dokunmatik',

        'manage.loading': 'Ayarlar okunuyor…',
        'manage.keypad': 'Ekrandaki tuşlar',
        'manage.kpFull': 'Tam tuş takımı',
        'manage.kpNav': 'Sadece yön ve seçim tuşları',
        'manage.kpNone': 'Gizli (dokunmatik oyunlar)',
        'manage.sound': 'Ses',
        'manage.help': 'Oyun açılmıyor ya da ekran kesik görünüyorsa önce ekran boyutunu, sonra tuş düzenini değiştir.',
        'manage.save': 'Kaydet',
        'manage.wipe': 'Kayıtları sil',
        'manage.remove': 'Oyunu kaldır',
        'manage.readFailed': 'Ayarlar okunamadı.',
        'manage.saved': 'Kaydedildi.',
        'manage.saveFailed': 'Kaydedilemedi.',
        'manage.wipeConfirm': '{name} için kayıtlı ilerleme silinsin mi?',
        'manage.wiped': 'Kayıtlar silindi.',
        'manage.wipeFailed': 'Silinemedi.',
        'manage.removeConfirm': '{name} kütüphaneden kaldırılsın mı? Kayıtları da silinir.',
        'manage.removed': 'Oyun kaldırıldı.',
        'manage.removeFailed': 'Kaldırılamadı.',

        'saves.title': 'Kayıtların',
        'saves.text': 'Oyun ilerlemen bu cihazın tarayıcısında saklanır. Gizli sekmede ya da tarayıcı verisini silersen kaybolur. Yedeğini alıp Dosyalar\'da veya iCloud\'da tutabilir, başka bir telefona geri yükleyebilirsin.',
        'saves.export': 'Yedek indir',
        'saves.import': 'Yedeği geri yükle',
        'saves.exporting': 'Yedek hazırlanıyor…',
        'saves.exported': 'Yedek indirildi. Dosyalar\'da ya da iCloud\'da saklayabilirsin.',
        'saves.imported': 'Yedek geri yüklendi: {count} oyun.',
        'saves.importFailed': 'Bu dosya bir hellojar yedeği değil ya da bozuk.',
        'saves.persistent': '✓ Tarayıcı bu siteyi kalıcı depolamada tutuyor.',
        'saves.notPersistent': 'Tarayıcı verileri gerektiğinde silebilir. Siteyi ana ekrana eklersen daha güvende olur.',
        'saves.importConfirm': 'Yedekteki oyunlar ve kayıtları bu cihaza yüklensin mi? Yedekte olan oyunların buradaki kayıtlarının üzerine yazılır.',
        'pending.text': '<b>{name}</b> indirildi mi?',
        'pending.pick': 'Dosyayı seç',
        'common.close': 'Kapat',

        // player
        'play.keypad': 'Tuş takımı',
        'play.softLeft': 'Sol seçim tuşu',
        'play.softRight': 'Sağ seçim tuşu',
        'play.menu': 'Menü',
        'play.up': 'Yukarı',
        'play.down': 'Aşağı',
        'play.left': 'Sol',
        'play.right': 'Sağ',
        'play.ok': 'Tamam',
        'play.preparing': 'Hazırlanıyor…',
        'play.softTip': 'Ekranın alt köşelerindeki YES / NO, Menü / Geri gibi yazılar bu iki üst tuşla seçilir.',
        'play.screenSize': 'Ekran boyutu:',
        'play.firstLoad': 'İlk açılış 20–40 sn sürebilir, sonrakiler daha hızlıdır.',
        'play.backToLibrary': 'Kütüphaneye dön',
        'play.fullscreen': 'Tam ekran',
        'play.exitFullscreen': 'Tam ekrandan çık',
        'play.haptics': 'Titreşim:',
        'play.on': 'Açık',
        'play.off': 'Kapalı',
        'play.keys': 'Tuşlar:',
        'play.kpFull': 'Tam',
        'play.kpNav': 'Sadece yön',
        'play.kpNone': 'Gizli (dokunmatik)',
        'play.emu': 'Emülatör ayarları',
        'play.restart': 'Oyunu yeniden başlat',
        'play.resume': 'Oyuna dön',
        'play.language': 'Dil:',
        'play.loadingAudio': 'Ses motoru yükleniyor…',
        'play.loadingJava': 'Java sanal makinesi yükleniyor…',
        'play.loadingEmu': 'Emülatör yükleniyor…',
        'play.preparingGame': 'Oyun hazırlanıyor…',
        'play.opening': 'Oyun açılıyor…',
        'play.starting': 'Oyun başlatılıyor…',
        'play.notInstalled': 'Bu oyun bu cihazda kurulu değil. Kütüphaneden yeniden ekleyin.',
        'play.crashed': 'Oyun çöktü. Menüden ekran boyutunu ya da telefon tipini değiştirip tekrar deneyin.',
        'play.offline': 'İnternet bağlantısı gerekli (Java motoru çevrim içi yükleniyor).',
        'play.loadFailed': 'Yüklenemedi: {error}',
    },

    en: {
        'meta.description': 'Play old keypad phone (J2ME) games in your browser.',
        'brand.tagline': 'Old phone games, in your browser',
        'lang.label': 'Language',

        'tab.library': 'My library',
        'tab.discover': 'Discover',

        'lib.add': 'Add game',
        'lib.addSub': 'choose a .jar file',
        'lib.emptyTitle': 'Your library is empty',
        'lib.emptyText': 'Add a <b>.jar</b> game you downloaded to your phone, or start with a ready-made one from Discover.',
        'lib.pickJar': 'Choose a jar file',
        'lib.findGame': 'Find a game',
        'lib.settingsFor': '{name} settings',
        'lib.dropHint': 'Drop the jar file',

        'cat.title': 'Play now',
        'cat.sub': 'Games their authors give away for free. No download needed, just tap and play.',
        'cat.openSource': 'Open source',
        'cat.sourceCode': 'source code',
        'cat.play': 'Play',
        'cat.continue': 'Continue',

        'dir.title': 'Game catalog',
        'dir.sub': 'Thousands of old phone games. Pick one, download it from dedomil, play it here.',
        'dir.subCount': '{count} old phone games. Pick one, download it from dedomil, play it here.',
        'dir.search': 'Search games, e.g. Asphalt',
        'dir.searchLabel': 'Search games',
        'dir.sort': 'Sort',
        'dir.sortPop': 'Popular',
        'dir.sortNew': 'Newest',
        'dir.sortAz': 'A-Z',
        'dir.brand': 'Brand',
        'dir.all': 'All',
        'dir.count': '{count} games',
        'dir.empty': 'No results. Try another name.',
        'dir.loadError': 'The catalog couldn\'t be loaded right now.',
        'dir.featured': 'Featured',
        'dir.downloads': '{count} downloads',
        'dir.playNow': '▶ Play now',
        'dir.playHint': 'The game loads straight from archive.org into your browser. No download, no ads, no file picking.',
        'dir.otherVersion': 'Need a different version? Download it from dedomil:',
        'dir.playable': '▶ Play instantly',
        'dir.playableTitle': 'Plays in one tap',
        'add.fetching': 'Loading from archive.org… {pct}',
        'add.fetchFailed': 'The game couldn\'t be loaded from archive.org. Try again in a bit, or download it from dedomil.',
        'add.installing': 'Installing the game…',
        'dir.version': 'Version (screen size)',
        'dir.recommended': 'recommended',
        'dir.recommendedOpt': '{res} (recommended)',
        'dir.go': 'Download from dedomil',
        'dir.goHint': 'Dedomil opens in a new tab. Tap the <b>JAR</b> (or <b>download</b>) link there, not JAD. Come back here when the download finishes.',
        'dir.adNote': 'The first few taps on dedomil may open ads. Close the ad tab, go back to dedomil and tap the link again; the download starts after a few tries.',
        'dir.step1': 'On the dedomil page, tap the <b>JAR</b> or <b>download</b> link. If an ad opens, close it, go back and tap again.',
        'dir.step2': 'When the download finishes, come back here and choose the file.',
        'dir.pick': 'Choose the downloaded file',
        'dir.again': 'Open the page again',
        'dir.later': 'Later',
        'dir.fineprint': 'The catalog is compiled from the public listings of <a href="http://dedomil.net/games" target="_blank" rel="noopener">dedomil.net</a> and the <a href="https://archive.org" target="_blank" rel="noopener">Internet Archive</a>. Games marked ▶ load straight from archive.org into your browser; the rest are downloaded from dedomil\'s own page. hellojar hosts no game files and isn\'t affiliated with either site. Games stay on your device.',

        'add.analysing': 'Checking the game…',
        'add.preparing': 'Starting the emulator… (the first time takes a moment)',
        'add.size': 'Screen size',
        'add.detected': 'detected',
        'add.phone': 'Key layout (phone type)',
        'add.exists': 'This game is already in your library',
        'add.replace': 'Replace the existing game with this one',
        'add.replaceNote': '(saves are kept)',
        'add.separate': 'Add it as a separate game',
        'add.cancel': 'Cancel',
        'add.confirm': 'Add and play',
        'add.adding': 'Adding…',
        'add.isJad': 'That\'s a JAD file. Choose the game itself: the .jar (or .zip) file.',
        'add.notJar': 'No J2ME game (.jar) was found in this file, or the file is damaged. Symbian (.sis) games don\'t work.',
        'add.offline': 'The emulator couldn\'t load: an internet connection is needed.',
        'add.unreadable': 'The game couldn\'t be read. The file may be damaged, or this game may not be supported.',
        'add.failed': 'The game couldn\'t be added. Try again?',
        'add.sharedFailed': 'The shared file couldn\'t be received.',

        'size.128x160': 'old S40',
        'size.176x208': 'S60 / N-Gage',
        'size.176x220': 'Sony Ericsson',
        'size.240x320': 'most common',
        'size.352x416': 'Nokia N80/N90',
        'size.360x640': 'touch',

        'manage.loading': 'Reading settings…',
        'manage.keypad': 'On-screen keys',
        'manage.kpFull': 'Full keypad',
        'manage.kpNav': 'Arrows and soft keys only',
        'manage.kpNone': 'Hidden (touch games)',
        'manage.sound': 'Sound',
        'manage.help': 'If the game won\'t start or the screen looks cut off, change the screen size first, then the key layout.',
        'manage.save': 'Save',
        'manage.wipe': 'Delete saves',
        'manage.remove': 'Remove game',
        'manage.readFailed': 'Couldn\'t read the settings.',
        'manage.saved': 'Saved.',
        'manage.saveFailed': 'Couldn\'t save.',
        'manage.wipeConfirm': 'Delete the saved progress for {name}?',
        'manage.wiped': 'Saves deleted.',
        'manage.wipeFailed': 'Couldn\'t delete.',
        'manage.removeConfirm': 'Remove {name} from your library? Its saves will be deleted too.',
        'manage.removed': 'Game removed.',
        'manage.removeFailed': 'Couldn\'t remove.',

        'saves.title': 'Your saves',
        'saves.text': 'Your progress is stored in this device\'s browser. It\'s lost in a private tab or if you clear browsing data. Download a backup to keep in Files or iCloud, and restore it on any phone.',
        'saves.export': 'Download backup',
        'saves.import': 'Restore a backup',
        'saves.exporting': 'Preparing the backup…',
        'saves.exported': 'Backup downloaded. Keep it in Files or iCloud.',
        'saves.imported': 'Backup restored: {count} games.',
        'saves.importFailed': 'This file isn\'t a hellojar backup, or it\'s damaged.',
        'saves.persistent': '✓ The browser keeps this site in persistent storage.',
        'saves.notPersistent': 'The browser may clear this data when it needs space. Adding the site to your home screen keeps it safer.',
        'saves.importConfirm': 'Load the games and saves from this backup onto this device? Saves of games in the backup will be overwritten.',
        'pending.text': 'Did <b>{name}</b> finish downloading?',
        'pending.pick': 'Choose file',
        'common.close': 'Close',

        // player
        'play.keypad': 'Keypad',
        'play.softLeft': 'Left soft key',
        'play.softRight': 'Right soft key',
        'play.menu': 'Menu',
        'play.up': 'Up',
        'play.down': 'Down',
        'play.left': 'Left',
        'play.right': 'Right',
        'play.ok': 'OK',
        'play.preparing': 'Getting ready…',
        'play.softTip': 'Labels in the screen\'s bottom corners (YES / NO, Menu / Back…) are picked with these two top keys.',
        'play.screenSize': 'Screen size:',
        'play.firstLoad': 'The first start can take 20–40 s; later ones are faster.',
        'play.backToLibrary': 'Back to library',
        'play.fullscreen': 'Full screen',
        'play.exitFullscreen': 'Exit full screen',
        'play.haptics': 'Vibration:',
        'play.on': 'On',
        'play.off': 'Off',
        'play.keys': 'Keys:',
        'play.kpFull': 'Full',
        'play.kpNav': 'Arrows only',
        'play.kpNone': 'Hidden (touch)',
        'play.emu': 'Emulator settings',
        'play.restart': 'Restart game',
        'play.resume': 'Back to game',
        'play.language': 'Language:',
        'play.loadingAudio': 'Loading the sound engine…',
        'play.loadingJava': 'Loading the Java virtual machine…',
        'play.loadingEmu': 'Loading the emulator…',
        'play.preparingGame': 'Preparing the game…',
        'play.opening': 'Opening the game…',
        'play.starting': 'Starting the game…',
        'play.notInstalled': 'This game isn\'t installed on this device. Add it again from your library.',
        'play.crashed': 'The game crashed. Try another screen size or phone type from the menu.',
        'play.offline': 'An internet connection is needed (the Java engine loads online).',
        'play.loadFailed': 'Couldn\'t load: {error}',
    },
};

// catalog entries (apps/catalog.json) carry their own translations: desc / desc_en, genre / genre_en
export function localized(entry, field) {
    return (lang === 'en' && entry[field + '_en']) || entry[field] || '';
}

const KEY = 'hellojar.lang';

function detect() {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved === 'tr' || saved === 'en') return saved;
    } catch {}
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
    return langs.some(l => /^tr\b/i.test(l)) ? 'tr' : 'en';
}

let lang = detect();

export function getLang() {
    return lang;
}

// locale for numbers and sorting
export function locale() {
    return lang === 'tr' ? 'tr-TR' : 'en-US';
}

export function num(n) {
    return Number(n).toLocaleString(locale());
}

export function t(key, vars = {}) {
    const str = STRINGS[lang][key] ?? STRINGS.tr[key] ?? key;
    return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// like t() but for strings that contain markup; variables are escaped
export function tHtml(key, vars = {}) {
    const safe = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, escapeHtml(v)]));
    return t(key, safe);
}

export function applyI18n(root = document) {
    document.documentElement.lang = lang;
    for (const el of root.querySelectorAll('[data-i18n]')) {
        el.textContent = t(el.dataset.i18n);
    }
    for (const el of root.querySelectorAll('[data-i18n-html]')) {
        el.innerHTML = t(el.dataset.i18nHtml);
    }
    for (const el of root.querySelectorAll('[data-i18n-attr]')) {
        for (const pair of el.dataset.i18nAttr.split(';')) {
            const [attr, key] = pair.split(':').map(s => s.trim());
            if (attr && key) el.setAttribute(attr, t(key));
        }
    }
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));
    for (const btn of root.querySelectorAll('[data-set-lang]')) {
        btn.setAttribute('aria-pressed', String(btn.dataset.setLang === lang));
    }
}

export function setLang(next) {
    if (next !== 'tr' && next !== 'en' || next === lang) return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch {}
    applyI18n();
    window.dispatchEvent(new Event('langchange'));
}

// wire up any [data-set-lang] buttons on the page
export function initLangSwitch() {
    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-set-lang]');
        if (btn) setLang(btn.dataset.setLang);
    });
}
