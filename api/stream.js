/**
 * GET /api/stream?q=...   (endpoint lama, dipertahankan untuk kompatibilitas)
 * Dulu menembak api.lexcode.biz.id yang sekarang NXDOMAIN.
 * Sekarang memakai mesin yang sama dengan /api/ytplay.
 */
const { extract } = require('./_lib/ytplay');
const { applyCors, errJson } = require('./_lib/core');

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    const query = String(req.query.q || req.query.query || req.query.url || '').trim();
    if (!query) return errJson(res, 400, 'Parameter q wajib diisi');

    try {
        const r = await extract(query);
        if (!r) return errJson(res, 503, 'URL audio tidak ditemukan');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900');
        return res.status(200).json({
            status: true,
            result: {
                url: r.audio,
                proxy: '/api/proxy-audio?url=' + encodeURIComponent(r.audio),
                type: 'mp3',
                duration: r.duration,
                videoId: r.videoId,
                source: r.source
            }
        });
    } catch (err) {
        return errJson(res, 500, 'Error: ' + err.message);
    }
};
