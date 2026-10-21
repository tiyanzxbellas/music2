// Harness tes semua handler tanpa express (req/res tiruan).
const path = require('path');
function mkres() {
  const r = { headers: {}, code: 200 };
  r.status = (c) => { r.code = c; return r; };
  r.setHeader = (k, v) => { r.headers[String(k).toLowerCase()] = v; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r; r.send = (b) => { r.body = b; return r; };
  return r;
}
async function call(name, query, method) {
  const h = require(path.join(__dirname, '..', 'api', name + '.js'));
  const res = mkres();
  const t = Date.now();
  await h({ method: method || 'GET', query: query || {}, headers: {}, body: {} }, res);
  const ms = Date.now() - t;
  let info = '';
  const b = res.body;
  if (name === 'search') info = `total=${b.result && b.result.total} items=${b.result && b.result.items.length} types=${JSON.stringify((b.result?.items||[]).reduce((a,i)=>(a[i.type]=(a[i.type]||0)+1,a),{}))}`;
  else if (name === 'album') info = `title=${b.result && b.result.title} tracks=${b.result && b.result.total} first=${b.result?.tracks?.[0]?.title}`;
  else if (name === 'artist') info = `name=${b.result && b.result.name} songs=${b.result?.topSongs?.length} albums=${b.result?.topAlbums?.length}`;
  else if (name === 'lyrics') info = `title=${b.result && b.result.title} type=${b.result?.lyrics?.type} lines=${b.result?.lyrics?.lines?.length}`;
  else if (name === 'suggest') info = `n=${Array.isArray(b) ? b.length : '?'} ${JSON.stringify(b).slice(0,60)}`;
  else if (name === 'ytplay' || name === 'stream') info = JSON.stringify(b.result || b).slice(0, 120);
  else if (name === 'proxy-audio') info = JSON.stringify(b).slice(0, 80);
  console.log(`[${name}] ${res.code} ${ms}ms ${info}`);
  return { code: res.code, body: b };
}
(async () => {
  await call('search', { query: 'tulus' });
  await call('search', { query: 'tulus', filter: 'videos' });
  await call('search', { query: 'tulus', filter: 'artists' });
  await call('album', { id: 'MPREb_wkOQCl4WIAV' });
  await call('artist', { id: 'UC_DHlXllTSMB8pTC38_leFg' });
  await call('artist', { id: 'MPREb_wkOQCl4WIAV' }); // harus jadi album
  await call('lyrics', { id: 'E7kHvjvU6JY' });
  await call('suggest', { q: 'tulus' });
  await call('ytplay', { q: 'jNQXAC9IVRw' });
  await call('stream', { q: 'https://youtu.be/E7kHvjvU6JY' }, 'GET');
  await call('proxy-audio', { url: 'http://169.254.169.254/latest/meta-data/' }); // HARUS 403
  await call('proxy-audio', { url: 'https://example.com/x.mp3' });               // HARUS 403
  await call('search', {});                                                      // HARUS 400
  process.exit(0);
})();
