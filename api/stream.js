const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ status: false, message: 'Method not allowed' });
        return;
    }

    const query = (req.query.q || '').trim();
    if (!query) {
        res.status(400).json({ status: false, message: 'Parameter q wajib diisi' });
        return;
    }

    try {
        const apiUrl = 'https://api.lexcode.biz.id/api/dwn/ytplay?q=' + encodeURIComponent(query);
        
        const result = await new Promise((resolve, reject) => {
            const client = apiUrl.startsWith('https') ? https : http;
            client.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36'
                },
                rejectUnauthorized: false,
                timeout: 30000
            }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                });
            }).on('error', reject).on('timeout', () => {
                resolve(null);
            });
        });

        if (!result) {
            res.status(500).json({ status: false, message: 'Gagal fetch dari upstream' });
            return;
        }

        // Cari URL MP3
        function findAudioUrl(obj, depth = 0) {
            if (depth > 10 || !obj || typeof obj !== 'object') return '';
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    const found = findAudioUrl(item, depth + 1);
                    if (found) return found;
                }
                return '';
            }
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (typeof val === 'string' && filter_var_safe(val) && (
                    val.includes('.mp3') || val.includes('audio') || val.includes('stream')
                )) {
                    return val;
                }
                if (typeof val === 'object') {
                    const found = findAudioUrl(val, depth + 1);
                    if (found) return found;
                }
            }
            return '';
        }

        function filter_var_safe(url) {
            try {
                return url.startsWith('http://') || url.startsWith('https://');
            } catch (e) {
                return false;
            }
        }

        let audioUrl = findAudioUrl(result);

        // Fallback
        if (!audioUrl) {
            const r = result.result || result.data || result;
            audioUrl = r.download || r.url || r.audio || r.mp3 || r.link || r.stream || '';
        }

        if (!audioUrl || !filter_var_safe(audioUrl)) {
            res.status(500).json({ status: false, message: 'URL audio tidak ditemukan' });
            return;
        }

        res.status(200).json({
            status: true,
            result: {
                url: audioUrl,
                type: 'mp3',
                creator: 'Nanzz'
            }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'Error: ' + error.message });
    }
};