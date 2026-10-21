/**
 * GET /api/health -> status ringkas: versi, runtime, dan daftar endpoint.
 * Dipakai untuk memantau apakah API hidup tanpa mengganggu upstream.
 */
const { applyCors, errJson } = require('./_lib/core');

const START = Date.now();
let VERSION = '3.2.1';
try { VERSION = require('../package.json').version || VERSION; } catch (e) { /* diabaikan */ }

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') return errJson(res, 405, 'Method not allowed');

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
    return res.status(200).json({
        status: true,
        app: 'Musicall',
        version: VERSION,
        node: process.version,
        region: process.env.VERCEL_REGION || null,
        uptimeSec: Math.round((Date.now() - START) / 1000),
        time: new Date().toISOString(),
        endpoints: [
            '/api/search?q=', '/api/album?id=', '/api/artist?id=', '/api/track?id=',
            '/api/lyrics?id=', '/api/lyrics?title=&artist=', '/api/suggest?q=',
            '/api/ytplay?q=', '/api/stream?q=', '/api/proxy-audio?url=', '/api/health'
        ]
    });
};
