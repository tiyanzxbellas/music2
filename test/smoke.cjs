// Harness tes semua handler tanpa express (req/res tiruan).
// Tes menembak upstream asli (YouTube Music / lrclib), jadi butuh internet.
// Exit code != 0 kalau ada pemeriksaan yang gagal -> CI jadi penjaga regresi.
const path = require('path');
const API_DIR = path.join(__dirname, '..', 'api');
const ALBUM_ID = 'MPREb_7FNmIeIV9kf';        // Tulus - Manusia (10 track)
const PLAYLIST_ID = 'VLRDCLAK5uy_kR2pM9ewJOAAqSZLidzflfoknDik6dinM';
const ARTIST_ID = 'UC_DHlXllTSMB8pTC38_leFg'; // Tulus
const LYRICS_ID = 'CnUpMOuhTr0';              // Tulus - Pamit (synced)

let pass = 0, fail = 0;
function check(name, cond, info) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (info !== undefined ? ' -> ' + JSON.stringify(info) : '')); }
}
function mkres() {
  const r = { headers: {}, code: 200 };
  r.status = (c) => { r.code = c; return r; };
  r.setHeader = (k, v) => { r.headers[String(k).toLowerCase()] = v; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r; r.send = (b) => { r.body = b; return r; };
  return r;
}
async function call(name, query, method) {
  const h = require(path.join(API_DIR, name + '.js'));
  const res = mkres();
  const t = Date.now();
  await h({ method: method || 'GET', query: query || {}, headers: {}, body: {} }, res);
  return { code: res.code, body: res.body || {}, ms: Date.now() - t, headers: res.headers };
}

(async () => {
  console.log('\n# search');
  let r = await call('search', { query: 'tulus' });
  const items = (r.body.result && r.body.result.items) || [];
  check('search 200 + items', r.code === 200 && items.length > 0, items.length);
  check('search item punya type', items.every((i) => !!i.type), items[0] && items[0].type);
  const counts = {};
  for (const f of ['songs', 'videos', 'albums', 'artists']) {
    const q = await call('search', { query: 'tulus', filter: f });
    const tot = q.body.result ? q.body.result.total : -1;
    counts[f] = tot;
    check('filter ' + f + ' menyaring (total > 0)', tot > 0, tot);
    check('filter ' + f + ' isi sesuai tipe', (q.body.result.items || []).every((i) => ({
      songs: ['song'], videos: ['video'], albums: ['album', 'single', 'ep'], artists: ['artist', 'profile']
    })[f].indexOf(i.type) !== -1), (q.body.result.items || []).map((i) => i.type));
  }
  check('filter songs tidak lagi mencampur single', counts.songs > 0 && counts.albums > 0, counts);
  check('alias filter (lagu/album) jalan',
    (await call('search', { query: 'tulus', filter: 'lagu' })).body.result.total === counts.songs &&
    (await call('search', { query: 'tulus', filter: 'album' })).body.result.total === counts.albums);
  check('search tanpa query -> 400', (await call('search', {})).code === 400);

  console.log('\n# album');
  r = await call('album', { id: ALBUM_ID });
  const alb = r.body.result || {};
  const tr = alb.tracks || [];
  check('album 200', r.code === 200, r.code);
  check('album judul + artis header', alb.title === 'Manusia' && alb.artist === 'Tulus', [alb.title, alb.artist]);
  check('album kind/year', alb.kind === 'album' && alb.year === '2022', [alb.kind, alb.year]);
  check('album 10 track', tr.length === 10, tr.length);
  check('semua track punya durasi (fixedColumns)', tr.every((t) => /^\d+:\d{2}(:\d{2})?$/.test(t.duration)), tr.map((t) => t.duration));
  check('semua track punya artis', tr.every((t) => !!t.artist), tr[0] && t_artist(tr[0]));
  check('track punya thumbnail (fallback cover)', tr.every((t) => !!t.thumbnail));
  check('track punya videoId', tr.every((t) => /^[A-Za-z0-9_-]{11}$/.test(t.videoId)));

  console.log('\n# album (playlist)');
  r = await call('album', { id: PLAYLIST_ID });
  const pl = r.body.result || {};
  check('playlist 200', r.code === 200, r.code);
  check('playlist shelf terbaca (>0 track)', (pl.tracks || []).length > 0, (pl.tracks || []).length);
  check('track playlist punya durasi', (pl.tracks || []).filter((t) => !!t.duration).length >= (pl.tracks || []).length - 1);

  console.log('\n# artist');
  r = await call('artist', { id: ARTIST_ID });
  const art = r.body.result || {};
  check('artist 200 + nama', r.code === 200 && art.name === 'Tulus', art.name);
  check('artist punya lagu/album', (art.topSongs || []).length > 0 && (art.topAlbums || []).length > 0);
  check('album subtitle bukan tahun saja', /Album/.test((art.topAlbums || [{}])[0].artist || ''), (art.topAlbums || [{}])[0]);
  const viaAlbum = await call('artist', { id: ALBUM_ID });
  check('artist?id=MPRE... dialihkan ke album', !!(viaAlbum.body.result && viaAlbum.body.result.tracks));

  console.log('\n# lyrics');
  r = await call('lyrics', { id: LYRICS_ID });
  const ly = (r.body.result && r.body.result.lyrics) || {};
  check('lyrics 200', r.code === 200, r.code);
  check('lirik ada isinya', (ly.lines || []).length > 0, ly.type);
  check('field album bukan jumlah penonton', !/views|pemutaran|likes|suka/i.test((r.body.result || {}).album || ''), (r.body.result || {}).album);
  check('lyrics tanpa id -> 400', (await call('lyrics', {})).code === 400);
  check('lirik sampah (<3 baris) tidak ditampilkan', ly.type === 'none' || (ly.lines || []).length >= 3, ly.lines && ly.lines.length);
  const junk = await call('lyrics', { id: 'dQw4w9WgXcQ' }); // LRCLIB berisi kiriman "probe"
  check('tidak membalas satu baris "probe"',
    junk.body.result && (junk.body.result.lyrics.type === 'none' || (junk.body.result.lyrics.lines || []).length >= 3),
    junk.body.result && junk.body.result.lyrics);

  console.log('\n# audio engine');
  r = await call('ytplay', { q: 'jNQXAC9IVRw' });
  check('ytplay 200 + download.audio', r.code === 200 && !!(r.body.result && r.body.result.download && r.body.result.download.audio), r.code);
  if (r.body.result) check('ytplay proxy ada', /^\/api\/proxy-audio\?url=/.test(r.body.result.download.proxy));
  check('stream (alias lama) 200', (await call('stream', { q: 'jNQXAC9IVRw' })).code === 200);
  check('ytplay tanpa query -> 400', (await call('ytplay', {})).code === 400);

  console.log('\n# proxy-audio (keamanan SSRF)');
  for (const bad of ['http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1:8080/x', 'https://example.com/x.mp3', 'file:///etc/passwd']) {
    const p = await call('proxy-audio', { url: bad });
    check('tolak ' + bad, p.code === 403 || p.code === 400, p.code);
  }
  check('tanpa url -> 400', (await call('proxy-audio', {})).code === 400);

  console.log('\n# track (metadata dari videoId - dipakai share link)');
  r = await call('track', { id: 'kJQP7kiw5Fk' });
  check('track 200 + judul', r.code === 200 && !!(r.body.result && r.body.result.title), r.code);
  check('track judul cocok dengan videonya (bukan hasil teks acak)',
    !!(r.body.result && /despacito/i.test(r.body.result.title)), r.body.result && r.body.result.title);
  check('track punya thumbnail', !!(r.body.result && r.body.result.thumbnail));
  check('track id ngawur -> 400', (await call('track', { id: 'bukanid' })).code === 400);

  console.log('\n# tempel link YouTube ke pencarian');
  r = await call('search', { query: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk' });
  check('search link -> mode direct', !!(r.body.result && r.body.result.direct), r.body.result && r.body.result.direct);
  check('search link -> 1 hasil dengan videoId yang sama',
    !!(r.body.result && r.body.result.items && r.body.result.items.length === 1 &&
       r.body.result.items[0].videoId === 'kJQP7kiw5Fk'));
  check('search link -> judul ikut video (Despacito)',
    !!(r.body.result && r.body.result.items && /despacito/i.test(r.body.result.items[0].title)));

  console.log('\n# health & lirik tanpa id');
  r = await call('health', {});
  check('health 200 + version', r.code === 200 && !!r.body.version, r.code);
  check('health cache singkat', /max-age=0/.test(r.headers['cache-control'] || ''), r.headers['cache-control']);
  r = await call('lyrics', { title: 'Tujuh Belas', artist: 'Tulus' });
  check('lyrics?title= & artist= 200', r.code === 200 && !!(r.body.result && r.body.result.lyrics), r.code);
  check('lyrics tanpa id & judul -> 400', (await call('lyrics', {})).code === 400);

  console.log('\n# suggest');
  r = await call('suggest', { q: 'tulus' });
  check('suggest 200', r.code === 200, r.code);

  console.log('\n=========================================');
  console.log(`  ${pass} ok, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();

function t_artist(t) { return { title: t.title, artist: t.artist }; }
