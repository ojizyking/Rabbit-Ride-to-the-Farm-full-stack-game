import Phaser from 'phaser';
import { sounds } from '../audio';

export interface PerspectiveEntity {
  id: number;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  shadow?: Phaser.GameObjects.Sprite;
  lane: number; // -1: Left, 0: Center, 1: Right, or -1.8 / 1.8 for roadside scenery
  z: number;    // 0.0 at horizon, 1.0 at player, >1.0 past camera
  yOffset: number; // Height above road surface (negative = higher)
  type: 'obstacle_low' | 'obstacle_high' | 'carrot' | 'star' | 'crate' | 'balloon' | 'clover' | 'rainbow-pad' | 'magnet' | 'shield' | 'nitro' | 'barn' | 'billboard';
  subType?: string;
  value?: number;
  cleared?: boolean;
  baseScale: number;
}

export default class FarmRide extends Phaser.Scene {
  // Parallax backdrop
  private sky!: Phaser.GameObjects.TileSprite;
  private hills!: Phaser.GameObjects.TileSprite;
  private roadGraphics!: Phaser.GameObjects.Graphics;

  // Track scrolling state
  private trackScroll: number = 0;

  // 3-Lane Player Stance & Physics
  private currentLane: number = 0; // -1: Left, 0: Center, 1: Right
  private targetLane: number = 0;
  private laneX: number = 0;
  private laneTargetX: number = 0;

  private riderContainer!: Phaser.GameObjects.Container;
  private chaseSprite!: Phaser.GameObjects.Sprite;
  private rabbitShadow!: Phaser.GameObjects.Sprite;
  private shieldBubbleSprite: Phaser.GameObjects.Sprite | null = null;
  private boostParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Jumping & Sliding (Subway Surfers core mechanics)
  private isGrounded: boolean = true;
  private jumpCount: number = 0;
  private maxJumps: number = 2;
  private playerJumpOffset: number = 0;
  private playerJumpVelocity: number = 0;
  private gravity: number = 1800;
  private jumpStrength: number = -720;

  private isSliding: boolean = false;
  private slideTimer: number = 0;

  // Speed & Boost
  private baseSpeed: number = 360;
  private currentSpeed: number = 360;
  private isBoosting: boolean = false;
  private boostTimer: number = 0;
  private boostMeter: number = 100; // 0 - 100

  // 360-Degree Stunt System
  private airRotationTotal: number = 0;
  private currentAirAngle: number = 0;
  private isStuntFlipping: boolean = false;
  private stuntFlipDirection: number = 1;

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
  private magnetTimer: number = 0;
  private comboStreak: number = 0;
  private comboTimer: number = 0;

  // 2.5D Entities Array
  private entities: PerspectiveEntity[] = [];
  private nextEntityId: number = 1;

  // Milestone Stations
  private nextBarnDistance: number = 500;
  private isAtBarn: boolean = false;
  private barnApproaching: boolean = false;

  private isAdWatching: boolean = false;
  private billboardApproaching: boolean = false;

  // Dynamic Biomes
  private currentBiome: string = 'meadow';

  // Timers
  private spawnItemTimer: number = 0;
  private spawnObstacleTimer: number = 0;
  private billboardTimer: number = 0;
  private adCooldownTimer: number = 0;
  private statSyncTimer: number = 0;

  // Pause State
  private isPaused: boolean = false;
  private isGameOver: boolean = false;

  // Input Keys
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private jumpKeyW!: Phaser.Input.Keyboard.Key;
  private jumpKeyUp!: Phaser.Input.Keyboard.Key;
  private slideKeyS!: Phaser.Input.Keyboard.Key;
  private slideKeyDown!: Phaser.Input.Keyboard.Key;
  private boostKey!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('FarmRide');
  }

  // =========================================================================
  // 2.5D PERSPECTIVE PROJECTION EQUATIONS
  // =========================================================================
  private getHorizonY(): number {
    return this.scale.height * 0.28;
  }

  private getRoadBottomY(): number {
    return this.scale.height;
  }

  private getRoadTopWidth(): number {
    return Math.min(130, this.scale.width * 0.16);
  }

  private getRoadBottomWidth(): number {
    return Math.min(this.scale.width * 0.88, 760);
  }

  /**
   * Projects a 3D track coordinate (z: depth, lane: -1/0/1, yOffset: altitude)
   * into screen space (x, y, scale, laneWidth) using the 2.5D optical trick.
   */
  private project(z: number, lane: number, yOffset: number = 0) {
    const w = this.scale.width;
    const horizonY = this.getHorizonY();
    const bottomY = this.getRoadBottomY();
    const topW = this.getRoadTopWidth();
    const bottomW = this.getRoadBottomWidth();
    const cx = w * 0.5;

    // Exponential perspective depth curve
    const pz = Math.pow(Math.max(0, z), 1.85);

    const groundY = horizonY + (bottomY - horizonY) * pz;
    const roadWidth = topW + (bottomW - topW) * pz;
    const laneWidth = roadWidth / 3;
    const x = cx + lane * laneWidth;
    const scale = 0.14 + (1.0 - 0.14) * pz;

    return {
      x,
      y: groundY + yOffset * scale,
      groundY,
      scale,
      laneWidth
    };
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

    this.isPaused = false;
    this.isAtBarn = false;
    this.barnApproaching = false;
    this.nextBarnDistance = 500;
    this.isAdWatching = false;
    this.billboardApproaching = false;
    this.currentBiome = 'meadow';
    this.adCooldownTimer = 0;
    this.billboardTimer = 0;

    // 3-Lane initialization (center lane = 0)
    this.currentLane = 0;
    this.targetLane = 0;
    this.isSliding = false;
    this.slideTimer = 0;
    this.playerJumpOffset = 0;
    this.playerJumpVelocity = 0;
    this.isGrounded = true;
    this.jumpCount = 0;

    this.entities = [];
    this.nextEntityId = 1;
    this.trackScroll = 0;

    const width = this.scale.width;
    const height = this.scale.height;
    const horizonY = this.getHorizonY();

    // 1. Pastoral Sky & Sun Backdrop (Layer 0)
    this.sky = this.add.tileSprite(0, 0, width, horizonY + 30, 'farm-sky').setOrigin(0, 0).setDepth(0);

    // 2. Distant Pastoral Farmland Ridge on Horizon (Layer 1)
    this.hills = this.add.tileSprite(0, horizonY - 100, width, 140, 'farm-hills').setOrigin(0, 0).setDepth(1);

    // 3. Dynamic 2.5D Perspective Roadbed Graphics (Layer 2)
    this.roadGraphics = this.add.graphics().setDepth(2);

    // 4. Player Positioning (z = 0.95 at bottom center)
    const playerProj = this.project(0.95, 0);
    this.laneX = playerProj.x;
    this.laneTargetX = playerProj.x;

    // Grounded Drop Shadow under Rabbit (Layer 4)
    if (this.textures.exists('shadow-oval')) {
      this.rabbitShadow = this.add.sprite(this.laneX, playerProj.groundY, 'shadow-oval');
      this.rabbitShadow.setScale(1.1, 0.55);
      this.rabbitShadow.setAlpha(0.65);
      this.rabbitShadow.setDepth(4);
    }

    // 5. Rider Container (Layer 5)
    this.riderContainer = this.add.container(this.laneX, playerProj.groundY - 32);
    this.riderContainer.setDepth(5);

    // Illustrated 2.5D Rear Chase View Rider
    const chaseTexture = this.textures.exists('rider-chase-default') ? 'rider-chase-default' : 'rabbit-starter';
    this.chaseSprite = this.add.sprite(0, 0, chaseTexture);
    this.chaseSprite.setScale(1.0);

    // Aura bubble shield sprite
    if (this.textures.exists('shield-bubble')) {
      this.shieldBubbleSprite = this.add.sprite(0, -10, 'shield-bubble');
      this.shieldBubbleSprite.setScale(1.0);
      this.shieldBubbleSprite.setVisible(false);
      this.riderContainer.add(this.shieldBubbleSprite);
    }

    this.riderContainer.add(this.chaseSprite);
    this.riderContainer.setSize(80, 90);

    // Boost particle trail
    if (this.textures.exists('particle-flame')) {
      this.boostParticles = this.add.particles(0, 0, 'particle-flame', {
        speed: { min: 80, max: 160 },
        angle: { min: 70, max: 110 },
        scale: { start: 0.9, end: 0 },
        blendMode: 'ADD',
        lifespan: 250,
        frequency: 25,
        emitting: false
      });
      this.boostParticles.setDepth(4);
    }

    // 6. Input Keys (Subway Surfers Style: A/D/Arrows for lanes, W/Space/Up for Jump, S/Down for Slide)
    if (this.input.keyboard) {
      this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.jumpKeyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.jumpKeyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      this.slideKeyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.slideKeyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      this.boostKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    }

    // 7. Mobile Touch & Swipe Gesture Handling on Canvas
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

      // Fast swipe gesture (distance > 24px within 350ms)
      if (dist > 24 && dt < 350) {
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal Swipe -> 3-Lane Dodge!
          if (dx < -20) {
            this.handleMoveLeft();
            return;
          } else if (dx > 20) {
            this.handleMoveRight();
            return;
          }
        } else {
          // Vertical Swipe -> Jump or Slide!
          if (dy < -20) {
            this.handleJump();
            return;
          } else if (dy > 20) {
            this.handleSlide();
            return;
          }
        }
      }

      // Tap on left/right half of screen to dodge, or center to jump
      if (dist < 15 && dt < 250) {
        if (touchStartX < width * 0.35) {
          this.handleMoveLeft();
        } else if (touchStartX > width * 0.65) {
          this.handleMoveRight();
        } else {
          this.handleJump();
        }
      }
    });

    // 8. External Window Event Triggers (from React UI buttons)
    const onExternalJump = () => this.handleJump();
    const onExternalSlide = () => this.handleSlide();
    const onExternalMoveLeft = () => this.handleMoveLeft();
    const onExternalMoveRight = () => this.handleMoveRight();
    const onExternalBoost = () => this.triggerBoost();
    const onExternalFlip = () => this.trigger360Flip();
    const onExternalAd = () => this.triggerBillboardAd();
    const onExternalPause = () => this.handlePause();
    const onExternalResume = () => this.handleResume();

    const onResumeRide = (e: Event) => {
      const customEvent = e as CustomEvent<{ earned?: boolean; value?: number }>;
      this.handleResumeRide(customEvent?.detail);
    };

    const onExitBarn = (e: Event) => {
      const customEvent = e as CustomEvent<{ boost?: boolean }>;
      this.handleExitBarn(customEvent?.detail);
    };

    window.addEventListener('game:jump', onExternalJump);
    window.addEventListener('game:slide', onExternalSlide);
    window.addEventListener('game:move_left', onExternalMoveLeft);
    window.addEventListener('game:move_right', onExternalMoveRight);
    window.addEventListener('game:trigger_boost', onExternalBoost);
    window.addEventListener('game:trigger_flip_360', onExternalFlip);
    window.addEventListener('game:trigger_ad_view', onExternalAd);
    window.addEventListener('game:resume_ride', onResumeRide);
    window.addEventListener('game:pause', onExternalPause);
    window.addEventListener('game:resume', onExternalResume);
    window.addEventListener('game:exit_barn', onExitBarn);

    // Responsive Resize Handler
    const handleResize = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width;
      const h = gameSize.height;
      const horY = h * 0.28;
      if (this.sky) this.sky.setSize(w, horY + 30);
      if (this.hills) {
        this.hills.setSize(w, 140);
        this.hills.y = horY - 100;
      }
      const p = this.project(0.95, this.currentLane);
      this.laneX = p.x;
      this.laneTargetX = p.x;
      if (this.riderContainer) {
        this.riderContainer.x = this.laneX;
        this.riderContainer.y = p.groundY - 32 + this.playerJumpOffset;
      }
      if (this.rabbitShadow) {
        this.rabbitShadow.x = this.laneX;
        this.rabbitShadow.y = p.groundY;
      }
    };
    this.scale.on('resize', handleResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('game:jump', onExternalJump);
      window.removeEventListener('game:slide', onExternalSlide);
      window.removeEventListener('game:move_left', onExternalMoveLeft);
      window.removeEventListener('game:move_right', onExternalMoveRight);
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

  // =========================================================================
  // SUBWAY SURFERS / TEMPLE RUN 3-LANE CONTROLS
  // =========================================================================
  handleMoveLeft() {
    if (this.isGameOver || this.isPaused || this.isAtBarn || this.isAdWatching) return;
    if (this.targetLane > -1) {
      this.targetLane--;
      sounds.playJump();

      // Mobile haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10); } catch { /* ignore */ }
      }

      // Snappy banking lean tilt to the left
      this.tweens.add({
        targets: this.riderContainer,
        angle: -16,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }
  }

  handleMoveRight() {
    if (this.isGameOver || this.isPaused || this.isAtBarn || this.isAdWatching) return;
    if (this.targetLane < 1) {
      this.targetLane++;
      sounds.playJump();

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10); } catch { /* ignore */ }
      }

      // Snappy banking lean tilt to the right
      this.tweens.add({
        targets: this.riderContainer,
        angle: 16,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }
  }

  handleJump() {
    if (this.isGameOver || this.isPaused || this.isAtBarn || this.isAdWatching) return;
    if (this.isGrounded || this.jumpCount < this.maxJumps) {
      this.playerJumpVelocity = this.jumpStrength;
      this.isGrounded = false;
      this.jumpCount++;
      this.isSliding = false;
      if (this.chaseSprite) this.chaseSprite.setScale(1.0, 1.0);

      sounds.playJump();

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(14); } catch { /* ignore */ }
      }
    }
  }

  handleSlide() {
    if (this.isGameOver || this.isPaused || this.isAtBarn || this.isAdWatching) return;
    if (this.isGrounded && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 0.65; // 650ms slide duration

      sounds.playBoost();

      // Squash rider down to tuck under overhead obstacles!
      if (this.chaseSprite) {
        this.chaseSprite.setScale(1.12, 0.48);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([12, 20]); } catch { /* ignore */ }
      }
    }
  }

  triggerBoost() {
    if (this.isGameOver || this.boostMeter < 25 || this.isBoosting) return;
    this.isBoosting = true;
    this.boostTimer = 3.5;
    sounds.playBoost();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([15, 30, 20]); } catch { /* ignore */ }
    }

    if (this.boostParticles) {
      this.boostParticles.start();
    }

    this.cameras.main.shake(200, 0.005);
  }

  trigger360Flip() {
    if (this.isGameOver || this.isGrounded) return;
    this.isStuntFlipping = true;
    sounds.playJump();
  }

  // =========================================================================
  // 2.5D ROAD RENDERING & UPDATE LOOP
  // =========================================================================
  update(time: number, delta: number) {
    if (this.isGameOver || this.isPaused) return;

    if (this.isAtBarn || this.isAdWatching) {
      // Idle bob while parked at station
      const p = this.project(0.95, this.currentLane);
      this.riderContainer.y = p.groundY - 32 + Math.sin(time * 0.006) * 1.5;
      return;
    }

    const dt = delta / 1000;

    // Check Inputs
    if (this.keyA && Phaser.Input.Keyboard.JustDown(this.keyA)) this.handleMoveLeft();
    if (this.keyLeft && Phaser.Input.Keyboard.JustDown(this.keyLeft)) this.handleMoveLeft();
    if (this.keyD && Phaser.Input.Keyboard.JustDown(this.keyD)) this.handleMoveRight();
    if (this.keyRight && Phaser.Input.Keyboard.JustDown(this.keyRight)) this.handleMoveRight();

    if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) this.handleJump();
    if (this.jumpKeyW && Phaser.Input.Keyboard.JustDown(this.jumpKeyW)) this.handleJump();
    if (this.jumpKeyUp && Phaser.Input.Keyboard.JustDown(this.jumpKeyUp)) this.handleJump();

    if (this.slideKeyS && Phaser.Input.Keyboard.JustDown(this.slideKeyS)) this.handleSlide();
    if (this.slideKeyDown && Phaser.Input.Keyboard.JustDown(this.slideKeyDown)) this.handleSlide();

    if (this.boostKey && Phaser.Input.Keyboard.JustDown(this.boostKey)) this.triggerBoost();

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
      this.boostMeter = Math.min(100, this.boostMeter + (8 * dt));
    }

    // Slide state timer decay
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        if (this.chaseSprite) this.chaseSprite.setScale(1.0, 1.0);
      }
    }

    // Parallax sky & horizon shift
    this.sky.tilePositionX += this.currentSpeed * 0.04 * dt;
    this.hills.tilePositionX += this.currentSpeed * 0.12 * dt;

    // Advance 2.5D track forward
    this.trackScroll = (this.trackScroll + (this.currentSpeed / 340) * dt) % 1.0;

    // Render the 2.5D Subway Surfers style perspective road surface
    this.render25DRoad();

    // -------------------------------------------------------------
    // PLAYER 3-LANE INTERPOLATION & JUMP PHYSICS
    // -------------------------------------------------------------
    const targetProj = this.project(0.95, this.targetLane);
    this.laneTargetX = targetProj.x;
    // Snappy, smooth horizontal slide between lanes
    this.laneX = Phaser.Math.Linear(this.laneX, this.laneTargetX, Math.min(1, 18 * dt));
    if (Math.abs(this.laneX - this.laneTargetX) < 1.5) {
      this.currentLane = this.targetLane;
    }

    // Vertical Jump Physics
    if (!this.isGrounded) {
      this.playerJumpVelocity += this.gravity * dt;
      this.playerJumpOffset += this.playerJumpVelocity * dt;

      if (this.playerJumpOffset >= 0) {
        this.playerJumpOffset = 0;
        this.playerJumpVelocity = 0;
        this.isGrounded = true;
        this.jumpCount = 0;

        // Touchdown squash impact on shadow
        if (this.rabbitShadow) {
          this.rabbitShadow.setScale(1.4, 0.4);
          this.tweens.add({
            targets: this.rabbitShadow,
            scaleX: 1.1,
            scaleY: 0.55,
            duration: 120,
            ease: 'Quad.easeOut'
          });
        }
      }
    }

    // Update Player Container & Shadow Position
    const currentBaseGroundY = targetProj.groundY;
    this.riderContainer.x = this.laneX;
    this.riderContainer.y = currentBaseGroundY - 32 + this.playerJumpOffset;

    if (this.rabbitShadow) {
      this.rabbitShadow.x = this.laneX;
      this.rabbitShadow.y = currentBaseGroundY;

      if (this.isGrounded) {
        this.rabbitShadow.setScale(1.1, 0.55);
        this.rabbitShadow.setAlpha(0.65);
      } else {
        const alt = Math.abs(this.playerJumpOffset);
        const sX = Math.max(0.45, 1.1 - (alt / 260) * 0.55);
        const sY = Math.max(0.22, 0.55 - (alt / 260) * 0.28);
        const a = Math.max(0.18, 0.65 - (alt / 260) * 0.45);
        this.rabbitShadow.setScale(sX, sY);
        this.rabbitShadow.setAlpha(a);
      }
    }

    // Boost particles follow rear wheel
    if (this.boostParticles) {
      this.boostParticles.setPosition(this.riderContainer.x, this.riderContainer.y + 24);
    }

    // Shield wobble
    if (this.shieldBubbleSprite && this.hasShield) {
      this.shieldBubbleSprite.setVisible(true);
      this.shieldBubbleSprite.setScale(1.0 + Math.sin(time * 0.008) * 0.06);
    } else if (this.shieldBubbleSprite) {
      this.shieldBubbleSprite.setVisible(false);
    }

    // Distance update
    this.distanceMeters += Math.round(this.currentSpeed * dt * 0.1);

    // Dynamic Biome Progression
    this.updateBiome();

    // -------------------------------------------------------------
    // 2.5D ENTITY UPDATE & COLLISION CHECK
    // -------------------------------------------------------------
    this.updatePerspectiveEntities(dt);

    // Spawning Loops
    this.spawnItemTimer += dt;
    if (this.spawnItemTimer >= 1.25) {
      this.spawnItemTimer = 0;
      this.spawnRandomItemsWave();
    }

    if (this.distanceMeters > 150) {
      this.spawnObstacleTimer += dt;
      const targetInterval = Math.max(2.6, 4.8 - (this.distanceMeters / 1500) * 1.5);
      if (this.spawnObstacleTimer >= targetInterval) {
        this.spawnObstacleTimer = 0;
        this.spawnObstacleWave();
      }
    }

    // Milestone: Barn Station every 500m
    if (this.distanceMeters >= this.nextBarnDistance - 60 && !this.barnApproaching) {
      this.barnApproaching = true;
      this.spawnBarnTunnel();
    }

    // Milestone: Billboard Ad Opportunity
    this.billboardTimer += dt;
    if (this.billboardTimer >= 150 && this.adCooldownTimer <= 0 && !this.billboardApproaching) {
      this.billboardTimer = 0;
      this.billboardApproaching = true;
      this.spawnBillboardBridge();
    }

    if (this.adCooldownTimer > 0) {
      this.adCooldownTimer -= dt;
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

  // =========================================================================
  // 2.5D ROAD SURFACE DRAWING (THE OUTRUN / SUBWAY SURFERS 2.5D TRICK)
  // =========================================================================
  private render25DRoad() {
    const g = this.roadGraphics;
    g.clear();

    const w = this.scale.width;
    const h = this.scale.height;
    const horizonY = this.getHorizonY();

    // 1. Pastoral Green Meadow Field Backdrop below horizon
    g.fillStyle(0x388E3C, 1);
    g.fillRect(0, horizonY, w, h - horizonY);

    // 2. Perspective Roadbed Bands (18 Depth Slices)
    const NUM_SEGMENTS = 18;
    for (let i = NUM_SEGMENTS - 1; i >= 0; i--) {
      // Depth slice coordinates
      const z0 = Math.max(0, (i + this.trackScroll) / NUM_SEGMENTS);
      const z1 = Math.min(1.2, (i + 1 + this.trackScroll) / NUM_SEGMENTS);

      const p0 = this.project(z0, 0);
      const p1 = this.project(z1, 0);

      const halfW0 = (this.getRoadTopWidth() + (this.getRoadBottomWidth() - this.getRoadTopWidth()) * Math.pow(z0, 1.85)) * 0.5;
      const halfW1 = (this.getRoadTopWidth() + (this.getRoadBottomWidth() - this.getRoadTopWidth()) * Math.pow(z1, 1.85)) * 0.5;
      const cx = w * 0.5;

      const isEven = i % 2 === 0;

      // Roadside Verge Grass Curbs
      const curbExtra0 = 24 * p0.scale;
      const curbExtra1 = 24 * p1.scale;

      g.fillStyle(isEven ? 0x2E7D32 : 0x43A047, 1);
      g.fillPoints([
        { x: cx - halfW0 - curbExtra0, y: p0.groundY },
        { x: cx + halfW0 + curbExtra0, y: p0.groundY },
        { x: cx + halfW1 + curbExtra1, y: p1.groundY },
        { x: cx - halfW1 - curbExtra1, y: p1.groundY }
      ], true);

      // Main Earthen Track Surface (Alternating bands for forward motion)
      g.fillStyle(isEven ? 0x6D4C41 : 0x795548, 1);
      g.fillPoints([
        { x: cx - halfW0, y: p0.groundY },
        { x: cx + halfW0, y: p0.groundY },
        { x: cx + halfW1, y: p1.groundY },
        { x: cx - halfW1, y: p1.groundY }
      ], true);

      // Dashed White/Chalk Lane Dividers (between Left/Center and Center/Right)
      if (isEven) {
        const laneW0 = halfW0 * (2 / 3);
        const laneW1 = halfW1 * (2 / 3);
        const dashW0 = Math.max(2, 4 * p0.scale);
        const dashW1 = Math.max(2, 4 * p1.scale);

        g.fillStyle(0xFFFDE7, 0.45);
        // Left divider
        g.fillPoints([
          { x: cx - laneW0 - dashW0, y: p0.groundY },
          { x: cx - laneW0 + dashW0, y: p0.groundY },
          { x: cx - laneW1 + dashW1, y: p1.groundY },
          { x: cx - laneW1 - dashW1, y: p1.groundY }
        ], true);
        // Right divider
        g.fillPoints([
          { x: cx + laneW0 - dashW0, y: p0.groundY },
          { x: cx + laneW0 + dashW0, y: p0.groundY },
          { x: cx + laneW1 + dashW1, y: p1.groundY },
          { x: cx + laneW1 - dashW1, y: p1.groundY }
        ], true);
      }
    }
  }

  // =========================================================================
  // 2.5D ENTITY PROJECTION & COLLISION MANAGEMENT
  // =========================================================================
  private updatePerspectiveEntities(dt: number) {
    const speedRatio = (this.currentSpeed / 460) * dt;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      e.z += speedRatio;

      // Project entity onto 2.5D screen coordinates
      const proj = this.project(e.z, e.lane, e.yOffset);
      e.sprite.setPosition(proj.x, proj.y);
      e.sprite.setScale(proj.scale * e.baseScale);
      e.sprite.setDepth(10 + Math.floor(e.z * 100));

      // Grounded shadow update
      if (e.shadow) {
        e.shadow.setPosition(proj.x, proj.groundY);
        e.shadow.setScale(proj.scale * e.baseScale * 0.75, proj.scale * e.baseScale * 0.35);
        e.shadow.setDepth(9 + Math.floor(e.z * 100));
      }

      // Magnet attraction for collectibles
      if (this.magnetTimer > 0 && e.type !== 'obstacle_low' && e.type !== 'obstacle_high' && e.type !== 'barn' && e.type !== 'billboard') {
        if (e.z > 0.4) {
          e.lane = Phaser.Math.Linear(e.lane, this.currentLane, Math.min(1, 10 * dt));
        }
      }

      // -------------------------------------------------------------
      // COLLISION DETECTION AT PLAYER PLANE (z ~ 0.90 to 1.04)
      // -------------------------------------------------------------
      if (e.z >= 0.88 && e.z <= 1.04 && !e.cleared) {
        // Milestone: Barn Station Entryway
        if (e.type === 'barn') {
          e.cleared = true;
          this.enterBarnStation();
          continue;
        }

        // Milestone: Billboard Bridge
        if (e.type === 'billboard') {
          e.cleared = true;
          this.openBillboardAd();
          continue;
        }

        // Lane match check (tolerance of 0.45 lanes)
        if (Math.abs(e.lane - this.currentLane) < 0.55) {
          // 1. Low Obstacle (Hay bale / Hurdle)
          if (e.type === 'obstacle_low') {
            // Did player jump cleanly over?
            if (this.playerJumpOffset < -28) {
              e.cleared = true;
              this.coins += 15;
              sounds.playJump();
              sounds.playCollect('crate');
              this.showStuntText('⚡ HURDLE CLEARED! +15 Coins ⚡');
              continue;
            }

            // Did player have boost or loop?
            if (this.isBoosting) {
              e.cleared = true;
              this.createSmashExplosion(proj.x, proj.y);
              sounds.playCollect('crate');
              this.removeEntityAt(i);
              continue;
            }

            // Shield save?
            if (this.hasShield) {
              e.cleared = true;
              this.hasShield = false;
              if (this.shieldBubbleSprite) this.shieldBubbleSprite.setVisible(false);
              this.createSmashExplosion(proj.x, proj.y);
              sounds.playShieldBreak();
              this.showStuntText('🛡️ SHIELD BROKE! (SAFE) 🛡️');
              this.removeEntityAt(i);
              continue;
            }

            // Crash check
            e.cleared = true;
            this.handlePlayerHit(proj.x, proj.y);
            this.removeEntityAt(i);
            continue;
          }

          // 2. High Obstacle (Overhead Timber Arch)
          if (e.type === 'obstacle_high') {
            // Did player duck / slide cleanly under?
            if (this.isSliding) {
              e.cleared = true;
              this.coins += 20;
              sounds.playBoost();
              this.showStuntText('▼ SLICK SLIDE! +20 Coins ▼');
              continue;
            }

            if (this.hasShield) {
              e.cleared = true;
              this.hasShield = false;
              if (this.shieldBubbleSprite) this.shieldBubbleSprite.setVisible(false);
              this.createSmashExplosion(proj.x, proj.y);
              sounds.playShieldBreak();
              this.showStuntText('🛡️ SHIELD BROKE! (SAFE) 🛡️');
              this.removeEntityAt(i);
              continue;
            }

            e.cleared = true;
            this.handlePlayerHit(proj.x, proj.y);
            this.removeEntityAt(i);
            continue;
          }

          // 3. Collectibles & Power-ups
          e.cleared = true;
          this.collectPerspectiveItem(e, proj.x, proj.y);
          this.removeEntityAt(i);
          continue;
        }
      }

      // Past camera -> clean up
      if (e.z > 1.25) {
        this.removeEntityAt(i);
      }
    }
  }

  private removeEntityAt(index: number) {
    if (index >= 0 && index < this.entities.length) {
      const e = this.entities[index];
      if (e.shadow) e.shadow.destroy();
      e.sprite.destroy();
      this.entities.splice(index, 1);
    }
  }

  // =========================================================================
  // SPAWNING: SUBWAY SURFERS STYLE 3-LANE WAVES
  // =========================================================================
  private spawnRandomItemsWave() {
    const lane = (Math.floor(Math.random() * 3) - 1); // -1, 0, 1
    const rand = Math.random();

    let type: PerspectiveEntity['type'] = 'carrot';
    let texture = 'item-carrot';
    let value = 10;
    let yOffset = 0;

    if (rand < 0.28) {
      type = 'star';
      texture = 'item-star';
      value = 5;
    } else if (rand < 0.55) {
      type = 'carrot';
      texture = 'item-carrot';
      value = 10;
    } else if (rand < 0.68) {
      type = 'balloon';
      texture = 'item-balloon';
      value = 20;
      yOffset = -35;
    } else if (rand < 0.78) {
      type = 'crate';
      texture = 'item-crate';
      value = 50;
    } else if (rand < 0.86) {
      type = 'magnet';
      texture = 'item-magnet';
      value = 25;
    } else if (rand < 0.92) {
      type = 'shield';
      texture = 'item-shield';
      value = 25;
    } else if (rand < 0.96) {
      type = 'clover';
      texture = 'item-clover';
      value = 50;
    } else {
      type = 'nitro';
      texture = 'item-nitro';
      value = 50;
    }

    this.createPerspectiveEntity({
      lane,
      z: 0.05,
      yOffset,
      type,
      texture,
      baseScale: 0.95,
      value
    });
  }

  private spawnObstacleWave() {
    const pattern = Math.floor(Math.random() * 4);

    if (pattern === 0) {
      // Single Lane Hurdle
      const lane = Math.floor(Math.random() * 3) - 1;
      this.createPerspectiveEntity({
        lane,
        z: 0.04,
        yOffset: 0,
        type: 'obstacle_low',
        texture: 'obstacle-hurdle-front',
        baseScale: 1.0,
        hasShadow: true
      });
    } else if (pattern === 1) {
      // Golden Round Hay Bale
      const lane = Math.floor(Math.random() * 3) - 1;
      this.createPerspectiveEntity({
        lane,
        z: 0.04,
        yOffset: 0,
        type: 'obstacle_low',
        texture: 'obstacle-hay-front',
        baseScale: 0.95,
        hasShadow: true
      });
    } else if (pattern === 2) {
      // Overhead Timber Arch (Duck / Slide required!)
      const lane = Math.floor(Math.random() * 3) - 1;
      this.createPerspectiveEntity({
        lane,
        z: 0.04,
        yOffset: 0,
        type: 'obstacle_high',
        texture: 'obstacle-arch-overhead',
        baseScale: 1.05
      });
    } else {
      // Double Blockade: 2 lanes blocked, 1 safe lane!
      const safeLane = Math.floor(Math.random() * 3) - 1;
      for (const l of [-1, 0, 1]) {
        if (l !== safeLane) {
          this.createPerspectiveEntity({
            lane: l,
            z: 0.04,
            yOffset: 0,
            type: 'obstacle_low',
            texture: 'obstacle-hay-front',
            baseScale: 0.95,
            hasShadow: true
          });
        }
      }
    }
  }

  private spawnBarnTunnel() {
    this.createPerspectiveEntity({
      lane: 0,
      z: 0.03,
      yOffset: -30,
      type: 'barn',
      texture: 'barn-station-tunnel',
      baseScale: 1.15
    });
  }

  private spawnBillboardBridge() {
    this.createPerspectiveEntity({
      lane: 0,
      z: 0.03,
      yOffset: -40,
      type: 'billboard',
      texture: 'billboard-bridge-front',
      baseScale: 1.15
    });
  }

  private createPerspectiveEntity(cfg: {
    lane: number;
    z: number;
    yOffset: number;
    type: PerspectiveEntity['type'];
    texture: string;
    baseScale: number;
    value?: number;
    hasShadow?: boolean;
  }) {
    const proj = this.project(cfg.z, cfg.lane, cfg.yOffset);
    const sprite = this.add.sprite(proj.x, proj.y, this.textures.exists(cfg.texture) ? cfg.texture : 'item-carrot');
    sprite.setScale(proj.scale * cfg.baseScale);
    sprite.setDepth(10);

    let shadow: Phaser.GameObjects.Sprite | undefined = undefined;
    if (cfg.hasShadow && this.textures.exists('shadow-oval')) {
      shadow = this.add.sprite(proj.x, proj.groundY, 'shadow-oval');
      shadow.setScale(proj.scale * cfg.baseScale * 0.75, proj.scale * cfg.baseScale * 0.35);
      shadow.setAlpha(0.5);
      shadow.setDepth(9);
    }

    this.entities.push({
      id: this.nextEntityId++,
      sprite,
      shadow,
      lane: cfg.lane,
      z: cfg.z,
      yOffset: cfg.yOffset,
      type: cfg.type,
      value: cfg.value || 10,
      baseScale: cfg.baseScale
    });
  }

  // =========================================================================
  // ITEM COLLECTION & CRASH HANDLING
  // =========================================================================
  private collectPerspectiveItem(e: PerspectiveEntity, x: number, y: number) {
    const type = e.type;
    const value = e.value || 10;

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
    } else {
      this.comboStreak++;
      this.comboTimer = 2.8;
      sounds.playCollect(type === 'star' ? 'star' : (type === 'crate' ? 'crate' : 'carrot'), this.comboStreak);
    }

    let multiplier = 1.0;
    if (this.comboStreak >= 20) multiplier = 2.0;
    else if (this.comboStreak >= 10) multiplier = 1.5;
    else if (this.comboStreak >= 5) multiplier = 1.2;

    const earned = Math.round(value * multiplier);
    this.coins += earned;

    if (type === 'star') this.starsCollected++;
    else if (type === 'carrot') this.carrotsCollected++;
    else if (type === 'crate') this.cratesCollected++;

    this.createCollectBurst(x, y, type);

    window.dispatchEvent(
      new CustomEvent('game:collect', {
        detail: { type, value: earned }
      })
    );
  }

  private handlePlayerHit(x: number, y: number) {
    if (this.invincibleTimer > 0) return;

    if (this.lives > 1) {
      this.lives--;
      this.invincibleTimer = 2.2;
      this.cameras.main.shake(220, 0.014);
      sounds.playCrash();
      this.createSmashExplosion(x, y);
      this.showStuntText(`⚠️ OOF! ${this.lives} HEARTS LEFT! ⚠️`);

      // Recovery blink
      this.tweens.add({
        targets: this.riderContainer,
        alpha: 0.4,
        duration: 120,
        yoyo: true,
        repeat: 8,
        onComplete: () => {
          this.riderContainer.alpha = 1.0;
        }
      });
    } else {
      this.lives = 0;
      this.triggerGameOver();
    }
  }

  private showStuntText(msg: string) {
    const txt = this.add.text(this.riderContainer.x, this.riderContainer.y - 65, msg, {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '20px',
      color: '#FFC93C',
      stroke: '#E65100',
      strokeThickness: 4,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: txt,
      y: txt.y - 50,
      scale: 1.15,
      alpha: 0,
      duration: 1300,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  private createCollectBurst(x: number, y: number, type: string) {
    const pTexture = type === 'crate' ? 'particle-flame' : 'particle-star';
    if (!this.textures.exists(pTexture)) return;

    const emitter = this.add.particles(x, y, pTexture, {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: 380,
      quantity: 12,
      emitting: false
    });
    emitter.explode();
    this.time.delayedCall(400, () => emitter.destroy());
  }

  private createSmashExplosion(x: number, y: number) {
    if (!this.textures.exists('particle-flame')) return;
    const emitter = this.add.particles(x, y, 'particle-flame', {
      speed: { min: 120, max: 280 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 450,
      quantity: 24,
      emitting: false
    });
    emitter.explode();
    this.time.delayedCall(500, () => emitter.destroy());
  }

  private triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    sounds.playCrash();

    this.tweens.add({
      targets: this.riderContainer,
      angle: 90,
      y: this.riderContainer.y + 15,
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

  // =========================================================================
  // MILESTONES: BARN CHECKPOINT & BILLBOARD AD BRIDGE
  // =========================================================================
  private enterBarnStation() {
    this.isAtBarn = true;
    this.currentSpeed = 0;
    this.playerJumpOffset = 0;
    this.playerJumpVelocity = 0;
    this.isGrounded = true;
    this.boostMeter = 100;

    sounds.playPowerup();
    sounds.playCollect('crate');

    const milestoneBonus = 50;
    this.coins += milestoneBonus;
    this.carrotsCollected += 10;

    this.showStuntText('🌾 BARN CHECKPOINT! +50 Coins 🥕');

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
    this.barnApproaching = false;
    this.nextBarnDistance += 600;

    this.currentSpeed = this.baseSpeed * 2.2;
    this.isBoosting = true;
    this.boostTimer = 5.0;
    this.boostMeter = 100;

    sounds.playBoost();
    if (this.boostParticles) this.boostParticles.start();
    this.cameras.main.shake(250, 0.008);
    this.showStuntText('🚀 TURBO BARN LAUNCH! (5s BOOST) 🚀');
  }

  private openBillboardAd() {
    if (this.isAdWatching || this.isGameOver || this.adCooldownTimer > 0) return;
    this.isAdWatching = true;
    this.currentSpeed = 0;
    this.playerJumpOffset = 0;
    this.playerJumpVelocity = 0;
    this.isGrounded = true;

    sounds.playCollect('star');

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
    this.billboardApproaching = false;
    this.adCooldownTimer = 90;
    this.currentSpeed = this.baseSpeed * 1.4;
    this.isBoosting = true;
    this.boostTimer = 2.5;

    if (detail?.earned) {
      const reward = detail.value || 100;
      this.coins += reward;
      this.adsViewed += 1;
      this.createCollectBurst(this.riderContainer.x, this.riderContainer.y, 'crate');
    }

    sounds.playBoost();
  }

  // =========================================================================
  // PAUSE & BIOME HANDLERS
  // =========================================================================
  private handlePause() {
    this.isPaused = true;
    if (this.boostParticles) this.boostParticles.stop();
    this.tweens.pauseAll();
  }

  private handleResume() {
    this.isPaused = false;
    this.tweens.resumeAll();
  }

  private updateBiome() {
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
}
