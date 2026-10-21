/**
 * GET /api/album?id=MPRE... (album/single) | VL.../PL... (playlist/album tab)
 * Endpoint baru: kartu Album/Single di modal Artis dulu memanggil /api/artist
 * dengan id album (MPRE...) sehingga responsnya KOSONG dan modal cuma berputar.
 */
const { httpJSON, ttlCache, applyCors, errJson, UA } = require('./_lib/core');

const cache = ttlCache(120, 15 * 60 * 1000);
const runs = (r) => (Array.isArray(r) ? r.map((x) => x.text || '').join('') : '');
const clean = (s) => String(s || '').replace(/\s*\u2022\s*$/, '').trim();
const DUR_RE = /^\d{1,2}:\d{2}$/;

function findPath(obj, pred) {
    if (!obj || typeof obj !== 'object') return null;
    if (pred(obj)) return obj;
    for (const k of Object.keys(obj)) { const r = findPath(obj[k], pred); if (r) return r; }
    return null;
}

const SEP_RE = /^[\u2022\u00b7|\-]+$/;

/** "4 menit, 15 detik" / "4.15" / "1:04:12" -> "4:15" / "1:04:12" */
function durationFromFixed(fr) {
    if (!fr || !fr.text) return '';
    const label = (fr.text.accessibility && fr.text.accessibility.accessibilityData && fr.text.accessibility.accessibilityData.label) || '';
    let m = label.match(/(?:(\d+)\s*jam)?\s*,?\s*(?:(\d+)\s*menit)?\s*,?\s*(?:(\d+)\s*detik)?/);
    if (m && (m[1] || m[2] || m[3])) {
        const h = parseInt(m[1] || '0', 10), mi = parseInt(m[2] || '0', 10), se = parseInt(m[3] || '0', 10);
        if (h) return h + ':' + String(mi).padStart(2, '0') + ':' + String(se).padStart(2, '0');
        if (mi || se) return mi + ':' + String(se).padStart(2, '0');
    }
    const raw = runs(fr.text.runs).trim();
    let t = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (t) return raw;
    t = raw.match(/^(\d{1,2})[.](\d{2})$/);     // YouTube Music pakai titik: 4.15
    if (t) return t[1] + ':' + t[2];
    return '';
}

function durationFromFlex(cols) {
    for (const col of cols) {
        const fr = col && col.musicResponsiveListItemFlexColumnRenderer;
        if (!fr) continue;
        const txt = runs(fr.text && fr.text.runs).trim();
        let m = txt.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (m) return txt;
        m = txt.match(/^(\d{1,2})[.](\d{2})$/);
        if (m) return m[1] + ':' + m[2];
    }
    return '';
}

/**
 * Satu baris track album/playlist.
 * Catatan struktur (diperiksa langsung dari upstream, 2026-10-21):
 *  - album   : flexColumns = [judul, {} , "37 jt pemutaran"]  + fixedColumns[0] = durasi ("4.15")
 *  - playlist: flexColumns = [judul, "Artis \u2022 37 jt pemutaran", ...]
 *  - track album tidak punya thumbnail sendiri -> pakai cover album (fallback).
 */
function itemToTrack(item, fallback) {
    const r = item && item.musicResponsiveListItemRenderer;
    if (!r) return null;
    const fb = fallback || {};
    const fc = r.flexColumns || [];
    const title = runs(fc[0] && fc[0].musicResponsiveListItemFlexColumnRenderer && fc[0].musicResponsiveListItemFlexColumnRenderer.text.runs);
    if (!title) return null;

    const subRuns = (fc[1] && fc[1].musicResponsiveListItemFlexColumnRenderer && fc[1].musicResponsiveListItemFlexColumnRenderer.text && fc[1].musicResponsiveListItemFlexColumnRenderer.text.runs) || [];
    let artist = '', artistId = '', extra = '';
    for (const run of subRuns) {
        const text = clean(run.text);
        if (!text || SEP_RE.test(text)) continue;
        const bid = (run.navigationEndpoint && run.navigationEndpoint.browseEndpoint && run.navigationEndpoint.browseEndpoint.browseId) || '';
        if (bid.startsWith('UC')) { artist = text; artistId = bid; continue; }
        if (!extra) extra = text;
    }

    // Durasi: fixedColumns dulu (album), lalu flex kolom 1/2 (playlist).
    let duration = '';
    for (const c of (r.fixedColumns || [])) {
        duration = durationFromFixed(c.musicResponsiveListItemFixedColumnRenderer) || duration;
        if (duration) break;
    }
    if (!duration) duration = durationFromFlex(fc.slice(1));

    const plays = extra || runs(fc[2] && fc[2].musicResponsiveListItemFlexColumnRenderer && fc[2].musicResponsiveListItemFlexColumnRenderer.text.runs);
    const videoId = (r.playlistItemData && r.playlistItemData.videoId)
        || (r.navigationEndpoint && r.navigationEndpoint.watchEndpoint && r.navigationEndpoint.watchEndpoint.videoId)
        || '';
    if (!videoId) return null;

    const thumbs = (r.thumbnail && r.thumbnail.musicThumbnailRenderer && r.thumbnail.musicThumbnailRenderer.thumbnail && r.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails) || [];
    return {
        videoId,
        title: clean(title),
        artist: artist || fb.artist || '',
        artistId: artistId || fb.artistId || '',
        duration,
        plays: plays || '',
        thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : (fb.thumbnail || '')
    };
}

function parseHeader(node) {
    const h = (node && (node.musicResponsiveHeaderRenderer || node.musicDetailHeaderRenderer)) || {};
    const title = runs(h.title && h.title.runs) || clean(runs(h.title && h.title.title && h.title.title.runs));
    const subRuns = (h.subtitle && h.subtitle.runs) || (h.subtitle && h.subtitle.subtitle && h.subtitle.subtitle.runs) || [];
    const subtitle = runs(subRuns);
    const thumbs = (h.thumbnail && h.thumbnail.musicThumbnailRenderer && h.thumbnail.musicThumbnailRenderer.thumbnail && h.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails) || [];
    // Nama artis album TIDAK ada di subtitle ("Album \u2022 2022") tapi di straplineTextOne.
    const strapRuns = (h.straplineTextOne && h.straplineTextOne.runs)
        || (h.straplineTextOne && h.straplineTextOne.text && h.straplineTextOne.text.runs)
        || [];
    let artist = '', artistId = '';
    for (const run of strapRuns) {
        const bid = (run.navigationEndpoint && run.navigationEndpoint.browseEndpoint && run.navigationEndpoint.browseEndpoint.browseId) || '';
        if (bid.startsWith('UC')) { artist = clean(run.text); artistId = bid; break; }
    }
    if (!artist) {
        for (const run of subRuns) {
            const bid = (run.navigationEndpoint && run.navigationEndpoint.browseEndpoint && run.navigationEndpoint.browseEndpoint.browseId) || '';
            if (bid.startsWith('UC')) { artist = clean(run.text); artistId = bid; break; }
        }
    }
    const parts = subtitle.split('\u2022').map((s) => s.trim()).filter(Boolean);
    return {
        title, subtitle, artist, artistId,
        kind: (parts[0] || '').toLowerCase(), year: (parts[1] || ''),
        thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : ''
    };
}

async function fetchBrowse(browseId) {
    const r = await httpJSON('https://music.youtube.com/youtubei/v1/browse?prettyPrint=false', {
        method: 'POST',
        body: {
            context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20260620.07.01', hl: 'id', gl: 'ID' } },
            browseId
        },
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://music.youtube.com' },
        timeout: 15000
    });
    if (!r.json) throw new Error('Respons upstream tidak valid');

    const headerNode = findPath(r.json, (o) => o.musicResponsiveHeaderRenderer || o.musicDetailHeaderRenderer);
    const header = parseHeader(headerNode);

    const shelves = [];
    (function collect(o) {
        if (!o || typeof o !== 'object') return;
        if (o.musicShelfRenderer) shelves.push(o.musicShelfRenderer);
        if (o.musicPlaylistShelfRenderer) shelves.push(o.musicPlaylistShelfRenderer);
        for (const k of Object.keys(o)) collect(o[k]);
    })(r.json.contents);

    const tracks = [];
    const seen = new Set();
    for (const sh of shelves) {
        for (const it of (sh.contents || [])) {
            const t = itemToTrack(it, header);
            if (!t || seen.has(t.videoId)) continue;
            seen.add(t.videoId);
            tracks.push(t);
        }
    }
    return { header, tracks };
}

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    const browseId = String(req.query.id || '').trim();
    if (!browseId) return errJson(res, 400, 'Parameter id wajib diisi');

    try {
        let data = cache.get(browseId);
        if (!data) { data = await fetchBrowse(browseId); cache.set(browseId, data); }
        if (!data.header.title && data.tracks.length === 0) return errJson(res, 404, 'Album/playlist tidak ditemukan');

        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600');
        return res.status(200).json({
            status: true,
            input: { id: browseId },
            result: Object.assign({ browseId, total: data.tracks.length }, data.header, { tracks: data.tracks })
        });
    } catch (err) {
        return errJson(res, 500, 'Gagal: ' + err.message);
    }
};
