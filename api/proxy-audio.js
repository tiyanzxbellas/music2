const https = require('https');
const http = require('http');

function pipeAudioUrl(targetUrl, reqHeaders, res, depth = 0) {
  if (depth > 5) {
    res.status(500).send('Too many redirects');
    return;
  }
  try {
    const client = targetUrl.startsWith('https') ? https : http;
    const req = client.get(targetUrl, { headers: reqHeaders, rejectUnauthorized: false }, (targetRes) => {
      if (targetRes.statusCode && targetRes.statusCode >= 300 && targetRes.statusCode < 400 && targetRes.headers.location) {
        let redirectUrl = targetRes.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsed = new URL(targetUrl);
          redirectUrl = parsed.protocol + '//' + parsed.host + redirectUrl;
        }
        pipeAudioUrl(redirectUrl, reqHeaders, res, depth + 1);
        return;
      }

      res.status(targetRes.statusCode || 200);
      const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
      headersToForward.forEach(h => {
        if (targetRes.headers[h]) {
          res.setHeader(h, targetRes.headers[h]);
        }
      });
      targetRes.pipe(res);
    });

    req.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).send('Proxy error: ' + err.message);
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send('Proxy exception: ' + err.message);
    }
  }
}

module.exports = async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.status(400).send('Missing url parameter');
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const reqHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36',
    'Range': req.headers.range || ''
  };
  pipeAudioUrl(targetUrl, reqHeaders, res);
};
