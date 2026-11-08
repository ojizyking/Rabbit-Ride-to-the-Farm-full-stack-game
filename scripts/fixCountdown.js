const fs = require('fs');
const playPath = 'client/src/pages/Play.tsx';
let playSrc = fs.readFileSync(playPath, 'utf8');

const target = `          const next = prev - 1;
          sounds.playTick();
          // Cycle sponsor every 7.5 seconds
          const slide = Math.floor((30 - next) / 7.5) % SPONSORS.length;
          setSponsorIdx(slide);
          return next;`;

// Handle both CRLF and LF
const targetLF = target.replace(/\r\n/g, '\n');
const targetCRLF = target.replace(/\n/g, '\r\n');

const replacement = `          const next = prev - 1;
          sounds.playTick();
          if (next <= 25) setSkipAvailable(true);
          // Cycle sponsor every 7.5 seconds
          const slide = Math.floor((30 - next) / 7.5) % Math.max(sponsors.length, 1);
          setSponsorIdx(slide);
          return next;`;

if (playSrc.includes(targetCRLF)) {
  playSrc = playSrc.replace(targetCRLF, replacement.replace(/\n/g, '\r\n'));
  fs.writeFileSync(playPath, playSrc, 'utf8');
  console.log('✅ Updated countdown with CRLF');
} else if (playSrc.includes(targetLF)) {
  playSrc = playSrc.replace(targetLF, replacement.replace(/\r\n/g, '\n'));
  fs.writeFileSync(playPath, playSrc, 'utf8');
  console.log('✅ Updated countdown with LF');
} else {
  console.error('❌ Could not find countdown block in Play.tsx');
}
