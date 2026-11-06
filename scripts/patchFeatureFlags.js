/**
 * patchFeatureFlags.js
 * Adds featureFlagJukebox toggle:
 *   1. Backend  — adds default to getSystemConfig
 *   2. Admin.tsx — adds toggle card in Settings tab
 *   3. Navbar.tsx — reads flag from /api/admin/config, hides Jukebox links
 *   4. Play.tsx  — hides HUD Jukebox button when flag is off
 */
const fs = require('fs');
const path = require('path');

function patchLines(filePath, replacements) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  let changed = 0;

  for (const { lineNum, oldFragment, newContent } of replacements) {
    const idx = lineNum - 1;
    // scan ±10 lines for the fragment
    let found = -1;
    for (let i = Math.max(0, idx - 10); i <= Math.min(lines.length - 1, idx + 10); i++) {
      if (!oldFragment || lines[i].includes(oldFragment)) { found = i; break; }
    }
    if (found === -1) {
      console.warn(`  ⚠️  NOT FOUND near line ${lineNum}: ${(oldFragment||'').slice(0,50)}`);
      continue;
    }
    // newContent may be an array (multi-line insert) or single string (replace)
    if (Array.isArray(newContent)) {
      lines.splice(found, 1, ...newContent);
    } else {
      lines[found] = newContent;
    }
    changed++;
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`\u2705 ${path.basename(filePath)} — ${changed} change(s)`);
}

// ─── 1. Backend: adminController.js — add featureFlagJukebox default ─────────
patchLines('server/src/controllers/adminController.js', [
  {
    lineNum: 510,
    oldFragment: 'maintenanceMode: false',
    newContent: `      maintenanceMode: false,
      featureFlagJukebox: true  // show/hide the Jukebox button site-wide`
  }
]);

// ─── 2. Admin.tsx — add toggle card after freeDailyRides card ────────────────
// We'll insert after the closing </div> of the freeDailyRides config-card (line ~1463)
patchLines('client/src/pages/Admin.tsx', [
  {
    lineNum: 1463,
    oldFragment: "          </div>\n",   // end of freeDailyRides card — scan only
    newContent: null  // handled below with raw string splice
  }
]);

// Use raw string replace for multi-line block to avoid line-shift issues
{
  const file = 'client/src/pages/Admin.tsx';
  let src = fs.readFileSync(file, 'utf8');

  const ANCHOR = `<h4>Minimum Withdrawal Threshold`;

  const TOGGLE_CARD = `          <div className="config-card">
            <div className="config-info">
              <h4>\u{1F3B5} Jukebox Feature Flag</h4>
              <p>Show or hide the YouTube Jukebox button across the entire site (Navbar + Game HUD)</p>
            </div>
            <div className="config-input-wrap" style={{ alignItems: 'center', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!systemConfig.featureFlagJukebox}
                  onChange={e => {
                    const val = e.target.checked;
                    setSystemConfig({ ...systemConfig, featureFlagJukebox: val });
                    handleSaveConfig('featureFlagJukebox', val, 'Jukebox feature visibility');
                  }}
                  style={{ width: 20, height: 20, accentColor: '#FF7A00', cursor: 'pointer' }}
                />
                <span style={{ color: systemConfig.featureFlagJukebox ? '#00C853' : '#aaa', fontWeight: 700 }}>
                  {systemConfig.featureFlagJukebox ? '\u{1F7E2} Jukebox ON' : '\u{1F534} Jukebox OFF'}
                </span>
              </label>
            </div>
          </div>

          `;

  if (src.includes(ANCHOR)) {
    src = src.replace(ANCHOR, TOGGLE_CARD + ANCHOR);
    fs.writeFileSync(file, src, 'utf8');
    console.log('\u2705 Admin.tsx — Jukebox feature flag toggle card inserted');
  } else {
    console.warn('  \u26a0\ufe0f  Admin.tsx anchor not found — skipping toggle card insert');
  }
}

// ─── 3. Navbar.tsx — read flag and conditionally render Jukebox links ─────────
{
  const file = 'client/src/components/Navbar.tsx';
  let src = fs.readFileSync(file, 'utf8');

  // 3a. Add import for useEffect+useState if not already there, and api import
  if (!src.includes('featureFlagJukebox')) {
    // Add state + fetch after first existing useState call in the component
    // Find the component function body start
    const AFTER_IMPORT = `import api from '../lib/api';`;
    // If api is already imported, good. Otherwise add it.
    if (!src.includes("import api from '../lib/api'") && !src.includes('import api from "../lib/api"')) {
      src = src.replace(
        `import { Link, useLocation } from 'react-router-dom';`,
        `import { Link, useLocation } from 'react-router-dom';\nimport api from '../lib/api';`
      );
    }

    // Insert hook after first const [ in the component
    // Look for the opening of the Navbar function
    const HOOK_ANCHOR = `const [menuOpen, setMenuOpen] = useState(false);`;
    const HOOK_INSERT = `const [jukeboxEnabled, setJukeboxEnabled] = useState(true);

  useEffect(() => {
    api.get('/admin/config').then(res => {
      if (res.data?.config?.featureFlagJukebox !== undefined) {
        setJukeboxEnabled(!!res.data.config.featureFlagJukebox);
      }
    }).catch(() => {}); // fail silently — keep button visible
  }, []);

  `;

    if (src.includes(HOOK_ANCHOR)) {
      src = src.replace(HOOK_ANCHOR, HOOK_INSERT + HOOK_ANCHOR);
      console.log('\u2705 Navbar.tsx — jukeboxEnabled hook added');
    } else {
      console.warn('  \u26a0\ufe0f  Navbar.tsx hook anchor not found');
    }

    // 3b. Wrap desktop nav Jukebox <li> with {jukeboxEnabled && ( ... )}
    // The <li> starts with <li><Link to="/play?jukebox=1" className="nav-link"
    const DESKTOP_LI_OLD = `            <li>
              <Link
                to="/play?jukebox=1"
                className="nav-link"`;
    const DESKTOP_LI_NEW = `            {jukeboxEnabled && (
            <li>
              <Link
                to="/play?jukebox=1"
                className="nav-link"`;

    if (src.includes(DESKTOP_LI_OLD)) {
      // Find the closing </li> after this link and wrap
      // Replace the opening
      src = src.replace(DESKTOP_LI_OLD, DESKTOP_LI_NEW);
      // Find the </li> that closes it and add )}
      // It ends with: </Link>\n            </li>
      // We'll do a targeted replace of the first occurrence after the opening
      src = src.replace(
        `              </Link>\n            </li>\n            {isAdmin`,
        `              </Link>\n            </li>\n            )}\n            {isAdmin`
      );
      console.log('\u2705 Navbar.tsx — desktop Jukebox link wrapped with flag');
    } else {
      console.warn('  \u26a0\ufe0f  Navbar.tsx desktop jukebox <li> not found');
    }

    // 3c. Wrap mobile nav Jukebox link
    const MOBILE_OLD = `        <Link to="/play?jukebox=1" className="mobile-nav-link" onClick={closeMenu}`;
    const MOBILE_NEW = `        {jukeboxEnabled && <Link to="/play?jukebox=1" className="mobile-nav-link" onClick={closeMenu}`;

    if (src.includes(MOBILE_OLD)) {
      src = src.replace(MOBILE_OLD, MOBILE_NEW);
      // close the conditional — find the end of that link element
      // Mobile link is self-closing or has children — find </Link> on same line or next
      src = src.replace(
        `          <Music size={20} /> \uD83C\uDFB5 YouTube Jukebox\n        </Link>\n        {isAdmin`,
        `          <Music size={20} /> \uD83C\uDFB5 YouTube Jukebox\n        </Link>}\n        {isAdmin`
      );
      console.log('\u2705 Navbar.tsx — mobile Jukebox link wrapped with flag');
    } else {
      console.warn('  \u26a0\ufe0f  Navbar.tsx mobile jukebox link not found — trying alternate pattern');
      // Try without exact emoji
      if (src.includes(MOBILE_OLD.trim())) {
        console.warn('  found with trim — manual fix needed');
      }
    }

    fs.writeFileSync(file, src, 'utf8');
  } else {
    console.log('\u2139\ufe0f  Navbar.tsx already has featureFlagJukebox');
  }
}

// ─── 4. Play.tsx — wrap HUD Jukebox button with state check ──────────────────
{
  const file = 'client/src/pages/Play.tsx';
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes('jukeboxEnabled')) {
    // 4a. Add state
    const STATE_ANCHOR = `const [showFreeCapBanner, setShowFreeCapBanner] = useState(true);`;
    const STATE_INSERT = `const [jukeboxEnabled, setJukeboxEnabled] = useState(true);
  useEffect(() => {
    api.get('/admin/config').then(res => {
      if (res.data?.config?.featureFlagJukebox !== undefined) {
        setJukeboxEnabled(!!res.data.config.featureFlagJukebox);
      }
    }).catch(() => {});
  }, []);

  `;
    if (src.includes(STATE_ANCHOR)) {
      src = src.replace(STATE_ANCHOR, STATE_INSERT + STATE_ANCHOR);
      console.log('\u2705 Play.tsx — jukeboxEnabled state added');
    } else {
      console.warn('  \u26a0\ufe0f  Play.tsx state anchor not found');
    }

    // 4b. Wrap HUD jukebox button
    const HUD_BTN_OLD = `                    className="hud-btn-jukebox"`;
    const HUD_BTN_WRAP_START = `                  {jukeboxEnabled && (
                  <button`;
    // Find the button opening
    const BTN_OPEN = `                  <button\n                    className="hud-btn-jukebox"`;
    if (src.includes(BTN_OPEN)) {
      src = src.replace(BTN_OPEN, `                  {jukeboxEnabled && (\n                  <button\n                    className="hud-btn-jukebox"`);
      // Find its closing and add )}
      // The button ends with </button> — find the one after hud-btn-jukebox
      const CLOSE_OLD = `                  </button>\n                  <button\n                    className="hud-btn-bank"`;
      const CLOSE_NEW = `                  </button>\n                  )}\n                  <button\n                    className="hud-btn-bank"`;
      if (src.includes(CLOSE_OLD)) {
        src = src.replace(CLOSE_OLD, CLOSE_NEW);
        console.log('\u2705 Play.tsx — HUD jukebox button wrapped with flag');
      } else {
        console.warn('  \u26a0\ufe0f  Play.tsx HUD button close not found');
      }
    } else {
      console.warn('  \u26a0\ufe0f  Play.tsx HUD jukebox button not found');
    }

    fs.writeFileSync(file, src, 'utf8');
  } else {
    console.log('\u2139\ufe0f  Play.tsx already has jukeboxEnabled');
  }
}

console.log('\n\u{1F389} Feature flag patch complete!');

