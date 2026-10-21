/**
 * GET /api/lyrics?id=<videoId>
 * 1) Ambil judul + artis dari YouTube Music (InnerTube "next")
 * 2) Cari lirik di lrclib.net: /api/get (paling akurat) lalu /api/search
 * Cache 24 jam per videoId: lirik tidak berubah, hemat request & cepat.
 */
const https = require('https');
const { ttlCache, applyCors, errJson } = require('./_lib/core');

const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const UA = 'Mozilla/5.0 Chrome/120.0.0.0';
const cache = ttlCache(500, 24 * 60 * 60 * 1000);

const getRunsText = (r) => (Array.isArray(r) ? r.map((x) => x.text || '').join('') : '');

function makeRequest(options, payload) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(d); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        if (payload) req.write(JSON.stringify(payload));
        req.end();
    });
}

function parseSyncedLyrics(s) {
    const lines = [];
    const p = /\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.+)/;
    for (const l of String(s).split('\n')) {
        const m = l.trim().match(p);
        if (m) lines.push({ time: Math.round((parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100) * 100) / 100, text: m[4].trim() });
    }
    return lines;
}
function parsePlainLyrics(p) {
    return String(p).split('\n').map((t) => t.trim()).filter((t) => t).map((t, i) => ({ time: Math.round(i * 3.8 * 100) / 100, text: t }));
}

function pickLyrics(entry) {
    if (!entry) return { type: 'none', lines: [] };
    if (entry.syncedLyrics) {
        const lines = parseSyncedLyrics(entry.syncedLyrics);
        if (lines.length) return { type: 'synced', lines };
    }
    if (entry.plainLyrics) {
        const lines = parsePlainLyrics(entry.plainLyrics);
        if (lines.length) return { type: 'plain', lines };
    }
    return { type: 'none', lines: [] };
}

async function lrclib(path) {
    try {
        const r = await makeRequest({
            hostname: 'lrclib.net', path, method: 'GET',
            headers: { 'User-Agent': UA }, timeout: 12000
        }, null);
        return r;
    } catch (e) { return null; }
}

async function findLyrics(title, artist, durationSec) {
    if (!title) return { type: 'none', lines: [] };

    // 1) exact match
    if (artist) {
        let path = '/api/get?track_name=' + encodeURIComponent(title.replace(/\s*\(.*?\)\s*$/, '')) + '&artist_name=' + encodeURIComponent(artist);
        if (durationSec) path += '&duration=' + Math.round(durationSec);
        const exact = await lrclib(path);
        if (exact && !exact.code) {
            const picked = pickLyrics(exact);
            if (picked.lines.length) return picked;
        }
    }
    // 2) pencarian bebas
    const res = await lrclib('/api/search?q=' + encodeURIComponent(title + ' ' + (artist || '')));
    if (Array.isArray(res) && res.length) {
        // utamakan yang punya syncedLyrics
        const best = res.find((x) => x.syncedLyrics) || res[0];
        return pickLyrics(best);
    }
    return { type: 'none', lines: [] };
}

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    const videoId = String(req.query.id || '').trim();
    if (!videoId) return errJson(res, 400, 'Parameter id wajib diisi');

    const hit = cache.get(videoId);
    if (hit) {
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        return res.status(200).json(hit);
    }

    try {
        const ytData = await makeRequest({
            hostname: 'music.youtube.com', path: '/youtubei/v1/next?key=' + API_KEY, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://music.youtube.com' },
            timeout: 15000
        }, { context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.00.00', hl: 'en', gl: 'ID' } }, videoId });

        let title = '', artist = '', album = '', durationSec = 0;
        try {
            const t = ytData.contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer.tabs[0];
            const item = t.tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents[0].playlistPanelVideoRenderer || {};
            title = getRunsText(item.title && item.title.runs);
            artist = getRunsText((item.shortBylineText && item.shortBylineText.runs) || (item.longBylineText && item.longBylineText.runs));
            // longBylineText = "Rick Astley \u2022 1.8B views \u2022 19M likes" (bukan nama album).
            // Hanya dipakai kalau memang bukan baris penonton/like.
            const byline = getRunsText(item.longBylineText && item.longBylineText.runs);
            album = /views|pemutaran|likes|suka|subscriber|pelanggan/i.test(byline) ? '' : byline;
            const len = getRunsText(item.lengthText && item.lengthText.runs);
            const m = len.match(/(\d+):(\d{2})/);
            if (m) durationSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        } catch (e) { /* metadata tidak lengkap: lanjut dengan lirik kosong */ }

        const lyrics = await findLyrics(title, artist, durationSec);
        const body = {
            status: true,
            input: { id: videoId },
            result: { videoId, title, artist, album, lyrics }
        };
        if (lyrics.lines.length) cache.set(videoId, body);
        res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=86400');
        return res.status(200).json(body);
    } catch (e) {
        return errJson(res, 500, 'Gagal: ' + e.message);
    }
};
