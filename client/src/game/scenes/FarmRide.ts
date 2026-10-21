import Phaser from 'phaser';
import { sounds } from '../audio';

export default class FarmRide extends Phaser.Scene {
  private sky!: Phaser.GameObjects.TileSprite;
  private hills!: Phaser.GameObjects.TileSprite;
  private fence!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;

  private riderContainer!: Phaser.GameObjects.Container;
  private bikeSprite!: Phaser.GameObjects.Sprite;
  private rabbitSprite!: Phaser.GameObjects.Sprite;

  private isGrounded: boolean = true;
  private jumpCount: number = 0;
  private maxJumps: number = 2;
  private velocityY: number = 0;
  private gravity: number = 1600;
  private jumpStrength: number = -650;

  private baseSpeed: number = 330;
  private currentSpeed: number = 330;
  private isBoosting: boolean = false;
  private boostTimer: number = 0;
  private boostMeter: number = 100; // 0 - 100

  // 360-Degree Stunt System
  private airRotationTotal: number = 0;
  private currentAirAngle: number = 0;
  private isStuntFlipping: boolean = false;
  private stuntFlipDirection: number = 1; // 1 = frontflip, -1 = backflip

  // 360-Degree Loop-de-Loop Stunt Track System
  private isLooping360: boolean = false;
  private loopAngle: number = 0;
  private loopCenter: { x: number; y: number } = { x: 0, y: 0 };
  private loopRadius: number = 115;
  private loopAngularSpeed: number = 5.2; // radians per second
  private activeLoopTrack: Phaser.GameObjects.Sprite | null = null;
  private loopCollectibles: Phaser.GameObjects.Sprite[] = [];

  // Live session stats
  private coins: number = 0;
  private distanceMeters: number = 0;
  private starsCollected: number = 0;
  private carrotsCollected: number = 0;
  private cratesCollected: number = 0;
  private adsViewed: number = 0;
  private flipsCompleted: number = 0;
  private loopsCompleted: number = 0;

  // Lives & Grace Mechanics
  private lives: number = 3;
  private invincibleTimer: number = 0;

  // Power-Ups & Combos
  private hasShield: boolean = false;
  private shieldBubbleSprite: Phaser.GameObjects.Sprite | null = null;
  private magnetTimer: number = 0;
  private comboStreak: number = 0;
  private comboTimer: number = 0;

  // Groups
  private collectibles!: Phaser.GameObjects.Group;
  private obstacles!: Phaser.GameObjects.Group;
  private stuntTracks!: Phaser.GameObjects.Group;
  private billboards!: Phaser.GameObjects.Group;
  private sceneryProps!: Phaser.GameObjects.Group;

  // Pause State
  private isPaused: boolean = false;

  // Barn Checkpoint Station ("Pappy's Farm Barn")
  private nextBarnDistance: number = 500;
  private isAtBarn: boolean = false;
  private barnContainer: Phaser.GameObjects.Container | null = null;
  private barnSignContainer: Phaser.GameObjects.Container | null = null;
  private barnSignSpawned: boolean = false;
  private barnStationSpawned: boolean = false;

  // Dynamic Biomes & Road Variety
  private currentBiome: string = 'meadow';
  private spawnSceneryTimer: number = 0;
  private spawnAnimalTimer: number = 0;

  private isAdWatching: boolean = false;
  private activeBillboard: Phaser.GameObjects.Container | null = null;

  // Timers
  private spawnItemTimer: number = 0;
  private spawnObstacleTimer: number = 0;
  private spawnLoopTimer: number = 0;
  private spawnRampTimer: number = 0;
  private billboardTimer: number = 0;
  private adCooldownTimer: number = 0;
  private statSyncTimer: number = 0;

  // Ground Y coordinate
  private groundY: number = 480;

  // Keys
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private jumpKeyW!: Phaser.Input.Keyboard.Key;
  private jumpKeyUp!: Phaser.Input.Keyboard.Key;
  private boostKey!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;

  // Boost trail emitter
  private boostParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private isGameOver: boolean = false;

  constructor() {
    super('FarmRide');
  }

  create() {
    this.isGameOver = false;
    this.coins = 0;
    this.distanceMeters = 0;
    this.starsCollected = 0;
    this.carrotsCollected = 0;
    this.cratesCollected = 0;
    this.adsViewed = 0;
    this.flipsCompleted = 0;
    this.loopsCompleted = 0;
    this.boostMeter = 100;
    this.currentSpeed = this.baseSpeed;
    this.isLooping360 = false;
    this.isStuntFlipping = false;
    this.airRotationTotal = 0;
    this.currentAirAngle = 0;

    // Reset powerups, combos & lives
    this.lives = 3;
    this.invincibleTimer = 0;
    this.hasShield = false;
    this.magnetTimer = 0;
    this.comboStreak = 0;
    this.comboTimer = 0;

    const width = this.scale.width;
    const height = this.scale.height;
    this.groundY = height - 120;

    // Background Parallax
    this.sky = this.add.tileSprite(0, 0, width, height, 'farm-sky').setOrigin(0, 0);
    this.hills = this.add.tileSprite(0, height - 380, width, 300, 'farm-hills').setOrigin(0, 0);
    this.fence = this.add.tileSprite(0, height - 260, width, 200, 'farm-fence').setOrigin(0, 0);
    this.ground = this.add.tileSprite(0, this.groundY, width, 140, 'farm-ground').setOrigin(0, 0);

    // Collectibles, Obstacles, Stunt Tracks, Billboards & Scenery Props
    this.collectibles = this.add.group();
    this.obstacles = this.add.group();
    this.stuntTracks = this.add.group();
    this.billboards = this.add.group();
    this.sceneryProps = this.add.group();

    this.isPaused = false;
    this.isAtBarn = false;
    this.nextBarnDistance = 500;
    this.barnSignSpawned = false;
    this.barnStationSpawned = false;
    this.barnContainer = null;
    this.barnSignContainer = null;
    this.currentBiome = 'meadow';
    this.spawnSceneryTimer = 0;
    this.spawnAnimalTimer = 0;

    // Determine equipped rabbit & bike textures from custom events or default
    const rabbitTexture = (window as unknown as { currentEquippedRabbit?: string }).currentEquippedRabbit || 'rabbit-starter';
    const bikeTexture = (window as unknown as { currentEquippedBike?: string }).currentEquippedBike || 'bike-starter';

    // Rider Container (Rabbit riding Bike)
    this.riderContainer = this.add.container(180, this.groundY - 35);

    this.bikeSprite = this.add.sprite(0, 0, this.textures.exists(bikeTexture) ? bikeTexture : 'bike-starter');
    this.bikeSprite.setScale(0.9);

    this.rabbitSprite = this.add.sprite(2, -26, this.textures.exists(rabbitTexture) ? rabbitTexture : 'rabbit-starter');
    this.rabbitSprite.setScale(0.72);

    // Aura bubble shield sprite
    if (this.textures.exists('shield-bubble')) {
      this.shieldBubbleSprite = this.add.sprite(0, -10, 'shield-bubble');
      this.shieldBubbleSprite.setScale(0.95);
      this.shieldBubbleSprite.setVisible(false);
      this.riderContainer.add(this.shieldBubbleSprite);
    }

    this.riderContainer.add([this.bikeSprite, this.rabbitSprite]);
    this.riderContainer.setSize(100, 90);

    // Boost particle trail
    if (this.textures.exists('particle-flame')) {
      this.boostParticles = this.add.particles(0, 0, 'particle-flame', {
        speed: { min: 100, max: 200 },
        angle: { min: 170, max: 190 },
        scale: { start: 0.8, end: 0 },
        blendMode: 'ADD',
        lifespan: 300,
        frequency: 25,
        emitting: false
      });
    }

    // Input Keys
    if (this.input.keyboard) {
      this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.jumpKeyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.jumpKeyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      this.boostKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

      // Stunt Flip Keys
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }

    // Mobile Touch & Swipe Gesture Handling on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      touchStartX = pointer.x;
      touchStartY = pointer.y;
      touchStartTime = this.time.now;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - touchStartX;
      const dy = pointer.y - touchStartY;
      const dt = this.time.now - touchStartTime;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Fast swipe gesture (distance > 28px within 350ms)
      if (dist > 28 && dt < 350) {
        if (dy < -25 && Math.abs(dy) > Math.abs(dx)) {
          // Swipe UP -> Jump / Double Jump!
          this.handleJump();
          return;
        } else if (dx > 25 && Math.abs(dx) > Math.abs(dy)) {
          // Swipe RIGHT -> Nitro Boost!
          this.triggerBoost();
          return;
        }
      }

      // Quick tap anywhere on screen:
      // If grounded or has jump count remaining -> JUMP!
      // If already mid-air at max jumps -> 360° Stunt Flip!
      if (this.isGrounded || this.jumpCount < this.maxJumps) {
        this.handleJump();
      } else {
        this.trigger360Flip();
      }
    });

    // Listen to React UI Jump button trigger (essential for mobile touch control!)
    const onExternalJump = () => this.handleJump();
    window.addEventListener('game:jump', onExternalJump);

    // Listen to React UI Boost button trigger
    const onExternalBoost = () => this.triggerBoost();
    window.addEventListener('game:trigger_boost', onExternalBoost);

    // Listen to React UI 360 Flip button trigger
    const onExternalFlip = () => this.trigger360Flip();
    window.addEventListener('game:trigger_flip_360', onExternalFlip);

    // Listen to React UI Billboard Ad trigger
    const onExternalAd = () => this.triggerBillboardAd();
    window.addEventListener('game:trigger_ad_view', onExternalAd);

    // Listen to React UI Resume Ride after 30s Billboard Ad
    const onResumeRide = (e: Event) => {
      const customEvent = e as CustomEvent<{ earned?: boolean; value?: number }>;
      this.handleResumeRide(customEvent?.detail);
    };
    window.addEventListener('game:resume_ride', onResumeRide);

    // Listen to Game Pause & Resume triggers
    const onExternalPause = () => this.handlePause();
    window.addEventListener('game:pause', onExternalPause);

    const onExternalResume = () => this.handleResume();
    window.addEventListener('game:resume', onExternalResume);

    // Listen to Barn Exit trigger from React modal
    const onExitBarn = (e: Event) => {
      const customEvent = e as CustomEvent<{ boost?: boolean }>;
      this.handleExitBarn(customEvent?.detail);
    };
    window.addEventListener('game:exit_barn', onExitBarn);

    // Dynamic Responsive Resize for mobile orientation changes
    const handleResize = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width;
      const h = gameSize.height;
      this.groundY = h - 120;
      if (this.sky) this.sky.setSize(w, h);
      if (this.hills) {
        this.hills.setSize(w, 300);
        this.hills.y = h - 380;
      }
      if (this.fence) {
        this.fence.setSize(w, 200);
        this.fence.y = h - 260;
      }
      if (this.ground) {
        this.ground.setSize(w, 140);
        this.ground.y = this.groundY;
      }
      if (this.isGrounded && this.riderContainer) {
        this.riderContainer.y = this.groundY - 35;
      }
    };
    this.scale.on('resize', handleResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('game:jump', onExternalJump);
      window.removeEventListener('game:trigger_boost', onExternalBoost);
      window.removeEventListener('game:trigger_flip_360', onExternalFlip);
      window.removeEventListener('game:trigger_ad_view', onExternalAd);
      window.removeEventListener('game:resume_ride', onResumeRide);
      window.removeEventListener('game:pause', onExternalPause);
      window.removeEventListener('game:resume', onExternalResume);
      window.removeEventListener('game:exit_barn', onExitBarn);
      this.scale.off('resize', handleResize);
    });

    // Notify React that ride has started
    window.dispatchEvent(new CustomEvent('game:ride_start'));
  }

  handleJump() {
    if (this.isGameOver || this.isLooping360) return;
    if (this.isGrounded || this.jumpCount < this.maxJumps) {
      this.velocityY = this.jumpStrength;
      this.isGrounded = false;
      this.jumpCount++;
      sounds.playJump();

      // Mobile haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(12); } catch { /* ignore */ }
      }

      // Fun little bunny bike tilt
      this.tweens.add({
        targets: this.riderContainer,
        angle: -15,
        duration: 150,
        yoyo: true,
        ease: 'Sine.easeOut'
      });
    }
  }

  triggerBoost() {
    if (this.isGameOver || this.boostMeter < 25 || this.isBoosting || this.isLooping360) return;
    this.isBoosting = true;
    this.boostTimer = 3.5;
    sounds.playBoost();

    // Mobile haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([15, 30, 20]); } catch { /* ignore */ }
    }

    if (this.boostParticles) {
      this.boostParticles.start();
    }

    // Camera punch
    this.cameras.main.shake(200, 0.005);
  }

  trigger360Flip(direction: number = 1) {
    if (this.isGameOver || this.isLooping360 || this.isGrounded) return;
    this.isStuntFlipping = true;
    this.stuntFlipDirection = direction;
    sounds.playJump();

    // Mobile haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(18); } catch { /* ignore */ }
    }
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;
    if (this.isPaused) return;
    if (this.isAtBarn) {
      // Parked inside the Barn Rest Stop: gentle idle breathing bob
      this.riderContainer.y = this.groundY - 35 + Math.sin(time * 0.005) * 1.5;
      return;
    }
    if (this.isAdWatching) {
      // Park rider cleanly next to billboard with gentle breathing idle bob
      this.riderContainer.y = this.groundY - 35 + Math.sin(time * 0.005) * 1.5;
      return;
    }
    const dt = delta / 1000;

    // Dynamic Biome progression based on distance
    this.updateBiome(time, dt);

    // Keys Check
    if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) this.handleJump();
    if (this.jumpKeyW && Phaser.Input.Keyboard.JustDown(this.jumpKeyW)) this.handleJump();
    if (this.jumpKeyUp && Phaser.Input.Keyboard.JustDown(this.jumpKeyUp)) this.handleJump();
    if (this.boostKey && Phaser.Input.Keyboard.JustDown(this.boostKey)) this.triggerBoost();

    // Stunt Flip Key Inputs (A / Left = backflip, D / Right = frontflip)
    if (!this.isGrounded && !this.isLooping360) {
      if ((this.keyA && this.keyA.isDown) || (this.keyLeft && this.keyLeft.isDown)) {
        this.trigger360Flip(-1);
      } else if ((this.keyD && this.keyD.isDown) || (this.keyRight && this.keyRight.isDown)) {
        this.trigger360Flip(1);
      }
    }

    // Boost Logic
    if (this.isBoosting) {
      this.currentSpeed = this.baseSpeed * 2.2;
      this.boostTimer -= dt;
      this.boostMeter = Math.max(0, this.boostMeter - (35 * dt));
      if (this.boostTimer <= 0 || this.boostMeter <= 0) {
        this.isBoosting = false;
        if (this.boostParticles) this.boostParticles.stop();
      }
    } else {
      this.currentSpeed = this.baseSpeed;
      // Slowly recharge boost
      this.boostMeter = Math.min(100, this.boostMeter + (8 * dt));
    }

    // Update boost particle position to rear wheel
    if (this.boostParticles) {
      this.boostParticles.setPosition(this.riderContainer.x - 45, this.riderContainer.y + 10);
    }

    // Parallax scrolling
    this.sky.tilePositionX += this.currentSpeed * 0.08 * dt;
    this.hills.tilePositionX += this.currentSpeed * 0.3 * dt;
    this.fence.tilePositionX += this.currentSpeed * 0.65 * dt;
    this.ground.tilePositionX += this.currentSpeed * dt;

    // -------------------------------------------------------------
    // 360-DEGREE LOOP-DE-LOOP EXECUTION
    // -------------------------------------------------------------
    if (this.isLooping360) {
      // Advance along the circular 360 arc with centrifugal speed
      this.loopAngle -= this.loopAngularSpeed * dt;

      // Calculate 360° circular position
      this.riderContainer.x = this.loopCenter.x + this.loopRadius * Math.cos(this.loopAngle);
      this.riderContainer.y = this.loopCenter.y + this.loopRadius * Math.sin(this.loopAngle);

      // Rotate bike tangent to the circle: perfectly 360° upside down at apex!
      this.riderContainer.rotation = this.loopAngle + Math.PI * 0.5;

      // Dynamic centrifugal camera tilt
      const normalizedApex = Math.sin(this.loopAngle);
      this.cameras.main.setAngle(normalizedApex * 8);

      // Check if full 360 degrees circuit completed!
      if (this.loopAngle <= -Math.PI * 1.5) {
        this.complete360Loop();
      }
    } else {
      // Normal Ground / Aerial Riding
      this.cameras.main.setAngle(0);

      // Physics on Rider
      this.velocityY += this.gravity * dt;
      this.riderContainer.y += this.velocityY * dt;

      // -------------------------------------------------------------
      // 360-DEGREE MID-AIR STUNT FLIP ROTATION
      // -------------------------------------------------------------
      if (!this.isGrounded) {
        if (this.isStuntFlipping) {
          const rotationStep = 540 * dt * this.stuntFlipDirection; // 540 deg/sec
          this.currentAirAngle += rotationStep;
          this.airRotationTotal += Math.abs(rotationStep);
          this.riderContainer.angle = this.currentAirAngle;
        }
      }

      // Ground Collision & Landing
      if (this.riderContainer.y >= this.groundY - 35) {
        this.riderContainer.y = this.groundY - 35;
        this.velocityY = 0;
        this.isGrounded = true;
        this.jumpCount = 0;

        // Check if player landed a 360° (or 720°) stunt flip!
        if (this.airRotationTotal >= 300) {
          this.complete360AirFlip();
        } else {
          this.riderContainer.angle = 0;
        }

        this.airRotationTotal = 0;
        this.currentAirAngle = 0;
        this.isStuntFlipping = false;

        // Gentle riding bob animation
        this.riderContainer.y += Math.sin(time * 0.015) * 1.5;
      }
    }

    // Distance update
    this.distanceMeters += Math.round(this.currentSpeed * dt * 0.1);

    // Spawn Timers
    this.spawnItemTimer += dt;
    if (this.spawnItemTimer >= 1.2) {
      this.spawnItemTimer = 0;
      this.spawnCollectible();
    }

    // Dynamic obstacle pacing:
    // 0 to 300m: pure runway with 0 obstacles!
    // 300m+: starts at 8.5s spacing, gradually tuning down to 6.2s at 1500m+
    if (this.distanceMeters > 300) {
      this.spawnObstacleTimer += dt;
      const targetInterval = Math.max(6.2, 8.5 - (this.distanceMeters / 1500) * 1.5);
      if (this.spawnObstacleTimer >= targetInterval) {
        this.spawnObstacleTimer = 0;
        this.spawnObstacle();
      }
    }

    // Spawn 360 Stunt Loop every 18 seconds
    this.spawnLoopTimer += dt;
    if (this.spawnLoopTimer >= 18) {
      this.spawnLoopTimer = 0;
      this.spawn360LoopTrack();
    }

    // Spawn Stunt Launch Ramp every 12 seconds
    this.spawnRampTimer += dt;
    if (this.spawnRampTimer >= 12) {
      this.spawnRampTimer = 0;
      this.spawnStuntRamp();
    }

    // Decrement ad cooldown timer
    if (this.adCooldownTimer > 0) {
      this.adCooldownTimer -= dt;
    }

    // Barn Checkpoint Pacing (Every 500m milestone)
    if (this.distanceMeters >= this.nextBarnDistance - 65 && !this.barnSignSpawned) {
      this.barnSignSpawned = true;
      this.spawnBarnSign();
    }
    if (this.distanceMeters >= this.nextBarnDistance - 25 && !this.barnStationSpawned) {
      this.barnStationSpawned = true;
      this.spawnBarnStation();
    }

    // Scenery Props Pacing (Sunflowers, apple trees, lanterns based on biome)
    this.spawnSceneryTimer += dt;
    if (this.spawnSceneryTimer >= 2.8) {
      this.spawnSceneryTimer = 0;
      this.spawnSceneryProp();
    }

    // Roadside Cheering Farm Animals Pacing
    this.spawnAnimalTimer += dt;
    if (this.spawnAnimalTimer >= 14.0) {
      this.spawnAnimalTimer = 0;
      this.spawnFriendlyAnimal();
    }

    // Roadside Animated Billboard Ad bonus opportunity (spawn at most once every 150s when not on cooldown)
    this.billboardTimer += dt;
    if (this.billboardTimer >= 150 && this.adCooldownTimer <= 0) {
      this.billboardTimer = 0;
      this.spawnBillboard();
    }

    // Move Barn Station and Check Entrance
    if (this.barnContainer) {
      this.barnContainer.x -= this.currentSpeed * dt;
      if (!this.isAtBarn && Math.abs(this.riderContainer.x - (this.barnContainer.x - 30)) < 35 && this.isGrounded) {
        this.enterBarnStation();
      }
    }

    if (this.barnSignContainer) {
      this.barnSignContainer.x -= this.currentSpeed * dt;
      if (this.barnSignContainer.x < -180) {
        this.barnSignContainer.destroy();
        this.barnSignContainer = null;
      }
    }

    // Move Scenery Props and Cheering Animals
    const sceneryArr = this.sceneryProps.getChildren() as Phaser.GameObjects.Sprite[];
    for (let i = sceneryArr.length - 1; i >= 0; i--) {
      const prop = sceneryArr[i];
      prop.x -= this.currentSpeed * dt;

      // Check cheering animal proximity
      if (prop.getData('isAnimal') && !prop.getData('cheered')) {
        if (Math.abs(this.riderContainer.x - prop.x) < 80) {
          prop.setData('cheered', true);
          this.tweens.add({
            targets: prop,
            y: prop.y - 18,
            duration: 160,
            yoyo: true,
            repeat: 2
          });
          this.carrotsCollected += 2;
          this.coins += 10;
          sounds.playCollect('carrot');
          this.showStuntText('🐮 ANIMAL CHEER! +2 Carrots 🥕');
        }
      }

      if (prop.x < -250) {
        prop.destroy();
      }
    }

    const riderBounds = new Phaser.Geom.Rectangle(
      this.riderContainer.x - 35,
      this.riderContainer.y - 45,
      70,
      80
    );

    // Magnet Power-up Logic: smoothly pull nearby collectibles to rider
    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
      const rx = this.riderContainer.x;
      const ry = this.riderContainer.y;
      const collectiblesArr = this.collectibles.getChildren() as Phaser.GameObjects.Sprite[];
      for (const item of collectiblesArr) {
        const dist = Phaser.Math.Distance.Between(rx, ry, item.x, item.y);
        if (dist < 380) {
          item.x += (rx - item.x) * 10 * dt;
          item.y += (ry - item.y) * 10 * dt;
        }
      }
    }

    // Combo streak decay timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboStreak = 0;
      }
    }

    // Invulnerability blink effect
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      this.riderContainer.alpha = Math.floor(time / 100) % 2 === 0 ? 0.35 : 0.95;
      if (this.invincibleTimer <= 0) {
        this.riderContainer.alpha = 1.0;
      }
    }

    // Shield bubble wobble animation
    if (this.shieldBubbleSprite && this.hasShield) {
      this.shieldBubbleSprite.setVisible(true);
      this.shieldBubbleSprite.setScale(0.95 + Math.sin(time * 0.008) * 0.06);
    } else if (this.shieldBubbleSprite) {
      this.shieldBubbleSprite.setVisible(false);
    }

    // Move Stunt Tracks & Check 360 Loop Entrance
    const stuntArr = this.stuntTracks.getChildren() as Phaser.GameObjects.Sprite[];
    for (let i = stuntArr.length - 1; i >= 0; i--) {
      const track = stuntArr[i];
      track.x -= this.currentSpeed * dt;

      const trackType = track.getData('type');

      if (trackType === 'loop360' && !this.isLooping360) {
        // Check if rider reaches the entrance ramp of the 360 loop
        const loopEntranceX = track.x - 70;
        if (Math.abs(this.riderContainer.x - loopEntranceX) < 25 && this.isGrounded) {
          this.enter360Loop(track);
        }
      } else if (trackType === 'ramp') {
        // Hit launch ramp -> catapult high into the air for 360 flips!
        if (Phaser.Geom.Intersects.RectangleToRectangle(riderBounds, track.getBounds()) && this.isGrounded) {
          this.velocityY = -850; // Super high launch
          this.isGrounded = false;
          sounds.playJump();
          this.trigger360Flip(1);
          track.destroy();
        }
      }

      if (track.x < -400) {
        track.destroy();
      }
    }

    // Move Roadside Animated Billboards & Check Proximity
    const billboardsArr = this.billboards.getChildren() as Phaser.GameObjects.Container[];
    for (let i = billboardsArr.length - 1; i >= 0; i--) {
      const bContainer = billboardsArr[i];
      bContainer.x -= this.currentSpeed * dt;

      // Animate marquee chasing bulbs between texture frames
      const bSprite = bContainer.getByName('billboardSprite') as Phaser.GameObjects.Sprite;
      if (bSprite) {
        const isLit = Math.floor(time / 220) % 2 === 0;
        bSprite.setTexture(isLit ? 'track-billboard-b' : 'track-billboard-a');
      }

      // Bob floating overhead neon indicator
      const bBadge = bContainer.getByName('billboardBadge') as Phaser.GameObjects.Sprite;
      if (bBadge) {
        bBadge.y = -95 + Math.sin(time * 0.007) * 4;
      }

      // Check collision/encounter with rider
      const isUsed = bContainer.getData('used');
      if (!isUsed && !this.isAdWatching && this.adCooldownTimer <= 0 && Math.abs(this.riderContainer.x - bContainer.x) < 65 && this.isGrounded) {
        bContainer.setData('used', true);
        this.openBillboardAd(bContainer);
      } else if (bContainer.x < -350 || (isUsed && bContainer.x < this.riderContainer.x - 80)) {
        bContainer.destroy();
      }
    }

    // Move Collectibles & Check Collision
    const collectiblesArr = this.collectibles.getChildren() as Phaser.GameObjects.Sprite[];
    for (let i = collectiblesArr.length - 1; i >= 0; i--) {
      const item = collectiblesArr[i];
      item.x -= this.currentSpeed * dt;

      // Floating wave animation
      item.y += Math.sin(time * 0.005 + item.x * 0.02) * 0.8;

      if (Phaser.Geom.Intersects.RectangleToRectangle(riderBounds, item.getBounds())) {
        this.collectItem(item);
      } else if (item.x < -100) {
        item.destroy();
      }
    }

    // Move Obstacles & Check Collision (with Forgiving Hitbox, Stomp Bounce & Grace Life)
    const obstaclesArr = this.obstacles.getChildren() as Phaser.GameObjects.Sprite[];
    for (let i = obstaclesArr.length - 1; i >= 0; i--) {
      const obs = obstaclesArr[i];
      obs.x -= this.currentSpeed * dt;

      // Road warning sign: passes harmlessly
      if (obs.getData('isWarning')) {
        if (obs.x < -100) obs.destroy();
        continue;
      }

      // Forgiving inner hitboxes (shrink ~40% so grazing empty edges does not crash)
      const obsHitbox = new Phaser.Geom.Rectangle(
        obs.x - 18,
        obs.y - 12,
        36,
        34
      );

      const riderHitbox = new Phaser.Geom.Rectangle(
        this.riderContainer.x - 20,
        this.riderContainer.y - 25,
        40,
        50
      );

      if (Phaser.Geom.Intersects.RectangleToRectangle(riderHitbox, obsHitbox)) {
        // 1. If boosting or looping -> Smash!
        if (this.isBoosting || this.isLooping360) {
          this.createSmashExplosion(obs.x, obs.y);
          sounds.playCollect('crate');
          obs.destroy();
          continue;
        }

        // 2. If shield active -> Pop shield and save the player!
        if (this.hasShield) {
          this.hasShield = false;
          if (this.shieldBubbleSprite) this.shieldBubbleSprite.setVisible(false);
          this.createSmashExplosion(obs.x, obs.y);
          sounds.playShieldBreak();
          this.showStuntText('🛡️ SHIELD BROKE! (SAFE) 🛡️');
          obs.destroy();
          continue;
        }

        // 3. Mario-style Springboard Bounce if landing on top!
        const riderFeetY = this.riderContainer.y + 20;
        if (this.velocityY > 10 && riderFeetY < obs.y + 10) {
          this.velocityY = -620; // High springboard bounce!
          this.isGrounded = false;
          this.coins += 25;
          sounds.playJump();
          sounds.playCollect('crate');
          this.showStuntText('🥕 STOMP BOUNCE! +25 Coins 🥕');
          this.createSmashExplosion(obs.x, obs.y);
          obs.destroy();
          continue;
        }

        // 4. Hit obstacle check with lives / invincibility grace
        if (this.invincibleTimer > 0) {
          // Currently in recovery grace period -> ignore
          continue;
        }

        if (this.lives > 1) {
          this.lives--;
          this.invincibleTimer = 2.2;
          this.cameras.main.shake(220, 0.012);
          sounds.playCrash();
          this.createSmashExplosion(obs.x, obs.y);
          this.showStuntText(`⚠️ OOF! ${this.lives} HEARTS LEFT! ⚠️`);
          obs.destroy();
        } else {
          // 0 lives left -> trigger game over
          this.lives = 0;
          this.triggerGameOver();
          return;
        }
      } else if (obs.x < -100) {
        obs.destroy();
      }
    }

    // Periodic Stat Sync to React (every 0.2s)
    this.statSyncTimer += dt;
    if (this.statSyncTimer >= 0.2) {
      this.statSyncTimer = 0;
      window.dispatchEvent(
        new CustomEvent('game:stat_update', {
          detail: {
            coins: this.coins,
            distance: this.distanceMeters,
            stars: this.starsCollected,
            carrots: this.carrotsCollected,
            crates: this.cratesCollected,
            adViews: this.adsViewed,
            flipsCompleted: this.flipsCompleted,
            loopsCompleted: this.loopsCompleted,
            boostMeter: Math.round(this.boostMeter),
            isBoosting: this.isBoosting,
            lives: this.lives,
            combo: this.comboStreak,
            hasShield: this.hasShield,
            magnetActive: this.magnetTimer > 0
          }
        })
      );
    }
  }

  private enter360Loop(loopTrack: Phaser.GameObjects.Sprite) {
    this.isLooping360 = true;
    this.activeLoopTrack = loopTrack;
    this.loopCenter = { x: loopTrack.x, y: loopTrack.y - 10 };
    this.loopRadius = 110;
    this.loopAngle = Math.PI * 0.5; // Start at bottom 6 o'clock position
    this.isGrounded = false;
    sounds.playBoost();

    // Spawn bonus stars inside the 360 circle!
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      const sx = this.loopCenter.x + (this.loopRadius - 30) * Math.cos(angle);
      const sy = this.loopCenter.y + (this.loopRadius - 30) * Math.sin(angle);
      const star = this.add.sprite(sx, sy, 'item-star');
      star.setData('type', 'star');
      star.setData('value', 15);
      this.collectibles.add(star);
    }
  }

  private complete360Loop() {
    this.isLooping360 = false;
    this.loopsCompleted++;
    this.riderContainer.rotation = 0;
    this.riderContainer.x = 180;
    this.riderContainer.y = this.groundY - 35;
    this.isGrounded = true;
    this.boostMeter = 100; // Refill nitro boost!

    // Reward for completing 360 loop!
    const loopBonus = 100;
    this.coins += loopBonus;
    sounds.playFlipStunt();

    // Spawn celebratory floating text
    this.showStuntText('⚡ 360° LOOP MASTER! +100 Coins (10 ₦) ⚡');

    // Burst particles
    this.createSmashExplosion(this.riderContainer.x, this.riderContainer.y - 20);

    // Sync with backend
    window.dispatchEvent(
      new CustomEvent('game:collect', {
        detail: { type: 'crate', value: loopBonus }
      })
    );
  }

  private complete360AirFlip() {
    this.flipsCompleted++;
    const bonus = 50;
    this.coins += bonus;
    this.boostMeter = Math.min(100, this.boostMeter + 50);
    this.riderContainer.angle = 0;

    sounds.playFlipStunt();
    this.showStuntText('★ 360° STUNT FLIP! +50 Coins (5 ₦) ★');
    this.createCollectBurst(this.riderContainer.x, this.riderContainer.y - 20, 'star');

    window.dispatchEvent(
      new CustomEvent('game:collect', {
        detail: { type: 'star', value: bonus }
      })
    );
  }

  private showStuntText(msg: string) {
    const txt = this.add.text(this.riderContainer.x + 30, this.riderContainer.y - 80, msg, {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '20px',
      color: '#FFC93C',
      stroke: '#E65100',
      strokeThickness: 4,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: txt.y - 60,
      scale: 1.2,
      alpha: 0,
      duration: 1400,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  private spawn360LoopTrack() {
    const width = this.scale.width;
    // Spawn 360-degree loop track sitting on the ground
    const loopY = this.groundY - 120;
    const loop = this.add.sprite(width + 200, loopY, 'track-loop-360');
    loop.setData('type', 'loop360');
    loop.setDepth(1);
    this.stuntTracks.add(loop);
  }

  private spawnStuntRamp() {
    const width = this.scale.width;
    const ramp = this.add.sprite(width + 100, this.groundY - 30, 'ramp-stunt');
    ramp.setData('type', 'ramp');
    ramp.setDepth(1);
    this.stuntTracks.add(ramp);
  }

  private spawnCollectible() {
    const width = this.scale.width;
    const rand = Math.random();
    let texture = 'item-carrot';
    let type = 'carrot';
    let value = 10;
    let spawnY = this.groundY - 50;

    if (rand < 0.26) {
      texture = 'item-star';
      type = 'star';
      value = 5;
      spawnY = this.groundY - (Math.random() > 0.5 ? 90 : 50);
    } else if (rand < 0.52) {
      texture = 'item-carrot';
      type = 'carrot';
      value = 10;
      spawnY = this.groundY - 50;
    } else if (rand < 0.64) {
      // 🎈 Floating Carrot Balloon (High aerial pickup)
      texture = 'item-balloon';
      type = 'balloon';
      value = 20;
      spawnY = this.groundY - 140;
    } else if (rand < 0.74) {
      texture = 'item-crate';
      type = 'crate';
      value = 50 + Math.floor(Math.random() * 150);
      spawnY = this.groundY - 45;
    } else if (rand < 0.82) {
      // 🌈 Rainbow Speed Pad
      texture = 'item-rainbow-pad';
      type = 'rainbow-pad';
      value = 15;
      spawnY = this.groundY - 10;
    } else if (rand < 0.88) {
      // 🧲 Magnet Power-up
      texture = 'item-magnet';
      type = 'magnet';
      value = 25;
      spawnY = this.groundY - 60;
    } else if (rand < 0.94) {
      // 🛡️ Shield Power-up
      texture = 'item-shield';
      type = 'shield';
      value = 25;
      spawnY = this.groundY - 60;
    } else if (rand < 0.97) {
      // 🍀 Rare Lucky 4-Leaf Clover
      texture = 'item-clover';
      type = 'clover';
      value = 50;
      spawnY = this.groundY - 65;
    } else {
      // ⚡ Super Nitro Rocket
      texture = 'item-nitro';
      type = 'nitro';
      value = 50;
      spawnY = this.groundY - 60;
    }

    const sprite = this.add.sprite(width + 50, spawnY, texture);
    sprite.setData('type', type);
    sprite.setData('value', value);
    this.collectibles.add(sprite);
  }

  private spawnObstacle() {
    const width = this.scale.width;

    // Spawn road warning sign 220px in front of the hay bale so player can anticipate jump!
    const warnSign = this.add.sprite(width + 40, this.groundY - 26, 'obstacle-warning');
    warnSign.setScale(0.85);
    warnSign.setData('isWarning', true);
    this.obstacles.add(warnSign);

    // Spawn hay bale
    const sprite = this.add.sprite(width + 260, this.groundY - 26, 'obstacle-hay');
    sprite.setScale(0.9);
    this.obstacles.add(sprite);
  }

  private spawnBillboard() {
    const width = this.scale.width;
    const container = this.add.container(width + 160, this.groundY - 80);

    const sprite = this.add.sprite(0, 0, 'track-billboard-a');
    sprite.setName('billboardSprite');
    sprite.setScale(0.95);

    const badge = this.add.sprite(0, -95, 'billboard-badge');
    badge.setName('billboardBadge');
    badge.setScale(0.9);

    container.add([sprite, badge]);
    container.setSize(220, 160);

    this.billboards.add(container);
  }

  private openBillboardAd(billboardContainer?: Phaser.GameObjects.Container) {
    if (this.isAdWatching || this.isGameOver || this.adCooldownTimer > 0) return;
    this.isAdWatching = true;
    if (billboardContainer) {
      billboardContainer.setData('used', true);
    }
    this.activeBillboard = billboardContainer || null;
    this.currentSpeed = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.riderContainer.y = this.groundY - 35;
    this.riderContainer.angle = 0;

    sounds.playCollect('star');

    // Notify React to open the 30-second animated billboard modal!
    window.dispatchEvent(
      new CustomEvent('game:open_billboard_ad', {
        detail: {
          value: 100,
          sponsor: 'Carrot Fuel & Paystack Payouts'
        }
      })
    );
  }

  private triggerBillboardAd() {
    this.openBillboardAd();
  }

  private handleResumeRide(detail?: { earned?: boolean; value?: number }) {
    this.isAdWatching = false;
    this.adCooldownTimer = 90; // 90-second cooldown so ad never repeats
    this.currentSpeed = this.baseSpeed * 1.4;
    this.isBoosting = true;
    this.boostTimer = 2.5;

    if (detail?.earned) {
      const reward = detail.value || 100;
      this.coins += reward;
      this.adsViewed += 1;
      this.createCollectBurst(this.riderContainer.x, this.riderContainer.y, 'crate');
    }

    if (this.activeBillboard) {
      // Immediately destroy billboard container so it cannot ever re-trigger
      this.activeBillboard.destroy();
      this.activeBillboard = null;
    }

    sounds.playBoost();
  }

  private collectItem(item: Phaser.GameObjects.Sprite) {
    const type = item.getData('type') || 'carrot';
    const value = item.getData('value') || 10;

    // Power-up specific activations
    if (type === 'magnet') {
      sounds.playPowerup();
      this.magnetTimer = 8.0;
      this.showStuntText('🧲 CARROT MAGNET (8s)! 🧲');
    } else if (type === 'shield') {
      sounds.playPowerup();
      this.hasShield = true;
      if (this.shieldBubbleSprite) this.shieldBubbleSprite.setVisible(true);
      this.showStuntText('🛡️ SHIELD EQUIPPED! (1 HIT ABSORB) 🛡️');
    } else if (type === 'nitro') {
      sounds.playPowerup();
      sounds.playBoost();
      this.isBoosting = true;
      this.boostTimer = 4.5;
      this.boostMeter = 100;
      this.showStuntText('🚀 SUPER NITRO ROCKET (5s)! 🚀');
    } else if (type === 'balloon') {
      sounds.playCollect('crate');
      this.comboStreak += 3;
      this.showStuntText('🎈 CARROT BALLOON POP! +3 COMBO! 🎈');
    } else if (type === 'clover') {
      sounds.playPowerup();
      this.magnetTimer = 12.0;
      this.showStuntText('🍀 LUCKY 4-LEAF CLOVER! 12s MAGNET FRENZY 🍀');
    } else if (type === 'rainbow-pad') {
      sounds.playBoost();
      this.isBoosting = true;
      this.boostTimer = 3.0;
      this.boostMeter = 100;
      if (this.boostParticles) this.boostParticles.start();
      this.cameras.main.shake(180, 0.006);
      this.showStuntText('🌈 RAINBOW SUPER SPEED! 🌈');
    } else {
      // Carrot, star, or crate: advance combo streak and pitch
      this.comboStreak++;
      this.comboTimer = 2.8;
      sounds.playCollect(type, this.comboStreak);
    }

    let multiplier = 1.0;
    if (this.comboStreak >= 20) {
      multiplier = 2.0;
      if (this.comboStreak % 5 === 0) {
        this.showStuntText(`🔥 ULTRA COMBO x${this.comboStreak}! (2.0x COINS) 🔥`);
      }
    } else if (this.comboStreak >= 10) {
      multiplier = 1.5;
      if (this.comboStreak === 10) {
        this.showStuntText('⚡ SUPER COMBO x10! (1.5x COINS) ⚡');
      }
    } else if (this.comboStreak === 5) {
      multiplier = 1.2;
      this.showStuntText('🥕 COMBO x5! (1.2x COINS) 🥕');
    }

    const earned = Math.round(value * multiplier);
    this.coins += earned;

    if (type === 'star') this.starsCollected++;
    else if (type === 'carrot') this.carrotsCollected++;
    else if (type === 'crate') this.cratesCollected++;
    else if (type === 'ad') this.adsViewed++;

    this.createCollectBurst(item.x, item.y, type);

    window.dispatchEvent(
      new CustomEvent('game:collect', {
        detail: { type, value: earned }
      })
    );

    item.destroy();
  }

  private createCollectBurst(x: number, y: number, type: string) {
    const pTexture = type === 'crate' ? 'particle-flame' : 'particle-star';
    if (!this.textures.exists(pTexture)) return;

    const emitter = this.add.particles(x, y, pTexture, {
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: 400,
      quantity: type === 'crate' ? 24 : 10,
      emitting: false
    });
    emitter.explode();
    this.time.delayedCall(450, () => emitter.destroy());
  }

  private createSmashExplosion(x: number, y: number) {
    if (!this.textures.exists('particle-flame')) return;
    const emitter = this.add.particles(x, y, 'particle-flame', {
      speed: { min: 120, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 500,
      quantity: 30,
      emitting: false
    });
    emitter.explode();
    this.time.delayedCall(550, () => emitter.destroy());
  }

  private triggerGameOver() {
    if (this.isGameOver || this.isLooping360) return;
    this.isGameOver = true;
    sounds.playCrash();

    this.tweens.add({
      targets: this.riderContainer,
      angle: 120,
      y: this.riderContainer.y + 20,
      duration: 350,
      ease: 'Bounce.easeOut'
    });

    this.cameras.main.fade(600, 23, 77, 42);

    this.time.delayedCall(650, () => {
      this.scene.start('GameOver', {
        coins: this.coins,
        distance: this.distanceMeters,
        stars: this.starsCollected,
        carrots: this.carrotsCollected,
        boxes: this.cratesCollected,
        ads: this.adsViewed
      });
    });
  }

  // ─── Pause & Resume Handlers ─────────────────────────────────────────────
  private handlePause() {
    this.isPaused = true;
    if (this.boostParticles) this.boostParticles.stop();
    this.tweens.pauseAll();
  }

  private handleResume() {
    this.isPaused = false;
    this.tweens.resumeAll();
  }

  // ─── Barn Station Handlers ───────────────────────────────────────────────
  private spawnBarnSign() {
    const width = this.scale.width;
    const sign = this.add.container(width + 80, this.groundY - 50);
    const sprite = this.add.sprite(0, 0, 'barn-sign');
    sign.add(sprite);
    this.barnSignContainer = sign;
  }

  private spawnBarnStation() {
    const width = this.scale.width;
    const barn = this.add.container(width + 180, this.groundY - 80);
    const sprite = this.add.sprite(0, 0, 'barn-station');
    barn.add(sprite);
    this.barnContainer = barn;
  }

  private enterBarnStation() {
    this.isAtBarn = true;
    this.currentSpeed = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.riderContainer.y = this.groundY - 35;
    this.riderContainer.angle = 0;
    this.boostMeter = 100; // Restore stamina!

    sounds.playPowerup();
    sounds.playCollect('crate');

    // Milestone bonus reward!
    const milestoneBonus = 50;
    this.coins += milestoneBonus;
    this.carrotsCollected += 10;

    this.showStuntText('🌾 BARN CHECKPOINT! +50 Coins 🥕');

    // Dispatch event to React UI to open the Barn Refresh Modal
    window.dispatchEvent(
      new CustomEvent('game:enter_barn', {
        detail: {
          distance: Math.round(this.distanceMeters),
          coins: this.coins,
          carrots: this.carrotsCollected,
          bonusCoins: milestoneBonus,
          bonusCarrots: 10
        }
      })
    );
  }

  private handleExitBarn(detail?: { boost?: boolean }) {
    this.isAtBarn = false;
    this.nextBarnDistance += 600;
    this.barnSignSpawned = false;
    this.barnStationSpawned = false;

    // Super Nitro Boost exit launch!
    this.currentSpeed = this.baseSpeed * 2.2;
    this.isBoosting = true;
    this.boostTimer = 5.0; // 5-second turbo boost!
    this.boostMeter = 100;

    sounds.playBoost();
    if (this.boostParticles) this.boostParticles.start();
    this.cameras.main.shake(250, 0.008);
    this.showStuntText('🚀 TURBO BARN LAUNCH! (5s BOOST) 🚀');

    // Slide barn away
    if (this.barnContainer) {
      this.tweens.add({
        targets: this.barnContainer,
        x: -400,
        duration: 800,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.barnContainer?.destroy();
          this.barnContainer = null;
        }
      });
    }
  }

  // ─── Dynamic Biomes & Roadside Scenery ────────────────────────────────────
  private updateBiome(time: number, dt: number) {
    let newBiome = 'meadow';
    if (this.distanceMeters >= 1800) newBiome = 'golden';
    else if (this.distanceMeters >= 1300) newBiome = 'twilight';
    else if (this.distanceMeters >= 800) newBiome = 'orchard';
    else if (this.distanceMeters >= 400) newBiome = 'sunflower';

    if (newBiome !== this.currentBiome) {
      this.currentBiome = newBiome;
      window.dispatchEvent(
        new CustomEvent('game:biome_change', { detail: { biome: newBiome } })
      );

      // Smoothly tint parallax scenery based on biome
      if (newBiome === 'sunflower') {
        this.sky.setTint(0xFFE082);
        this.hills.setTint(0xFFD54F);
      } else if (newBiome === 'orchard') {
        this.sky.setTint(0xFFAB91);
        this.hills.setTint(0xAED581);
      } else if (newBiome === 'twilight') {
        this.sky.setTint(0x9575CD);
        this.hills.setTint(0x7E57C2);
      } else if (newBiome === 'golden') {
        this.sky.setTint(0xFFF176);
        this.hills.setTint(0x81C784);
      } else {
        this.sky.clearTint();
        this.hills.clearTint();
      }
    }
  }

  private spawnSceneryProp() {
    const width = this.scale.width;
    let texture = 'prop-sunflower';
    let y = this.groundY - 55;

    if (this.currentBiome === 'sunflower') {
      texture = 'prop-sunflower';
      y = this.groundY - 50;
    } else if (this.currentBiome === 'orchard') {
      texture = 'prop-appletree';
      y = this.groundY - 65;
    } else if (this.currentBiome === 'twilight') {
      texture = 'prop-lantern';
      y = this.groundY - 50;
    } else {
      // Meadow: alternating sunflower or haybale
      texture = Math.random() > 0.5 ? 'prop-sunflower' : 'item-haybale';
      y = this.groundY - 30;
    }

    if (this.textures.exists(texture)) {
      const prop = this.add.sprite(width + 60, y, texture);
      prop.setDepth(0);
      this.sceneryProps.add(prop);
    }
  }

  private spawnFriendlyAnimal() {
    const width = this.scale.width;
    const isCow = Math.random() > 0.5;
    const texture = isCow ? 'prop-cow' : 'prop-sheep';

    if (this.textures.exists(texture)) {
      const animal = this.add.sprite(width + 80, this.groundY - 35, texture);
      animal.setData('isAnimal', true);
      animal.setData('cheered', false);
      animal.setDepth(0);
      this.sceneryProps.add(animal);
    }
  }
}
