const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '../public/assets/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const svgPath = path.join(__dirname, '../public/assets/logo.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  
  // Maskable icon with emerald background and centered emblem for adaptive home screen icons
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 45, g: 138, b: 78, alpha: 1 }
    }
  })
  .composite([
    {
      input: await sharp(svgBuffer).resize(400, 400).toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(iconsDir, 'icon-maskable.png'));

  console.log('Successfully generated all PWA icons in', iconsDir);
}

generate().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
