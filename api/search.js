const axios = require('axios');

module.exports = async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter query diperlukan' });

  try {
    const { data } = await axios.post('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
      context: {
        client: { clientName: 'WEB_REMIX', clientVersion: '1.20260620.07.01', hl: 'id', gl: 'ID' }
      },
      query: query,
      params: 'EgWKAQIIAWoSEAQQAxAFEAkQChAVEBAQERAO'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://music.youtube.com'
      },
      timeout: 15000
    });

    const songs = [];
    const tabs = data?.contents?.tabbedSearchResultsRenderer?.tabs || [];

    for (const tab of tabs) {
      const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of sections) {
        const shelf = section?.musicShelfRenderer;
        const items = shelf?.contents || section?.itemSectionRenderer?.contents || [];

        for (const item of items) {
          const r = item?.musicResponsiveListItemRenderer;
          if (!r) continue;

          const cols = r.flexColumns || [];

          // Title dari col 0
          const titleRuns = cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const title = titleRuns.map(x => x.text).join('');

          // Subtitle dari col 1: "Lagu • Artist • Album • Durasi"
          const subRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          
          // Parse: cari artist (punya browseId UC...) & album (punya browseId MPRE...)
          let artist = '';
          let artistId = '';
          let album = '';
          let albumId = '';
          let duration = '';

          for (let i = 0; i < subRuns.length; i++) {
            const run = subRuns[i];
            const text = run.text || '';
            const browseId = run?.navigationEndpoint?.browseEndpoint?.browseId || '';

            if (browseId.startsWith('UC')) {
              artist = text;
              artistId = browseId;
            } else if (browseId.startsWith('MPRE')) {
              album = text;
              albumId = browseId;
            }
          }

          // Duration: ambil dari accessibility label atau text terakhir
          const accLabel = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.accessibility?.accessibilityData?.label || '';
          const durMatch = accLabel.match(/(\d+)\s*(?:menit|min)\s*(?:(\d+)\s*(?:detik|det))?/);
          if (durMatch) {
            duration = durMatch[1] + '.' + (durMatch[2] || '00').padStart(2, '0');
          }
          if (!duration) {
            // Fallback: cari text dengan format menit
            const allText = subRuns.map(x => x.text).join(' ');
            const m = allText.match(/(\d+)\s*(?:menit|min)/);
            if (m) duration = m[1] + '.00';
          }

          // Type: "Lagu" atau "Video"
          const type = subRuns[0]?.text || '';
          if (type === 'Video') continue;

          // Plays dari col 2
          const playsRuns = cols[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const plays = playsRuns.map(x => x.text).join('');

          // Video ID
          const videoId = r?.playlistItemData?.videoId || '';

          // Thumbnail
          const thumbs = r?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : '';

          songs.push({
            title,
            videoId,
            thumbnail,
            url: videoId ? `https://music.youtube.com/watch?v=${videoId}` : '',
            artist: artist || (subRuns[1]?.text || ''),
            artistId,
            album: album || '',
            albumId,
            duration,
            plays
          });
        }
      }
    }

    return res.json({
      status: true,
      creator: 'Nanzz',
      result: { query, total: songs.length, songs }
    });

  } catch (err) {
    return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
  }
};