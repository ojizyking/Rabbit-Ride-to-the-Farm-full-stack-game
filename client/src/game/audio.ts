class SoundEffects {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  public enabled: boolean = true;
  private sfxVolume: number = 0.8;
  private masterVolume: number = 0.8;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.updateGain();
        this.sfxGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(sfxVol: number, masterVol: number, muted: boolean = false) {
    this.sfxVolume = sfxVol;
    this.masterVolume = masterVol;
    this.isMuted = muted;
    this.updateGain();
  }

  private updateGain() {
    if (this.sfxGain && this.ctx) {
      const effective = this.isMuted || !this.enabled ? 0 : this.sfxVolume * this.masterVolume;
      this.sfxGain.gain.setValueAtTime(effective, this.ctx.currentTime);
    }
  }

  private getDestination(): AudioNode {
    this.initCtx();
    if (!this.sfxGain && this.ctx) {
      this.sfxGain = this.ctx.createGain();
      this.updateGain();
      this.sfxGain.connect(this.ctx.destination);
    }
    return this.sfxGain || this.ctx!.destination;
  }

  playJump() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.getDestination());

      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch {
      // Audio autoplay policy
    }
  }

  private pentatonicPitches = [
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50, // C6
    1174.66, // D6
    1318.51, // E6
    1567.98  // G6
  ];

  playCollect(type: string = 'coin', streak: number = 0) {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'crate') {
        // Multi-tone fanfare
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, this.ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.24);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start();
        osc.stop(this.ctx.currentTime + 0.48);
      } else {
        // Bright coin / carrot ding with ascending pitch streak
        osc.type = 'sine';
        let baseFreq = type === 'carrot' ? 523.25 : 659.25;
        if (streak > 0) {
          const idx = Math.min(streak - 1, this.pentatonicPitches.length - 1);
          baseFreq = this.pentatonicPitches[idx];
        }
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.setValueAtTime(baseFreq * 1.45, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start();
        osc.stop(this.ctx.currentTime + 0.17);
      }
    } catch {
      // ignore
    }
  }

  playPowerup() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880, 1108.7].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.05);
        gain.gain.setValueAtTime(0.18, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.22);
        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.25);
      });
    } catch {
      // ignore
    }
  }

  playShieldBreak() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  }

  playBoost() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + 0.38);
    } catch {
      // ignore
    }
  }

  playFlipStunt() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.2, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.38);
      });
    } catch {
      // ignore
    }
  }

  playTick() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // ignore
    }
  }

  playAdFanfare() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0.0, d: 0.15 }, // C5
        { f: 659.25, t: 0.12, d: 0.15 }, // E5
        { f: 783.99, t: 0.24, d: 0.18 }, // G5
        { f: 1046.5, t: 0.38, d: 0.45 }, // C6
        { f: 1318.5, t: 0.52, d: 0.6 }  // E6
      ];

      notes.forEach(({ f, t, d }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0.25, now + t);
        gain.gain.exponentialRampToValueAtTime(0.01, now + t + d);

        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now + t);
        osc.stop(now + t + d + 0.05);
      });
    } catch {
      // ignore
    }
  }

  playCrash() {
    if (!this.enabled || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundEffects();
export default sounds;
