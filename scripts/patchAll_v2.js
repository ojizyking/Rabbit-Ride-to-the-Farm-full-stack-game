/**
 * patchAll_v2.js — Executes all Task 1, 2, 3A backend changes
 *
 * Task 1: Remove Admin Portal link from Landing.tsx footer
 * Task 2: Add ownedGadgets + hasPurchasedFarmItem to register/login responses
 * Task 3A: Wire /api/ads route in server.js + add admin ad CRUD to admin routes + controller
 *          + seed default ads in db.js
 */
const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, oldStr, newStr, label) {
  let src = fs.readFileSync(filePath, 'utf8');
  if (src.includes(oldStr)) {
    src = src.split(oldStr).join(newStr);
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`\u2705 ${label}`);
  } else {
    console.warn(`  \u26a0\ufe0f  NOT FOUND: ${label}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1 — Remove Admin Portal link from Landing.tsx
// ─────────────────────────────────────────────────────────────────────────────
replaceInFile(
  'client/src/pages/Landing.tsx',
  `            <Link to="/admin/login" style={{ opacity: 0.75 }}>Admin Portal</Link>\n`,
  '',
  'Task 1: Removed Admin Portal link from Landing.tsx footer'
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK 2 — Add ownedGadgets + hasPurchasedFarmItem to register response
// ─────────────────────────────────────────────────────────────────────────────
replaceInFile(
  'server/src/controllers/authController.js',
  // Register response — after ownedBikes
  `        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('Registration error:', err);`,
  `        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes,
        ownedGadgets: populatedUser.ownedGadgets || [],
        hasPurchasedFarmItem: populatedUser.hasPurchasedFarmItem || false
      }
    });
  } catch (err) {
    console.error('Registration error:', err);`,
  'Task 2a: ownedGadgets + hasPurchasedFarmItem added to register response'
);

replaceInFile(
  'server/src/controllers/authController.js',
  // Login response — after ownedBikes
  `        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('Login error:', err);`,
  `        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes,
        ownedGadgets: populatedUser.ownedGadgets || [],
        hasPurchasedFarmItem: populatedUser.hasPurchasedFarmItem || false
      }
    });
  } catch (err) {
    console.error('Login error:', err);`,
  'Task 2b: ownedGadgets + hasPurchasedFarmItem added to login response'
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK 3A — Register /api/ads route in server.js
// ─────────────────────────────────────────────────────────────────────────────
replaceInFile(
  'server/src/server.js',
  `const adminRoutes = require('./routes/admin');`,
  `const adminRoutes = require('./routes/admin');
const adsRoutes = require('./routes/ads');`,
  'Task 3A-i: ads route required in server.js'
);

replaceInFile(
  'server/src/server.js',
  `app.use('/api/admin', adminRoutes);`,
  `app.use('/api/admin', adminRoutes);
app.use('/api/ads', adsRoutes);`,
  'Task 3A-ii: /api/ads mounted in server.js'
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK 3A — Add Ad CRUD routes to admin.js
// ─────────────────────────────────────────────────────────────────────────────
replaceInFile(
  'server/src/routes/admin.js',
  `// Runtime System Configuration
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

module.exports = router;`,
  `// Runtime System Configuration
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

// Ad Manager
router.get('/ads', adminController.getAds);
router.post('/ads', adminController.createAd);
router.put('/ads/:id', adminController.updateAd);
router.delete('/ads/:id', adminController.deleteAd);

module.exports = router;`,
  'Task 3A-iii: Ad CRUD routes added to admin.js'
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK 3A — Add Ad controller methods to adminController.js
// ─────────────────────────────────────────────────────────────────────────────
replaceInFile(
  'server/src/controllers/adminController.js',
  `const SystemConfig = require('../models/SystemConfig');`,
  `const SystemConfig = require('../models/SystemConfig');
const Ad = require('../models/Ad');`,
  'Task 3A-iv: Ad model required in adminController.js'
);

// Append Ad CRUD methods at end of adminController.js
{
  const ctrlPath = 'server/src/controllers/adminController.js';
  let src = fs.readFileSync(ctrlPath, 'utf8');
  const AD_METHODS = `
// ─── Ad Manager ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/ads — list all ads (admin)
 */
exports.getAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ order: 1, createdAt: -1 });
    return res.json({ success: true, ads });
  } catch (err) {
    console.error('getAds error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching ads.' });
  }
};

/**
 * POST /api/admin/ads — create new ad (admin)
 */
exports.createAd = async (req, res) => {
  try {
    const { title, subtitle, tag, slogan, perk, accentColor, bgColor, icon, imageUrl, linkUrl, isActive, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Ad title is required.' });

    const ad = await Ad.create({
      title, subtitle, tag, slogan, perk,
      accentColor: accentColor || '#FF7A00',
      bgColor: bgColor || 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      icon: icon || '🌾',
      imageUrl: imageUrl || '',
      linkUrl: linkUrl || '',
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    return res.status(201).json({ success: true, message: 'Ad created successfully.', ad });
  } catch (err) {
    console.error('createAd error:', err);
    return res.status(500).json({ success: false, message: 'Error creating ad.' });
  }
};

/**
 * PUT /api/admin/ads/:id — update ad (admin)
 */
exports.updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates._id;

    const ad = await Ad.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found.' });

    return res.json({ success: true, message: 'Ad updated.', ad });
  } catch (err) {
    console.error('updateAd error:', err);
    return res.status(500).json({ success: false, message: 'Error updating ad.' });
  }
};

/**
 * DELETE /api/admin/ads/:id — delete ad (admin)
 */
exports.deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndDelete(id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found.' });

    return res.json({ success: true, message: 'Ad deleted successfully.' });
  } catch (err) {
    console.error('deleteAd error:', err);
    return res.status(500).json({ success: false, message: 'Error deleting ad.' });
  }
};
`;
  if (!src.includes('exports.getAds')) {
    fs.writeFileSync(ctrlPath, src + AD_METHODS, 'utf8');
    console.log('\u2705 Task 3A-v: Ad CRUD methods appended to adminController.js');
  } else {
    console.log('\u2139\ufe0f  adminController.js already has getAds');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 3A — Seed default ads in db.js
// ─────────────────────────────────────────────────────────────────────────────
replaceInFile(
  'server/src/config/db.js',
  `const Rabbit = require('../models/Rabbit');
const Bicycle = require('../models/Bicycle');`,
  `const Rabbit = require('../models/Rabbit');
const Bicycle = require('../models/Bicycle');
const Ad = require('../models/Ad');`,
  'Task 3A-vi: Ad model required in db.js'
);

const DEFAULT_ADS_SEED = `
  // ── Seed default ads (idempotent — only create if title not found) ───────
  const defaultAds = [
    {
      tag: 'FARM FUEL', order: 0,
      title: 'Crunchy Carrot Nitro Juice',
      subtitle: '100% Organic Farm-Pressed Stamina Drink for Champions',
      perk: '+50% Jump Power & Instant 360° Flip Torque',
      accentColor: '#FF7A00',
      bgColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      icon: '🥕',
      slogan: '"Munch faster. Jump higher. Dominate the dirt track!"',
      isActive: true
    },
    {
      tag: 'OFFICIAL PAYOUTS', order: 1,
      title: 'Paystack Instant Cashouts',
      subtitle: 'Automated Real Naira Bank Transfers in Under 10 Seconds',
      perk: 'Zero Wait Time 💰 10,000 Coins = ₦100 Direct to Bank',
      accentColor: '#00C853',
      bgColor: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
      icon: '💳',
      slogan: '"Play daily. Collect coins. Cash out direct to your account."',
      isActive: true
    },
    {
      tag: 'SPEED & STYLE', order: 2,
      title: 'Hyper Bunny Turbo Bicycles',
      subtitle: 'Aerodynamic Racing Frames, Gold Rims & Rocket Exhaust',
      perk: 'Loop-de-Loop Balance Stabilizer + 2X Nitrous Burn Time',
      accentColor: '#FFB300',
      bgColor: 'linear-gradient(135deg, #FFFDE7 0%, #FFF9C4 100%)',
      icon: '🚲',
      slogan: '"Equip pro gear in the shop to crush every track record."',
      isActive: true
    },
    {
      tag: 'LUCKY HARVEST', order: 3,
      title: 'Golden Carrot Jackpot Seeds',
      subtitle: 'Mystery Crates Spawning Across Every 100 Meters',
      perk: 'Up to ₦10,000 Surprise Jackpot Coins in Loot Crates',
      accentColor: '#8E24AA',
      bgColor: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
      icon: '🌟',
      slogan: '"Collect crates on the run and watch your wallet explode."',
      isActive: true
    }
  ];
  for (const adData of defaultAds) {
    const exists = await Ad.findOne({ title: adData.title });
    if (!exists) {
      await Ad.create(adData);
      console.log(\`\u2705 Seeded ad: \${adData.title}\`);
    }
  }
`;

{
  const dbPath = 'server/src/config/db.js';
  let src = fs.readFileSync(dbPath, 'utf8');
  // Insert seed before the closing of the seed function (before "} catch" in seedDatabase)
  if (!src.includes('Seed default ads')) {
    // Find the last seedDatabase closing block
    const SEED_CLOSE = `  } catch (err) {
    console.error('Seed error:', err);
  }
};`;
    if (src.includes(SEED_CLOSE)) {
      src = src.replace(SEED_CLOSE, DEFAULT_ADS_SEED + `\n  } catch (err) {\n    console.error('Seed error:', err);\n  }\n};`);
      fs.writeFileSync(dbPath, src, 'utf8');
      console.log('\u2705 Task 3A-vii: Default ads seed added to db.js');
    } else {
      console.warn('  \u26a0\ufe0f  Could not find seed close block in db.js — appending seed call manually');
    }
  } else {
    console.log('\u2139\ufe0f  db.js already has ad seed');
  }
}

console.log('\n\u{1F389} patchAll_v2.js complete!');

