# 📺 IPTV Guide — EPG Web App

A feature-rich Electronic Program Guide (EPG) for IPTV playlists.  
**Live demo:** deploy to GitHub Pages using the steps below.

## Features

- 📡 Import M3U playlists via URL, file upload, or paste
- 📅 EPG program grid with current/past/upcoming programs
- ▶️ HLS & MP4 stream playback (powered by hls.js)
- 🗓️ XMLTV EPG import
- 🔍 Channel search & category filters
- 🌙 Dark / Light theme
- 💾 Saves your playlist in browser storage
- 📱 Mobile-responsive

---

## Deploy to GitHub Pages

### Step 1 — Create a GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `iptv-guide` (or anything you like)
3. Set to **Public**
4. Click **Create repository**

### Step 2 — Upload these files

**Option A — GitHub web UI (easiest):**
1. In your new repo, click **Add file → Upload files**
2. Drag and drop the entire `iptv-epg` folder contents:
   - `index.html`
   - `css/style.css`
   - `js/m3u-parser.js`
   - `js/epg-parser.js`
   - `js/app.js`
3. Click **Commit changes**

**Option B — Git CLI:**
```bash
cd iptv-epg
git init
git add .
git commit -m "Initial IPTV Guide"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/iptv-guide.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your repo, go to **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**

### Step 4 — Access your site

After ~1 minute, your site will be live at:
```
https://YOUR_USERNAME.github.io/iptv-guide/
```

---

## Usage

1. Click **Import M3U** to load your playlist
2. Use the **Demo** tab to try sample channels first
3. Click any channel to play the stream
4. The EPG grid shows the program schedule
5. Import XMLTV data for real program guides

## M3U Format

```
#EXTM3U
#EXTINF:-1 tvg-name="CNN" tvg-logo="https://..." group-title="News",CNN
http://your-stream-url.m3u8
```

## XMLTV EPG Format

```xml
<?xml version="1.0"?>
<tv>
  <channel id="cnn"><display-name>CNN</display-name></channel>
  <programme start="20240101060000 +0000" stop="20240101070000 +0000" channel="cnn">
    <title>Morning News</title>
  </programme>
</tv>
```
