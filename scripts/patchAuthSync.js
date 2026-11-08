const fs = require('fs');
const filePath = 'server/src/controllers/authController.js';
let src = fs.readFileSync(filePath, 'utf8');

// 1. getMe
const getMeOld = `        ownedRabbits: user.ownedRabbits,
        ownedBikes: user.ownedBikes
      }`;
const getMeNew = `        ownedRabbits: user.ownedRabbits,
        ownedBikes: user.ownedBikes,
        ownedGadgets: user.ownedGadgets || [],
        hasPurchasedFarmItem: user.hasPurchasedFarmItem || false
      }`;
if (src.includes(getMeOld)) {
  src = src.replace(getMeOld, getMeNew);
  console.log('✅ Added ownedGadgets + hasPurchasedFarmItem to getMe');
}

// 2. clerkSync
const clerkOld = `        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('clerkSync error:'`;
const clerkNew = `        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes,
        ownedGadgets: populatedUser.ownedGadgets || [],
        hasPurchasedFarmItem: populatedUser.hasPurchasedFarmItem || false
      }
    });
  } catch (err) {
    console.error('clerkSync error:'`;
if (src.includes(clerkOld)) {
  src = src.replace(clerkOld, clerkNew);
  console.log('✅ Added ownedGadgets + hasPurchasedFarmItem to clerkSync');
}

fs.writeFileSync(filePath, src, 'utf8');

