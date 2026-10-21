/**
 * Uji logika player tanpa browser: stub DOM minimal, lalu jalankan public/player.js.
 * Fokus: preferensi server vs engine aktif, fallback Server 1, retry Server 2,
 * shuffle, volume, queue album/artis, dan equalizer di Server 1.
 *
 * Jalankan: node test/player-logic.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUB = path.join(__dirname, '..', 'public');
const code = fs.readFileSync(path.join(PUB, 'player.js'), 'utf8') +
    '\n;globalThis.__S=S;globalThis.__AU=AU;globalThis.__API=API;';

let failures = 0;
const ok = (name, cond, extra) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? '  -> ' + extra : ''));
    if (!cond) failures++;
};

function makeEl(id) {
    return {
        id, src: '', volume: 1, muted: false, paused: true, currentTime: 0, duration: 0,
        dataset: {}, style: {}, innerHTML: '', innerText: '', value: 100,
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener() {}, removeEventListener() {},
        play() { this.paused = false; return Promise.resolve(); },
        pause() { this.paused = true; },
        setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; },
        appendChild() {}, remove() {}, querySelector() { return null; }
    };
}

function makeWorld() {
    const audioEl = makeEl('audio-player');
    const store = {};
    const toasts = [];
    const sandbox = {
        console,
        setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
        encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN, isFinite,
        Math, JSON, Date, Object, Array, String, Number, Boolean, Promise, Error, RegExp, Map, Set,
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; }
        },
        location: { origin: 'https://music.test', search: '' },
        history: { pushState() {} },
        document: {
            getElementById: (id) => (id === 'audio-player' ? audioEl : null),
            createElement: () => makeEl('tmp'),
            querySelector: () => null, querySelectorAll: () => [],
            head: { appendChild() {} },
            body: { appendChild() {}, style: {} },
            addEventListener() {}, activeElement: null
        },
        navigator: {}, lucide: { createIcons() {} },
        MP: { show() {}, hide() {}, dismiss() {}, restore() {} },
        YT: { Player: function () { return {}; } },
        fetch: async () => { throw new Error('fetch belum di-stub'); }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: 'player.js' });
    sandbox.showToast = (m) => toasts.push(m);
    return { sandbox, S: sandbox.__S, AU: sandbox.__AU, store, toasts };
}

(async () => {
    // ================= dunia 1: state, server, fallback, shuffle, queue =================
    let { sandbox, S, AU, store, toasts } = makeWorld();

    ok('state engine terpisah dari server', typeof S.engine === 'string', 'engine=' + S.engine);
    ok('state shuffle/volume/eqBands/queue ada',
        S.shuffle === false && typeof S.volume === 'number' && Array.isArray(S.eqBands) &&
        Array.isArray(S.albumTracks) && Array.isArray(S.artistTracks));

    // 1. setServer menyinkronkan engine + menyimpan preferensi
    store.nanzz_server = '1'; S.server = '1'; S.engine = '1'; S.ct = null;
    sandbox.closeServerSettings = () => {};
    sandbox.setServer('2');
    ok('setServer(2) -> engine ikut jadi 2', S.server === '2' && S.engine === '2');
    ok('setServer(2) -> preferensi tersimpan', store.nanzz_server === '2');

    // 2. Server 1 gagal -> engine pindah, preferensi TIDAK ditimpa
    S.server = '1'; S.engine = '1'; S.ytDegraded = false;
    S.ct = { videoId: 'AAAAAAAAAAA', title: 'Tes', ytUrl: 'https://youtube.com/watch?v=AAAAAAAAAAA' };
    S.pl = [S.ct]; S.pi = 0;
    let fb = null;
    sandbox.playViaServer2 = (t, at, p) => { fb = { t, at, p }; };
    S.yp = { stopVideo() {} };
    store.nanzz_server = '1';
    sandbox.ytFailed(150);
    ok('ytFailed -> engine jadi 2', S.engine === '2');
    ok('ytFailed -> preferensi server tetap 1', S.server === '1' && store.nanzz_server === '1');
    ok('ytFailed -> tandai ytDegraded', S.ytDegraded === true);
    ok('ytFailed -> langsung diputar di Server 2', fb && fb.t === S.ct);
    ok('ytFailed -> ada toast penjelasan', toasts.some((m) => /Server 2/.test(m)));

    // 2b. user menekan "Server 1" saat engine sedang dialihkan -> harus benar-benar kembali
    sandbox.playViaServer2 = () => {};
    S.yp = { stopVideo() {}, loadVideoById() {}, seekTo() {} }; S.yr = true;
    sandbox.setServer('1');
    ok('setServer(1) saat engine dialihkan -> engine balik ke 1 + degraded reset',
        S.engine === '1' && S.ytDegraded === false, 'engine=' + S.engine);
    S.engine = '2'; S.ytDegraded = true; S.yp = { stopVideo() {} }; S.yr = false;

    // 3. lagu berikutnya saat degraded tidak mencoba Server 1 lagi
    S.engine = '1'; S.ytDegraded = true;
    let usedEngine = null;
    sandbox.playViaServer2 = () => { usedEngine = S.engine; };
    sandbox.loadTrack(S.ct, 0);
    ok('degraded: engine dipaksa 2 sebelum memutar', usedEngine === '2');

    // 4. NX menghormati shuffle
    const realPK = sandbox.PK;
    S.shuffle = true; S.pl = [1, 2, 3, 4, 5].map((n) => ({ videoId: 'vid0000000' + n })); S.pi = 2; S.ps = 'search';
    let picked = null;
    sandbox.PK = (s, i) => { picked = i; };
    sandbox.NX();
    ok('NX shuffle memilih index lain', picked !== null && picked !== 2, 'picked=' + picked);
    S.shuffle = false; picked = null; sandbox.NX();
    ok('NX normal memilih index+1', picked === 3, 'picked=' + picked);
    sandbox.PK = realPK;

    // 5. queue album & artis lewat PK
    const tA = { videoId: 'alb00000001', title: 'A' };
    const tB = { videoId: 'alb00000002', title: 'B' };
    S.albumTracks = [tA, tB]; S.artistTracks = [tB];
    sandbox.UU = () => {}; sandbox.UB = () => {};
    sandbox.resetLyricsUI = () => {}; sandbox.loadTrack = () => {};
    sandbox.PK('album', 1);
    ok('PK album -> antrian dari S.albumTracks', S.ct === tB && S.pl === S.albumTracks && S.pi === 1);
    sandbox.PK('artist', 0);
    ok('PK artist -> antrian dari S.artistTracks', S.ct === tB && S.pl === S.artistTracks);

    // ================= dunia 2: Server 2 (fetch, retry, volume, EQ) =================
    ({ sandbox, S, AU, store, toasts } = makeWorld());
    sandbox.UB = () => {};
    sandbox.showToast = (m) => toasts.push(m);
    const track = { videoId: 'CCCCCCCCCCC', ytUrl: 'https://youtube.com/watch?v=CCCCCCCCCCC' };
    S.ct = track; S.pl = [track]; S.pi = 0;

    // 6a. API balas error -> spinner berhenti + alasan ditampilkan
    sandbox.fetch = async () => ({ ok: false, json: async () => ({ status: false, message: 'Layanan sibuk' }) });
    await sandbox.playViaServer2(track, 0);
    ok('API error -> spinner berhenti', S.il === false && S.ip === false);
    ok('API error -> pesan memuat alasan', toasts.some((m) => /Layanan sibuk/.test(m)));

    // 6b. sukses tanpa EQ -> link CDN langsung (mulai bunyi lebih cepat)
    sandbox.fetch = async () => ({
        ok: true,
        json: async () => ({ status: true, result: { download: { audio: 'https://cdn403.savetube.vip/media/x/y.mp3' } } })
    });
    await sandbox.playViaServer2(track, 0);
    ok('sukses -> pakai link CDN langsung', String(AU.src).indexOf('cdn403.savetube.vip') > -1, AU.src);

    // 6c. EQ aktif -> wajib proxy
    await sandbox.playViaServer2(track, 0, true);
    ok('EQ aktif -> lewat /api/proxy-audio', String(AU.src).indexOf('/api/proxy-audio?url=') === 0, AU.src);

    // 6d. error elemen audio -> pemulihan berantai maksimal 2x
    AU.src = 'https://cdn403.savetube.vip/media/x/y.mp3';
    S.pt = 42;
    let retried = null;
    sandbox.playViaServer2 = (t, at, p) => { retried = { at, p }; };
    const h1 = sandbox.recoverServer2();
    ok('error audio -> pemulihan 1 (proxy) & posisi dipertahankan', h1 === true && retried.p === true && retried.at === 42);
    const h2 = sandbox.recoverServer2();
    ok('error audio -> pemulihan 2 (ambil ulang link)', h2 === true && retried.p === false);
    const h3 = sandbox.recoverServer2();
    ok('pemulihan berhenti setelah 2x (tidak loop)', h3 === false);

    // 7. volume & mute berlaku untuk elemen audio (Server 2)
    S.volume = 1; S.muted = false;
    sandbox.setVolume(40);
    ok('setVolume(40) -> 0.4', Math.abs(S.volume - 0.4) < 1e-9 && Math.abs(AU.volume - 0.4) < 1e-9);
    ok('volume tersimpan', store.nanzz_volume === '0.4');
    sandbox.toggleMute();
    ok('mute -> volume 0 & muted true', S.muted === true && AU.volume === 0);
    sandbox.toggleMute();
    ok('unmute -> volume balik 0.4', S.muted === false && Math.abs(AU.volume - 0.4) < 1e-9);

    // 7b. volume juga diterapkan ke Server 1 (YT setVolume)
    let ytVol = null;
    S.yp = { setVolume: (v) => { ytVol = v; } }; S.yr = true;
    S.volume = 0.7; S.muted = false;
    sandbox.applyVolume();
    ok('volume diteruskan ke Server 1 (YT setVolume 70)', ytVol === 70, 'ytVol=' + ytVol);

    // 8. equalizer di Server 1: diberi penjelasan, bukan diam
    ({ sandbox, S } = makeWorld());
    S.server = '1'; S.engine = '1';
    let notice = 0;
    sandbox.openEqServerNotice = () => { notice++; };
    sandbox.openEqualizer();
    ok('Server 1 + EQ -> tampil penjelasan & eqOn tetap false', notice === 1 && S.eqOn === false);

    // 9. lirik: tetap di-fetch, tanpa cache-buster acak
    let lyricUrl = null;
    sandbox.fetch = async (u) => { lyricUrl = u; return { json: async () => ({ status: true, result: { lyrics: { type: 'synced', lines: [{ time: 0, text: 'baris' }] } } }) }; };
    sandbox.gid = (id) => makeEl(id);
    await sandbox.FL('DDDDDDDDDDD');
    ok('lirik tetap di-fetch saat lagu diputar', !!lyricUrl && lyricUrl.indexOf('/api/lyrics?id=DDDDDDDDDDD') === 0, lyricUrl);
    ok('lirik tidak lagi pakai cache-buster acak', String(lyricUrl).indexOf('&t=') === -1);

    console.log('\n' + (failures === 0 ? 'SEMUA TES LOLOS' : failures + ' TES GAGAL'));
    process.exit(failures === 0 ? 0 : 1);
})();
