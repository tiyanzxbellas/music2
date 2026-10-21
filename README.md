# Musicall 🎵

Pemutar musik web (PWA) yang memakai **YouTube Music** sebagai sumber katalog: cari lagu/artis/album,
putar audio, lihat **lirik sinkron**, atur **equalizer**, kecepatan putar, timer tidur, dan simpan playlist
pribadi di browser. Tanpa API key, tanpa login, tanpa database.

- **Demo produksi:** <https://music.tyn.web.id>
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
| `filter` | `all` | `all`, `songs`, `videos`, `artists`, `albums`, `playlists` |
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

### `GET /api/album?id=MPRE…|VL…`
Tracklist album/single/playlist.

```json
{ "status": true,
  "result": { "title": "Tulus", "subtitle": "Single • 2022", "kind": "single", "year": "2022",
              "artist": "Tulus", "artistId": "UC...", "thumbnail": "https://...", "total": 1,
              "tracks": [{ "videoId": "UPQi3gTrT60", "title": "Tulus", "duration": "3:12" }] } }
```

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

### `GET /api/suggest?q=<kata>`
`["tulus", "tulus teh hijau", …]` — array saran (dipakai autocomplete).

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
