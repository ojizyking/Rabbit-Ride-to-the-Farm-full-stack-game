import Phaser from 'phaser';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    // Show smooth loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1B5E20, 0.4);
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 20, 320, 40, 12);

    const loadingText = this.add.text(width / 2, height / 2 - 45, 'Loading Rabbit Farm...', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '22px',
      color: '#1B5E20',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xFF7A00, 1);
      progressBar.fillRoundedRect(width / 2 - 150, height / 2 - 12, 300 * value, 24, 8);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
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

    // 2. Distant Hills & Farm Barns (1200 x 300)
    const hillsCanvas = this.textures.createCanvas('farm-hills', 1200, 300);
    if (hillsCanvas) {
      const ctx = hillsCanvas.getContext();
      ctx.fillStyle = '#81C784';
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.bezierCurveTo(200, 120, 400, 220, 600, 150);
      ctx.bezierCurveTo(800, 100, 1000, 240, 1200, 140);
      ctx.lineTo(1200, 300);
      ctx.lineTo(0, 300);
      ctx.fill();

      // Red Barn silhouette on hill
      ctx.fillStyle = '#C62828';
      ctx.fillRect(450, 150, 60, 40);
      ctx.beginPath();
      ctx.moveTo(445, 150);
      ctx.lineTo(480, 120);
      ctx.lineTo(515, 150);
      ctx.fill();
      // Silo
      ctx.fillStyle = '#90A4AE';
      ctx.fillRect(518, 130, 20, 60);
      ctx.beginPath();
      ctx.arc(528, 130, 10, Math.PI, 0);
      ctx.fill();

      // Windmill silhouette
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(920, 140, 16, 55);
      ctx.strokeStyle = '#FFE082';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(900, 130);
      ctx.lineTo(956, 150);
      ctx.moveTo(928, 110);
      ctx.lineTo(928, 170);
      ctx.stroke();

      hillsCanvas.refresh();
    }

    // 3. Near Farm Fence & Trees (1200 x 200)
    const fenceCanvas = this.textures.createCanvas('farm-fence', 1200, 200);
    if (fenceCanvas) {
      const ctx = fenceCanvas.getContext();
      // Wooden fence posts & rails
      ctx.fillStyle = '#8D6E63';
      ctx.strokeStyle = '#6D4C41';
      ctx.lineWidth = 2;

      // Rails
      ctx.fillRect(0, 120, 1200, 10);
      ctx.fillRect(0, 145, 1200, 10);

      // Posts every 80px
      for (let x = 20; x < 1200; x += 80) {
        ctx.fillRect(x, 100, 14, 75);
        ctx.strokeRect(x, 100, 14, 75);
      }

      // Sunflowers along fence
      for (let x = 60; x < 1200; x += 120) {
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(x + 4, 120, 4, 50);
        // Blossom
        ctx.fillStyle = '#FDD835';
        ctx.beginPath();
        ctx.arc(x + 6, 118, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(x + 6, 118, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      fenceCanvas.refresh();
    }

    // 4. Ground Dirt Track (1200 x 140)
    const groundCanvas = this.textures.createCanvas('farm-ground', 1200, 140);
    if (groundCanvas) {
      const ctx = groundCanvas.getContext();
      // Lush grass top strip
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, 1200, 22);

      // Grass tufts pattern
      ctx.fillStyle = '#2E7D32';
      for (let x = 10; x < 1200; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x + 5, 10);
        ctx.lineTo(x + 10, 22);
        ctx.fill();
      }

      // Rich Earthy Farm Track
      const groundGrad = ctx.createLinearGradient(0, 22, 0, 140);
      gradColor(groundGrad, 0, '#8D6E63');
      gradColor(groundGrad, 0.4, '#795548');
      gradColor(groundGrad, 1, '#4E342E');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 22, 1200, 118);

      // Pebbles / track texture
      ctx.fillStyle = '#A1887F';
      for (let i = 0; i < 90; i++) {
        const px = (i * 37) % 1200;
        const py = 35 + ((i * 19) % 80);
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      groundCanvas.refresh();
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
  }
}

function gradColor(grad: CanvasGradient, stop: number, color: string) {
  grad.addColorStop(stop, color);
}
