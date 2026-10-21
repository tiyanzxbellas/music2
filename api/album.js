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

function itemToTrack(item) {
    const r = item && item.musicResponsiveListItemRenderer;
    if (!r) return null;
    const cols = r.flexColumns || [];
    const title = runs(cols[0] && cols[0].musicResponsiveListItemFlexColumnRenderer && cols[0].musicResponsiveListItemFlexColumnRenderer.text.runs);
    if (!title) return null;

    const subRuns = (cols[1] && cols[1].musicResponsiveListItemFlexColumnRenderer && cols[1].musicResponsiveListItemFlexColumnRenderer.text && cols[1].musicResponsiveListItemFlexColumnRenderer.text.runs) || [];
    let artist = '', artistId = '', duration = '';
    for (const run of subRuns) {
        const text = clean(run.text);
        const bid = (run.navigationEndpoint && run.navigationEndpoint.browseEndpoint && run.navigationEndpoint.browseEndpoint.browseId) || '';
        if (bid.startsWith('UC')) { artist = text; artistId = bid; }
        else if (DUR_RE.test(text)) duration = text;
    }
    if (!duration) {
        const col2 = cols[2] && cols[2].musicResponsiveListItemFlexColumnRenderer && cols[2].musicResponsiveListItemFlexColumnRenderer.text && cols[2].musicResponsiveListItemFlexColumnRenderer.text.runs;
        if (Array.isArray(col2)) for (const run of col2) { const t = clean(run.text); if (DUR_RE.test(t)) duration = t; }
    }

    const videoId = (r.playlistItemData && r.playlistItemData.videoId)
        || (r.navigationEndpoint && r.navigationEndpoint.watchEndpoint && r.navigationEndpoint.watchEndpoint.videoId)
        || '';
    if (!videoId) return null;

    const thumbs = (r.thumbnail && r.thumbnail.musicThumbnailRenderer && r.thumbnail.musicThumbnailRenderer.thumbnail && r.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails) || [];
    return { videoId, title: clean(title), artist, artistId, duration, thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : '' };
}

function parseHeader(node) {
    const h = (node && (node.musicResponsiveHeaderRenderer || node.musicDetailHeaderRenderer)) || {};
    const title = runs(h.title && h.title.runs) || clean(runs(h.title && h.title.title && h.title.title.runs));
    const subRuns = (h.subtitle && h.subtitle.runs) || (h.subtitle && h.subtitle.subtitle && h.subtitle.subtitle.runs) || (h.straplineTextOne && h.straplineTextOne.runs) || [];
    const subtitle = runs(subRuns);
    const thumbs = (h.thumbnail && h.thumbnail.musicThumbnailRenderer && h.thumbnail.musicThumbnailRenderer.thumbnail && h.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails) || [];
    let artist = '', artistId = '';
    for (const run of subRuns) {
        const bid = (run.navigationEndpoint && run.navigationEndpoint.browseEndpoint && run.navigationEndpoint.browseEndpoint.browseId) || '';
        if (bid.startsWith('UC')) { artist = clean(run.text); artistId = bid; }
    }
    const parts = subtitle.split('\u2022').map((s) => s.trim());
    return {
        title, subtitle, artist, artistId,
        kind: (parts[0] || '').toLowerCase(), year: parts[1] || '',
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
        for (const k of Object.keys(o)) collect(o[k]);
    })(r.json.contents);

    const tracks = [];
    const seen = new Set();
    for (const sh of shelves) {
        for (const it of (sh.contents || [])) {
            const t = itemToTrack(it);
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
