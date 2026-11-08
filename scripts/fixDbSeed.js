// Fix db.js — add Ad require + ad seed inside seedInitialShop
const fs = require('fs');
const file = 'server/src/config/db.js';
let src = fs.readFileSync(file, 'utf8');

// 1. Add Ad require inside seedInitialShop (after Bicycle require)
const REQ_OLD = `    const Rabbit = require('../models/Rabbit');
    const Bicycle = require('../models/Bicycle');`;
const REQ_NEW = `    const Rabbit = require('../models/Rabbit');
    const Bicycle = require('../models/Bicycle');
    const Ad = require('../models/Ad');`;

if (!src.includes("const Ad = require('../models/Ad')")) {
  src = src.replace(REQ_OLD, REQ_NEW);
  console.log('✅ Added Ad require to db.js seedInitialShop');
} else {
  console.log('ℹ️  Ad already required in db.js');
}

// 2. Find the last } catch (err) inside seedInitialShop (line 190)
//    and insert ad seed just before it
const AD_SEED = `
    // ── Seed default ads ─────────────────────────────────────────────────
    const DEFAULT_ADS = [
      { tag: 'FARM FUEL',         order: 0, title: 'Crunchy Carrot Nitro Juice',    subtitle: '100% Organic Farm-Pressed Stamina Drink for Champions', perk: '+50% Jump Power & Instant 360 Flip Torque', accentColor: '#FF7A00', bgColor: 'linear-gradient(135deg,#FFF3E0 0%,#FFE0B2 100%)', icon: '🥕', slogan: '"Munch faster. Jump higher. Dominate the dirt track!"', isActive: true },
      { tag: 'OFFICIAL PAYOUTS',  order: 1, title: 'Paystack Instant Cashouts',     subtitle: 'Automated Real Naira Bank Transfers in Under 10 Seconds',  perk: 'Zero Wait Time 10,000 Coins = ₦100 Direct to Bank',       accentColor: '#00C853', bgColor: 'linear-gradient(135deg,#E8F5E9 0%,#C8E6C9 100%)', icon: '💳', slogan: '"Play daily. Collect coins. Cash out direct to your account."', isActive: true },
      { tag: 'SPEED & STYLE',     order: 2, title: 'Hyper Bunny Turbo Bicycles',    subtitle: 'Aerodynamic Racing Frames, Gold Rims & Rocket Exhaust',      perk: 'Loop-de-Loop Balance Stabilizer + 2X Nitrous Burn Time',   accentColor: '#FFB300', bgColor: 'linear-gradient(135deg,#FFFDE7 0%,#FFF9C4 100%)', icon: '🚲', slogan: '"Equip pro gear in the shop to crush every track record."',      isActive: true },
      { tag: 'LUCKY HARVEST',     order: 3, title: 'Golden Carrot Jackpot Seeds',   subtitle: 'Mystery Crates Spawning Across Every 100 Meters',            perk: 'Up to ₦10,000 Surprise Jackpot Coins in Loot Crates',      accentColor: '#8E24AA', bgColor: 'linear-gradient(135deg,#F3E5F5 0%,#E1BEE7 100%)', icon: '🌟', slogan: '"Collect crates on the run and watch your wallet explode."',  isActive: true }
    ];
    for (const adData of DEFAULT_ADS) {
      const exists = await Ad.findOne({ title: adData.title });
      if (!exists) {
        await Ad.create(adData);
        console.log(\`✅ Seeded ad: \${adData.title}\`);
      }
    }

`;

// Find the first catch block inside seedInitialShop (line 190 → index 189)
// We look for the pattern at the end of the bike seeding block
const BIKE_SEED_END = `    memoryStore.save();\n    console.log(\`[Seed]`;
// Actually, find the closing of the seed function try block
// The function's try block ends with a console.log then } catch
const SEED_TRY_END = `    console.log('[Seed] ✅ Shop seed complete.');\n  } catch (err) {`;
const SEED_TRY_END2 = `    console.log('[Seed]`;

if (!src.includes('Seed default ads')) {
  // Find the first } catch (err) at line 190 by searching for the pattern
  // that closes seedInitialShop's try block
  const lines = src.split('\n');
  
  // Find the line index of the first "  } catch (err) {" after "seedInitialShop"
  let seedFuncStart = -1;
  let firstCatchIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('async function seedInitialShop()')) {
      seedFuncStart = i;
    }
    if (seedFuncStart > -1 && i > seedFuncStart && lines[i].match(/^\s+\} catch \(err\)/)) {
      firstCatchIdx = i;
      break;
    }
  }

  if (firstCatchIdx > -1) {
    // Insert ad seed before the catch
    lines.splice(firstCatchIdx, 0, AD_SEED);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log(`✅ Ad seed inserted in db.js before line ${firstCatchIdx + 1}`);
  } else {
    console.error('❌ Could not find seedInitialShop catch block');
  }
} else {
  console.log('ℹ️  Ad seed already in db.js');
}

