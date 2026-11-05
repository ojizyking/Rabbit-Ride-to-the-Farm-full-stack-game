const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../client/public/assets');

// Helper to write file
function writeAsset(relPath, content) {
  const fullPath = path.join(publicDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
  console.log('✅ Created:', relPath);
}

// 1. Chef Rabbit
writeAsset('rabbits/chef_rabbit.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <radialGradient id="chefFur" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFF8E1" />
      <stop offset="100%" stop-color="#FFE082" />
    </radialGradient>
    <radialGradient id="toqueGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#CFD8DC" />
    </radialGradient>
  </defs>
  <circle cx="80" cy="80" r="76" fill="#FFFDE7" stroke="#FFD54F" stroke-width="2" />
  <!-- Chef Toque Hat (Tall puffy) -->
  <path d="M 52 50 C 40 30 50 15 65 22 C 75 10 95 10 102 24 C 115 15 125 32 110 50 Z" fill="url(#toqueGrad)" stroke="#78909C" stroke-width="2.5" />
  <rect x="54" y="48" width="54" height="10" rx="3" fill="#ECEFF1" stroke="#78909C" stroke-width="2" />
  <!-- Ears sticking out -->
  <path d="M 45 42 C 30 18 42 10 52 30 Z" fill="url(#chefFur)" stroke="#FFA000" stroke-width="2" />
  <path d="M 115 42 C 130 18 118 10 108 30 Z" fill="url(#chefFur)" stroke="#FFA000" stroke-width="2" />
  <!-- Rabbit Face -->
  <ellipse cx="80" cy="82" rx="30" ry="26" fill="url(#chefFur)" stroke="#FFA000" stroke-width="2" />
  <ellipse cx="70" cy="88" rx="14" ry="11" fill="#FFFFFF" />
  <ellipse cx="90" cy="88" rx="14" ry="11" fill="#FFFFFF" />
  <circle cx="68" cy="86" r="3.5" fill="#FF8A80" opacity="0.6" />
  <circle cx="92" cy="86" r="3.5" fill="#FF8A80" opacity="0.6" />
  <!-- Eyes -->
  <ellipse cx="71" cy="78" rx="4.5" ry="5.5" fill="#3E2723" />
  <circle cx="69.5" cy="76" r="2" fill="#FFFFFF" />
  <ellipse cx="89" cy="78" rx="4.5" ry="5.5" fill="#3E2723" />
  <circle cx="87.5" cy="76" r="2" fill="#FFFFFF" />
  <!-- Carrot Nose -->
  <polygon points="76,86 84,86 80,94" fill="#FF6D00" />
  <path d="M 74 94 Q 80 98 86 94" fill="none" stroke="#5D4037" stroke-width="2" stroke-linecap="round" />
  <!-- Red Chef Scarf / Neckerchief -->
  <path d="M 60 106 Q 80 114 100 106 L 96 118 Q 80 126 64 118 Z" fill="#E53935" stroke="#B71C1C" stroke-width="2" />
  <circle cx="80" cy="116" r="5" fill="#D32F2F" />
</svg>
`);

// 2. Disco Bunny
writeAsset('rabbits/disco_rabbit.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <radialGradient id="discoFur" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#E1BEE7" />
      <stop offset="100%" stop-color="#BA68C8" />
    </radialGradient>
    <linearGradient id="shadesLens" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E5FF" />
      <stop offset="50%" stop-color="#FF4081" />
      <stop offset="100%" stop-color="#FFD600" />
    </linearGradient>
  </defs>
  <circle cx="80" cy="80" r="76" fill="#F3E5F5" stroke="#CE93D8" stroke-width="2" />
  <!-- Neon Glitter Ears -->
  <path d="M 48 35 C 32 4 48 -4 60 18 C 64 26 58 36 48 35 Z" fill="url(#discoFur)" stroke="#7B1FA2" stroke-width="2" />
  <path d="M 50 28 C 44 14 52 8 58 18 Z" fill="#FF80AB" />
  <path d="M 112 35 C 128 4 112 -4 100 18 C 96 26 102 36 112 35 Z" fill="url(#discoFur)" stroke="#7B1FA2" stroke-width="2" />
  <path d="M 110 28 C 116 14 108 8 102 18 Z" fill="#FF80AB" />
  <!-- Rabbit Face -->
  <ellipse cx="80" cy="82" rx="30" ry="26" fill="url(#discoFur)" stroke="#7B1FA2" stroke-width="2" />
  <!-- 80s Neon Star Sunglasses -->
  <rect x="52" y="70" width="24" height="16" rx="5" fill="url(#shadesLens)" stroke="#FFD600" stroke-width="2.5" />
  <rect x="84" y="70" width="24" height="16" rx="5" fill="url(#shadesLens)" stroke="#FFD600" stroke-width="2.5" />
  <line x1="76" y1="78" x2="84" y2="78" stroke="#FFD600" stroke-width="3" />
  <!-- Nose & Grin -->
  <polygon points="77,92 83,92 80,96" fill="#FF4081" />
  <path d="M 72 98 Q 80 106 88 98" fill="none" stroke="#4A148C" stroke-width="2.2" stroke-linecap="round" />
  <!-- Sparkles -->
  <polygon points="120,40 123,48 131,51 123,54 120,62 117,54 109,51 117,48" fill="#FFD600" />
  <polygon points="36,65 38,70 43,72 38,74 36,79 34,74 29,72 34,70" fill="#00E5FF" />
</svg>
`);

// 3. Astro Bunny
writeAsset('rabbits/astro_rabbit.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <radialGradient id="helmetVisor" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFD54F" />
      <stop offset="50%" stop-color="#FF9800" />
      <stop offset="100%" stop-color="#E65100" />
    </radialGradient>
    <radialGradient id="suitGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#B0BEC5" />
    </radialGradient>
  </defs>
  <circle cx="80" cy="80" r="76" fill="#E0F7FA" stroke="#80DEEA" stroke-width="2" />
  <!-- Glass Bubble Helmet -->
  <circle cx="80" cy="75" r="44" fill="rgba(224, 247, 250, 0.45)" stroke="#00BCD4" stroke-width="3" />
  <!-- White Space Suit Ears -->
  <rect x="52" y="16" width="14" height="28" rx="7" fill="url(#suitGrad)" stroke="#546E7A" stroke-width="2" />
  <rect x="94" y="16" width="14" height="28" rx="7" fill="url(#suitGrad)" stroke="#546E7A" stroke-width="2" />
  <!-- Rabbit Face inside Helmet -->
  <ellipse cx="80" cy="78" rx="26" ry="22" fill="#ECEFF1" stroke="#78909C" stroke-width="1.8" />
  <!-- Gold Mirrored Visor -->
  <ellipse cx="80" cy="72" rx="24" ry="15" fill="url(#helmetVisor)" stroke="#BF360C" stroke-width="1.5" />
  <!-- Visor Glare Shine -->
  <path d="M 64 64 Q 78 60 92 64" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.8" stroke-linecap="round" />
  <!-- Collar Ring -->
  <rect x="56" y="112" width="48" height="12" rx="6" fill="#00ACC1" stroke="#006064" stroke-width="2" />
</svg>
`);

// 4. Cyber Mech Bunny
writeAsset('rabbits/cyber_rabbit.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="cyberMetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#37474F" />
      <stop offset="50%" stop-color="#263238" />
      <stop offset="100%" stop-color="#102027" />
    </linearGradient>
  </defs>
  <circle cx="80" cy="80" r="76" fill="#ECEFF1" stroke="#607D8B" stroke-width="2" />
  <!-- Cybernetic Mechanical Ears -->
  <polygon points="50,42 42,12 58,16 64,42" fill="url(#cyberMetal)" stroke="#00E5FF" stroke-width="2" />
  <line x1="50" y1="20" x2="56" y2="38" stroke="#00E5FF" stroke-width="2" />
  <polygon points="110,42 118,12 102,16 96,42" fill="url(#cyberMetal)" stroke="#00E5FF" stroke-width="2" />
  <line x1="110" y1="20" x2="104" y2="38" stroke="#00E5FF" stroke-width="2" />
  <!-- Armored Head Plating -->
  <ellipse cx="80" cy="82" rx="30" ry="26" fill="url(#cyberMetal)" stroke="#00E5FF" stroke-width="2.5" />
  <!-- Glowing Cyan Laser Eye Visor -->
  <path d="M 56 74 L 104 74 L 100 84 L 60 84 Z" fill="#00E5FF" />
  <line x1="56" y1="79" x2="104" y2="79" stroke="#FFFFFF" stroke-width="2" />
  <!-- Carbon Fiber Accents -->
  <polygon points="76,92 84,92 80,98" fill="#FF1744" />
  <line x1="68" y1="98" x2="78" y2="102" stroke="#00E5FF" stroke-width="1.8" />
  <line x1="92" y1="98" x2="82" y2="102" stroke="#00E5FF" stroke-width="1.8" />
</svg>
`);

// 5. Vintage Farm Tractor
writeAsset('bikes/vintage_tractor.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120" width="180" height="120">
  <defs>
    <radialGradient id="tractorBody" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#43A047" />
      <stop offset="100%" stop-color="#1B5E20" />
    </radialGradient>
    <radialGradient id="yellowWheel" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFEE58" />
      <stop offset="100%" stop-color="#FBC02D" />
    </radialGradient>
  </defs>
  <!-- Exhaust Stack Pipe with Smoke Puff -->
  <rect x="130" y="15" width="8" height="35" rx="3" fill="#37474F" />
  <circle cx="134" cy="10" r="5" fill="#B0BEC5" opacity="0.6" />
  <circle cx="139" cy="4" r="7" fill="#CFD8DC" opacity="0.4" />
  <!-- Tractor Engine Hood & Body -->
  <path d="M 50 50 L 50 30 Q 80 25 90 40 L 155 45 L 155 80 L 50 80 Z" fill="url(#tractorBody)" stroke="#1B5E20" stroke-width="2.5" />
  <!-- Cab / Seat Support -->
  <path d="M 60 40 L 60 22 L 75 22" fill="none" stroke="#FFEE58" stroke-width="3" stroke-linecap="round" />
  <!-- Front Grille -->
  <rect x="150" y="52" width="6" height="24" rx="2" fill="#212121" />
  <!-- Small Front Tire -->
  <circle cx="145" cy="85" r="18" fill="#212121" stroke="#424242" stroke-width="3" />
  <circle cx="145" cy="85" r="9" fill="url(#yellowWheel)" />
  <circle cx="145" cy="85" r="3" fill="#212121" />
  <!-- HUGE Rear Tire (Deep Treads) -->
  <circle cx="55" cy="75" r="34" fill="#212121" stroke="#424242" stroke-width="4" />
  <!-- Tire Lug Treads -->
  <circle cx="55" cy="75" r="22" fill="url(#yellowWheel)" stroke="#F57F17" stroke-width="2" />
  <circle cx="55" cy="75" r="8" fill="#37474F" />
  <circle cx="55" cy="75" r="3" fill="#FFEE58" />
</svg>
`);

// 6. Carrot Chopper Motorcycle
writeAsset('bikes/carrot_chopper.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120" width="180" height="120">
  <defs>
    <linearGradient id="carrotTank" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF9800" />
      <stop offset="100%" stop-color="#E65100" />
    </linearGradient>
    <linearGradient id="chromePipe" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ECEFF1" />
      <stop offset="50%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#90A4AE" />
    </linearGradient>
  </defs>
  <!-- Extended Front Fork Chopper -->
  <line x1="100" y1="35" x2="155" y2="85" stroke="url(#chromePipe)" stroke-width="5" stroke-linecap="round" />
  <!-- High Ape-Hanger Handlebars -->
  <path d="M 98 42 L 88 18 L 84 20" fill="none" stroke="url(#chromePipe)" stroke-width="3.5" stroke-linecap="round" />
  <!-- Giant Carrot Shaped Gas Tank -->
  <path d="M 65 48 C 65 35 110 38 120 48 C 110 56 65 58 65 48 Z" fill="url(#carrotTank)" stroke="#BF360C" stroke-width="2.5" />
  <!-- Green Carrot Greens at front of tank -->
  <path d="M 118 45 L 126 40 L 122 47 L 128 49 Z" fill="#4CAF50" />
  <!-- Chrome V-Twin Engine Block -->
  <polygon points="70,55 95,55 90,75 75,75" fill="#455A64" stroke="url(#chromePipe)" stroke-width="2" />
  <!-- Twin Exhaust Pipes with Flames -->
  <path d="M 85 70 L 40 76 L 25 76" fill="none" stroke="url(#chromePipe)" stroke-width="4" stroke-linecap="round" />
  <polygon points="23,76 15,73 18,76 15,79" fill="#FF5722" />
  <!-- Front Wheel (Spokes) -->
  <circle cx="155" cy="85" r="22" fill="none" stroke="#263238" stroke-width="6" />
  <circle cx="155" cy="85" r="6" fill="#CFD8DC" />
  <!-- Fat Rear Tire -->
  <circle cx="45" cy="82" r="26" fill="none" stroke="#212121" stroke-width="10" />
  <circle cx="45" cy="82" r="10" fill="#90A4AE" />
</svg>
`);

// 7. Hover UFO
writeAsset('bikes/hover_ufo.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120" width="180" height="120">
  <defs>
    <radialGradient id="ufoDome" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#E0F7FA" />
      <stop offset="100%" stop-color="#00E5FF" />
    </radialGradient>
    <linearGradient id="saucerDisk" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#78909C" />
      <stop offset="50%" stop-color="#CFD8DC" />
      <stop offset="100%" stop-color="#546E7A" />
    </linearGradient>
  </defs>
  <!-- Anti-Gravity Glow Rings beneath -->
  <ellipse cx="90" cy="98" rx="45" ry="8" fill="none" stroke="#00E5FF" stroke-width="3" opacity="0.8" />
  <ellipse cx="90" cy="106" rx="30" ry="5" fill="none" stroke="#76FF03" stroke-width="2" opacity="0.6" />
  <!-- Glass Cockpit Dome -->
  <ellipse cx="90" cy="45" rx="35" ry="24" fill="url(#ufoDome)" stroke="#00B0FF" stroke-width="2" opacity="0.9" />
  <!-- Saucer Disk Body -->
  <ellipse cx="90" cy="68" rx="72" ry="18" fill="url(#saucerDisk)" stroke="#37474F" stroke-width="2.5" />
  <!-- Rotating Neon Pod Lights -->
  <circle cx="35" cy="68" r="4.5" fill="#FF1744" />
  <circle cx="58" cy="73" r="5" fill="#FFEA00" />
  <circle cx="90" cy="75" r="5.5" fill="#76FF03" />
  <circle cx="122" cy="73" r="5" fill="#00E5FF" />
  <circle cx="145" cy="68" r="4.5" fill="#D500F9" />
</svg>
`);

// 8. Gadget Magnet
writeAsset('items/gadget_magnet.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="redPole" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5252" />
      <stop offset="100%" stop-color="#D50000" />
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="56" fill="#FFEBEE" stroke="#FF8A80" stroke-width="2" />
  <path d="M 35 35 C 15 55 15 85 60 95 C 105 85 105 55 85 35 L 72 48 C 82 60 82 75 60 82 C 38 75 38 60 48 48 Z" fill="url(#redPole)" stroke="#B71C1C" stroke-width="2" />
  <!-- Silver Poles -->
  <rect x="27" y="26" width="16" height="14" rx="2" fill="#CFD8DC" stroke="#78909C" stroke-width="1.5" />
  <rect x="77" y="26" width="16" height="14" rx="2" fill="#CFD8DC" stroke="#78909C" stroke-width="1.5" />
  <!-- Magnetic Flux Waves -->
  <path d="M 35 18 Q 60 8 85 18" fill="none" stroke="#29B6F6" stroke-width="3" stroke-linecap="round" />
  <path d="M 42 12 Q 60 3 78 12" fill="none" stroke="#00E5FF" stroke-width="2" stroke-linecap="round" />
</svg>
`);

// 9. Gadget Shield
writeAsset('items/gadget_shield.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="shieldGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFE082" />
      <stop offset="70%" stop-color="#FFB300" />
      <stop offset="100%" stop-color="#FF8F00" />
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="56" fill="#FFF8E1" stroke="#FFE082" stroke-width="2" />
  <path d="M 60 20 L 92 32 C 92 68 76 90 60 100 C 44 90 28 68 28 32 Z" fill="url(#shieldGrad)" stroke="#E65100" stroke-width="3" />
  <path d="M 60 28 L 84 38 C 84 64 72 82 60 90 C 48 82 36 64 36 38 Z" fill="#FFF9C4" opacity="0.6" />
  <!-- Carrot Symbol on Shield -->
  <polygon points="56,48 64,48 60,72" fill="#E65100" />
  <polygon points="58,44 62,44 60,48" fill="#2E7D32" />
</svg>
`);

// 10. Gadget Heart
writeAsset('items/gadget_heart.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="heartGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FF5252" />
      <stop offset="100%" stop-color="#C62828" />
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="56" fill="#FFEBEE" stroke="#FFCDD2" stroke-width="2" />
  <path d="M 60 92 C 40 76 22 58 22 40 C 22 26 34 18 46 18 C 53 18 57 21 60 26 C 63 21 67 18 74 18 C 86 18 98 26 98 40 C 98 58 80 76 60 92 Z" fill="url(#heartGrad)" stroke="#B71C1C" stroke-width="3" />
  <!-- Bandage Cross on Heart -->
  <rect x="48" y="44" width="24" height="7" rx="3" fill="#FFF9C4" transform="rotate(45 60 47)" />
  <rect x="48" y="44" width="24" height="7" rx="3" fill="#FFF9C4" transform="rotate(-45 60 47)" />
</svg>
`);

// 11. Gadget Harvester
writeAsset('items/gadget_harvester.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="harvesterGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#C8E6C9" />
      <stop offset="100%" stop-color="#81C784" />
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="56" fill="#E8F5E9" stroke="#A5D6A7" stroke-width="2" />
  <!-- Twin Golden Wheat / Carrots -->
  <path d="M 38 90 Q 60 60 75 30" fill="none" stroke="#FFB300" stroke-width="4" stroke-linecap="round" />
  <circle cx="75" cy="30" r="6" fill="#FF8F00" />
  <circle cx="66" cy="45" r="5" fill="#FFA000" />
  <circle cx="56" cy="60" r="5" fill="#FFB300" />
  <!-- Multiplier Badge 2X -->
  <circle cx="85" cy="80" r="22" fill="#2E7D32" stroke="#FFFFFF" stroke-width="2.5" />
  <text x="85" y="87" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="18" fill="#FFFFFF">2×</text>
</svg>
`);

// 12. Wooden Mystery Box
writeAsset('items/mystery_wood.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="woodPlank" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D7CCC8" />
      <stop offset="50%" stop-color="#8D6E63" />
      <stop offset="100%" stop-color="#5D4037" />
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="56" fill="#EFEBE9" stroke="#BCAAA4" stroke-width="2" />
  <rect x="25" y="30" width="70" height="65" rx="8" fill="url(#woodPlank)" stroke="#3E2723" stroke-width="3" />
  <!-- Iron Corner Brackets -->
  <polygon points="25,30 45,30 25,50" fill="#78909C" />
  <polygon points="95,30 75,30 95,50" fill="#78909C" />
  <polygon points="25,95 45,95 25,75" fill="#78909C" />
  <polygon points="95,95 75,95 95,75" fill="#78909C" />
  <!-- Question Mark -->
  <text x="60" y="75" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="900" font-size="44" fill="#FFD54F" stroke="#E65100" stroke-width="2">?</text>
</svg>
`);

// 13. Golden Barn Vault
writeAsset('items/mystery_gold.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="vaultGold" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFF9C4" />
      <stop offset="50%" stop-color="#FFD54F" />
      <stop offset="100%" stop-color="#FF8F00" />
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="56" fill="#FFFDE7" stroke="#FFE082" stroke-width="2" />
  <rect x="22" y="26" width="76" height="72" rx="12" fill="url(#vaultGold)" stroke="#E65100" stroke-width="3.5" />
  <!-- Diamond / Star Emblem in Center -->
  <polygon points="60,38 69,52 84,55 73,66 76,82 60,74 44,82 47,66 36,55 51,52" fill="#FFFFFF" stroke="#E65100" stroke-width="2" />
  <circle cx="60" cy="60" r="6" fill="#00E5FF" />
</svg>
`);

console.log('All 13 new assets generated successfully!');

