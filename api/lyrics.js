const https = require('https');

const API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

function getRunsText(runs) { return Array.isArray(runs) ? runs.map(r => r.text || '').join('') : ''; }
function removeKeysRecursive(obj, keys) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(i => removeKeysRecursive(i, keys)); return; }
    for (const k of Object.keys(obj)) { if (keys.includes(k)) delete obj[k]; else if (typeof obj[k] === 'object') removeKeysRecursive(obj[k], keys); }
}

function parseSyncedLyrics(s) {
    const lines = [], p = /\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.+)/;
    for (const l of s.split('\n')) { const m = l.trim().match(p); if (m) lines.push({ time: Math.round((parseInt(m[1])*60+parseInt(m[2])+parseInt(m[3])/100)*100)/100, text: m[4].trim() }); }
    return lines;
}
function parsePlainLyrics(p) { return p.split('\n').map(t => t.trim()).filter(t => t).map((t, i) => ({ time: Math.round(i*3.8*100)/100, text: t })); }

function makeRequest(options, payload) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => { let d=''; res.on('data', c=>d+=c); res.on('end', ()=>{ try{resolve(JSON.parse(d));}catch(e){resolve(d);} }); });
        req.on('error', reject); req.on('timeout', ()=>{ req.destroy(); reject(new Error('Timeout')); });
        if(payload) req.write(JSON.stringify(payload)); req.end();
    });
}

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { res.status(405).json({ status: false, message: 'Method not allowed' }); return; }
    const videoId = (req.query.id || '').trim();
    if (!videoId) { res.status(400).json({ status: false, message: 'Parameter id wajib diisi' }); return; }

    try {
        const ytData = await makeRequest({
            hostname: 'music.youtube.com', path: '/youtubei/v1/next?key='+API_KEY, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0', 'Origin': 'https://music.youtube.com' },
            rejectUnauthorized: false, timeout: 15000
        }, { context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.00.00', hl: 'en', gl: 'ID' } }, videoId });

        let title='', artist='', album='';
        try { const c = ytData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents?.[0]?.playlistPanelVideoRenderer || {}; title=getRunsText(c.title?.runs||[]); artist=getRunsText(c.shortBylineText?.runs||c.longBylineText?.runs||[]); album=getRunsText(c.longBylineText?.runs||[]); } catch(e){}

        let lyricsData = { type: 'none', lines: [] };
        if(title&&artist){try{const lrc=await makeRequest({hostname:'lrclib.net',path:'/api/search?q='+encodeURIComponent(title+' '+artist),method:'GET',headers:{'User-Agent':'Mozilla/5.0 Chrome/120.0.0.0'},rejectUnauthorized:false,timeout:15000},null);if(Array.isArray(lrc)&&lrc.length>0){const b=lrc[0];if(b.syncedLyrics)lyricsData={type:'synced',lines:parseSyncedLyrics(b.syncedLyrics)};else if(b.plainLyrics)lyricsData={type:'plain',lines:parsePlainLyrics(b.plainLyrics)};}}catch(e){}}

        const result = { status: true, input: { id: videoId }, result: { videoId, title, artist, album, lyrics: lyricsData, creator: 'Nanzz' } };
        removeKeysRecursive(result, ['creator']);
        res.status(200).json(result);
    } catch(e) { res.status(500).json({ status: false, message: 'Gagal: '+e.message }); }
};