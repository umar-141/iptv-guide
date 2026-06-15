/**
 * XMLTV EPG Parser
 * Parses XMLTV format and returns a map: channelId → [{title, start, stop, desc}]
 */
function parseXMLTV(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  if (doc.querySelector('parseerror')) {
    throw new Error('Invalid XML. Make sure you paste valid XMLTV data.');
  }

  const channels = {};
  const programs = {};

  // Parse channels
  doc.querySelectorAll('channel').forEach(ch => {
    const id = ch.getAttribute('id');
    const name = ch.querySelector('display-name')?.textContent || id;
    channels[id] = name;
    programs[id] = [];
  });

  // Parse programmes
  doc.querySelectorAll('programme').forEach(prog => {
    const chId = prog.getAttribute('channel');
    const start = parseXMLTVDate(prog.getAttribute('start'));
    const stop = parseXMLTVDate(prog.getAttribute('stop'));
    const title = prog.querySelector('title')?.textContent || 'Unknown';
    const desc = prog.querySelector('desc')?.textContent || '';
    const category = prog.querySelector('category')?.textContent || '';

    if (chId) {
      if (!programs[chId]) programs[chId] = [];
      programs[chId].push({ title, start, stop, desc, category });
    }
  });

  return { channels, programs };
}

/**
 * Parse XMLTV date format: "20240101063000 +0000" → Date
 */
function parseXMLTVDate(str) {
  if (!str) return null;
  // Format: YYYYMMDDHHMMSS +HHMM
  const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, tz] = m;
  const isoStr = `${y}-${mo}-${d}T${h}:${mi}:${s}${tz ? tz.replace(/([+-])(\d{2})(\d{2})/, '$1$2:$3') : 'Z'}`;
  return new Date(isoStr);
}

/**
 * Generate fake demo EPG for a list of channel names
 */
function generateDemoEPG(channels) {
  const programs = {};
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const showNames = {
    'Movies': ['Morning Movie', 'Classic Film', 'Action Hour', 'Drama Special', 'Documentary', 'Late Night Feature', 'Weekend Cinema'],
    'News': ['Morning Briefing', 'World News', 'Business Report', 'Weather Update', 'Sports Roundup', 'Evening News', 'Late Headlines'],
    'Sports': ['Live Match', 'Game Day', 'Sports Centre', 'Highlights', 'Talk Show', 'Pre-Game', 'Post-Match Analysis'],
    'Kids': ['Cartoon Hour', 'Story Time', 'Educational Fun', 'Animation', 'Kids Corner', 'Fun Zone', 'Adventure Time'],
    'Live': ['Live TV', 'Stream 1', 'Channel Live', 'Broadcast', 'On Air'],
    'Ads': ['Commercial Break', 'Ad Showcase', 'Promo Reel'],
    'default': ['Morning Show', 'Midday Report', 'Afternoon Special', 'Evening Feature', 'Prime Time', 'Late Show', 'Night Owl'],
  };

  channels.forEach(ch => {
    const chPrograms = [];
    const shows = showNames[ch.group] || showNames['default'];
    let cursor = new Date(dayStart);

    for (let i = 0; i < 24; i++) {
      const duration = [30, 60, 90][Math.floor(Math.random() * 3)]; // 30/60/90 min
      const stop = new Date(cursor.getTime() + duration * 60000);
      chPrograms.push({
        title: shows[i % shows.length],
        start: new Date(cursor),
        stop,
        desc: `${shows[i % shows.length]} on ${ch.name}`,
        category: ch.group,
      });
      cursor = stop;
      if (cursor >= new Date(dayStart.getTime() + 86400000)) break;
    }

    programs[ch.tvgId || String(ch.id)] = chPrograms;
  });

  return programs;
}

/**
 * Find current program for a channel at a given time
 */
function getCurrentProgram(programs, channelId, time = new Date()) {
  const progs = programs[channelId];
  if (!progs) return null;
  return progs.find(p => p.start <= time && p.stop > time) || null;
}

/**
 * Get programs in a time window
 */
function getProgramsInWindow(programs, channelId, windowStart, windowEnd) {
  const progs = programs[channelId];
  if (!progs) return [];
  return progs.filter(p => p.stop > windowStart && p.start < windowEnd);
}
