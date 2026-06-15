/**
 * IPTV Guide — Main App
 */

// ═══════════════════════ STATE ═══════════════════════
const state = {
  channels: [],
  filteredChannels: [],
  epgData: {},          // channelId → [{title, start, stop}]
  selectedChannel: null,
  activeCategory: 'all',
  searchQuery: '',
  epgWindowStart: null, // start of visible time window
  hls: null,
  epgHoursVisible: 6,   // hours visible in EPG grid
  theme: 'dark',
};

// ═══════════════════════ INIT ═══════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEPGTime();
  bindEvents();
  renderEPGGrid();

  // Restore from localStorage
  const saved = localStorage.getItem('iptv_channels');
  if (saved) {
    try {
      const channels = JSON.parse(saved);
      loadChannels(channels);
      showToast(`Restored ${channels.length} channels`, 'success');
    } catch {}
  }
});

// ═══════════════════════ THEME ═══════════════════════
function initTheme() {
  const saved = localStorage.getItem('iptv_theme') || 'dark';
  setTheme(saved);
}

function setTheme(t) {
  state.theme = t;
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '');
  document.getElementById('themeToggle').textContent = t === 'light' ? '🌙' : '☀️';
  localStorage.setItem('iptv_theme', t);
}

// ═══════════════════════ BIND EVENTS ═══════════════════════
function bindEvents() {
  // Theme
  document.getElementById('themeToggle').addEventListener('click', () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.toLowerCase();
    clearSearch.style.display = state.searchQuery ? 'flex' : 'none';
    filterChannels();
  });
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearch.style.display = 'none';
    filterChannels();
  });

  // Import M3U modal
  document.getElementById('importBtn').addEventListener('click', () => openModal('importModal'));
  document.getElementById('closeImportModal').addEventListener('click', () => closeModal('importModal'));
  document.getElementById('importModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('importModal');
  });

  // Tabs in import modal
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('hidden');
    });
  });

  // Load from URL
  document.getElementById('loadUrlBtn').addEventListener('click', async () => {
    const url = document.getElementById('m3uUrl').value.trim();
    if (!url) return showError('importError', 'Please enter a URL.');
    await loadM3UFromUrl(url);
  });

  // Parse paste
  document.getElementById('parsePasteBtn').addEventListener('click', () => {
    const text = document.getElementById('m3uPaste').value.trim();
    if (!text) return showError('importError', 'Please paste M3U content.');
    processM3UText(text);
  });

  // File upload
  const fileInput = document.getElementById('fileInput');
  const fileDrop = document.getElementById('fileDrop');
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) readFileAsM3U(file);
  });
  fileDrop.addEventListener('click', () => fileInput.click());
  fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('dragover'); });
  fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('dragover'));
  fileDrop.addEventListener('drop', e => {
    e.preventDefault(); fileDrop.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) readFileAsM3U(file);
  });

  // EPG Import modal
  document.getElementById('importEpgBtn').addEventListener('click', () => openModal('epgModal'));
  document.getElementById('closeEpgModal').addEventListener('click', () => closeModal('epgModal'));
  document.getElementById('epgModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('epgModal');
  });
  document.getElementById('loadEpgBtn').addEventListener('click', loadEPGFromUrl);
  document.getElementById('parseEpgBtn').addEventListener('click', parseEPGFromPaste);

  // Player close
  document.getElementById('closePlayer').addEventListener('click', closePlayer);

  // EPG navigation
  document.getElementById('epgPrev').addEventListener('click', () => shiftEPG(-state.epgHoursVisible));
  document.getElementById('epgNext').addEventListener('click', () => shiftEPG(state.epgHoursVisible));
  document.getElementById('epgNow').addEventListener('click', () => {
    initEPGTime();
    renderEPGGrid();
  });
}

// ═══════════════════════ M3U LOADING ═══════════════════════
async function loadM3UFromUrl(url) {
  showProgress('importProgress', 0, 'Fetching playlist…');
  hideError('importError');
  try {
    const text = await fetchM3U(url);
    showProgress('importProgress', 60, 'Parsing channels…');
    processM3UText(text);
  } catch (err) {
    hideProgress('importProgress');
    showError('importError', `Failed to load: ${err.message}\n\nTip: The server must allow CORS. Try the Paste tab instead.`);
  }
}

function readFileAsM3U(file) {
  showProgress('importProgress', 10, 'Reading file…');
  const reader = new FileReader();
  reader.onload = e => {
    showProgress('importProgress', 70, 'Parsing…');
    processM3UText(e.target.result);
  };
  reader.onerror = () => showError('importError', 'Failed to read file.');
  reader.readAsText(file);
}

function processM3UText(text) {
  try {
    showProgress('importProgress', 80, 'Loading channels…');
    const channels = parseM3U(text);
    if (!channels.length) throw new Error('No channels found in this playlist.');
    loadChannels(channels);
    localStorage.setItem('iptv_channels', JSON.stringify(channels));
    showProgress('importProgress', 100, `Loaded ${channels.length} channels!`);
    setTimeout(() => {
      hideProgress('importProgress');
      closeModal('importModal');
      showToast(`✓ Loaded ${channels.length} channels`, 'success');
    }, 600);
  } catch (err) {
    hideProgress('importProgress');
    showError('importError', err.message);
  }
}

function loadDemo(type) {
  processM3UText(DEMOS[type]);
}

function loadChannels(channels) {
  state.channels = channels;
  // Generate demo EPG
  state.epgData = generateDemoEPG(channels);
  renderCategories();
  filterChannels();
  renderEPGGrid();
}

// ═══════════════════════ EPG LOADING ═══════════════════════
async function loadEPGFromUrl() {
  const url = document.getElementById('epgUrl').value.trim();
  if (!url) return showError('epgError', 'Please enter a URL.');
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    parseAndApplyEPG(text);
  } catch (err) {
    showError('epgError', `Failed: ${err.message}`);
  }
}

function parseEPGFromPaste() {
  const text = document.getElementById('epgPaste').value.trim();
  if (!text) return showError('epgError', 'Please paste XMLTV data.');
  parseAndApplyEPG(text);
}

function parseAndApplyEPG(text) {
  try {
    const { channels, programs } = parseXMLTV(text);
    // Merge into state, try to match by tvgId
    state.channels.forEach(ch => {
      const key = ch.tvgId || ch.tvgName || ch.name;
      if (programs[key]) state.epgData[String(ch.id)] = programs[key];
    });
    closeModal('epgModal');
    renderEPGGrid();
    showToast('✓ EPG loaded', 'success');
  } catch (err) {
    showError('epgError', err.message);
  }
}

// ═══════════════════════ CATEGORIES ═══════════════════════
function renderCategories() {
  const groups = ['all', ...new Set(state.channels.map(c => c.group).filter(Boolean))];
  const bar = document.getElementById('categoryBar');
  bar.innerHTML = groups.map(g => `
    <button class="cat-btn ${g === state.activeCategory ? 'active' : ''}" data-cat="${g}">
      ${g === 'all' ? 'All' : g}
    </button>
  `).join('');

  bar.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterChannels();
    });
  });
}

// ═══════════════════════ CHANNEL LIST ═══════════════════════
function filterChannels() {
  state.filteredChannels = state.channels.filter(ch => {
    const catOk = state.activeCategory === 'all' || ch.group === state.activeCategory;
    const qOk = !state.searchQuery ||
      ch.name.toLowerCase().includes(state.searchQuery) ||
      (ch.group || '').toLowerCase().includes(state.searchQuery);
    return catOk && qOk;
  });
  renderChannelList();
  renderEPGGrid();
}

function renderChannelList() {
  const list = document.getElementById('channelList');
  const empty = document.getElementById('sidebarEmpty');

  if (!state.filteredChannels.length) {
    list.innerHTML = '';
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');

  list.innerHTML = state.filteredChannels.map(ch => {
    const prog = getCurrentProgram(state.epgData, String(ch.id));
    const isActive = state.selectedChannel?.id === ch.id;
    return `
      <li class="channel-item ${isActive ? 'active' : ''}" data-id="${ch.id}">
        ${ch.logo
          ? `<div class="ch-logo"><img src="${escHtml(ch.logo)}" alt="" onerror="this.parentElement.innerHTML='${getEmoji(ch.group)}'" /></div>`
          : `<div class="ch-logo-placeholder">${getEmoji(ch.group)}</div>`}
        <div class="ch-info">
          <div class="ch-name">${escHtml(ch.name)}</div>
          <div class="ch-group">${escHtml(ch.group)}</div>
          ${prog ? `<div style="font-size:.65rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(prog.title)}</div>` : ''}
        </div>
        <div class="ch-actions">
          <span class="ch-live-badge">LIVE</span>
          <button class="vlc-btn" data-id="${ch.id}" title="Open in VLC">&#9654; VLC</button>
        </div>
      </li>
    `;
  }).join('');

  list.querySelectorAll('.channel-item').forEach(item => {
    item.addEventListener('click', () => {
      const ch = state.channels.find(c => c.id == item.dataset.id);
      if (ch) selectChannel(ch);
    });
  });

  list.querySelectorAll('.vlc-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const ch = state.channels.find(c => c.id == btn.dataset.id);
      if (ch) openInVLC(ch);
    });
  });
}

// ═══════════════════════ VLC ═══════════════════════
function openInVLC(ch) {
  const m3u = '#EXTM3U\n#EXTINF:-1 tvg-name="' + ch.name + '" tvg-logo="' + (ch.logo || '') + '" group-title="' + (ch.group || '') + '",' + ch.name + '\n' + ch.url + '\n';
  const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ch.name.replace(/[^a-z0-9]/gi, '_') + '.m3u';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Downloading .m3u for VLC — double-click the file to open in VLC', 'success');
}

// ═══════════════════════ PLAYER ═══════════════════════
function selectChannel(ch) {
  state.selectedChannel = ch;
  document.getElementById('playerChannelName').textContent = ch.name;
  const prog = getCurrentProgram(state.epgData, String(ch.id));
  document.getElementById('playerProgramName').textContent = prog ? prog.title : 'Live';
  document.getElementById('playerSection').style.display = 'block';

  // Wire VLC button in player
  const playerVlc = document.getElementById('playerVlcBtn');
  if (playerVlc) {
    playerVlc.onclick = (e) => { e.stopPropagation(); openInVLC(ch); };
  }

  playStream(ch.url);
  renderChannelList();
  // Scroll EPG to this channel
  const row = document.getElementById(`epg-row-${ch.id}`);
  if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function playStream(url) {
  const video = document.getElementById('videoPlayer');

  // Destroy old HLS instance
  if (state.hls) { state.hls.destroy(); state.hls = null; }

  if (url.includes('.m3u8') || url.includes('m3u8') || url.toLowerCase().includes('hls')) {
    if (Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1, capLevelToPlayerSize: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          showToast('Stream error — trying direct', 'error');
          video.src = url;
          video.play().catch(() => {});
        }
      });
      state.hls = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    }
  } else {
    video.src = url;
    video.play().catch(() => {});
  }
}

function closePlayer() {
  const video = document.getElementById('videoPlayer');
  if (state.hls) { state.hls.destroy(); state.hls = null; }
  video.pause(); video.src = '';
  document.getElementById('playerSection').style.display = 'none';
  state.selectedChannel = null;
  renderChannelList();
}

// ═══════════════════════ EPG GRID ═══════════════════════
function initEPGTime() {
  const now = new Date();
  // Round to previous 30-min slot
  const mins = now.getMinutes();
  const roundedMins = mins < 30 ? 0 : 30;
  state.epgWindowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMins, 0, 0);
  updateEPGDateLabel();
}

function shiftEPG(hours) {
  state.epgWindowStart = new Date(state.epgWindowStart.getTime() + hours * 3600000);
  updateEPGDateLabel();
  renderEPGGrid();
}

function updateEPGDateLabel() {
  const start = state.epgWindowStart || new Date();
  const end = new Date(start.getTime() + state.epgHoursVisible * 3600000);
  const fmt = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = d => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('epgDateLabel').textContent = `${fmtDate(start)} ${fmt(start)}–${fmt(end)}`;
}

function renderEPGGrid() {
  const gridWrap = document.getElementById('epgGridWrap');
  const epgEmpty = document.getElementById('epgEmpty');
  const timeHeader = document.getElementById('epgTimeHeader');
  const grid = document.getElementById('epgGrid');

  if (!state.filteredChannels.length) {
    gridWrap.style.display = 'none';
    epgEmpty.style.display = 'flex';
    return;
  }
  gridWrap.style.display = 'flex';
  epgEmpty.style.display = 'none';

  const windowStart = state.epgWindowStart || new Date();
  const windowEnd = new Date(windowStart.getTime() + state.epgHoursVisible * 3600000);
  const windowMs = windowEnd - windowStart;
  const TOTAL_WIDTH = 1200; // px for the program area
  const now = new Date();

  // ── Time header ──
  const slots = [];
  let t = new Date(windowStart);
  while (t < windowEnd) {
    slots.push(new Date(t));
    t = new Date(t.getTime() + 30 * 60000);
  }

  const slotWidth = TOTAL_WIDTH / slots.length;
  timeHeader.innerHTML = `
    <div class="epg-time-label">Channel</div>
    <div class="epg-time-slots" style="width:${TOTAL_WIDTH}px">
      ${slots.map(s => `
        <div class="epg-time-slot ${Math.abs(s - now) < 30*60000 ? 'now' : ''}" style="min-width:${slotWidth}px;flex:0 0 ${slotWidth}px">
          ${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      `).join('')}
    </div>
  `;

  // ── Now line ──
  const nowOffset = now >= windowStart && now <= windowEnd
    ? ((now - windowStart) / windowMs) * TOTAL_WIDTH
    : -9999;

  // ── Rows ──
  grid.innerHTML = state.filteredChannels.map(ch => {
    const programs = getProgramsInWindow(state.epgData, String(ch.id), windowStart, windowEnd);
    const isSelected = state.selectedChannel?.id === ch.id;

    const programsHtml = programs.map(p => {
      const left = Math.max(0, ((p.start - windowStart) / windowMs)) * TOTAL_WIDTH;
      const right = Math.min(TOTAL_WIDTH, ((p.stop - windowStart) / windowMs) * TOTAL_WIDTH);
      const width = Math.max(right - left, 4);

      const isCurrent = p.start <= now && p.stop > now;
      const isPast = p.stop <= now;
      let progressPct = 0;
      if (isCurrent) progressPct = ((now - p.start) / (p.stop - p.start)) * 100;

      return `
        <div class="epg-program ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}"
          style="left:${left}px;width:${width}px"
          title="${escHtml(p.title)} (${fmtTime(p.start)}–${fmtTime(p.stop)})"
          data-chid="${ch.id}" data-title="${escHtml(p.title)}">
          <div class="epg-prog-title">${escHtml(p.title)}</div>
          ${width > 100 ? `<div class="epg-prog-time">${fmtTime(p.start)}–${fmtTime(p.stop)}</div>` : ''}
          ${isCurrent ? `<div class="epg-prog-progress" style="width:${progressPct}%"></div>` : ''}
        </div>
      `;
    }).join('');

    // No EPG placeholder
    const noEPG = !programs.length ? `
      <div style="position:absolute;top:50%;transform:translateY(-50%);left:12px;font-size:0.72rem;color:var(--text3)">No schedule data</div>
    ` : '';

    return `
      <div class="epg-row ${isSelected ? 'epg-row-selected' : ''}" id="epg-row-${ch.id}">
        <div class="epg-ch-name" data-chid="${ch.id}">
          ${ch.logo
            ? `<img class="epg-ch-logo" src="${escHtml(ch.logo)}" alt="" onerror="this.outerHTML='<div class=epg-ch-logo-placeholder>${getEmoji(ch.group)}</div>'" />`
            : `<div class="epg-ch-logo-placeholder">${getEmoji(ch.group)}</div>`}
          <span class="epg-ch-label">${escHtml(ch.name)}</span>
        </div>
        <div class="epg-programs" style="width:${TOTAL_WIDTH}px;min-width:${TOTAL_WIDTH}px;position:relative;">
          ${nowOffset > 0 ? `<div class="now-line" style="left:${nowOffset}px"></div>` : ''}
          ${programsHtml}
          ${noEPG}
        </div>
      </div>
    `;
  }).join('');

  // Click channel name → play
  grid.querySelectorAll('.epg-ch-name').forEach(el => {
    el.addEventListener('click', () => {
      const ch = state.channels.find(c => c.id == el.dataset.chid);
      if (ch) selectChannel(ch);
    });
  });

  // Click program → show info + play
  grid.querySelectorAll('.epg-program').forEach(el => {
    el.addEventListener('click', () => {
      const ch = state.channels.find(c => c.id == el.dataset.chid);
      if (ch) {
        selectChannel(ch);
        showToast(`▶ ${el.dataset.title}`);
      }
    });
  });

  // Refresh progress bars every minute
  clearTimeout(state.epgRefreshTimer);
  state.epgRefreshTimer = setTimeout(() => renderEPGGrid(), 60000);
}

// ═══════════════════════ MODALS ═══════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// ═══════════════════════ TOAST ═══════════════════════
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ═══════════════════════ PROGRESS / ERROR ═══════════════════════
function showProgress(id, pct, msg) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = msg;
}
function hideProgress(id) { document.getElementById(id).classList.add('hidden'); }
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(id) { document.getElementById(id).classList.add('hidden'); }

// ═══════════════════════ UTILS ═══════════════════════
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtTime(d) {
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getEmoji(group) {
  const g = (group || '').toLowerCase();
  if (g.includes('news')) return '📰';
  if (g.includes('sport')) return '⚽';
  if (g.includes('movie') || g.includes('film')) return '🎬';
  if (g.includes('kid') || g.includes('child')) return '🧸';
  if (g.includes('music')) return '🎵';
  if (g.includes('live')) return '🔴';
  if (g.includes('doc')) return '🎥';
  return '📺';
}
