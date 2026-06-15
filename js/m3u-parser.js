/**
 * M3U Parser — parses M3U/M3U8 playlist text into channel objects
 */
function parseM3U(text) {
  const channels = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  if (!lines[0]?.startsWith('#EXTM3U')) {
    // Try to parse anyway
  }

  let meta = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXTINF:')) {
      meta = parseExtInf(line);
    } else if (!line.startsWith('#') && line.length > 0) {
      if (meta) {
        channels.push({ ...meta, url: line, id: channels.length });
        meta = null;
      } else {
        // URL without EXTINF — basic entry
        channels.push({
          id: channels.length,
          name: guessName(line),
          url: line,
          logo: '',
          group: 'Uncategorized',
          tvgId: '',
          tvgName: '',
        });
      }
    }
  }

  return channels;
}

function parseExtInf(line) {
  // #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",Display Name
  const commaIdx = line.lastIndexOf(',');
  const attrPart = commaIdx >= 0 ? line.slice(0, commaIdx) : line;
  const displayName = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : '';

  function attr(key) {
    const re = new RegExp(`${key}="([^"]*)"`, 'i');
    const m = attrPart.match(re);
    return m ? m[1].trim() : '';
  }

  return {
    name: displayName || attr('tvg-name') || 'Unknown',
    logo: attr('tvg-logo'),
    group: attr('group-title') || 'Uncategorized',
    tvgId: attr('tvg-id'),
    tvgName: attr('tvg-name'),
  };
}

function guessName(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || u.hostname;
    return last.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  } catch {
    return 'Unknown Channel';
  }
}

/**
 * Fetch M3U from a URL (requires CORS)
 */
async function fetchM3U(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  return resp.text();
}

/**
 * Demo playlists
 */
const DEMOS = {
  basic: `#EXTM3U
#EXTINF:-1 tvg-name="Big Buck Bunny" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg" group-title="Movies",Big Buck Bunny
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-name="Elephants Dream" tvg-logo="" group-title="Movies",Elephants Dream
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-name="For Bigger Blazes" tvg-logo="" group-title="Sports",For Bigger Blazes
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
#EXTINF:-1 tvg-name="For Bigger Escapes" tvg-logo="" group-title="Sports",For Bigger Escapes
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4
#EXTINF:-1 tvg-name="Subaru Outback" tvg-logo="" group-title="Ads",Subaru Outback
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4
#EXTINF:-1 tvg-name="Volkswagen GTI" tvg-logo="" group-title="Ads",Volkswagen GTI
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4
#EXTINF:-1 tvg-name="We Are Going On Bullrun" tvg-logo="" group-title="Kids",We Are Going On Bullrun
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4
#EXTINF:-1 tvg-name="What Care" tvg-logo="" group-title="Kids",What Care
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4
#EXTINF:-1 tvg-name="HLS Stream 1" tvg-logo="" group-title="Live",HLS Stream 1
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-name="Tears of Steel" tvg-logo="" group-title="Movies",Tears of Steel
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4
#EXTINF:-1 tvg-name="Sintel" tvg-logo="" group-title="Movies",Sintel
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4
#EXTINF:-1 tvg-name="Sample HLS" tvg-logo="" group-title="Live",Sample HLS
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`,

  news: `#EXTM3U
#EXTINF:-1 tvg-name="Demo News 1" tvg-logo="" group-title="News",Demo News 1
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
#EXTINF:-1 tvg-name="Demo News 2" tvg-logo="" group-title="News",Demo News 2
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
#EXTINF:-1 tvg-name="Demo News 3" tvg-logo="" group-title="News",Demo News 3
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
#EXTINF:-1 tvg-name="Demo News 4" tvg-logo="" group-title="News",Demo News 4
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4
#EXTINF:-1 tvg-name="Demo News 5" tvg-logo="" group-title="News",Demo News 5
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4`,
};
