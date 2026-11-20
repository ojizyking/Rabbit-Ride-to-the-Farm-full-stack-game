/**
 * bumpSW.js — auto-increment Service Worker cache version
 * Reads the current version from client/public/sw.js, bumps it by 1,
 * and writes the new version to all sw.js targets.
 *
 * Usage: node scripts/bumpSW.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '../client/public/sw.js');

const targets = [
  SOURCE,
  path.resolve(__dirname, '../client/dist/sw.js'),
  path.resolve(__dirname, '../server/public/sw.js')
];

// Read current version from source
const sourceContent = fs.readFileSync(SOURCE, 'utf8');
const match = sourceContent.match(/rabbit-farm-pwa-v(\d+)/);
if (!match) {
  console.error('❌ Could not find version string in sw.js (expected: rabbit-farm-pwa-vNN)');
  process.exit(1);
}

const currentVersion = parseInt(match[1], 10);
const nextVersion = currentVersion + 1;
const oldTag = `rabbit-farm-pwa-v${currentVersion}`;
const newTag = `rabbit-farm-pwa-v${nextVersion}`;

targets.forEach(p => {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(new RegExp(`rabbit-farm-pwa-v\\d+`, 'g'), newTag);
    fs.writeFileSync(p, content, 'utf8');
    console.log(`  ✅ ${path.relative(process.cwd(), p)}: ${oldTag} → ${newTag}`);
  }
});

console.log(`\n🚀 Service Worker bumped: ${oldTag} → ${newTag}`);
