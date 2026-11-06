// Fix: wrap Play.tsx HUD Jukebox button with jukeboxEnabled flag
const fs = require('fs');
const file = 'client/src/pages/Play.tsx';
let src = fs.readFileSync(file, 'utf8');

const OLD = `          {/* PROMINENT JUKEBOX BUTTON */}
          <button
            onClick={() => {
              setMusicSource('youtube');
              bgm.setSource('youtube');
              setIsMusicDrawerOpen(true);
              if (ytSearchResults.length === 0 && !ytSearchHasSearched) { executeYtSearch('popular nigerian afrobeats hits'); }
            }}
            className="hud-btn-jukebox"
            title="Open Jukebox & Search YouTube Songs"
          >
            <Music size={18} />
            <span className="jukebox-btn-text">Jukebox</span>
            <span className="jukebox-btn-badge">YouTube</span>
          </button>`;

const NEW = `          {/* PROMINENT JUKEBOX BUTTON — hidden by featureFlagJukebox */}
          {jukeboxEnabled && (
          <button
            onClick={() => {
              setMusicSource('youtube');
              bgm.setSource('youtube');
              setIsMusicDrawerOpen(true);
              if (ytSearchResults.length === 0 && !ytSearchHasSearched) { executeYtSearch('popular nigerian afrobeats hits'); }
            }}
            className="hud-btn-jukebox"
            title="Open Jukebox & Search YouTube Songs"
          >
            <Music size={18} />
            <span className="jukebox-btn-text">Jukebox</span>
            <span className="jukebox-btn-badge">YouTube</span>
          </button>
          )}`;

if (src.includes(OLD)) {
  src = src.replace(OLD, NEW);
  fs.writeFileSync(file, src, 'utf8');
  console.log('✅ Play.tsx — HUD Jukebox button wrapped with {jukeboxEnabled && (...)}');
} else {
  console.error('❌ Pattern not found — check whitespace/encoding');
  // Dump the section for debugging
  const idx = src.indexOf('PROMINENT JUKEBOX');
  console.log('Found at index:', idx);
  console.log('Surrounding text:\n', JSON.stringify(src.slice(idx, idx + 500)));
}

