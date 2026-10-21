/**
 * GET /api/search?query=<kata>&limit=24&filter=all|songs|videos|artists|albums|playlists
 * Sumber: YouTube Music InnerTube (WEB_REMIX), tanpa API key.
 *
 * Tanpa `params` internal, YT Music mengembalikan semua jenis hasil (Lagu, Video,
 * Single, Album, Artis, Profil, Playlist, Episode, Podcast). Tiap item diberi
 * field `type` supaya tab filter di frontend benar-benar menyaring hasil.
 *
 * Kompatibilitas: `result.songs` tetap ada (daftar lagu/video) untuk kode lama.
 */
const { httpJSON, ttlCache, applyCors, errJson, UA } = require('./_lib/core');

const cache = ttlCache(120, 10 * 60 * 1000);

const TYPE_MAP = {
    'Lagu': 'song', 'Song': 'song',
    'Video': 'video',
    'Single': 'single', 'Album': 'album',
    'Artis': 'artist', 'Artist': 'artist', 'Profil': 'profile',
    'Playlist': 'playlist',
    'Episode': 'episode', 'Podcast': 'podcast',
    'Film': 'movie', 'Movie': 'movie'
};
const FILTER_MAP = {
    all: null,
    // "single" adalah rilisan album-like: dulu ikut tab Lagu, sekarang masuk tab Album/EP.
    songs: ['song'],
    videos: ['video'],
    artists: ['artist', 'profile'],
    albums: ['album', 'single', 'ep'],
    playlists: ['playlist']
};
// Alias filter dari klien lama / query manual
const FILTER_ALIAS = { track: 'songs', lagu: 'songs', video: 'videos', artis: 'artists', album: 'albums', ep: 'albums', playlist: 'playlists', semua: 'all' };

const runs = (r) => (Array.isArray(r) ? r.map((x) => x.text || '').join('') : '');
const clean = (s) => String(s || '').replace(/\s*\u2022\s*$/, '').trim();

function parseDuration(col) {
    if (!col) return '';
    const text = runs(col.text && col.text.runs);
    const acc = (col.text && col.text.accessibility && col.text.accessibility.accessibilityData && col.text.accessibility.accessibilityData.label) || '';
    const src = acc || text;
    let m = src.match(/(\d{1,2}):(\d{2})/);
    if (m) return m[1] + ':' + m[2];
    m = src.match(/(\d+)\s*(?:menit|min)\s*(?:(\d+)\s*(?:detik|det))?/);
    if (m) return m[1] + ':' + String(m[2] || '0').padStart(2, '0');
    m = text.trim().match(/^(\d{1,2})[.:](\d{2})$/);
    if (m) return m[1] + ':' + m[2];
    return '';
}

function parseItem(item) {
    const r = item && item.musicResponsiveListItemRenderer;
    if (!r) return null;
    const cols = r.flexColumns || [];
    const title = runs(cols[0] && cols[0].musicResponsiveListItemFlexColumnRenderer && cols[0].musicResponsiveListItemFlexColumnRenderer.text.runs);
    if (!title) return null;

    const subCol = cols[1] && cols[1].musicResponsiveListItemFlexColumnRenderer;
    const subRuns = (subCol && subCol.text && subCol.text.runs) || [];

    let type = '', artist = '', artistId = '', album = '', albumId = '', extra = '';
    for (const run of subRuns) {
        const text = clean(run.text);
        const bid = (run.navigationEndpoint && run.navigationEndpoint.browseEndpoint && run.navigationEndpoint.browseEndpoint.browseId) || '';
        if (!type && TYPE_MAP[text]) { type = TYPE_MAP[text]; continue; }
        if (bid.startsWith('UC')) { artist = text; artistId = bid; continue; }
        if (bid.startsWith('MPRE')) { album = text; albumId = bid; continue; }
        if (!extra && text) extra = text;
    }
    if (!type) type = 'song';

    const duration = parseDuration(cols[1] && cols[1].musicResponsiveListItemFlexColumnRenderer)
        || parseDuration(cols[2] && cols[2].musicResponsiveListItemFlexColumnRenderer);

    const videoId = (r.playlistItemData && r.playlistItemData.videoId)
        || (r.navigationEndpoint && r.navigationEndpoint.watchEndpoint && r.navigationEndpoint.watchEndpoint.videoId)
        || '';
    const browseId = (r.navigationEndpoint && r.navigationEndpoint.browseEndpoint && r.navigationEndpoint.browseEndpoint.browseId) || '';
    const thumbs = (r.thumbnail && r.thumbnail.musicThumbnailRenderer && r.thumbnail.musicThumbnailRenderer.thumbnail && r.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails) || [];
    const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : '';

    let plays = '';
    const col2 = cols[2] && cols[2].musicResponsiveListItemFlexColumnRenderer && cols[2].musicResponsiveListItemFlexColumnRenderer.text && cols[2].musicResponsiveListItemFlexColumnRenderer.text.runs;
    if (Array.isArray(col2) && col2.length) plays = runs(col2);

    if (!videoId && !browseId) return null;

    return {
        type, title: clean(title), videoId, browseId, thumbnail,
        url: videoId ? 'https://music.youtube.com/watch?v=' + videoId : '',
        artist, artistId, album, albumId, duration, plays,
        subtitle: extra || runs(subRuns)
    };
}

async function doSearch(query) {
    const r = await httpJSON('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
        method: 'POST',
        body: {
            context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20260620.07.01', hl: 'id', gl: 'ID' } },
            query
        },
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': 'https://music.youtube.com' },
        timeout: 15000
    });

    const out = [];
    const seen = new Set();
    const tabs = (r.json && r.json.contents && r.json.contents.tabbedSearchResultsRenderer && r.json.contents.tabbedSearchResultsRenderer.tabs) || [];
    for (const tab of tabs) {
        const tabR = tab && tab.tabRenderer;
        const sections = (tabR && tabR.content && tabR.content.sectionListRenderer && tabR.content.sectionListRenderer.contents) || [];
        for (const section of sections) {
            let items = [];
            if (section.musicShelfRenderer) items = section.musicShelfRenderer.contents || [];
            else if (section.itemSectionRenderer) items = section.itemSectionRenderer.contents || [];
            for (const item of items) {
                const parsed = parseItem(item);
                if (!parsed) continue;
                const key = parsed.videoId || parsed.browseId || parsed.title;
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(parsed);
            }
        }
    }
    return out;
}

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    const query = String(req.query.query || req.query.q || '').trim();
    if (!query) return errJson(res, 400, 'Parameter query diperlukan');

    let filter = String(req.query.filter || 'all').toLowerCase();
    if (FILTER_ALIAS[filter]) filter = FILTER_ALIAS[filter];
    const limit = Math.min(parseInt(req.query.limit, 10) || 24, 60);

    try {
        const ck = query.toLowerCase();
        let items = cache.get(ck);
        let cached = true;
        if (!items) {
            items = await doSearch(query);
            cache.set(ck, items);
            cached = false;
        }

        const allow = FILTER_MAP[filter] || null;
        const filtered = allow ? items.filter((i) => allow.indexOf(i.type) !== -1) : items;
        const songs = items.filter((i) => i.type === 'song' || i.type === 'video');

        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({
            status: true,
            result: {
                query, filter, total: filtered.length, cached,
                items: filtered.slice(0, limit),
                songs: songs.slice(0, limit)
            }
        });
    } catch (err) {
        return errJson(res, 500, err.message);
    }
};
