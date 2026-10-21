# Musicall 🎵

Pemutar musik web (PWA) yang memakai **YouTube Music** sebagai sumber katalog: cari lagu/artis/album,
putar audio, lihat **lirik sinkron**, atur **equalizer**, kecepatan putar, timer tidur, dan simpan playlist
pribadi di browser. Tanpa API key, tanpa login, tanpa database.

- **Demo produksi:** <https://music.tyn.web.id> (alias `www.music.tyn.web.id` → 308 ke domain utama)
- **Repo:** <https://github.com/tiyanzxbellas/music2>

---

## Daftar isi

1. [Fitur](#fitur)
2. [Arsitektur & struktur folder](#arsitektur--struktur-folder)
3. [Menjalankan di lokal](#menjalankan-di-lokal)
4. [Deploy ke Vercel](#deploy-ke-vercel)
5. [Dokumentasi API](#dokumentasi-api)
6. [Catatan teknis penting](#catatan-teknis-penting)
7. [Perbaikan versi 3.1.0](#perbaikan-versi-310)
8. [Batasan & catatan hukum](#batasan--catatan-hukum)

---

## Fitur

| Fitur | Keterangan |
|---|---|
| Pencarian | Lagu, video, album/single, artis & playlist dari YouTube Music, dengan tab filter yang benar-benar menyaring hasil |
| Player | Streaming audio lewat elemen `<audio>` (bukan iframe YouTube), mini player + full player, seek, next/prev, shuffle, repeat off/all/one |
| Lirik | Lirik sinkron otomatis dari [LRCLIB](https://lrclib.net) + tombol geser ±1 baris untuk koreksi |
| Equalizer | 5 band (Bass → Treble) + preset Bass Booster / Vocal / Electronic / Acoustic (Web Audio API) |
| Playback | Kecepatan 0.5x–2x; mode "Hentikan di akhir lagu"; timer tidur 5–60 menit |
| Playlist | Buat playlist lokal (nama + cover), tambah lagu, putar, ubah, hapus — tersimpan di `localStorage` |
| Share | Share card (canvas → PNG), salin link, Web Share API |
| PWA | Manifest + service worker; bisa dipasang ke home screen, tetap terbuka saat offline (halaman) |
| Tema | Gelap (default, neumorphic) & terang |

## Arsitektur & struktur folder

```
music2/
├─ api/                     # serverless functions (Vercel) + dipakai server lokal
│  ├─ _lib/core.js          # utilitas: http JSON + timeout, cache TTL, validasi URL/SSRF
│  ├─ _lib/ytplay.js        # mesin ekstraksi audio (Savetube → lexcode)
│  ├─ search.js             # pencarian YT Music (semua tipe hasil)
│  ├─ album.js              # tracklist album / single / playlist
│  ├─ artist.js             # profil artis (lagu, album, single, video, serupa)
│  ├─ lyrics.js             # lirik dari LRCLIB
│  ├─ suggest.js            # saran pencarian (autocomplete)
│  ├─ ytplay.js             # videoId/URL/teks -> URL audio MP3
│  ├─ stream.js             # kompatibilitas: alias /api/ytplay
│  └─ proxy-audio.js        # proxy audio (allowlist host, anti-SSRF)
├─ public/                  # aplikasi web (vanilla JS + Tailwind CDN + Lucide)
│  ├─ index.html            # shell, tema, splash, service worker registration
│  ├─ player.js             # inti player, lirik, queue, EQ, timer, playlist store
│  ├─ app.js                # bootstrap, navigasi, library, popup share
│  ├─ home.js / search.js / miniplayer.js / fullplayer.js / artist.js
│  ├─ sw.js / manifest.json / robots.txt / sitemap.xml / icons/
├─ server.ts                # server Express (dev lokal)
├─ test/smoke.cjs           # tes cepat semua endpoint tanpa framework tes
└─ vercel.json              # rewrite statis + heredity function + cache/security header
```

Alur pemutaran:

```
klik lagu → POST /api/ytplay {query} → URL MP3 (CDN Savetube)
          → <audio src=URL>  (atau /api/proxy-audio?url=… saat equalizer aktif)
GET /api/lyrics?id=videoId → LRCLIB → highlight per baris
```

## Menjalankan di lokal

Butuh **Node.js 18+**.

```bash
git clone https://github.com/tiyanzxbellas/music2.git
cd music2
npm install
npm run dev            # http://localhost:3000
```

Perintah lain:

```bash
npm run smoke      # tes semua endpoint API (butuh internet)
npm run typecheck  # cek tipe TypeScript server.ts
```

## Deploy ke Vercel

1. Import repo ke Vercel.
2. **Framework preset: `Other`** (jangan `Vite` — folder ini bukan aplikasi React/Vite).
3. Root directory: `./`, build command: kosongkan, output directory: kosongkan.
4. Deploy. Folder `api/` otomatis jadi serverless function; `public/` disajikan lewat `rewrites` di `vercel.json`.
5. Tambahkan domain sendiri di **Settings → Domains** bila perlu.

> Catatan: siapa pun yang punya URL bisa memakai aplikasi ini (tidak ada login). Semua request ke
> YouTube/LRCLIB dikirim dari server function kamu.

## Dokumentasi API

Semua endpoint mengembalikan JSON. `status: true|false`, `message` saat error.

### `GET /api/search`
| Query | Default | Keterangan |
|---|---|---|
| `query` | — | kata kunci (wajib) |
| `filter` | `all` | `all`, `songs`, `videos`, `artists`, `albums`, `playlists` (alias: `lagu`, `video`, `artis`, `album`, `ep`, `playlist`, `semua`) |
| `limit` | `24` | maksimum 60 |

```json
{
  "status": true,
  "result": {
    "query": "tulus", "total": 24,
    "items": [{ "type": "song", "title": "Teh Hijau", "videoId": "5F28ye50-Kc",
                "artist": "Tulus", "artistId": "UC...", "album": "Teh Hijau",
                "duration": "3:38", "thumbnail": "https://..." }],
    "songs": [ ... ]   // kompatibilitas dengan versi lama
  }
}
```

`type` bisa: `song`, `video`, `single`, `album`, `artist`, `profile`, `playlist`, `episode`, `podcast`.

Pembagian tab: **Lagu** = `song`, **Video** = `video`, **Album** = `album` + `single` + `ep`
(rilisan album-like), **Artis** = `artist` + `profile`.

### `GET /api/track?id=<videoId>`

Metadata satu lagu dari videoId — dipakai fitur **share link** (`?play=<videoId>`) dan saat user
menempel link YouTube ke kolom pencarian. Dulu judul/cover diambil dari hasil pencarian teks
(link YouTube dianggap kata kunci), jadi yang tampil bisa lagu yang salah.

```json
{ "status": true, "result": {
    "videoId": "kJQP7kiw5Fk", "title": "Despacito",
    "artist": "Luis Fonsi & Daddy Yankee", "artistId": "",
    "album": "", "duration": "4:42",
    "thumbnail": "https://i.ytimg.com/vi/kJQP7kiw5Fk/hq720.jpg…"
} }
```

`/api/search?query=<link YouTube atau videoId>` sekarang mendeteksi link/videoId dan membalas
`result.direct: true` berisi satu item yang benar (bukan hasil pencarian teks).

### `GET /api/album?id=MPRE…|VL…`
Tracklist album/single/playlist (`MPRE…` album & single, `VL…` playlist/radio).

```json
{ "status": true,
  "result": { "title": "Manusia", "subtitle": "Album • 2022", "kind": "album", "year": "2022",
              "artist": "Tulus", "artistId": "UC...", "thumbnail": "https://...", "total": 10,
              "tracks": [{ "videoId": "cA7Gzh2ISL0", "title": "Tujuh Belas", "artist": "Tulus",
                           "duration": "4:15", "plays": "37 jt pemutaran", "thumbnail": "https://..." }] } }
```

`artist` diambil dari `straplineTextOne` header (subtitle album tidak memuat nama artis), durasi dari
`fixedColumns` (YouTube Music memakai format `4.15`), dan track album tidak punya thumbnail sendiri
sehingga memakai cover album.

### `GET /api/artist?id=UC…`
`{ status, result: { name, thumbnails, topSongs[], topAlbums[], topSingles[], topVideos[], featuredOn[], similarArtists[] } }`
— kalau `id` yang dikirim adalah album (`MPRE…`) endpoint otomatis meneruskan ke `/api/album`.

### `GET /api/lyrics?id=<videoId>`
```json
{ "status": true,
  "result": { "title": "Hati-Hati di Jalan", "artist": "Tulus",
              "lyrics": { "type": "synced", "lines": [{ "time": 13.28, "text": "Perjalanan membawamu" }] } } }
```
`type`: `synced` (ada timing), `plain` (tanpa timing), `none`.

Tanpa `id`, lirik juga bisa dicari langsung dari judul/artis (tidak 400):

```
GET /api/lyrics?title=Tujuh%20Belas&artist=Tulus
```
Field `album` dikosongkan kalau upstream hanya mengirim baris penonton/like
(mis. `"Rick Astley • 1.8B views"`), bukan nama album.

### `GET /api/suggest?q=<kata>`
`["tulus", "tulus teh hijau", …]` — array saran (dipakai autocomplete).

### `GET /api/health`
```json
{ "status": true, "app": "Musicall", "version": "3.2.1", "node": "v24.x",
  "region": "sin1", "uptimeSec": 0, "time": "2026-10-21T04:54:30.737Z",
  "endpoints": ["/api/search?q=", "/api/album?id=", "…"] }
```
Tidak menembak upstream — aman dipakai untuk pemantauan.

### `POST /api/ytplay` (atau `GET /api/ytplay?q=`)
Body: `{ "query": "<videoId | URL YouTube | teks pencarian>" }`

```json
{ "status": true,
  "result": { "videoId": "jNQXAC9IVRw", "title": "Me at the zoo", "duration": "0:19",
              "source": "savetube", "cached": false,
              "download": { "audio": "https://cdn403.savetube.vip/…mp3",
                            "proxy": "/api/proxy-audio?url=…" } } }
```

### `GET /api/stream?q=…`
Bentuk kompatibel endpoint lama: `{ status, result: { url, proxy, type: "mp3" } }`.

### `GET /api/proxy-audio?url=…`
Streaming audio dengan dukungan `Range` (206). **Hanya** host `*.savetube.vip`, `*.googlevideo.com`,
dan `*.lexcode.biz.id`; host lain, IP privat, dan port non-standar ditolak `403`.

## Dua mesin pemutar: Server 1 vs Server 2

Aplikasi punya dua mesin pemutaran, bisa diganti dari tombol ⚙️ di beranda
(**Pengaturan Server**). Pilihan disimpan di `localStorage` (`nanzz_server`) dan berlaku
untuk semua halaman.

| Fitur | Server 1 (YouTube iframe) | Server 2 (elemen `<audio>`) |
|---|---|---|
| Putar / jeda | ✅ | ✅ |
| Next / Prev / Auto-next | ✅ | ✅ |
| Geser waktu (seek) & progres | ✅ | ✅ |
| Ulangi (off / semua / satu lagu) | ✅ | ✅ |
| **Acak (shuffle)** | ✅ | ✅ |
| **Volume + mute** | ✅ (`setVolume` YT) | ✅ (`audio.volume`) |
| Lirik + highlight sinkron | ✅ | ✅ |
| Seek dari baris lirik | ✅ | ✅ |
| Koreksi sinkron lirik (+/−) | ✅ | ✅ |
| Timer tidur | ✅ | ✅ |
| Kecepatan putar (0.5×–2×) | ✅ | ✅ |
| Antrian (dari album/artis/playlist) | ✅ | ✅ |
| Equalizer + preset + visualizer | ⚠️ tidak bisa (audio ada di dalam iframe YouTube) — tombolnya memberi penjelasan + tawaran pindah ke Server 2 | ✅ |
| Unduh MP3 / share card / playlist | ✅ (tidak tergantung server) | ✅ |
| Jalan saat layar mati / background | ⚠️ sering dihentikan browser (butuh izin notifikasi; tetap tidak dijamin) | ✅ |
| Gagal memutar lagu | otomatis dialihkan ke Server 2 untuk lagu itu (setelanmu tidak diubah) | otomatis coba lewat proxy → ambil ulang link audio → baru menyerah |

Catatan: pemilihan server adalah **preferensi**. Kalau Server 1 gagal memutar satu lagu,
engine pindah sementara ke Server 2 tanpa menimpa pilihanmu di Pengaturan Server.

## Catatan teknis penting

- **Tidak ada API key.** Semua data diambil dari endpoint internal YouTube Music (`youtubei/v1`) dengan
  client `WEB_REMIX`, ditambah LRCLIB untuk lirik dan Savetube untuk ekstraksi audio.
- **Audio bukan iframe YouTube.** `ytplay` mengubah video menjadi URL MP3 di CDN, jadi tetap bisa
  diputar walau tab di background (di Android/iOS perilaku background tetap tergantung browser).
- **Cache**: pencarian 10 menit, URL audio 15 menit, lirik 24 jam, album/artis 15 menit, saran 15 menit.
  Selain itu header `Cache-Control` di-set per endpoint agar CDN Vercel ikut meng-cache.
- **Service worker** tidak pernah meng-cache `/api/*`, request `Range`, maupun file audio. Halaman
  memakai network-first + fallback offline, aset statis memakai stale-while-revalidate.
- **SSRF**: `/api/proxy-audio` memvalidasi host, skema, port, dan memblokir IP privat/loopback
  (sebelumnya endpoint ini bisa dipakai memanggil `169.254.169.254` dsb).

## Perbaikan versi 3.1.0

Ringkasan masalah yang ditemukan saat audit dan sudah diperbaiki:

| # | Masalah | Perbaikan |
|---|---|---|
| 1 | `/api/proxy-audio` = open proxy + SSRF (bisa akses `127.0.0.1`, `169.254.169.254`) | allowlist host, blokir IP privat/port aneh, timeout, hentikan upstream saat klien disconnect |
| 2 | Service worker cache-first untuk semua request → aplikasi tidak pernah update, hasil pencarian & URL audio basi ikut di-cache | strategi per jenis request; `/api/*`, media, dan request `Range` tidak pernah di-cache |
| 3 | Tab filter pencarian "Video" & "Artis" tidak berfungsi (`apply()` mengabaikan filter) | API mengembalikan `type`, UI menyaring sungguhan + tab Album |
| 4 | Klik album/single di halaman artis → spinner selamanya (memanggil `/api/artist` dengan id album) | endpoint `/api/album` baru + tombol kembali |
| 5 | Fallback audio memakai **cobalt.tools** (API v7 sudah shutdown Nov 2024) dan `api.lexcode.biz.id` (domain mati) | urutan ekstraksi dirapikan, timeout pendek, CDN Savetube fallback berlapis + cache |
| 6 | `/api/stream` mati total (host upstream NXDOMAIN) | dialihkan ke mesin `/api/ytplay` |
| 7 | Gambar: `logo.png` 1.75 MB, `dev.png` 1.75 MB (duplikat), `jansen_avatar.jpg` 950 KB | dikompres → total `public/` turun dari **4.6 MB ke 1.2 MB** |
| 8 | Ikon/favicon/OG mengambil file dari `raw.githubusercontent.com` | aset lokal (`/icons/*`, `/logo.png`) + `manifest.json` dengan ikon 192/512 |
| 9 | `lucide@latest` (rawan breaking) & `cdn.tailwindcss.com` tanpa versi | dipin ke `lucide@0.544.0` dan `tailwindcss@3.4.17` |
| 10 | Query beranda memakai tahun mati ("lagu viral indonesia 2024") | daftar query berputar, tanpa tahun |
| 11 | Skeleton beranda berputar selamanya kalau jaringan gagal | state error + tombol "Coba lagi" |
| 12 | Lirik tanpa timing tetap di-highlight seolah sinkron; tombol seek lirik menembak player yang salah | hanya lirik `synced` yang di-highlight/seek |
| 13 | Autocomplete menembak 1 request per ketikan | debounce 250 ms + cache server 15 menit |
| 14 | Endpoint tidak punya cache/`Cache-Control`, `rejectUnauthorized:false` di semua request | `Cache-Control` per endpoint, TLS diverifikasi normal |
| 15 | Sisa proyek AI Studio: `index.html` root, `src/App.tsx` kosong, `vite.config.ts`, `metadata.json`, dependency React/Vite/Tailwind/GenAI tidak terpakai | dihapus; `package.json` bersih (produksi hanya `express`) |
| 16 | `npm run build` menyalin `public/*` tapi tidak ada `dist` di deploy, Vercel mendeteksi framework **vite** | preset **Other**, `vercel.json` dirapikan (rewrite `/(.*) → /public/$1`, `maxDuration` 30 s, header keamanan) |
| 17 | Tidak ada `robots.txt`, `sitemap.xml`, `.gitignore`, `LICENSE`, dan README hanya 35 byte | ditambahkan semua + README lengkap ini |

## Perbaikan versi 3.1.1

Hasil pemeriksaan ulang seluruh handler terhadap respons live YouTube Music (2026-10-21):

| # | Masalah | Bukti sebelum | Perbaikan |
|---|---|---|---|
| 1 | Track album **tanpa durasi & tanpa artis** | `Manusia` (10 track): `filled: 0/10` — semua `duration: ""`, `artist: ""` | durasi dibaca dari `fixedColumns` (format `4.15` → `4:15`, prioritas label aksesibilitas `4 menit, 15 detik`), artis fallback ke header album, thumbnail fallback ke cover |
| 2 | **Playlist kosong** (`VL…` / radio) | `Presenting Tulus` → `total: 0`, `tracks: []` | `fetchBrowse` sekarang juga mengumpulkan `musicPlaylistShelfRenderer` (bukan hanya `musicShelfRenderer`) |
| 3 | Tab **Album** selalu kosong | `?filter=albums` → `total: 0` padahal ada rilisan `Single` | `albums` = `album`+`single`+`ep`; `songs` = `song` saja; tambah alias filter (`lagu`, `album`, dll) |
| 4 | Field `album` di `/api/lyrics` berisi jumlah penonton | `"album": "Rick Astley • 1.8B views • 19M likes"` | dibersihkan: `album` dikosongkan kalau baris itu penonton/like |
| 5 | Subtitle album di halaman artis cuma tahun | `topAlbums[0].artist = "2022"` | dinormalisasi jadi `Album • 2022` + field `year` |
| 6 | Lirik sampah dari LRCLIB tampil apa adanya | `dQw4w9WgXcQ` → 1 baris `"probe"` | lirik < 3 baris / < 30 karakter dianggap tidak layak, lanjut ke kandidat berikutnya |
| 7 | Smoke test cuma mencetak hasil (regresi tidak ketahuan) | CI hijau walau handler rusak | `test/smoke.cjs` ditulis ulang: **44 pemeriksaan ber-assert**, exit code ≠ 0 kalau gagal |

## Perbaikan versi 3.2.0

Audit ulang khusus **kesetaraan fitur Server 1 & Server 2** (2026-10-21):

| # | Masalah | Bukti sebelum | Perbaikan |
|---|---|---|---|
| 1 | Server 1 yang gagal memutar **menimpa setelan user** jadi Server 2 permanen | `loadTrack()` menulis `S.server='2'` + `localStorage` saat fallback | engine aktif (`S.engine`) dipisah dari preferensi (`S.server`); fallback hanya mengalihkan lagu itu + `ytDegraded` untuk sesi berjalan |
| 2 | Server 1 **tanpa penanganan error** — video dibatasi/dihapus = spinner berputar selamanya | event YT cuma `onReady` + `onStateChange` | tambah `onError` → `ytFailed()` → dialihkan ke Server 2 + toast berisi kode error |
| 3 | Server 2 gagal mutar hanya kasih toast, tidak ada usaha lanjut | `AU.addEventListener('error')` → toast | pemulihan berantai: putar ulang lewat proxy (posisi dipertahankan) → ambil ulang link audio → baru menyerah (maks 2 percobaan) |
| 4 | `/api/ytplay` dipanggil **tanpa timeout** — kalau upstream hang, spinner menggantung | `await fetch(...)` tanpa `AbortSignal` | `AbortController` 25 s + pesan spesifik ("Server terlalu lama merespons") |
| 5 | Equalizer di Server 1 **diam saja** (slider digeser, tidak ada efek) | `if (S.server === '2')` lalu lanjut membuka UI | UI tidak dibuka; muncul penjelasan + tombol "Pindah ke Server 2 & buka Equalizer" |
| 6 | **Shuffle tidak ada tombolnya** (fungsi `SF()` mati) | 0 pemanggil di UI | tombol acak di full player + indikator, `NX()` menghormati shuffle |
| 7 | **Tidak ada kontrol volume sama sekali** | hanya ikon dekoratif di daftar antrian | slider volume + tombol mute di full player, tersimpan di `localStorage`, berlaku di dua server |
| 8 | Main lagu dari album/artis: **cover hilang** & antrian cuma 1 lagu (next/auto-next mati) | `Artist.play()` menulis `cover: FI`, `S.pl=[S.ct]` | `playIdx()` memakai daftar album/lagu teratas → antrian benar; `playOne()` membawa cover |
| 9 | Share link (`?play=`) menampilkan **judul lagu lain** | metadata dicari dengan query berupa URL → hasil acak | endpoint `/api/track?id=` + `result.direct` pada `/api/search` |
| 10 | Lirik di-fetch ulang dengan cache-buster acak tiap lagu | `?id=…&t=Date.now()` | cache server (24 jam) dipakai, hemat request, lirik tetap sama |

Tes: `test/player-logic.cjs` (30 pemeriksaan logika dua mesin, tanpa browser) + `npm run smoke`
(sekarang 55 pemeriksaan, termasuk `/api/track`, `/api/health`, dan "tempel link YouTube").

## Perbaikan versi 3.2.1

Hasil pemeriksaan ulang setelah deploy 3.2.0 (2026-10-21):

| # | Masalah | Perbaikan |
|---|---|---|
| 1 | `/api/lyrics?title=&artist=` balas **400** "Parameter id wajib diisi" — pemanggil tanpa `videoId` tidak bisa apa-apa | tanpa `id`, lirik dicari langsung dari `title`/`artist` (cache terpisah); `id` tetap jalur utama dan tidak berubah |
| 2 | Aset yang tidak ada (mis. `/player.js.bak`) dibalas **200 + index.html**, bukan 404 | rewrite baru: path ber-ekstensi file yang filenya tidak ada → `/api/notfound` (404 JSON) |
| 3 | Tidak ada cara cepat memastikan API hidup tanpa menembak upstream | endpoint baru `GET /api/health` (versi, node, region, uptime, daftar endpoint) |

## Batasan & catatan hukum

- Ini proyek pribadi/edukasi. Aplikasi **tidak** meng-host file audio: URL MP3 berasal dari layanan pihak
  ketiga (Savetube) dan bisa berubah/hilang kapan saja.
- Ketersediaan bergantung pada endpoint internal YouTube Music yang tidak berdokumentasi; kalau YouTube
  mengubah struktur respons, `api/search.js` / `api/album.js` / `api/artist.js` perlu disesuaikan.
- Menonton/mengunduh konten YouTube tetap terikat [Ketentuan Layanan YouTube](https://www.youtube.com/t/terms).
  Gunakan untuk keperluan pribadi.
- Tidak ada login/pembatasan pengguna. Kalau dipakai publik, pertimbangkan menambah rate limit atau
  autentikasi.

## Lisensi

[MIT](LICENSE) © 2026 Tiyanz
