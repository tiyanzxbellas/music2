/**
 * Metadata satu video dari YouTube Music InnerTube ("next").
 * Dipakai /api/track dan /api/search saat user menempel link YouTube.
 * Hasil: { videoId, title, artist, artistId, album, duration, thumbnail }
 */
const https = require('https');
const { ttlCache, UA } = require('./core');

const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const cache = ttlCache(400, 6 * 60 * 60 * 1000);
const runs = (r) => (Array.isArray(r) ? r.map((x) => x.text || '').join('') : '');

function request(options, payload) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let d = '';
            res.on('data', (c) => { d += c; if (d.length > 3 * 1024 * 1024) req.destroy(); });
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error('Respons upstream tidak valid')); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        if (payload) req.write(JSON.stringify(payload));
        req.end();
    });
}

/** Cari node playlistPanelVideoRenderer yang cocok (atau pertama) di respons next. */
function findQueueItem(json, videoId) {
    let first = null, exact = null;
    (function walk(o) {
        if (!o || typeof o !== 'object' || exact) return;
        if (o.playlistPanelVideoRenderer) {
            const r = o.playlistPanelVideoRenderer;
            if (!first) first = r;
            if (r.videoId === videoId) { exact = r; return; }
        }
        for (const k of Object.keys(o)) walk(o[k]);
    })(json);
    return exact || first;
}

function thumbsOf(item) {
    const cands = [
        item && item.thumbnail && item.thumbnail.musicThumbnailRenderer && item.thumbnail.musicThumbnailRenderer.thumbnail && item.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails,
        item && item.thumbnail && item.thumbnail.thumbnails
    ];
    for (const t of cands) if (Array.isArray(t) && t.length) return t[t.length - 1].url || '';
    return '';
}

async function getTrack(videoId) {
    if (!videoId) return null;
    const hit = cache.get(videoId);
    if (hit) return hit;

    let item = null;
    try {
        const json = await request({
            hostname: 'music.youtube.com',
            path: '/youtubei/v1/next?key=' + API_KEY,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': UA,
                'Origin': 'https://music.youtube.com'
            },
            timeout: 12000
        }, {
            context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20260620.07.01', hl: 'id', gl: 'ID' } },
            videoId
        });
        item = findQueueItem(json, videoId);
    } catch (e) { /* biarkan metadata kosong */ }

    const out = { videoId, title: '', artist: '', artistId: '', album: '', duration: '', thumbnail: '' };
    if (item) {
        out.title = runs(item.title && item.title.runs);
        const byline = (item.shortBylineText && item.shortBylineText.runs) || [];
        out.artist = runs(byline);
        for (const r of byline) {
            const bid = (r.navigationEndpoint && r.navigationEndpoint.browseEndpoint && r.navigationEndpoint.browseEndpoint.browseId) || '';
            if (bid.startsWith('UC')) { out.artistId = bid; break; }
        }
        // longBylineText = "Rick Astley • 1.8B views • 19M likes" -> bukan album
        const longBy = runs(item.longBylineText && item.longBylineText.runs);
        out.album = /views|pemutaran|likes|suka|subscriber|pelanggan/i.test(longBy) ? '' : longBy;
        const len = runs(item.lengthText && item.lengthText.runs);
        const m = len.match(/(\d+):(\d{2})/);
        if (m) out.duration = m[1] + ':' + m[2];
        out.thumbnail = thumbsOf(item);
    }
    if (out.title) cache.set(videoId, out);
    return out;
}

module.exports = { getTrack };
