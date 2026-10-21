/**
 * Fallback untuk path /api/* yang tidak dikenal.
 * Tanpa ini, Vercel me-rewrite /api/apapun ke file statis -> jadi 200 HTML
 * (menyamarkan error, bikin klien bingung karena responsnya bukan JSON).
 */
module.exports = async (req, res) => {
    res.status(404).json({
        status: false,
        message: 'Endpoint tidak ditemukan',
        available: [
            '/api/search?query=', '/api/album?id=', '/api/artist?id=',
            '/api/track?id=', '/api/lyrics?id=', '/api/suggest?q=',
            '/api/ytplay?q=', '/api/stream?q=', '/api/proxy-audio?url=', '/api/health'
        ]
    });
};
