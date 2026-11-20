const fs = require('fs');

const targets = [
  'client/public/sw.js',
  'client/dist/sw.js',
  'server/public/sw.js'
];

targets.forEach(p => {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/rabbit-farm-pwa-v\d+/, 'rabbit-farm-pwa-v15');
    fs.writeFileSync(p, content, 'utf8');
  }
});

console.log('✅ Bumped service worker cache to v15 across client and server');
