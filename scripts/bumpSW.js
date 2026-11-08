const fs = require('fs');

const swPathClient = 'client/public/sw.js';
let swClient = fs.readFileSync(swPathClient, 'utf8');
swClient = swClient.replace(/rabbit-farm-pwa-v\d+/, 'rabbit-farm-pwa-v10');
fs.writeFileSync(swPathClient, swClient, 'utf8');

const swPathDist = 'client/dist/sw.js';
if (fs.existsSync(swPathDist)) {
  let swDist = fs.readFileSync(swPathDist, 'utf8');
  swDist = swDist.replace(/rabbit-farm-pwa-v\d+/, 'rabbit-farm-pwa-v10');
  fs.writeFileSync(swPathDist, swDist, 'utf8');
}

console.log('✅ Bumped service worker cache to v10');
