const https = require('https');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') { res.status(405).json({ status: false, message: 'Method not allowed' }); return; }
    const query = (req.query.q || '').trim();
    if (!query) { res.status(400).json({ status: false, message: 'Parameter q wajib diisi' }); return; }

    try {
        const data = await new Promise((resolve, reject) => {
            https.get({
                hostname: 'suggestqueries.google.com',
                path: '/complete/search?client=youtube&ds=yt&q=' + encodeURIComponent(query),
                headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
                rejectUnauthorized: false, timeout: 15000
            }, res => { let d=''; res.on('data', c=>d+=c); res.on('end', ()=>resolve(d)); }).on('error', reject);
        });
        const json = JSON.parse(data.replace(/^window\.google\.ac\.h\(/, '').replace(/\)$/, ''));
        const suggestions = (Array.isArray(json) && Array.isArray(json[1])) ? json[1].filter(i => Array.isArray(i) && i[0]).map(i => i[0]) : [];
        res.status(200).json(suggestions);
    } catch(e) { res.status(500).json({ status: false, message: 'Gagal: '+e.message }); }
};