/**
 * patchFrontend.js
 * Patches all frontend files for the coin-math rework (10,000 coins = ₦100)
 * and adds ownedGadgets / hasPurchasedFarmItem to AuthContext types.
 */
const fs = require('fs');
const path = require('path');

function patch(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed++;
    } else {
      console.warn(`  ⚠️  NOT FOUND: ${JSON.stringify(from.slice(0, 60))}`);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Patched ${path.basename(filePath)} (${changed}/${replacements.length} replacements)`);
}

// ─── 1. AuthContext.tsx — add ownedGadgets + hasPurchasedFarmItem ───────────
patch(
  'client/src/context/AuthContext.tsx',
  [
    [
      `  ownedRabbits?: (string | RabbitItem)[];\n  ownedBikes?: (string | BicycleItem)[];`,
      `  ownedRabbits?: (string | RabbitItem)[];\n  ownedBikes?: (string | BicycleItem)[];\n  ownedGadgets?: string[];\n  hasPurchasedFarmItem?: boolean;`
    ]
  ]
);

// ─── 2. Play.tsx — fix coin math + labels ───────────────────────────────────
patch(
  'client/src/pages/Play.tsx',
  [
    // Perk line in subscription tiers
    [
      `perk: 'Zero Wait Time \u0007 1,000 Coins = ?50 Direct to Bank'`,
      `perk: 'Zero Wait Time \u0007 10,000 Coins = \u20a6100 Direct to Bank'`
    ],
    // HUD coin span: /10 → /100
    [
      `{stats.coins} Coins (?{(stats.coins / 10).toFixed(1)})`,
      `{stats.coins} Coins (\u20a6{(stats.coins / 100).toFixed(2)})`
    ],
    // HUD bank button tooltip
    [
      `title="Click to Bank Coins to Wallet! (Conversion: 1,000 Coins = ?100)"`,
      `title="Click to Bank Coins to Wallet! (Conversion: 10,000 Coins = \u20a6100)"`
    ],
    // HUD BANK button label: /20 → /100
    [
      `<span>BANK (+?{(stats.coins / 20).toFixed(1)})</span>`,
      `<span>BANK (+\u20a6{(stats.coins / 100).toFixed(2)})</span>`
    ],
    // Game Over reward value: /20 → /100
    [
      `gameOverData.nairaEarned !== undefined ? gameOverData.nairaEarned : (gameOverData.coins / 20)`,
      `gameOverData.nairaEarned !== undefined ? gameOverData.nairaEarned : (gameOverData.coins / 100)`
    ],
    // Game Over label
    [
      `<span className="gameover-stat-label">Reward Value (1,000 Coins = ?50)</span>`,
      `<span className="gameover-stat-label">Reward Value (10,000 Coins = \u20a6100)</span>`
    ],
    // Pause screen coin display: /20 → /100
    [
      `+{stats.coins} (?{(stats.coins / 20).toFixed(1)})`,
      `+{stats.coins} (\u20a6{(stats.coins / 100).toFixed(2)})`
    ],
    // Free cap banner text
    [
      `?? Free Rider Cap: Max ?50 per run!`,
      `\uD83D\uDD12 Free Rider Cap: Max \u20a650 per run (5,000 coins)!`
    ],
    // Game over free rider note
    [
      `?? Psst, Farmer! Free rides cap out at ?50 per run!`,
      `\uD83D\uDD12 Psst, Farmer! Free rides cap at \u20a650/run (5,000 coins). Buy a farm item to unlock unlimited!`
    ]
  ]
);

// ─── 3. Dashboard.tsx — update comment ──────────────────────────────────────
patch(
  'client/src/pages/Dashboard.tsx',
  [
    [
      `// Estimated Coin Bank: roughly 20 coins per Naira balance (1000 coins = ?50)`,
      `// Estimated Coin Bank: roughly 100 coins per Naira balance (10,000 coins = \u20a6100)`
    ],
    // Any balance display using *20
    [
      `* 20).toLocaleString()} Coins`,
      `* 100).toLocaleString()} Coins`
    ]
  ]
);

// ─── 4. Admin.tsx — update coin conversion display ──────────────────────────
patch(
  'client/src/pages/Admin.tsx',
  [
    [
      `coinConversionRate: 0.05,`,
      `coinConversionRate: 0.01,`
    ],
    [
      `<h4>Coin Conversion Value (? per 1,000 Coins)</h4>`,
      `<h4>Coin Conversion Value (\u20a6 per 10,000 Coins)</h4>`
    ],
    [
      `<p>Default: ?50 per 1,000 coins (0.05 rate)</p>`,
      `<p>Default: \u20a6100 per 10,000 coins (0.01 rate)</p>`
    ],
    [
      `value={systemConfig.coinConversionRate || 0.05}`,
      `value={systemConfig.coinConversionRate || 0.01}`
    ]
  ]
);

// ─── 5. Wallet.tsx — update coin balance display ────────────────────────────
patch(
  'client/src/pages/Wallet.tsx',
  [
    [
      `* 20).toLocaleString()} Coins (Rate: 1,000 Coins = ?50)`,
      `* 100).toLocaleString()} Coins (Rate: 10,000 Coins = \u20a6100)`
    ]
  ]
);

console.log('\n🎉 All frontend patches applied!');

