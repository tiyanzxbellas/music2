const https = require('https');
const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

function getRunsText(r) { return Array.isArray(r) ? r.map(x=>x.text||'').join('') : ''; }
function removeKeysRecursive(o, k) { if(!o||typeof o!=='object')return; if(Array.isArray(o)){o.forEach(i=>removeKeysRecursive(i,k));return;} for(const key of Object.keys(o)){if(k.includes(key))delete o[key];else if(typeof o[key]==='object')removeKeysRecursive(o[key],k);} }

function makeRequest(o, p) {
    return new Promise((resolve, reject) => {
        const r = https.request(o, res => { let d=''; res.on('data', c=>d+=c); res.on('end', ()=>{ try{resolve(JSON.parse(d));}catch(e){resolve(d);} }); });
        r.on('error', reject); r.on('timeout', ()=>{ r.destroy(); reject(new Error('Timeout')); });
        if(p) r.write(JSON.stringify(p)); r.end();
    });
}

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { res.status(405).json({ status: false, message: 'Method not allowed' }); return; }
    const artistId = (req.query.id || '').trim();
    if (!artistId) { res.status(400).json({ status: false, message: 'Parameter id wajib diisi' }); return; }

    try {
        const data = await makeRequest({
            hostname: 'music.youtube.com', path: '/youtubei/v1/browse?key='+API_KEY, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Origin': 'https://music.youtube.com' },
            rejectUnauthorized: false, timeout: 15000
        }, { context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.00.00', hl: 'en', gl: 'ID' } }, browseId: artistId });

        let name='', thumbnails=[];
        const topSongs=[], topAlbums=[], topSingles=[], topVideos=[], featuredOn=[], similarArtists=[];
        try {
            const h = data?.header?.musicImmersiveHeaderRenderer || data?.header?.musicVisualHeaderRenderer || {};
            name = getRunsText(h.title?.runs||[]);
            thumbnails = h.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
            for (const tab of tabs) {
                const contents = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
                for (const sec of contents) {
                    if (sec.musicShelfRenderer) {
                        for (const item of sec.musicShelfRenderer.contents || []) {
                            if (item.musicResponsiveListItemRenderer) {
                                const i = item.musicResponsiveListItemRenderer;
                                topSongs.push({ videoId: i.playlistItemData?.videoId||'', title: getRunsText(i.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs||[]), artist: getRunsText(i.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs||[]), thumbnails: i.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails||[] });
                            }
                        }
                    }
                    if (sec.musicCarouselShelfRenderer) {
                        const car = sec.musicCarouselShelfRenderer;
                        const ht = getRunsText(car.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs||[]);
                        for (const item of car.contents || []) {
                            if (item.musicTwoRowItemRenderer) {
                                const it = item.musicTwoRowItemRenderer;
                                const parsed = { name: getRunsText(it.title?.runs||[]), artist: getRunsText(it.subtitle?.runs||[]), browseId: it.navigationEndpoint?.browseEndpoint?.browseId||'', thumbnails: it.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails||[] };
                                if (/album/i.test(ht)) topAlbums.push(parsed);
                                else if (/singles|ep/i.test(ht)) topSingles.push(parsed);
                                else if (/video/i.test(ht)) { parsed.videoId = it.navigationEndpoint?.watchEndpoint?.videoId||''; topVideos.push(parsed); }
                                else if (/featured|playlist/i.test(ht)) featuredOn.push(parsed);
                                else if (/similar|fans/i.test(ht)) similarArtists.push(parsed);
                            }
                        }
                    }
                }
            }
        } catch(e) {}

        const result = { status: true, input: { id: artistId }, result: { artistId, name, thumbnails, topSongs, topAlbums, topSingles, topVideos, featuredOn, similarArtists, creator: 'Nanzz' } };
        removeKeysRecursive(result, ['creator']);
        res.status(200).json(result);
    } catch(e) { res.status(500).json({ status: false, message: 'Gagal: '+e.message }); }
};