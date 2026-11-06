/**
 * patchFrontend2.js  — line-based patches for Play.tsx, Dashboard.tsx, Admin.tsx, Wallet.tsx
 * Uses line-number replacement to avoid encoding issues with ₦ symbol.
 */
const fs = require('fs');
const path = require('path');

function patchLines(filePath, replacements) {
  // replacements = array of { lineNum: 1-based, oldFragment: string, newLine: string }
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  let changed = 0;

  for (const { lineNum, oldFragment, newLine } of replacements) {
    const idx = lineNum - 1; // 0-based
    if (idx < 0 || idx >= lines.length) {
      console.warn(`  ⚠️  Line ${lineNum} out of range in ${path.basename(filePath)}`);
      continue;
    }
    const line = lines[idx];
    if (oldFragment && !line.includes(oldFragment)) {
      // Try to find line by scanning ±5 lines
      let found = -1;
      for (let i = Math.max(0, idx-5); i <= Math.min(lines.length-1, idx+5); i++) {
        if (lines[i].includes(oldFragment)) { found = i; break; }
      }
      if (found === -1) {
        console.warn(`  ⚠️  Fragment not found near line ${lineNum}: ${oldFragment.slice(0,50)}`);
        continue;
      }
      lines[found] = newLine;
      changed++;
    } else {
      lines[idx] = newLine;
      changed++;
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`\u2705 Patched ${path.basename(filePath)} (${changed} lines changed)`);
}

// ─── Play.tsx ───────────────────────────────────────────────────────────────
patchLines('client/src/pages/Play.tsx', [
  // Line 41: perk text
  {
    lineNum: 41,
    oldFragment: '1,000 Coins',
    newLine: `    perk: 'Zero Wait Time \u{1F4B0} 10,000 Coins = \u20a6100 Direct to Bank',`
  },
  // Line 630: HUD tooltip
  {
    lineNum: 630,
    oldFragment: '1,000 Coins = ',
    newLine: `            title="Click to Bank Coins to Wallet! (Conversion: 10,000 Coins = \u20a6100)"`
  },
  // Line 633: HUD coin span /10 → /100
  {
    lineNum: 633,
    oldFragment: 'stats.coins / 10',
    newLine: `            <span>{stats.coins} Coins (\u20a6{(stats.coins / 100).toFixed(2)})</span>`
  },
  // Line 658: BANK button /20 → /100
  {
    lineNum: 658,
    oldFragment: 'stats.coins / 20',
    newLine: `              <span>BANK (+\u20a6{(stats.coins / 100).toFixed(2)})</span>`
  },
  // Line 911: game over naira (already /100 from previous pass, check label)
  {
    lineNum: 913,
    oldFragment: '1,000 Coins = ',
    newLine: `                <span className="gameover-stat-label">Reward Value (10,000 Coins = \u20a6100)</span>`
  },
  // Line 1455: pause screen /20 → /100
  {
    lineNum: 1455,
    oldFragment: 'stats.coins / 20',
    newLine: `                <div className="pause-stat-val">+{stats.coins} (\u20a6{(stats.coins / 100).toFixed(2)})</div>`
  },
]);

// ─── Dashboard.tsx ──────────────────────────────────────────────────────────
patchLines('client/src/pages/Dashboard.tsx', [
  {
    lineNum: 49,
    oldFragment: 'roughly 20 coins per Naira',
    newLine: `  // Estimated Coin Bank: roughly 100 coins per Naira balance (10,000 coins = \u20a6100)`
  },
  {
    lineNum: 50,
    oldFragment: 'balanceNaira * 20',
    newLine: `  const estimatedCoins = Math.round(user.balanceNaira * 100);`
  },
]);

// ─── Admin.tsx ───────────────────────────────────────────────────────────────
patchLines('client/src/pages/Admin.tsx', [
  {
    lineNum: 1424,
    oldFragment: 'per 1,000 Coins',
    newLine: `              <h4>Coin Conversion Value (\u20a6 per 10,000 Coins)</h4>`
  },
  {
    lineNum: 1425,
    oldFragment: 'per 1,000 coins',
    newLine: `              <p>Default: \u20a6100 per 10,000 coins (0.01 rate)</p>`
  },
]);

// ─── Wallet.tsx ──────────────────────────────────────────────────────────────
patchLines('client/src/pages/Wallet.tsx', [
  {
    lineNum: 374,
    oldFragment: 'balanceNaira',
    newLine: `            \u{1F4B0} {((user?.balanceNaira || 0) * 100).toLocaleString()} Coins (Rate: 10,000 Coins = \u20a6100)`
  },
]);

console.log('\n\u{1F389} Frontend line-based patches done!');

