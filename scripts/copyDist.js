const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../client/dist');
const destDir = path.join(__dirname, '../server/public');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(srcDir)) {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  copyRecursiveSync(srcDir, destDir);
  console.log('✅ Successfully copied client/dist to server/public');
} else {
  console.warn('⚠️ client/dist does not exist. Run "npm run build --prefix client" first.');
}
