/**
 * GET /api/track?id=<videoId>  -> metadata satu lagu (judul, artis, album, durasi, cover)
 * Dipakai fitur share link (?play=ID) dan "buka lagu dari videoId" di frontend,
 * supaya judul/cover tidak lagi diambil dari hasil pencarian teks (dulu salah lagu).
 */
const { applyCors, errJson, extractVideoId } = require('./_lib/core');
const { getTrack } = require('./_lib/trackinfo');

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    const raw = String(req.query.id || req.query.v || req.query.videoId || '').trim();
    const videoId = extractVideoId(raw);
    if (!videoId) return errJson(res, 400, 'Parameter id (videoId YouTube) wajib diisi');

    try {
        const t = await getTrack(videoId);
        if (!t || !t.title) return errJson(res, 404, 'Metadata lagu tidak ditemukan');
        res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=86400');
        return res.status(200).json({ status: true, result: t });
    } catch (e) {
        return errJson(res, 500, 'Gagal: ' + e.message);
    }
};
