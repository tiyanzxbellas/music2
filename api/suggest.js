/**
 * GET /api/suggest?q=<kata> -> ["saran 1", ...]
 * Cache 15 menit: endpoint ini dipanggil tiap ketikan (hemat kuota + respons instan).
 */
const https = require('https');
const { ttlCache, applyCors, errJson, UA } = require('./_lib/core');

const cache = ttlCache(256, 15 * 60 * 1000);

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    const query = String(req.query.q || '').trim();
    if (!query) return errJson(res, 400, 'Parameter q wajib diisi');

    const key = query.toLowerCase();
    const hit = cache.get(key);
    if (hit) {
        res.setHeader('Cache-Control', 'public, max-age=180, s-maxage=900');
        return res.status(200).json(hit);
    }

    try {
        const data = await new Promise((resolve, reject) => {
            const req2 = https.get({
                hostname: 'suggestqueries.google.com',
                path: '/complete/search?client=youtube&ds=yt&q=' + encodeURIComponent(query),
                headers: { 'User-Agent': UA },
                timeout: 10000
            }, (r) => {
                let d = '';
                r.on('data', (c) => (d += c));
                r.on('end', () => resolve(d));
            });
            req2.on('error', reject);
            req2.on('timeout', () => { req2.destroy(); reject(new Error('Timeout')); });
        });

        const json = JSON.parse(data.replace(/^window\.google\.ac\.h\(/, '').replace(/\)$/, ''));
        const suggestions = (Array.isArray(json) && Array.isArray(json[1]))
            ? json[1].filter((i) => Array.isArray(i) && i[0]).map((i) => i[0])
            : [];
        cache.set(key, suggestions);
        res.setHeader('Cache-Control', 'public, max-age=180, s-maxage=900');
        return res.status(200).json(suggestions);
    } catch (e) {
        // Gagal ambil saran bukan alasan bikin UI error: balikin array kosong.
        return res.status(200).json([]);
    }
};
