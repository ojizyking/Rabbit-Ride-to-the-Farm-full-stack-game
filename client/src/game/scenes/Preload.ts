import Phaser from 'phaser';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Synchronously create canvas texture for the animated running rabbit
    if (!this.textures.exists('preload-runner')) {
      const runnerCanvas = this.textures.createCanvas('preload-runner', 96, 76);
      if (runnerCanvas) {
        const ctx = runnerCanvas.getContext();

        // Bicycle Wheels
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.arc(22, 54, 13, 0, Math.PI * 2);
        ctx.arc(74, 54, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFC93C';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#455A64';
        ctx.beginPath();
        ctx.arc(22, 54, 5, 0, Math.PI * 2);
        ctx.arc(74, 54, 5, 0, Math.PI * 2);
        ctx.fill();

        // Bike Frame (Gold / Yellow)
        ctx.strokeStyle = '#FFC93C';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(22, 54);
        ctx.lineTo(46, 52);
        ctx.lineTo(62, 36);
        ctx.lineTo(40, 36);
        ctx.closePath();
        ctx.moveTo(46, 52);
        ctx.lineTo(74, 54);
        ctx.stroke();

        // Saddle
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(34, 34);
        ctx.lineTo(46, 34);
        ctx.stroke();

        // Handlebars
        ctx.strokeStyle = '#FFC93C';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(62, 36);
        ctx.lineTo(66, 24);
        ctx.lineTo(60, 24);
        ctx.stroke();

        // Rabbit Body (White fur, racing stance)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#37474F';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(48, 28, 14, 11, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Paws gripping handlebar
        ctx.beginPath();
        ctx.arc(62, 26, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rabbit Head
        ctx.beginPath();
        ctx.ellipse(54, 17, 11, 9, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pink Cheeks & Eye
        ctx.fillStyle = '#FF8A80';
        ctx.beginPath();
        ctx.arc(58, 20, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(57, 16, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(56.3, 15.3, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Green Helmet
        ctx.fillStyle = '#2D8A4E';
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(52, 14, 10, Math.PI, 0, false);
        ctx.fill();
        ctx.stroke();

        // Fast wind-swept ears blowing backward
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#37474F';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(32, 9, 14, 5, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FF80AB';
        ctx.beginPath();
        ctx.ellipse(32, 9, 9, 2.8, -0.35, 0, Math.PI * 2);
        ctx.fill();

        runnerCanvas.refresh();
      }
    }

    // Sky & Meadow Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x70C7EC, 0x70C7EC, 0xD9F2CE, 0xD9F2CE, 1);
    bg.fillRect(0, 0, width, height);

    // Warm Morning Sun
    bg.fillStyle(0xFFEB3B, 0.9);
    bg.fillCircle(width - 90, 80, 50);

    // Soft Cloud
    bg.fillStyle(0xFFFFFF, 0.75);
    bg.fillCircle(120, 90, 30);
    bg.fillCircle(150, 80, 40);
    bg.fillCircle(180, 90, 30);

    // Track Geometry
    const trackWidth = Math.min(width * 0.82, 480);
    const trackHeight = 22;
    const trackX = width / 2;
    const trackY = height / 2 + 35;
    const trackStartX = trackX - trackWidth / 2;

    // Grass turf cushion around track
    const turf = this.add.graphics();
    turf.fillStyle(0x43A047, 0.55);
    turf.fillRoundedRect(trackStartX - 16, trackY - 8, trackWidth + 32, trackHeight + 16, 16);

    // Dirt road bed with wood finish
    const roadTrack = this.add.graphics();
    roadTrack.fillStyle(0x3E2723, 0.9);
    roadTrack.fillRoundedRect(trackStartX, trackY, trackWidth, trackHeight, 11);
    roadTrack.lineStyle(2.5, 0x8D6E63, 0.8);
    roadTrack.strokeRoundedRect(trackStartX, trackY, trackWidth, trackHeight, 11);

    // Road dashed lane stripes
    const roadStripes = this.add.graphics();
    roadStripes.fillStyle(0xFFFFFF, 0.35);
    const stripesCount = Math.floor(trackWidth / 24);
    for (let i = 0; i < stripesCount; i++) {
      roadStripes.fillRect(trackStartX + 8 + (i * 24), trackY + trackHeight / 2 - 1.5, 12, 3);
    }

    // Glowing carrot progress fill
    const progressBar = this.add.graphics();

    // 0% to 100% Counter Text
    const percentText = this.add.text(width / 2, trackY - 70, '0%', {
      fontFamily: 'Fredoka, -apple-system, sans-serif',
      fontSize: '48px',
      color: '#1B5E20',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 6
    }).setOrigin(0.5, 0.5);

    // Milestone status text
    const statusText = this.add.text(width / 2, trackY + 44, '🐰 Rabbit warming up paws...', {
      fontFamily: 'Fredoka, -apple-system, sans-serif',
      fontSize: '17px',
      color: '#2E7D32',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    // Running Rabbit Sprite mounted on progress head
    const rabbitRunner = this.add.image(trackStartX, trackY - 26, 'preload-runner')
      .setOrigin(0.5, 0.85)
      .setScale(0.85);

    // Bouncing hop animation for the runner
    this.tweens.add({
      targets: rabbitRunner,
      y: trackY - 30,
      rotation: 0.04,
      duration: 120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.load.on('progress', (value: number) => {
      // 1. Draw glowing carrot-orange progress fill
      progressBar.clear();
      if (value > 0.01) {
        const fillWidth = Math.max(12, trackWidth * value);
        progressBar.fillStyle(0xFF7A00, 1);
        progressBar.fillRoundedRect(trackStartX, trackY, fillWidth, trackHeight, 11);

        progressBar.fillStyle(0xFFC93C, 0.85);
        progressBar.fillRoundedRect(trackStartX + 2, trackY + 2, fillWidth - 4, 6, 3);
      }

      // 2. Position the sprinting rabbit
      const currentX = trackStartX + (trackWidth * value);
      rabbitRunner.x = currentX;

      // 3. Update the 0 to 100% counter
      const pct = Math.round(value * 100);
      percentText.setText(`${pct}%`);

      // 4. Milestone messages
      if (pct < 28) {
        statusText.setText('🐰 Rabbit warming up paws...');
      } else if (pct < 55) {
        statusText.setText('🚲 Tuning bike chain & carrot nitro boost...');
      } else if (pct < 85) {
        statusText.setText('🌾 Scouting dirt track & secret farm shortcuts...');
      } else if (pct < 100) {
        statusText.setText('🥕 Polishing golden carrots & cash rewards...');
      } else {
        statusText.setText('🏁 100% Loaded! Ready to ride!');
      }

      // 5. Emit dust puff behind rabbit
      if (Math.random() > 0.35) {
        const dust = this.add.circle(currentX - 25, trackY + 6, Phaser.Math.Between(3, 7), 0xD7CCC8, 0.7);
        this.tweens.add({
          targets: dust,
          x: dust.x - Phaser.Math.Between(15, 30),
          y: dust.y - Phaser.Math.Between(5, 12),
          alpha: 0,
          scale: 1.6,
          duration: 350,
          onComplete: () => dust.destroy()
        });
      }
    });

    this.load.on('complete', () => {
      percentText.setText('100%');
      statusText.setText('🏁 Ready! Hop on & Ride! 🐰💨');

      // Zoom-off transition before launching the FarmRide scene
      this.tweens.add({
        targets: rabbitRunner,
        x: width + 120,
        scaleX: 1.05,
        duration: 320,
        ease: 'Power2',
        onComplete: () => {
          bg.destroy();
          turf.destroy();
          roadTrack.destroy();
          roadStripes.destroy();
          progressBar.destroy();
          percentText.destroy();
          statusText.destroy();
          rabbitRunner.destroy();
          this.scene.start('FarmRide');
        }
      });
    });

    // Preload SVG assets
    this.load.svg('rabbit-starter', '/assets/rabbits/starter_rabbit.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-red-hoodie', '/assets/rabbits/red_hoodie.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-blue-aviator', '/assets/rabbits/blue_aviator.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-farmer-hat', '/assets/rabbits/farmer_hat.svg', { width: 100, height: 100 });
    this.load.svg('rabbit-ninja', '/assets/rabbits/ninja_rabbit.svg', { width: 100, height: 100 });

    this.load.svg('bike-starter', '/assets/bikes/starter_bike.svg', { width: 120, height: 90 });
    this.load.svg('bike-blue-basket', '/assets/bikes/blue_basket.svg', { width: 120, height: 90 });
    this.load.svg('bike-green-bloom', '/assets/bikes/green_bloom.svg', { width: 120, height: 90 });
    this.load.svg('bike-turbo-gold', '/assets/bikes/turbo_gold.svg', { width: 120, height: 90 });

    this.load.svg('item-star', '/assets/items/star.svg', { width: 44, height: 44 });
    this.load.svg('item-carrot', '/assets/items/carrot.svg', { width: 44, height: 44 });
    this.load.svg('item-crate', '/assets/items/crate.svg', { width: 56, height: 56 });
    this.load.svg('item-billboard', '/assets/items/billboard.svg', { width: 150, height: 110 });

    // Procedurally create texture layers
    this.generateParallaxTextures();
  }

  create() {
    this.scene.start('FarmRide');
  }

  private generateParallaxTextures() {
    // 1. Sky & Sun Background (1200 x 600)
    const skyCanvas = this.textures.createCanvas('farm-sky', 1200, 600);
    if (skyCanvas) {
      const ctx = skyCanvas.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, 600);
      grad.addColorStop(0, '#70C7EC');
      grad.addColorStop(0.6, '#BFE8FA');
      grad.addColorStop(1, '#D9F2CE');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 600);

      // Warm Sun
      const sunGrad = ctx.createRadialGradient(1000, 100, 10, 1000, 100, 80);
      sunGrad.addColorStop(0, '#FFFDE7');
      sunGrad.addColorStop(0.3, '#FFF176');
      sunGrad.addColorStop(1, 'rgba(255, 238, 88, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(1000, 100, 80, 0, Math.PI * 2);
      ctx.fill();

      // Soft clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const drawCloud = (cx: number, cy: number, r: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.7, cy - r * 0.2, r * 0.8, 0, Math.PI * 2);
        ctx.arc(cx + r * 1.4, cy, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCloud(150, 120, 36);
      drawCloud(480, 90, 44);
      drawCloud(820, 140, 38);
      skyCanvas.refresh();
    }

    // 2. Distant Hills & Pastoral Farm Farmland (1200 x 300)
    const hillsCanvas = this.textures.createCanvas('farm-hills', 1200, 300);
    if (hillsCanvas) {
      const ctx = hillsCanvas.getContext();

      // Deepest atmospheric ridge (bluish teal green)
      ctx.fillStyle = '#A5D6A7';
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.bezierCurveTo(250, 80, 500, 180, 750, 100);
      ctx.bezierCurveTo(950, 60, 1100, 160, 1200, 90);
      ctx.lineTo(1200, 300);
      ctx.lineTo(0, 300);
      ctx.fill();

      // Mid-distance rolling pastoral hills
      ctx.fillStyle = '#81C784';
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.bezierCurveTo(180, 140, 380, 220, 600, 160);
      ctx.bezierCurveTo(820, 110, 1020, 240, 1200, 150);
      ctx.lineTo(1200, 300);
      ctx.lineTo(0, 300);
      ctx.fill();

      // Foreground lush hill crest
      ctx.fillStyle = '#66BB6A';
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.bezierCurveTo(300, 210, 650, 190, 900, 230);
      ctx.bezierCurveTo(1050, 250, 1150, 220, 1200, 240);
      ctx.lineTo(1200, 300);
      ctx.lineTo(0, 300);
      ctx.fill();

      // Distant Red Barn on crest
      ctx.fillStyle = '#C62828';
      ctx.fillRect(440, 140, 68, 44);
      // Barn Gambrel Roof
      ctx.fillStyle = '#B71C1C';
      ctx.beginPath();
      ctx.moveTo(434, 140);
      ctx.lineTo(454, 116);
      ctx.lineTo(474, 106);
      ctx.lineTo(494, 116);
      ctx.lineTo(514, 140);
      ctx.closePath();
      ctx.fill();
      // White barn doors
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(464, 156, 20, 28);
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 2;
      ctx.strokeRect(464, 156, 20, 28);
      ctx.beginPath();
      ctx.moveTo(464, 156);
      ctx.lineTo(484, 184);
      ctx.moveTo(484, 156);
      ctx.lineTo(464, 184);
      ctx.stroke();

      // Metallic Silo with domed roof
      ctx.fillStyle = '#90A4AE';
      ctx.fillRect(514, 120, 22, 64);
      ctx.fillStyle = '#CFD8DC';
      ctx.beginPath();
      ctx.arc(525, 120, 11, Math.PI, 0);
      ctx.fill();

      // Windmill tower & turning blades
      ctx.fillStyle = '#4E342E';
      ctx.beginPath();
      ctx.moveTo(916, 195);
      ctx.lineTo(924, 130);
      ctx.lineTo(936, 130);
      ctx.lineTo(944, 195);
      ctx.closePath();
      ctx.fill();
      // Hub
      ctx.fillStyle = '#FFC107';
      ctx.beginPath();
      ctx.arc(930, 130, 5, 0, Math.PI * 2);
      ctx.fill();
      // Blades
      ctx.strokeStyle = '#FFF8E1';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(900, 100);
      ctx.lineTo(960, 160);
      ctx.moveTo(960, 100);
      ctx.lineTo(900, 160);
      ctx.stroke();

      // Distant clustered apple tree clumps
      ctx.fillStyle = '#388E3C';
      for (const tx of [120, 150, 720, 760, 1080]) {
        ctx.beginPath();
        ctx.arc(tx, 210, 16, 0, Math.PI * 2);
        ctx.arc(tx + 12, 204, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      hillsCanvas.refresh();
    }

    // 3. Near Farm Fence, Sunflowers & Hedgerow (1200 x 200)
    const fenceCanvas = this.textures.createCanvas('farm-fence', 1200, 200);
    if (fenceCanvas) {
      const ctx = fenceCanvas.getContext();

      // Low roadside hedgerow base
      ctx.fillStyle = '#43A047';
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.arc(x + 20, 165, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wooden fence rails
      ctx.fillStyle = '#8D6E63';
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 2.5;

      ctx.fillRect(0, 118, 1200, 11);
      ctx.strokeRect(0, 118, 1200, 11);
      ctx.fillRect(0, 142, 1200, 11);
      ctx.strokeRect(0, 142, 1200, 11);

      // Posts with bevel tops every 75px
      for (let x = 15; x < 1200; x += 75) {
        // Shadow behind post
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x + 14, 98, 4, 80);

        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(x, 96, 15, 80);
        ctx.strokeRect(x, 96, 15, 80);

        // Pointed post cap
        ctx.fillStyle = '#A1887F';
        ctx.beginPath();
        ctx.moveTo(x - 1, 96);
        ctx.lineTo(x + 7.5, 88);
        ctx.lineTo(x + 16, 96);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Golden Sunflowers along fence
      for (let x = 50; x < 1200; x += 95) {
        // Green stem & leaves
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(x + 4, 112, 4, 60);
        ctx.beginPath();
        ctx.ellipse(x + 12, 135, 8, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Golden Petals
        ctx.fillStyle = '#FDD835';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const px = x + 6 + Math.cos(a) * 13;
          const py = 110 + Math.sin(a) * 13;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center seed disk
        ctx.fillStyle = '#4E342E';
        ctx.beginPath();
        ctx.arc(x + 6, 110, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.arc(x + 5, 109, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      fenceCanvas.refresh();
    }

    // 4. Isometric Perspective Farm Road (1200 x 160)
    const groundCanvas = this.textures.createCanvas('farm-ground', 1200, 160);
    if (groundCanvas) {
      const ctx = groundCanvas.getContext();

      // (A) Far Road Verge: light green grass buffer with perspective depth (y: 0 to 24)
      ctx.fillStyle = '#81C784';
      ctx.fillRect(0, 0, 1200, 12);
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 12, 1200, 12);

      // Fine grass tufts along the far edge
      ctx.fillStyle = '#2E7D32';
      for (let x = 6; x < 1200; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 24);
        ctx.lineTo(x + 4, 12);
        ctx.lineTo(x + 8, 24);
        ctx.fill();
      }

      // Tiny distant wildflowers (yellow, white, pink)
      for (let i = 0; i < 40; i++) {
        const wx = (i * 31) % 1200;
        const wy = 6 + (i % 3) * 5;
        ctx.fillStyle = i % 3 === 0 ? '#FFF59D' : (i % 3 === 1 ? '#FFFFFF' : '#F48FB1');
        ctx.beginPath();
        ctx.arc(wx, wy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // (B) Far Dirt Shoulder: compressed perspective earth (y: 24 to 45)
      const shoulderGrad = ctx.createLinearGradient(0, 24, 0, 45);
      gradColor(shoulderGrad, 0, '#A1887F');
      gradColor(shoulderGrad, 1, '#8D6E63');
      ctx.fillStyle = shoulderGrad;
      ctx.fillRect(0, 24, 1200, 21);

      // (C) Main Isometric Road Surface (y: 45 to 125) with deep earthen gradient
      const roadGrad = ctx.createLinearGradient(0, 45, 0, 125);
      gradColor(roadGrad, 0, '#795548');
      gradColor(roadGrad, 0.45, '#6D4C41');
      gradColor(roadGrad, 1, '#4E342E');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 45, 1200, 80);

      // Angled perspective wheel ruts / tire paths (subtle depression shading)
      ctx.fillStyle = 'rgba(62, 39, 35, 0.45)';
      ctx.fillRect(0, 56, 1200, 10);
      ctx.fillRect(0, 96, 1200, 14);

      // Dashed perspective center-line country road markings (slanted slightly for 2.5D tilt)
      ctx.fillStyle = 'rgba(255, 248, 225, 0.26)';
      for (let x = 0; x < 1200; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 78);
        ctx.lineTo(x + 36, 76);
        ctx.lineTo(x + 38, 80);
        ctx.lineTo(x + 2, 82);
        ctx.closePath();
        ctx.fill();
      }

      // Realistic farm track pebbles and cobblestones with 3D light & shadow
      for (let i = 0; i < 110; i++) {
        const px = (i * 41) % 1200;
        const py = 48 + ((i * 23) % 72);
        const rad = 1.8 + (i % 3) * 0.8;

        // Shadow under pebble
        ctx.fillStyle = 'rgba(38, 24, 20, 0.55)';
        ctx.beginPath();
        ctx.ellipse(px + 1, py + 1.2, rad + 0.6, rad * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pebble body
        ctx.fillStyle = (i % 2 === 0) ? '#BCAAA4' : '#8D6E63';
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();

        // Pebble top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(px - 0.5, py - 0.5, rad * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // (D) Near Road Embankment (y: 125 to 160) - rich dark soil & bold lush foreground grass
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(0, 125, 1200, 35);

      // Overlapping bold foreground grass blades
      ctx.fillStyle = '#2E7D32';
      for (let x = 0; x < 1200; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 145);
        ctx.lineTo(x + 6, 122);
        ctx.lineTo(x + 12, 145);
        ctx.fill();

        // Second blade leaning with speed
        ctx.fillStyle = '#1B5E20';
        ctx.beginPath();
        ctx.moveTo(x + 4, 150);
        ctx.lineTo(x + 14, 126);
        ctx.lineTo(x + 18, 150);
        ctx.fill();
        ctx.fillStyle = '#2E7D32';
      }

      groundCanvas.refresh();
    }

    // 4b. Soft Radial Drop Shadow Texture (96 x 32) for Rabbit & Obstacles
    const shadowCanvas = this.textures.createCanvas('shadow-oval', 96, 32);
    if (shadowCanvas) {
      const sCtx = shadowCanvas.getContext();
      const cx = 48;
      const cy = 16;
      const sGrad = sCtx.createRadialGradient(cx, cy, 2, cx, cy, 44);
      sGrad.addColorStop(0, 'rgba(18, 18, 18, 0.72)');
      sGrad.addColorStop(0.35, 'rgba(24, 24, 24, 0.48)');
      sGrad.addColorStop(0.7, 'rgba(30, 30, 30, 0.18)');
      sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = sGrad;
      sCtx.beginPath();
      sCtx.ellipse(cx, cy, 46, 14, 0, 0, Math.PI * 2);
      sCtx.fill();
      shadowCanvas.refresh();
    }

    // 4c. Extreme Foreground Rush Verge (1200 x 70) - 1.35x Parallax speed
    const vergeCanvas = this.textures.createCanvas('farm-verge-rush', 1200, 70);
    if (vergeCanvas) {
      const vCtx = vergeCanvas.getContext();

      // Deep rich foreground turf
      for (let x = 0; x < 1200; x += 28) {
        // Broad grass cluster
        vCtx.fillStyle = '#1B5E20';
        vCtx.beginPath();
        vCtx.moveTo(x, 70);
        vCtx.lineTo(x + 10, 18);
        vCtx.lineTo(x + 22, 70);
        vCtx.fill();

        vCtx.fillStyle = '#2E7D32';
        vCtx.beginPath();
        vCtx.moveTo(x + 8, 70);
        vCtx.lineTo(x + 20, 10);
        vCtx.lineTo(x + 30, 70);
        vCtx.fill();

        // Occasional bright yellow buttercup or white daisy
        if (x % 84 === 0) {
          vCtx.fillStyle = '#FFEB3B';
          vCtx.beginPath();
          vCtx.arc(x + 18, 16, 5, 0, Math.PI * 2);
          vCtx.fill();
          vCtx.fillStyle = '#FF9800';
          vCtx.beginPath();
          vCtx.arc(x + 18, 16, 2, 0, Math.PI * 2);
          vCtx.fill();
        }
      }

      vergeCanvas.refresh();
    }

    // 5. Hay Bale Obstacle (70 x 60)
    const hayCanvas = this.textures.createCanvas('obstacle-hay', 70, 60);
    if (hayCanvas) {
      const ctx = hayCanvas.getContext();
      ctx.fillStyle = '#FDD835';
      ctx.beginPath();
      ctx.ellipse(35, 30, 32, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#C67100';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Binding twines
      ctx.strokeStyle = '#D84315';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(35, 30, 24, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(35, 30, 14, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      hayCanvas.refresh();
    }

    // 6. 360-Degree Stunt Loop Track (300 x 300)
    const loopCanvas = this.textures.createCanvas('track-loop-360', 300, 300);
    if (loopCanvas) {
      const ctx = loopCanvas.getContext();
      const cx = 150;
      const cy = 150;
      const radius = 115;

      // Wooden scaffolding support struts
      ctx.strokeStyle = '#6D4C41';
      ctx.lineWidth = 4;
      // Vertical legs
      ctx.beginPath();
      ctx.moveTo(cx - 90, cy + radius);
      ctx.lineTo(cx - 90, 300);
      ctx.moveTo(cx + 90, cy + radius);
      ctx.lineTo(cx + 90, 300);
      ctx.moveTo(cx, cy + radius);
      ctx.lineTo(cx, 300);
      // Cross trusses
      ctx.moveTo(cx - 90, 240);
      ctx.lineTo(cx + 90, 300);
      ctx.moveTo(cx + 90, 240);
      ctx.lineTo(cx - 90, 300);
      ctx.stroke();

      // Outer Loop Ribbon Track
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Riding Surface
      ctx.strokeStyle = '#FFC93C';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Dual Guide Rails
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 7, 0, Math.PI * 2);
      ctx.stroke();

      // Golden 360° Neon Sign at Apex
      ctx.fillStyle = '#2D8A4E';
      ctx.beginPath();
      ctx.roundRect(cx - 55, cy - radius - 24, 110, 26, 8);
      ctx.fill();
      ctx.strokeStyle = '#FFC93C';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ 360° LOOP ⚡', cx, cy - radius - 11);

      loopCanvas.refresh();
    }

    // 7. Stunt Jump Ramp (100 x 60)
    const rampCanvas = this.textures.createCanvas('ramp-stunt', 100, 60);
    if (rampCanvas) {
      const ctx = rampCanvas.getContext();
      // Ramp body triangle
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.moveTo(0, 60);
      ctx.quadraticCurveTo(50, 58, 100, 10);
      ctx.lineTo(100, 60);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Striped top surface
      ctx.fillStyle = '#FF7A00';
      ctx.beginPath();
      ctx.moveTo(0, 60);
      ctx.quadraticCurveTo(50, 58, 100, 10);
      ctx.lineTo(100, 18);
      ctx.quadraticCurveTo(50, 64, 0, 60);
      ctx.fill();

      // Hazard stripes
      ctx.strokeStyle = '#FFC93C';
      ctx.lineWidth = 4;
      for (let i = 20; i < 90; i += 18) {
        ctx.beginPath();
        ctx.moveTo(i, 56 - (i * 0.45));
        ctx.lineTo(i + 8, 48 - (i * 0.45));
        ctx.stroke();
      }

      rampCanvas.refresh();
    }

    // 8. Particle textures
    const starP = this.textures.createCanvas('particle-star', 16, 16);
    if (starP) {
      const ctx = starP.getContext();
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      starP.refresh();
    }

    const flameP = this.textures.createCanvas('particle-flame', 14, 14);
    if (flameP) {
      const ctx = flameP.getContext();
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(7, 7, 6, 0, Math.PI * 2);
      ctx.fill();
      flameP.refresh();
    }

    // 8B. Power-up Collectible Textures: Magnet, Shield, Nitro, Warning Sign & Bubble
    // A. Magnet (48 x 48)
    const magnetCanvas = this.textures.createCanvas('item-magnet', 48, 48);
    if (magnetCanvas) {
      const ctx = magnetCanvas.getContext();
      // Horseshoe magnet body
      ctx.strokeStyle = '#E53935';
      ctx.lineWidth = 10;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(24, 22, 14, 0, Math.PI, true);
      ctx.stroke();

      // Silver pole tips
      ctx.fillStyle = '#B0BEC5';
      ctx.fillRect(5, 20, 10, 8);
      ctx.fillRect(33, 20, 10, 8);

      // Yellow spark
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.arc(24, 20, 4, 0, Math.PI * 2);
      ctx.fill();
      magnetCanvas.refresh();
    }

    // B. Shield (48 x 48)
    const shieldCanvas = this.textures.createCanvas('item-shield', 48, 48);
    if (shieldCanvas) {
      const ctx = shieldCanvas.getContext();
      // Glowing cyan shield
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.moveTo(24, 6);
      ctx.lineTo(42, 14);
      ctx.lineTo(36, 36);
      ctx.lineTo(24, 44);
      ctx.lineTo(12, 36);
      ctx.lineTo(6, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Star emblem
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(24, 24, 6, 0, Math.PI * 2);
      ctx.fill();
      shieldCanvas.refresh();
    }

    // C. Super Nitro Rocket Drink (48 x 48)
    const nitroCanvas = this.textures.createCanvas('item-nitro', 48, 48);
    if (nitroCanvas) {
      const ctx = nitroCanvas.getContext();
      // Nitro cylinder bottle
      ctx.fillStyle = '#FF7A00';
      ctx.beginPath();
      ctx.roundRect(14, 8, 20, 32, 6);
      ctx.fill();
      ctx.strokeStyle = '#FFE082';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Lightning bolt icon
      ctx.fillStyle = '#FFF59D';
      ctx.beginPath();
      ctx.moveTo(26, 12);
      ctx.lineTo(18, 26);
      ctx.lineTo(25, 26);
      ctx.lineTo(22, 36);
      ctx.lineTo(32, 22);
      ctx.lineTo(25, 22);
      ctx.closePath();
      ctx.fill();
      nitroCanvas.refresh();
    }

    // D. Rider Shield Aura Bubble (120 x 120)
    const bubbleCanvas = this.textures.createCanvas('shield-bubble', 120, 120);
    if (bubbleCanvas) {
      const ctx = bubbleCanvas.getContext();
      const bGrad = ctx.createRadialGradient(60, 60, 20, 60, 60, 56);
      bGrad.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
      bGrad.addColorStop(0.8, 'rgba(0, 229, 255, 0.45)');
      bGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(60, 60, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#80D8FF';
      ctx.lineWidth = 3;
      ctx.stroke();
      bubbleCanvas.refresh();
    }

    // E. Road Warning Flag / Hazard Sign (60 x 60)
    const warnCanvas = this.textures.createCanvas('obstacle-warning', 60, 60);
    if (warnCanvas) {
      const ctx = warnCanvas.getContext();
      // Wooden post
      ctx.fillStyle = '#795548';
      ctx.fillRect(27, 28, 6, 30);

      // Yellow warning triangle
      ctx.fillStyle = '#FFC107';
      ctx.beginPath();
      ctx.moveTo(30, 4);
      ctx.lineTo(54, 38);
      ctx.lineTo(6, 38);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#D84315';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Exclamation mark
      ctx.fillStyle = '#212121';
      ctx.fillRect(28, 14, 4, 12);
      ctx.beginPath();
      ctx.arc(30, 31, 2.5, 0, Math.PI * 2);
      ctx.fill();
      warnCanvas.refresh();
    }

    // 9. Procedural Animated Billboard Textures (240 x 180)
    const drawBillboard = (key: string, isLit: boolean) => {
      const bCanvas = this.textures.createCanvas(key, 240, 180);
      if (!bCanvas) return;
      const ctx = bCanvas.getContext();

      // Wooden / Steel Dual Support Posts
      ctx.fillStyle = '#4E342E';
      ctx.fillRect(45, 100, 12, 80);
      ctx.fillRect(183, 100, 12, 80);
      ctx.strokeStyle = '#271612';
      ctx.lineWidth = 2;
      ctx.strokeRect(45, 100, 12, 80);
      ctx.strokeRect(183, 100, 12, 80);

      // Diagonal cross-trusses
      ctx.beginPath();
      ctx.moveTo(57, 130);
      ctx.lineTo(183, 175);
      ctx.moveTo(183, 130);
      ctx.lineTo(57, 175);
      ctx.stroke();

      // Main Billboard Board Outer Casing
      ctx.fillStyle = '#3E2723';
      ctx.beginPath();
      ctx.roundRect(10, 8, 220, 105, 10);
      ctx.fill();
      ctx.strokeStyle = isLit ? '#FFD54F' : '#FFA000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Marquee Chasing Lightbulbs around perimeter
      const bulbRadius = 3.5;
      const perimeterPoints: { x: number; y: number }[] = [];
      for (let x = 25; x <= 215; x += 22) perimeterPoints.push({ x, y: 15 });
      for (let y = 32; y <= 95; y += 20) perimeterPoints.push({ x: 220, y });
      for (let x = 215; x >= 25; x -= 22) perimeterPoints.push({ x, y: 104 });
      for (let y = 95; y >= 32; y -= 20) perimeterPoints.push({ x: 20, y });

      perimeterPoints.forEach((pt, idx) => {
        const lit = (idx % 2 === 0) ? isLit : !isLit;
        ctx.fillStyle = lit ? '#FFF59D' : '#FF9800';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, bulbRadius + (lit ? 1 : 0), 0, Math.PI * 2);
        ctx.fill();
        if (lit) {
          ctx.strokeStyle = '#FFE082';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Inner TV Screen
      const screenGrad = ctx.createLinearGradient(20, 22, 220, 95);
      screenGrad.addColorStop(0, '#0D3818');
      screenGrad.addColorStop(0.5, '#1B5E20');
      screenGrad.addColorStop(1, '#0D3818');
      ctx.fillStyle = screenGrad;
      ctx.beginPath();
      ctx.roundRect(24, 22, 192, 75, 6);
      ctx.fill();
      ctx.strokeStyle = isLit ? '#69F0AE' : '#2E7D32';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sponsor Header Pill
      ctx.fillStyle = isLit ? '#FF7A00' : '#E65100';
      ctx.beginPath();
      ctx.roundRect(50, 26, 140, 16, 5);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ 30s SPONSOR AD ★', 120, 34);

      // Main Ad Title
      ctx.fillStyle = isLit ? '#FFEB3B' : '#FFF9C4';
      ctx.font = 'bold 15px Fredoka, sans-serif';
      ctx.fillText('📺 WATCH 30s AD', 120, 56);

      // Earnings Subtitle
      ctx.fillStyle = isLit ? '#69F0AE' : '#B9F6CA';
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.fillText('+100 COINS (₦10 NAIRA)', 120, 74);

      // Ticker Bottom
      ctx.fillStyle = '#FFE082';
      ctx.font = 'bold 8px Fredoka, sans-serif';
      ctx.fillText('▶ RIDE OR TAP TO WATCH ▶', 120, 89);

      bCanvas.refresh();
    };

    drawBillboard('track-billboard-a', false);
    drawBillboard('track-billboard-b', true);

    // 10. Overhead Animated Badge for Billboard
    const badgeCanvas = this.textures.createCanvas('billboard-badge', 130, 36);
    if (badgeCanvas) {
      const ctx = badgeCanvas.getContext();
      ctx.fillStyle = '#FF7A00';
      ctx.beginPath();
      ctx.roundRect(5, 4, 120, 22, 11);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📺 30s AD • ₦10', 65, 15);

      // Down indicator arrow
      ctx.beginPath();
      ctx.moveTo(60, 26);
      ctx.lineTo(70, 26);
      ctx.lineTo(65, 33);
      ctx.closePath();
      ctx.fillStyle = '#FF7A00';
      ctx.fill();

      badgeCanvas.refresh();
    }

    // 11. Generate Barn Rest Stop Checkpoint & Journey Variety Assets
    this.generateJourneyAndBarnTextures();
  }

  private generateJourneyAndBarnTextures() {
    // A. Barn Rest Stop Station (260 x 200)
    const barnCanvas = this.textures.createCanvas('barn-station', 260, 200);
    if (barnCanvas) {
      const ctx = barnCanvas.getContext();
      // Main Barn Building Body (Rustic Red)
      ctx.fillStyle = '#B71C1C';
      ctx.fillRect(25, 75, 210, 125);
      ctx.strokeStyle = '#5F0909';
      ctx.lineWidth = 3;
      ctx.strokeRect(25, 75, 210, 125);

      // White corner trim boards
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(25, 75, 12, 125);
      ctx.fillRect(223, 75, 12, 125);

      // Barn Gambrel Roof
      ctx.fillStyle = '#78281F';
      ctx.beginPath();
      ctx.moveTo(10, 75);
      ctx.lineTo(60, 25);
      ctx.lineTo(130, 8);
      ctx.lineTo(200, 25);
      ctx.lineTo(250, 75);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Cupola / Weather Vane on apex
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(115, -4, 30, 15);
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath();
      ctx.arc(130, -10, 8, 0, Math.PI * 2);
      ctx.fill();

      // Open Double Barn Bay Doors (Warm golden interior light)
      const bayGrad = ctx.createLinearGradient(70, 95, 190, 200);
      bayGrad.addColorStop(0, '#FFE082');
      bayGrad.addColorStop(0.3, '#FFB300');
      bayGrad.addColorStop(1, '#3E2723');
      ctx.fillStyle = bayGrad;
      ctx.fillRect(75, 95, 110, 105);

      // White Cross X Trim on side panels
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(37, 85); ctx.lineTo(75, 135);
      ctx.moveTo(75, 85); ctx.lineTo(37, 135);
      ctx.moveTo(185, 85); ctx.lineTo(223, 135);
      ctx.moveTo(223, 85); ctx.lineTo(185, 135);
      ctx.stroke();

      // Overhead Barn Signboard
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath();
      ctx.roundRect(40, 50, 180, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#1B3824';
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌾 PAPPY\'S BARN REST STOP 🥕', 130, 62);

      // Carrot juice refreshment icon in door
      ctx.font = '24px sans-serif';
      ctx.fillText('🥤', 130, 150);

      barnCanvas.refresh();
    }

    // B. Barn Approach Road Sign (110 x 80)
    const signCanvas = this.textures.createCanvas('barn-sign', 110, 80);
    if (signCanvas) {
      const ctx = signCanvas.getContext();
      // Wooden post
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(50, 30, 10, 50);
      // Board
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath();
      ctx.roundRect(5, 5, 100, 36, 6);
      ctx.fill();
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#3E2723';
      ctx.font = 'bold 9px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('REST STOP', 55, 15);
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.fillText('BARN AHEAD ➔', 55, 29);

      signCanvas.refresh();
    }

    // C. Floating Carrot Balloon (46 x 60)
    const balloonCanvas = this.textures.createCanvas('item-balloon', 46, 60);
    if (balloonCanvas) {
      const ctx = balloonCanvas.getContext();
      // Orange balloon carrot bulb
      ctx.fillStyle = '#FF7A00';
      ctx.beginPath();
      ctx.ellipse(23, 22, 18, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Highlight shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(17, 15, 6, 9, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Green leafy tuft on top
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.moveTo(23, 2);
      ctx.lineTo(16, -6);
      ctx.lineTo(23, -2);
      ctx.lineTo(30, -6);
      ctx.closePath();
      ctx.fill();

      // String
      ctx.strokeStyle = '#B0BEC5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(23, 42);
      ctx.quadraticCurveTo(20, 50, 23, 58);
      ctx.stroke();

      balloonCanvas.refresh();
    }

    // D. Lucky 4-Leaf Clover (48 x 48)
    const cloverCanvas = this.textures.createCanvas('item-clover', 48, 48);
    if (cloverCanvas) {
      const ctx = cloverCanvas.getContext();
      // Golden / emerald glow aura
      ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(24, 24, 22, 0, Math.PI * 2);
      ctx.fill();

      // 4 heart leaves
      const drawLeaf = (cx: number, cy: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.fillStyle = '#00E676';
        ctx.beginPath();
        ctx.arc(-5, -5, 6, 0, Math.PI * 2);
        ctx.arc(5, -5, 6, 0, Math.PI * 2);
        ctx.moveTo(-10, -3);
        ctx.lineTo(0, 8);
        ctx.lineTo(10, -3);
        ctx.fill();
        ctx.restore();
      };

      drawLeaf(24, 24, 0);
      drawLeaf(24, 24, Math.PI * 0.5);
      drawLeaf(24, 24, Math.PI);
      drawLeaf(24, 24, Math.PI * 1.5);

      // Gold center sparkle
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(24, 24, 4, 0, Math.PI * 2);
      ctx.fill();

      cloverCanvas.refresh();
    }

    // E. Rainbow Speed Boost Pad (110 x 24)
    const padCanvas = this.textures.createCanvas('item-rainbow-pad', 110, 24);
    if (padCanvas) {
      const ctx = padCanvas.getContext();
      // Glowing rainbow stripe gradient
      const rainbow = ctx.createLinearGradient(0, 0, 110, 0);
      rainbow.addColorStop(0, '#FF1744');
      rainbow.addColorStop(0.2, '#FF9100');
      rainbow.addColorStop(0.4, '#FFEA00');
      rainbow.addColorStop(0.6, '#00E676');
      rainbow.addColorStop(0.8, '#00E5FF');
      rainbow.addColorStop(1, '#D500F9');

      ctx.fillStyle = rainbow;
      ctx.beginPath();
      ctx.roundRect(0, 2, 110, 20, 6);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Forward Chevrons
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      for (let x = 20; x <= 90; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x - 6, 5);
        ctx.lineTo(x + 4, 12);
        ctx.lineTo(x - 6, 19);
        ctx.stroke();
      }

      padCanvas.refresh();
    }

    // F. Hay Bale Launch Ramp (70 x 45)
    const hayCanvas = this.textures.createCanvas('item-haybale', 70, 45);
    if (hayCanvas) {
      const ctx = hayCanvas.getContext();
      // Straw body
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.roundRect(4, 4, 62, 37, 8);
      ctx.fill();
      ctx.strokeStyle = '#FFA000';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Twine ties
      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 4); ctx.lineTo(22, 41);
      ctx.moveTo(48, 4); ctx.lineTo(48, 41);
      ctx.stroke();

      // Spring arrow indicator
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 12px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⬆ BOUNCE', 35, 26);

      hayCanvas.refresh();
    }

    // G. Roadside Sunflower (60 x 110)
    const sunflowerCanvas = this.textures.createCanvas('prop-sunflower', 60, 110);
    if (sunflowerCanvas) {
      const ctx = sunflowerCanvas.getContext();
      // Stem
      ctx.strokeStyle = '#388E3C';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(30, 40);
      ctx.quadraticCurveTo(24, 75, 30, 110);
      ctx.stroke();

      // Leaf
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.ellipse(40, 75, 12, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Flower Head: Golden Petals
      ctx.fillStyle = '#FFC107';
      for (let i = 0; i < 12; i++) {
        const ang = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.arc(30 + Math.cos(ang) * 16, 32 + Math.sin(ang) * 16, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dark brown seed center
      ctx.fillStyle = '#4E342E';
      ctx.beginPath();
      ctx.arc(30, 32, 12, 0, Math.PI * 2);
      ctx.fill();

      sunflowerCanvas.refresh();
    }

    // H. Roadside Apple Tree (120 x 140)
    const appleCanvas = this.textures.createCanvas('prop-appletree', 120, 140);
    if (appleCanvas) {
      const ctx = appleCanvas.getContext();
      // Trunk
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(52, 70, 16, 70);

      // Foliage Canopy
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(60, 50, 44, 0, Math.PI * 2);
      ctx.arc(35, 60, 30, 0, Math.PI * 2);
      ctx.arc(85, 60, 30, 0, Math.PI * 2);
      ctx.fill();

      // Red Apples
      ctx.fillStyle = '#E53935';
      const apples = [
        { x: 45, y: 35 }, { x: 75, y: 38 }, { x: 30, y: 65 },
        { x: 62, y: 60 }, { x: 88, y: 62 }, { x: 55, y: 80 }
      ];
      apples.forEach(a => {
        ctx.beginPath();
        ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      appleCanvas.refresh();
    }

    // I. Twilight Roadside Lantern (40 x 110)
    const lanternCanvas = this.textures.createCanvas('prop-lantern', 40, 110);
    if (lanternCanvas) {
      const ctx = lanternCanvas.getContext();
      // Fence Post
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(16, 35, 8, 75);

      // Arm
      ctx.fillRect(16, 35, 18, 4);

      // Glowing Lantern
      ctx.fillStyle = '#FFA000';
      ctx.beginPath();
      ctx.arc(26, 48, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFF9C4';
      ctx.beginPath();
      ctx.roundRect(20, 42, 12, 16, 3);
      ctx.fill();
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      lanternCanvas.refresh();
    }

    // J. Friendly Cheering Farm Cow (75 x 55)
    const cowCanvas = this.textures.createCanvas('prop-cow', 75, 55);
    if (cowCanvas) {
      const ctx = cowCanvas.getContext();
      // Body (White with black patches)
      ctx.fillStyle = '#ECEFF1';
      ctx.beginPath();
      ctx.roundRect(10, 15, 50, 30, 8);
      ctx.fill();

      // Black patches
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(25, 24, 9, 0, Math.PI * 2);
      ctx.arc(45, 32, 8, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#ECEFF1';
      ctx.beginPath();
      ctx.arc(58, 20, 12, 0, Math.PI * 2);
      ctx.fill();

      // Pink muzzle
      ctx.fillStyle = '#FF80AB';
      ctx.beginPath();
      ctx.ellipse(65, 23, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#CFD8DC';
      ctx.fillRect(18, 42, 6, 12);
      ctx.fillRect(44, 42, 6, 12);

      // Bell
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(52, 33, 4, 0, Math.PI * 2);
      ctx.fill();

      cowCanvas.refresh();
    }

    // K. Fluffy Cheering Farm Sheep (65 x 50)
    const sheepCanvas = this.textures.createCanvas('prop-sheep', 65, 50);
    if (sheepCanvas) {
      const ctx = sheepCanvas.getContext();
      // Fluffy white wool cloud body
      ctx.fillStyle = '#FFFFFF';
      for (let x = 15; x <= 45; x += 10) {
        for (let y = 15; y <= 35; y += 10) {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Black face
      ctx.fillStyle = '#37474F';
      ctx.beginPath();
      ctx.ellipse(50, 22, 8, 10, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.beginPath();
      ctx.ellipse(45, 14, 4, 2, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#263238';
      ctx.fillRect(20, 38, 4, 10);
      ctx.fillRect(38, 38, 4, 10);

      sheepCanvas.refresh();
    }
  }
}

function gradColor(grad: CanvasGradient, stop: number, color: string) {
  grad.addColorStop(stop, color);
}
