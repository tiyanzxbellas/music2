/**
 * Mesin ekstraksi audio YouTube -> direct MP3 URL.
 * Urutan: Savetube CDN (utama) -> lexcode (fallback).
 * Catatan: cobalt.tools API v7 sudah SHUT DOWN (Nov 2024) jadi dibuang.
 */
const crypto = require('crypto');
const { httpJSON, extractVideoId, isAllowedProxyHost, isSafeHttpUrl, ttlCache } = require('./core');

const AES_KEY = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');
const SAVETUBE_HEADERS = { origin: 'https://yt.savetube.me', referer: 'https://yt.savetube.me/' };

// URL MP3 dari savetube berlaku ~ beberapa jam; cache 15 menit aman.
const urlCache = ttlCache(300, 15 * 60 * 1000);
const cdnCache = ttlCache(4, 10 * 60 * 1000);

function fmtDuration(sec) {
    if (!sec || isNaN(sec)) return null;
    const s = Math.round(Number(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/** Cari videoId pertama untuk query teks bebas (mis. "tulus hati hati"). */
async function resolveBySearch(query) {
    try {
        const r = await httpJSON('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
            method: 'POST',
            body: {
                context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20260620.07.01', hl: 'id', gl: 'ID' } },
                query
            },
            headers: { Origin: 'https://music.youtube.com' },
            timeout: 12000
        });
        const text = JSON.stringify(r.json || {});
        const m = text.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
        return m ? m[1] : null;
    } catch (e) { return null; }
}

async function getCdns() {
    const cached = cdnCache.get('list');
    if (cached) return cached;
    let list = [];
    try {
        const r = await httpJSON('https://media.savetube.vip/api/random-cdn', { timeout: 8000 });
        const j = r.json || {};
        if (Array.isArray(j.cdns)) list = j.cdns.slice(0, 4);
        else if (j.cdn) list = [j.cdn];
    } catch (e) { /* fallback di bawah */ }
    if (!list.length) list = ['cdn403.savetube.vip', 'cdn400.savetube.vip', 'cdn105.savetube.vip'];
    cdnCache.set('list', list);
    return list;
}

async function viaSavetube(videoId) {
    const cdns = await getCdns();
    for (const cdn of cdns) {
        try {
            const info = await httpJSON('https://' + cdn + '/v2/info', {
                method: 'POST', body: { url: 'https://www.youtube.com/watch?v=' + videoId },
                headers: SAVETUBE_HEADERS, timeout: 12000
            });
            const enc = info.json && info.json.data;
            if (!enc) continue;

            const buf = Buffer.from(enc, 'base64');
            const decipher = crypto.createDecipheriv('aes-128-cbc', AES_KEY, buf.slice(0, 16));
            const dec = JSON.parse(Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString());
            if (!dec.key) continue;

            const dl = await httpJSON('https://' + cdn + '/download', {
                method: 'POST',
                body: { id: videoId, downloadType: 'audio', quality: '128', key: dec.key },
                headers: SAVETUBE_HEADERS, timeout: 12000
            });
            const url = (dl.json && ((dl.json.data && dl.json.data.downloadUrl) || dl.json.downloadUrl)) || '';
            if (url && /^https:\/\//.test(url)) {
                return { audio: url, duration: fmtDuration(dec.duration), title: dec.title || null, source: 'savetube' };
            }
        } catch (e) { /* coba CDN berikutnya */ }
    }
    return null;
}

async function viaLexcode(url) {
    try {
        const r = await httpJSON('https://api.lexcode.biz.id/api/dwn/ytplay?q=' + encodeURIComponent(url), { timeout: 8000 });
        const found = findAudioUrl(r.json);
        if (found) return { audio: found, duration: null, source: 'lexcode' };
    } catch (e) { /* diabaikan */ }
    return null;
}

function findAudioUrl(obj, depth) {
    depth = depth || 0;
    if (depth > 10 || !obj || typeof obj !== 'object') return '';
    if (Array.isArray(obj)) {
        for (const it of obj) { const f = findAudioUrl(it, depth + 1); if (f) return f; }
        return '';
    }
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === 'string' && /^https?:\/\//.test(v) && (/\.mp3|audio|stream|\.m4a/i.test(v))) return v;
        if (typeof v === 'object') { const f = findAudioUrl(v, depth + 1); if (f) return f; }
    }
    return '';
}

/**
 * @param {string} query videoId | URL YouTube | teks pencarian
 * @returns {Promise<null|{videoId,audio,duration,title,source,cached}>}
 */
async function extract(query) {
    if (!query) return null;
    let videoId = extractVideoId(query);
    let queryText = null;
    if (!videoId) {
        queryText = String(query).trim();
        if (!queryText) return null;
        videoId = await resolveBySearch(queryText);
        if (!videoId) return null;
    }
    const hit = urlCache.get(videoId);
    if (hit) return Object.assign({}, hit, { cached: true });

    const url = 'https://www.youtube.com/watch?v=' + videoId;
    let result = await viaSavetube(videoId);
    if (!result) result = await viaLexcode(url);
    if (!result) return null;

    const safe = isSafeHttpUrl(result.audio);
    if (!safe || !isAllowedProxyHost(safe.hostname)) return null;

    const out = {
        videoId,
        audio: result.audio,
        duration: result.duration,
        title: result.title || null,
        source: result.source,
        cached: false
    };
    urlCache.set(videoId, out);
    return out;
}

module.exports = { extract, fmtDuration, resolveBySearch, findAudioUrl };
