/**
 * Server lokal (dev/produksi rumahan).
 * Di Vercel, tiap file di folder api/ otomatis jadi serverless function;
 * file ini hanya dipakai kalau aplikasi dijalankan sendiri (npm run dev).
 */
import express from 'express';
import path from 'path';

import searchHandler from './api/search.js';
import lyricsHandler from './api/lyrics.js';
import artistHandler from './api/artist.js';
import albumHandler from './api/album.js';
import trackHandler from './api/track.js';
import suggestHandler from './api/suggest.js';
import ytplayHandler from './api/ytplay.js';
import streamHandler from './api/stream.js';
import proxyAudioHandler from './api/proxy-audio.js';
import healthHandler from './api/health.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true }));

// --- API ---
app.get('/api/search', searchHandler as any);
app.get('/api/lyrics', lyricsHandler as any);
app.get('/api/artist', artistHandler as any);
app.get('/api/album', albumHandler as any);
app.get('/api/track', trackHandler as any);
app.get('/api/suggest', suggestHandler as any);
app.all('/api/ytplay', ytplayHandler as any);
app.get('/api/stream', streamHandler as any);
app.all('/api/proxy-audio', proxyAudioHandler as any);
app.get('/api/health', healthHandler as any);
app.all('/api/*', (_req, res) => res.status(404).json({ status: false, message: 'Endpoint tidak ditemukan' }));

// --- Static (public/) ---
const PUB = path.join(process.cwd(), 'public');
app.use(express.static(PUB, { extensions: ['html'], maxAge: '1h' }));

// SPA fallback (jangan menelan /api)
app.get('*', (_req, res) => res.sendFile(path.join(PUB, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Musicall server jalan di http://localhost:${PORT}`);
});
