const fs = require('fs');
const path = require('path');

// 1. Patch Preload.ts
const preloadPath = path.join(__dirname, '../client/src/game/scenes/Preload.ts');
let preload = fs.readFileSync(preloadPath, 'utf8');

const oldPreloadRabbits = "this.load.svg('rabbit-starter', '/assets/rabbits/starter_rabbit.svg', { width: 100, height: 100 });";
const newPreloadRabbits = `this.load.svg('rabbit-starter', '/assets/rabbits/starter_rabbit.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-chef', '/assets/rabbits/chef_rabbit.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-disco', '/assets/rabbits/disco_rabbit.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-astro', '/assets/rabbits/astro_rabbit.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-cyber', '/assets/rabbits/cyber_rabbit.svg', { width: 100, height: 100 });`;

const oldPreloadBikes = "this.load.svg('bike-starter', '/assets/bikes/starter_bike.svg', { width: 120, height: 90 });";
const newPreloadBikes = `this.load.svg('bike-starter', '/assets/bikes/starter_bike.svg', { width: 120, height: 90 });
    this.load.svg('bike-tractor', '/assets/bikes/vintage_tractor.svg', { width: 120, height: 90 });
    this.load.svg('bike-chopper', '/assets/bikes/carrot_chopper.svg', { width: 120, height: 90 });
    this.load.svg('bike-ufo', '/assets/bikes/hover_ufo.svg', { width: 120, height: 90 });`;

if (!preload.includes('rabbit-chef') && preload.includes(oldPreloadRabbits)) {
  preload = preload.replace(oldPreloadRabbits, newPreloadRabbits);
  console.log('✅ Patched Preload.ts rabbits');
}
if (!preload.includes('bike-tractor') && preload.includes(oldPreloadBikes)) {
  preload = preload.replace(oldPreloadBikes, newPreloadBikes);
  console.log('✅ Patched Preload.ts bikes');
}
fs.writeFileSync(preloadPath, preload, 'utf8');

// 2. Patch PhaserGame.tsx
const phaserGamePath = path.join(__dirname, '../client/src/components/game/PhaserGame.tsx');
let phaserGame = fs.readFileSync(phaserGamePath, 'utf8');

const oldRabbitTextureKey = `  const getRabbitTextureKey = (): string => {
    const raw = user?.currentRabbit;
    const id = typeof raw === 'object' ? (raw?._id || '') : (raw || '');
    const name = (typeof raw === 'object' ? raw?.name : '') || '';
    if (id === 'rab_002' || name.includes('Red Hoodie')) return 'rabbit-red-hoodie';
    if (id === 'rab_003' || name.includes('Blue Aviator')) return 'rabbit-blue-aviator';
    if (id === 'rab_004' || name.includes('Farmer')) return 'rabbit-farmer-hat';
    if (id === 'rab_005' || name.includes('Ninja')) return 'rabbit-ninja';
    return 'rabbit-starter';
  };`;

const newRabbitTextureKey = `  const getRabbitTextureKey = (): string => {
    const raw = user?.currentRabbit;
    const id = typeof raw === 'object' ? (raw?._id || '') : (raw || '');
    const name = (typeof raw === 'object' ? raw?.name : '') || '';
    if (id === 'rab_002' || name.includes('Red Hoodie')) return 'rabbit-red-hoodie';
    if (id === 'rab_006' || name.includes('Chef')) return 'rabbit-chef';
    if (id === 'rab_003' || name.includes('Blue Aviator')) return 'rabbit-blue-aviator';
    if (id === 'rab_007' || name.includes('Disco')) return 'rabbit-disco';
    if (id === 'rab_004' || name.includes('Farmer')) return 'rabbit-farmer-hat';
    if (id === 'rab_008' || name.includes('Astro')) return 'rabbit-astro';
    if (id === 'rab_005' || name.includes('Ninja')) return 'rabbit-ninja';
    if (id === 'rab_009' || name.includes('Cyber')) return 'rabbit-cyber';
    return 'rabbit-starter';
  };`;

const oldBikeTextureKey = `  const getBikeTextureKey = (): string => {
    const raw = user?.currentBike;
    const id = typeof raw === 'object' ? (raw?._id || '') : (raw || '');
    const name = (typeof raw === 'object' ? raw?.name : '') || '';
    if (id === 'bike_002' || name.includes('Blue Basket')) return 'bike-blue-basket';
    if (id === 'bike_003' || name.includes('Green Bloom')) return 'bike-green-bloom';
    if (id === 'bike_004' || name.includes('Turbo Gold') || name.includes('Turbo Golden')) return 'bike-turbo-gold';
    return 'bike-starter';
  };`;

const newBikeTextureKey = `  const getBikeTextureKey = (): string => {
    const raw = user?.currentBike;
    const id = typeof raw === 'object' ? (raw?._id || '') : (raw || '');
    const name = (typeof raw === 'object' ? raw?.name : '') || '';
    if (id === 'bike_002' || name.includes('Blue Basket')) return 'bike-blue-basket';
    if (id === 'bike_005' || name.includes('Tractor')) return 'bike-tractor';
    if (id === 'bike_003' || name.includes('Green Bloom')) return 'bike-green-bloom';
    if (id === 'bike_006' || name.includes('Chopper')) return 'bike-chopper';
    if (id === 'bike_004' || name.includes('Turbo Gold') || name.includes('Turbo Golden')) return 'bike-turbo-gold';
    if (id === 'bike_007' || name.includes('UFO') || name.includes('Hover')) return 'bike-ufo';
    return 'bike-starter';
  };`;

const oldWindowGlobal = `    (window as unknown as { currentEquippedRabbit: string }).currentEquippedRabbit = getRabbitTextureKey();
    (window as unknown as { currentEquippedBike: string }).currentEquippedBike = getBikeTextureKey();`;

const newWindowGlobal = `    (window as unknown as { currentEquippedRabbit: string }).currentEquippedRabbit = getRabbitTextureKey();
    (window as unknown as { currentEquippedBike: string }).currentEquippedBike = getBikeTextureKey();
    (window as unknown as { userOwnedGadgets: string[] }).userOwnedGadgets = user?.ownedGadgets || [];`;

// Normalize line endings for replacement
const normalize = str => str.replace(/\r\n/g, '\n');

if (normalize(phaserGame).includes(normalize(oldRabbitTextureKey))) {
  phaserGame = phaserGame.replace(oldRabbitTextureKey, newRabbitTextureKey).replace(oldRabbitTextureKey.replace(/\n/g, '\r\n'), newRabbitTextureKey.replace(/\n/g, '\r\n'));
  console.log('✅ Patched PhaserGame.tsx rabbit keys');
}
if (normalize(phaserGame).includes(normalize(oldBikeTextureKey))) {
  phaserGame = phaserGame.replace(oldBikeTextureKey, newBikeTextureKey).replace(oldBikeTextureKey.replace(/\n/g, '\r\n'), newBikeTextureKey.replace(/\n/g, '\r\n'));
  console.log('✅ Patched PhaserGame.tsx bike keys');
}
if (normalize(phaserGame).includes(normalize(oldWindowGlobal))) {
  phaserGame = phaserGame.replace(oldWindowGlobal, newWindowGlobal).replace(oldWindowGlobal.replace(/\n/g, '\r\n'), newWindowGlobal.replace(/\n/g, '\r\n'));
  console.log('✅ Patched PhaserGame.tsx window globals');
}
fs.writeFileSync(phaserGamePath, phaserGame, 'utf8');

// 3. Patch FarmRide.ts
const farmRidePath = path.join(__dirname, '../client/src/game/scenes/FarmRide.ts');
let farmRide = fs.readFileSync(farmRidePath, 'utf8');

// Update collectibles spawn values
farmRide = farmRide.replace("value = 5;\n      spawnY = this.groundY - (Math.random() > 0.5 ? 90 : 50);", "value = 25;\n      spawnY = this.groundY - (Math.random() > 0.5 ? 90 : 50);");
farmRide = farmRide.replace("value = 5;\r\n      spawnY = this.groundY - (Math.random() > 0.5 ? 90 : 50);", "value = 25;\r\n      spawnY = this.groundY - (Math.random() > 0.5 ? 90 : 50);");

farmRide = farmRide.replace("value = 10;\n      spawnY = this.groundY - 50;", "value = 50;\n      spawnY = this.groundY - 50;");
farmRide = farmRide.replace("value = 10;\r\n      spawnY = this.groundY - 50;", "value = 50;\r\n      spawnY = this.groundY - 50;");

farmRide = farmRide.replace("value = 20;\n      spawnY = this.groundY - 140;", "value = 100;\n      spawnY = this.groundY - 140;");
farmRide = farmRide.replace("value = 20;\r\n      spawnY = this.groundY - 140;", "value = 100;\r\n      spawnY = this.groundY - 140;");

farmRide = farmRide.replace("value = 50 + Math.floor(Math.random() * 150);", "value = 250 + Math.floor(Math.random() * 750);");

// Update Stunts
farmRide = farmRide.replace("const loopBonus = 100;", "const loopBonus = 500;");
farmRide = farmRide.replace("const bonus = 50;\n    this.coins += bonus;", "const bonus = 250;\n    this.coins += bonus;");
farmRide = farmRide.replace("const bonus = 50;\r\n    this.coins += bonus;", "const bonus = 250;\r\n    this.coins += bonus;");

farmRide = farmRide.replace("this.coins += 25;\n          sounds.playJump();", "this.coins += 100;\n          sounds.playJump();");
farmRide = farmRide.replace("this.coins += 25;\r\n          sounds.playJump();", "this.coins += 100;\r\n          sounds.playJump();");

// Update stunt texts
farmRide = farmRide.replace("STOMP BOUNCE! +25 Coins", "STOMP BOUNCE! +100 Coins (1 ₦)");
farmRide = farmRide.replace("360° STUNT FLIP! +50 Coins (5 ₦)", "360° STUNT FLIP! +250 Coins (2.5 ₦)");
farmRide = farmRide.replace("360° LOOP MASTER! +100 Coins (10 ₦)", "360° LOOP MASTER! +500 Coins (5 ₦)");

// Obstacle collision check with Tractor ability
const oldObsCollisionCheck = "if (this.isBoosting || this.isLooping360) {";
const newObsCollisionCheck = `const bikeTex = (window as unknown as { currentEquippedBike?: string }).currentEquippedBike || '';
        // Vintage Farm Tractor ability: Smashes right through hay bales!
        if (bikeTex === 'bike-tractor') {
          this.createSmashExplosion(obs.x, obs.y);
          sounds.playCollect('crate');
          this.coins += 50;
          this.showStuntText('🚜 TRACTOR SMASH! +50 Coins 🚜');
          this.destroyObstacle(obs);
          continue;
        }

        if (this.isBoosting || this.isLooping360) {`;

if (!farmRide.includes('TRACTOR SMASH') && farmRide.includes(oldObsCollisionCheck)) {
  farmRide = farmRide.replace(oldObsCollisionCheck, newObsCollisionCheck);
  console.log('✅ Patched FarmRide.ts Tractor smash');
}

// Initialize gadgets in FarmRide.ts create()
const oldCreateEnd = "this.setupKeyboardControls();";
const newCreateEnd = `this.setupKeyboardControls();

    // Check equipped permanent gadgets
    const gadgets = (window as unknown as { userOwnedGadgets?: string[] }).userOwnedGadgets || [];
    if (gadgets.includes('gadget_shield')) {
      this.hasShield = true;
      if (this.shieldBubbleSprite) this.shieldBubbleSprite.setVisible(true);
    }
    if (gadgets.includes('gadget_heart')) {
      this.lives = 4;
    }`;

if (!farmRide.includes('userOwnedGadgets') && farmRide.includes(oldCreateEnd)) {
  farmRide = farmRide.replace(oldCreateEnd, newCreateEnd);
  console.log('✅ Patched FarmRide.ts gadget initialization');
}

fs.writeFileSync(farmRidePath, farmRide, 'utf8');
console.log('Done patching game scenes!');

