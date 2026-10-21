/**
 * Utilitas bersama untuk semua handler API.
 * Dipakai oleh fungsi Vercel (api/*.js) dan server lokal (server.ts).
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/* ------------------------------------------------------------------ */
/* Cache TTL sederhana di memori (serverless: satu instance proses)   */
/* ------------------------------------------------------------------ */
function ttlCache(maxEntries, ttlMs) {
    const m = new Map(); // key -> {v, exp}
    return {
        get(k) {
            const e = m.get(k);
            if (!e) return undefined;
            if (Date.now() > e.exp) { m.delete(k); return undefined; }
            return e.v;
        },
        set(k, v) {
            if (m.size >= maxEntries) {
                // buang entry tua
                let oldestKey = null, oldest = Infinity;
                for (const [k2, e] of m) { if (e.exp < oldest) { oldest = e.exp; oldestKey = k2; } }
                if (oldestKey) m.delete(oldestKey);
            }
            m.set(k, { v, exp: Date.now() + ttlMs });
        }
    };
}

/**
 * HTTP JSON dengan timeout, redirect dibatasi.
 * Selalu punya timeout supaya handler tidak menggantung sampai limit Vercel.
 * @returns {Promise<{code:number, json:*, headers:Object}>}
 */
function httpJSON(urlStr, opts) {
    opts = opts || {};
    const maxRedirects = opts.maxRedirects == null ? 3 : opts.maxRedirects;
    return new Promise((resolve, reject) => {
        let u;
        try { u = new URL(urlStr); } catch (e) { reject(e); return; }
        const isHttps = u.protocol === 'https:';
        const payload = opts.body != null ? JSON.stringify(opts.body) : null;
        const headers = Object.assign(
            { 'User-Agent': opts.userAgent || UA, 'Accept': 'application/json' },
            opts.headers || {}
        );
        if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
        const req = (isHttps ? https : http).request({
            hostname: u.hostname,
            port: u.port || undefined,
            path: u.pathname + (u.search || ''),
            method: opts.method || 'GET',
            headers,
            timeout: opts.timeout || 12000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
                const loc = new URL(res.headers.location, u);
                resolve(httpJSON(loc.toString(), Object.assign({}, opts, { maxRedirects: maxRedirects - 1 })));
                res.resume();
                return;
            }
            let d = '';
            res.on('data', (c) => { d += c; if (d.length > 4 * 1024 * 1024) { req.destroy(); } });
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(d); } catch (e) { /* biarkan null */ }
                resolve({ code: res.statusCode, json, headers: res.headers, raw: d });
            });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

/** NPC hosts: localhost / private ranges. Cegah SSRF ke loopback/cloud metadata. */
const PRIVATE_HOST_RE = /^(localhost$|127\.|0\.|10\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|\[::1\]$|\[fc|\[fd|\[fe80)/i;

function isPrivateHost(hostname) {
    const h = String(hostname || '').toLowerCase().replace(/\.$/, '');
    if (PRIVATE_HOST_RE.test(h)) return true;
    if (h.endsWith('.internal') || h.endsWith('.local') || h.endsWith('.lan')) return true;
    return false;
}

/** Host proxy audio yang diizinkan (hanya sumber hasil ekstraksi sendiri). */
const PROXY_HOST_SUFFIXES = [
    'savetube.vip',           // CDN audio hasil /api/ytplay
    'googlevideo.com',        // CDN YouTube
    'lexcode.biz.id',         // fallback extractor legacy
];

function isAllowedProxyHost(hostname) {
    const h = String(hostname || '').toLowerCase();
    if (isPrivateHost(h)) return false;
    return PROXY_HOST_SUFFIXES.some((s) => h === s || h.endsWith('.' + s));
}

function isSafeHttpUrl(raw) {
    let u;
    try { u = new URL(raw); } catch (e) { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (! /^https?:$/.test(u.protocol)) return null;
    if (u.username || u.password) return null;
    if (u.port && u.port !== '80' && u.port !== '443') return null;
    if (isPrivateHost(u.hostname)) return null;
    return u;
}

/** Terima: videoId, watch/youtu.be/shorts/embed URL -> videoId atas 11 karakter. */
const VID_RE = /^[A-Za-z0-9_-]{11}$/;
function extractVideoId(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (VID_RE.test(s)) return s;
    const m = s.match(/(?:watch\?v=|\/embed\/|\/shorts\/|\/v\/|youtu\.be\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

/** Pesan JSON konsisten buat semua handler. */
function okJson(res, body) { res.status(200).json(Object.assign({ status: true }, body)); }
function errJson(res, code, message, extra) {
    res.status(code).json(Object.assign({ status: false, message }, extra || {}));
}
/* CORS standar untuk semua endpoint */
function applyCors(req, res, methods) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', methods || 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
    return false;
}

module.exports = {
    UA, isPrivateHost, isPrivateHostRE: PRIVATE_HOST_RE, isAllowedProxyHost, isSafeHttpUrl,
    extractVideoId, httpJSON, ttlCache, okJson, errJson, applyCors,
};
