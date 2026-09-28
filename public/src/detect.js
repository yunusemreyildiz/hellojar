// Guess a J2ME game's screen size and phone family from its file name.
// dedomil-style names usually carry either the resolution ("..._240x320.jar")
// or the target handset ("LOST_NokiaN80_EN_IGP_101.jar").

export const SCREEN_SIZES = [
    '128x128', '128x160', '132x176', '176x208', '176x220', '208x208',
    '240x320', '320x240', '240x400', '352x416', '360x640', '640x360',
    '480x800', '800x480', '96x65', '96x96', '101x80',
];

// the key layouts freej2me knows; Samsung/LG games generally work with Nokia's
export const PHONE_TYPES = ['Nokia', 'SonyEricsson', 'Motorola', 'Siemens', 'Standard'];

// handset model -> screen size, for the phones games were most often built for.
// Matched against whole tokens of the file name (a trailing letter like the
// "i" in K800i is allowed), so short codes like "k1" don't fire on "pack1".
const MODELS = [
    // Nokia
    ['352x416', 'n80 n90 e90'],
    ['360x640', '5800 n97 5530 5230 x6 n8'],
    ['320x240', 'e61 e62 e63 e71 e72'],
    ['240x320', 'n95 n73 n82 n78 n81 n93 n76 n85 n86 n79 n96 6120 6121 6124 6210 6220 6290 e65 e51 e66 5320 5700 6110 6300 6500 5310 5610 5300 6233 6234 6280 6270 6288 7373 7370 7390 5220 6700 3120 2700 x3 6303'],
    ['176x208', 'ngage 3650 3660 6600 6620 6630 6680 6681 6682 7610 n70 n72 3230 3250 6260 7650 n91 e60 e70'],
    ['208x208', '6230i 6021 6822 7270 6170 7260 6060'],
    ['128x160', '5200 6111 6101 6103 6070 6080 6085 6125 6131 6133 2600 2630 2680 3110 3109 3500 5070 7070 7100 s40'],
    ['128x128', '6230 6610 6100 7250 3100 3200 3300 3510 6020'],
    // Sony Ericsson
    ['176x220', 'k750 w800 w810 k700 k610 w700 z520 s700 k600 z710 w550 w600 w710 z530'],
    ['240x320', 'k800 k810 k850 w850 w880 w900 w910 k790 w960 w580 w890 c902 c905 k660 k630 w705 w595 w760 w980 g502 t650'],
    ['128x160', 'w200 k310 k510 w300 z310 k320 t610 t630 k300 k500 j300 z300'],
    // Siemens
    ['132x176', 'cx65 c65 s65 m65 cx75 c75 s75 m75 me75 el71 c72'],
    ['176x220', 'sx1'],
    // Motorola / Samsung / LG
    ['240x320', 'v3x z6 e8 v8 u9 k3 d900 d600 e900 u600 f250 g600 l760 s8300 i8510 j700'],
    ['176x220', 'razr v3 e398 l7 k1 l6 slvr v360 v600 e770'],
    ['128x160', 'e250 x680 c170 e370 x660 d520'],
].map(([size, models]) => [size, new Set(models.split(' '))]);

const FAMILIES = [
    [/nokia|ngage|n-gage|s40|s60|symbian/, 'Nokia'],
    [/sonyericsson|ericsson|(^|[^a-z])se([^a-z]|$)|(^|[^a-z0-9])[kwzct]\d{3}i?([^a-z0-9]|$)/, 'SonyEricsson'],
    [/motorola|razr|(^|[^a-z0-9])(v3x?|l7|k1|e398)([^a-z0-9]|$)/, 'Motorola'],
    [/siemens|(^|[^a-z0-9])(sx1|c65|m65|s65|cx65)([^a-z0-9]|$)/, 'Siemens'],
];

// "LOST_NokiaN80_EN" -> ["lost", "nokia", "n80", "en"]; "Nokia6300" -> ["nokia", "6300"]
function tokens(fileName) {
    return fileName
        .replace(/\.(jar|jad|zip)$/i, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Za-z]{3,})(\d)/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
}

export function guessFromFileName(fileName) {
    const name = fileName.toLowerCase();
    const result = { size: null, phone: null };

    const m = name.match(/(\d{2,3})\s*[x×*]\s*(\d{2,3})/);
    if (m && SCREEN_SIZES.includes(`${m[1]}x${m[2]}`)) {
        result.size = `${m[1]}x${m[2]}`;
    }

    if (!result.size) {
        const toks = tokens(fileName);
        outer: for (const [size, models] of MODELS) {
            for (const t of toks) {
                if (models.has(t) || (/[a-z]$/.test(t) && models.has(t.slice(0, -1)))) {
                    result.size = size;
                    break outer;
                }
            }
        }
    }

    for (const [re, phone] of FAMILIES) {
        if (re.test(name)) { result.phone = phone; break; }
    }

    return result;
}

// what to recommend people look for on dedomil, given their own screen
export function recommendedSizes() {
    const w = Math.min(screen.width, screen.height);
    const h = Math.max(screen.width, screen.height);
    return h / w > 1.6 ? ['360x640', '240x320', '240x400'] : ['240x320', '352x416', '176x220'];
}
