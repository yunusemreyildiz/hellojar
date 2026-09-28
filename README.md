# Tuşlu — eski cep oyunları, tarayıcında

Eski tuşlu telefonların J2ME (Java ME) oyunlarını mobil tarayıcıda oynatan bir
platform. Emülatör: [freej2me-web](https://github.com/zb3/freej2me-web)
(FreeJ2ME + [CheerpJ](https://cheerpj.com/)).

- **Kütüphanem:** Telefona indirdiğin herhangi bir `.jar` oyununu ekle; ekran
  boyutu ve tuş düzeni dosya adından/jar'dan otomatik tahmin edilir. Oyunlar ve
  kayıtlar cihazda (IndexedDB) kalır, hiçbir sunucuya yüklenmez.
- **Keşfet:** Yazarlarının GPL ile dağıttığı oyunlar tek dokunuşla açılır.
  Dedomil araması ve kategorileri dedomil'in kendi sayfalarını açar.
- **Oynatıcı:** N80 tarzı 5 yönlü tuş, seçim tuşları, sayı tuşları; yatay/dikey
  düzen, tam ekran, titreşim, dokunmatik oyunlar için tuşsuz mod.
- **Android:** Ana ekrana eklenince indirilen jar'lar *Paylaş → Tuşlu* ile
  açılabilir (Web Share Target).

## Çalıştırma

```bash
npm install
npm start          # http://localhost:8080
```

Telefondan denemek için aynı ağda `http://<bilgisayar-ip>:8080` adresini açın.

## Yapı

| Yol | Ne |
| --- | --- |
| `public/index.html`, `src/library.js`, `css/app.css` | Kütüphane ve Keşfet |
| `public/play.html`, `src/play.js`, `css/play.css` | Oynatıcı (`play.html?app=<id>`) |
| `public/src/emu.js` | Jar inceleme/kurma/ayar (CheerpJ'deki Java tarafı) |
| `public/src/detect.js` | Dosya adından ekran boyutu ve telefon tipi tahmini |
| `public/sw.js`, `manifest.webmanifest` | PWA, "Paylaş → Tuşlu" |
| `public/freej2me-web.jar`, `libjs/`, `libmidi/`, `libmedia/`, `src/key.js`, `src/eventqueue.js` | freej2me-web (GPL-3, bkz. `LICENSE-freej2me`) |
| `emulator/` | freej2me-web'e yaptığımız değişiklikler (aşağıda) |
| `catalog/games.json`, `catalog/free/` | Katalog oyunları ve lisansları |
| `tools/build_catalog.py` | `public/apps/` altında katalog paketlerini üretir |
| `tools/build_emulator.sh` | `public/freej2me-web.jar`'ı yeniden derler (JDK gerekir) |

## Emülatör yaması: neden oyunlar 1 fps'te takılmıyor?

Birçok J2ME oyunu (özellikle Gameloft) `Thread.yield()` / `Thread.sleep(0)` ile
meşgul bekleme yapar. CheerpJ'de tüm Java iş parçacıkları tarayıcının ana
iş parçacığını paylaştığı için bu döngüler CPU'yu tüketir ve oyun ~1 fps'e düşer.
`emulator/src/.../MIDletLoader.java` oyun sınıflarını yüklerken bu çağrıları
en az 1 ms uyuyan `ThreadCompat`'a yönlendirir (ör. LOST: ~1 → 14 fps, CPU
%100 → ~%15).

## Katalog

`catalog/games.json` listesini düzenleyip şunu çalıştırın:

```bash
python3 tools/build_catalog.py            # sadece yayınlanabilir oyunlar
python3 tools/build_catalog.py --private  # + "private": true olanlar (yerel)
```

`"private": true` oyunlar (dağıtım hakkınız olmayanlar) `catalog.local.json`'a
yazılır; bunlar ve jar'ları git'e girmez.

Şu anki ücretsiz oyunlar: Abo, MilCity, Reversi (GPL, bkz. `catalog/free/README.md`).

## Yayınlama

`public/` klasörü herhangi bir statik sunucuda çalışır; sunucunun `Range`
isteklerini desteklemesi gerekir (nginx, Netlify, Vercel, Cloudflare Pages,
GitHub Pages destekler). HTTPS önerilir (PWA, paylaş hedefi, tam ekran).

## Notlar

- CheerpJ çalışma zamanı `cjrtnc.leaningtech.com`'dan yüklenir: internet gerekir.
  CheerpJ kişisel/ticari olmayan kullanımda ücretsizdir.
- Her oyun çalışmaz: 3D (M3G/Mascot) ve bazı üreticiye özel API'ler sorun çıkarabilir.
- Tuşlu oyun barındırmaz (GPL katalog hariç) ve dedomil.net ile bağlantılı değildir.
- iPhone'da sessiz modu anahtarı açıksa Web Audio sesi çalmaz.
