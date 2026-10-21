/**
 * POST /api/ytplay   body: { query: videoId | URL YouTube | teks }
 * GET  /api/ytplay?q=...
 * -> { status, result: { videoId, duration, title, download: { audio, proxy } } }
 *
 * `download.audio` = link CDN langsung (bisa dipakai <audio src>).
 * `download.proxy` = lewat /api/proxy-audio (wajib kalau pakai Web Audio / equalizer).
 */
const { extract } = require('./_lib/ytplay');
const { applyCors, errJson } = require('./_lib/core');

module.exports = async (req, res) => {
    if (applyCors(req, res, 'POST, GET, OPTIONS')) return;
    if (req.method !== 'POST' && req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    const query = String(body.query || body.url || body.q || req.query.q || '').trim();
    if (!query) return errJson(res, 400, 'Parameter query wajib diisi');

    try {
        const r = await extract(query);
        if (!r) return errJson(res, 503, 'Layanan ekstraksi audio sedang sibuk, coba lagu lain.');

        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900');
        return res.status(200).json({
            status: true,
            result: {
                videoId: r.videoId,
                title: r.title,
                duration: r.duration,
                source: r.source,
                cached: r.cached,
                download: {
                    audio: r.audio,
                    proxy: '/api/proxy-audio?url=' + encodeURIComponent(r.audio)
                }
            }
        });
    } catch (err) {
        return errJson(res, 500, 'Error: ' + err.message);
    }
};
