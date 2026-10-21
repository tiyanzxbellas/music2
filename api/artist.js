/**
 * GET /api/artist?id=UC...  -> profil artis (lagu, album, single, video, serupa)
 * Id album (MPRE...) / playlist (VL...) otomatis dialihkan ke handler /api/album.
 */
const https = require('https');
const { ttlCache, applyCors, errJson } = require('./_lib/core');
const albumHandler = require('./album');

const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const cache = ttlCache(120, 15 * 60 * 1000);

const getRunsText = (r) => (Array.isArray(r) ? r.map((x) => x.text || '').join('') : '');

function makeRequest(o, p) {
    return new Promise((resolve, reject) => {
        const r = https.request(o, (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(d); } });
        });
        r.on('error', reject);
        r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
        if (p) r.write(JSON.stringify(p));
        r.end();
    });
}

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    const artistId = String(req.query.id || '').trim();
    if (!artistId) return errJson(res, 400, 'Parameter id wajib diisi');

    // Album / single / playlist -> pakai handler album (dulu hasilnya kosong)
    if (/^(MPRE|VL|OLAK|RD)/.test(artistId)) return albumHandler(req, res);

    const hit = cache.get(artistId);
    if (hit) {
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=1800');
        return res.status(200).json(hit);
    }

    try {
        const data = await makeRequest({
            hostname: 'music.youtube.com', path: '/youtubei/v1/browse?key=' + API_KEY, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Origin': 'https://music.youtube.com' },
            timeout: 15000
        }, { context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.00.00', hl: 'en', gl: 'ID' } }, browseId: artistId });

        let name = '', thumbnails = [];
        const topSongs = [], topAlbums = [], topSingles = [], topVideos = [], featuredOn = [], similarArtists = [];

        const h = (data && data.header && (data.header.musicImmersiveHeaderRenderer || data.header.musicVisualHeaderRenderer)) || {};
        name = getRunsText(h.title && h.title.runs) || getRunsText(h.title && h.title.text && h.title.text.runs);
        thumbnails = (h.thumbnail && h.thumbnail.musicThumbnailRenderer && h.thumbnail.musicThumbnailRenderer.thumbnail && h.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails) || [];

        const tabs = (data && data.contents && data.contents.singleColumnBrowseResultsRenderer && data.contents.singleColumnBrowseResultsRenderer.tabs) || [];
        for (const tab of tabs) {
            const contents = (tab.tabRenderer && tab.tabRenderer.content && tab.tabRenderer.content.sectionListRenderer && tab.tabRenderer.content.sectionListRenderer.contents) || [];
            for (const sec of contents) {
                if (sec.musicShelfRenderer) {
                    for (const item of sec.musicShelfRenderer.contents || []) {
                        const i = item.musicResponsiveListItemRenderer;
                        if (!i) continue;
                        const fc = i.flexColumns || [];
                        topSongs.push({
                            videoId: (i.playlistItemData && i.playlistItemData.videoId) || '',
                            title: getRunsText(fc[0] && fc[0].musicResponsiveListItemFlexColumnRenderer && fc[0].musicResponsiveListItemFlexColumnRenderer.text && fc[0].musicResponsiveListItemFlexColumnRenderer.text.runs),
                            artist: getRunsText(fc[1] && fc[1].musicResponsiveListItemFlexColumnRenderer && fc[1].musicResponsiveListItemFlexColumnRenderer.text && fc[1].musicResponsiveListItemFlexColumnRenderer.text.runs),
                            thumbnails: (i.thumbnail && i.thumbnail.musicThumbnailRenderer && i.thumbnail.musicThumbnailRenderer.thumbnail && i.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails) || []
                        });
                    }
                }
                if (sec.musicCarouselShelfRenderer) {
                    const car = sec.musicCarouselShelfRenderer;
                    const ht = getRunsText(car.header && car.header.musicCarouselShelfBasicHeaderRenderer && car.header.musicCarouselShelfBasicHeaderRenderer.title && car.header.musicCarouselShelfBasicHeaderRenderer.title.runs);
                    for (const item of car.contents || []) {
                        const it = item.musicTwoRowItemRenderer;
                        if (!it) continue;
                        const sub = getRunsText(it.subtitle && it.subtitle.runs);
                        const yearOnly = /^\d{4}$/.test(sub.trim());
                        const parsed = {
                            name: getRunsText(it.title && it.title.runs),
                            // Untuk album/single subtitle YT Music cuma tahun ("2022").
                            artist: yearOnly ? 'Album \u2022 ' + sub.trim() : sub,
                            year: yearOnly ? sub.trim() : '',
                            browseId: (it.navigationEndpoint && it.navigationEndpoint.browseEndpoint && it.navigationEndpoint.browseEndpoint.browseId) || '',
                            thumbnails: (it.thumbnailRenderer && it.thumbnailRenderer.musicThumbnailRenderer && it.thumbnailRenderer.musicThumbnailRenderer.thumbnail && it.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails) || []
                        };
                        if (/album/i.test(ht)) topAlbums.push(parsed);
                        else if (/singles|ep/i.test(ht)) topSingles.push(parsed);
                        else if (/video/i.test(ht)) { parsed.videoId = (it.navigationEndpoint && it.navigationEndpoint.watchEndpoint && it.navigationEndpoint.watchEndpoint.videoId) || ''; topVideos.push(parsed); }
                        else if (/featured|playlist/i.test(ht)) featuredOn.push(parsed);
                        else if (/similar|fans/i.test(ht)) similarArtists.push(parsed);
                    }
                }
            }
        }

        if (!name) return errJson(res, 404, 'Profil artis tidak ditemukan');

        const body = {
            status: true,
            input: { id: artistId },
            result: { artistId, name, thumbnails, topSongs, topAlbums, topSingles, topVideos, featuredOn, similarArtists }
        };
        cache.set(artistId, body);
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=1800');
        return res.status(200).json(body);
    } catch (e) {
        return errJson(res, 500, 'Gagal: ' + e.message);
    }
};
