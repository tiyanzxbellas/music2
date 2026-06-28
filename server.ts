import express from 'express';
import path from 'path';
import https from 'https';
import http from 'http';

// Load raw Vercel API handlers
import searchHandler from './api/search.js';
import lyricsHandler from './api/lyrics.js';
import artistHandler from './api/artist.js';
import suggestHandler from './api/suggest.js';
import ytplayHandler from './api/ytplay.js';
import streamHandler from './api/stream.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function pipeAudioUrl(targetUrl: string, reqHeaders: any, res: express.Response, depth = 0) {
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
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).send('Proxy exception: ' + err.message);
    }
  }
}

// Serve Vercel rewrites for frontend .js scripts directly to public/
app.get('/player.js', (req, res) => res.sendFile(path.join(process.cwd(), 'public/player.js')));
app.get('/home.js', (req, res) => res.sendFile(path.join(process.cwd(), 'public/home.js')));
app.get('/search.js', (req, res) => res.sendFile(path.join(process.cwd(), 'public/search.js')));
app.get('/miniplayer.js', (req, res) => res.sendFile(path.join(process.cwd(), 'public/miniplayer.js')));
app.get('/fullplayer.js', (req, res) => res.sendFile(path.join(process.cwd(), 'public/fullplayer.js')));
app.get('/artist.js', (req, res) => res.sendFile(path.join(process.cwd(), 'public/artist.js')));
app.get('/app.js', (req, res) => res.sendFile(path.join(process.cwd(), 'public/app.js')));

// Map backend API routes to the actual handlers
app.get('/api/search', searchHandler);
app.get('/api/lyrics', lyricsHandler);
app.get('/api/artist', artistHandler);
app.get('/api/suggest', suggestHandler);
app.post('/api/ytplay', ytplayHandler); // ytplay uses POST in the client-side code
app.get('/api/stream', streamHandler);

app.get('/api/proxy-audio', (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    res.status(400).send('Missing url parameter');
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  const reqHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36',
    'Range': req.headers.range || ''
  };
  pipeAudioUrl(targetUrl, reqHeaders, res);
});

// Serve standard static assets in public/
app.use(express.static(path.join(process.cwd(), 'public')));

// Fallback to serving public/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
