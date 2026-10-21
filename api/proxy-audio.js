/**
 * GET /api/proxy-audio?url=<audio-url>
 * Proxy streaming audio (dipakai saat equalizer Web Audio aktif -> butuh CORS/izin
 * cross-origin). Dibatasi hanya host hasil ekstraksi sendiri supaya tidak jadi
 * open proxy / celah SSRF (sebelumnya ?url=http://169.254.169.254 bisa ditembak).
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { applyCors, errJson, isSafeHttpUrl, isAllowedProxyHost, UA } = require('./_lib/core');

const MAX_REDIRECTS = 4;
const CONNECT_TIMEOUT = 12000;
const IDLE_TIMEOUT = 45000;

function streamTo(targetUrl, req, res, depth) {
    if (depth > MAX_REDIRECTS) return errJson(res, 502, 'Terlalu banyak redirect');

    const u = isSafeHttpUrl(targetUrl);
    if (!u) return errJson(res, 403, 'URL tidak diizinkan');
    if (!isAllowedProxyHost(u.hostname)) return errJson(res, 403, 'Host tidak diizinkan');

    const client = u.protocol === 'https:' ? https : http;
    const headers = { 'User-Agent': UA, 'Accept': '*/*' };
    if (req.headers.range) headers.Range = req.headers.range;

    const up = client.get(u.toString(), { headers, timeout: CONNECT_TIMEOUT }, (upRes) => {
        const code = upRes.statusCode || 502;

        if (code >= 300 && code < 400 && upRes.headers.location) {
            upRes.resume();
            const next = new URL(upRes.headers.location, u).toString();
            return streamTo(next, req, res, depth + 1);
        }

        if (code >= 400) {
            upRes.resume();
            return errJson(res, code === 416 ? 416 : 502, 'Sumber audio menolak permintaan (' + code + ')');
        }

        res.status(code);
        ['content-type', 'content-length', 'accept-ranges', 'content-range', 'last-modified', 'etag'].forEach((h) => {
            if (upRes.headers[h]) res.setHeader(h, upRes.headers[h]);
        });
        if (!upRes.headers['content-type']) res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');

        upRes.on('error', () => { try { res.destroy(); } catch (e) {} });
        upRes.pipe(res);
        upRes.setTimeout(IDLE_TIMEOUT, () => { try { upRes.destroy(); } catch (e) {} });
    });

    up.on('timeout', () => { up.destroy(); if (!res.headersSent) errJson(res, 504, 'Sumber audio timeout'); });
    up.on('error', (e) => { if (!res.headersSent) errJson(res, 502, 'Gagal mengambil audio: ' + e.message); });
    // Klien menutup koneksi (pindah lagu / seek) -> hentikan upstream biar tidak boros kuota
    req.on('close', () => { try { up.destroy(); } catch (e) {} });
}

module.exports = async (req, res) => {
    if (applyCors(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET' && req.method !== 'HEAD') return errJson(res, 405, 'Method not allowed');

    const raw = String(req.query.url || '').trim();
    if (!raw) return errJson(res, 400, 'Parameter url wajib diisi');

    streamTo(raw, req, res, 0);
};
