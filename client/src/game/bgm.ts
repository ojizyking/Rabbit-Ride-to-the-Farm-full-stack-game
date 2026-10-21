/**
 * Background Music (BGM) & Audio Mixer Engine
 * Supports:
 * 1. Built-in Web Audio procedural farm soundtracks (instant, zero-latency, no CORS)
 * 2. Embedded YouTube Music Player (paste any video/music URL or choose presets)
 * 3. Master, Music, and SFX volume controls with persistent settings
 */

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string | HTMLElement, options: unknown) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (volume: number) => void;
  loadVideoById: (id: string) => void;
  destroy: () => void;
}

export type MusicSourceType = 'soundtrack' | 'youtube';

export interface SoundtrackInfo {
  id: string;
  name: string;
  genre: string;
  tempo: number;
  description: string;
}

export const SOUNDTRACKS: SoundtrackInfo[] = [
  {
    id: 'sunny-hop',
    name: 'Sunny Farm Hop 🌾',
    genre: 'Country Bounce',
    tempo: 118,
    description: 'Catchy country acoustic bounce with lively bass & cheerful melody'
  },
  {
    id: 'meadow-breeze',
    name: 'Meadow Breeze 🍃',
    genre: 'Acoustic Lo-Fi',
    tempo: 96,
    description: 'Calm, gentle pastoral flute & warm acoustic guitar chords'
  },
  {
    id: 'turbo-rush',
    name: 'Turbo Barnyard Rush ⚡',
    genre: 'Electro-Funk',
    tempo: 132,
    description: 'High-energy driving farm groove with upbeat funk bassline'
  }
];

export const YOUTUBE_PRESETS = [
  { id: 'jfKfPfyJRdk', name: 'Chill Lofi Farm Beats' },
  { id: '5qap5aO4i9A', name: 'Lofi Girl Study & Ride' },
  { id: '1fueZCTYkpA', name: 'Sunny Country Acoustic' },
  { id: '4xDzrJKXOOY', name: 'Synthwave Turbo Ride' }
];

class BGMEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private activeSoundtrackId: string = 'sunny-hop';
  private loopTimer: number | null = null;

  // YouTube State
  private ytPlayer: YTPlayer | null = null;
  private isYTReady: boolean = false;
  private currentYTVideoId: string = 'jfKfPfyJRdk';

  // Volume settings (0.0 to 1.0)
  public masterVolume: number = 0.8;
  public musicVolume: number = 0.6;
  public sfxVolume: number = 0.8;
  public isMuted: boolean = false;
  public currentSource: MusicSourceType = 'soundtrack';

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      this.initYouTubeAPI();
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('rabbit_audio_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.masterVolume !== undefined) this.masterVolume = parsed.masterVolume;
        if (parsed.musicVolume !== undefined) this.musicVolume = parsed.musicVolume;
        if (parsed.sfxVolume !== undefined) this.sfxVolume = parsed.sfxVolume;
        if (parsed.isMuted !== undefined) this.isMuted = parsed.isMuted;
        if (parsed.activeSoundtrackId) this.activeSoundtrackId = parsed.activeSoundtrackId;
        if (parsed.currentSource) this.currentSource = parsed.currentSource;
        if (parsed.currentYTVideoId) this.currentYTVideoId = parsed.currentYTVideoId;
      }
    } catch {
      // ignore
    }
  }

  public saveSettings() {
    try {
      localStorage.setItem(
        'rabbit_audio_settings',
        JSON.stringify({
          masterVolume: this.masterVolume,
          musicVolume: this.musicVolume,
          sfxVolume: this.sfxVolume,
          isMuted: this.isMuted,
          activeSoundtrackId: this.activeSoundtrackId,
          currentSource: this.currentSource,
          currentYTVideoId: this.currentYTVideoId
        })
      );
    } catch {
      // ignore
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.musicGain = this.ctx.createGain();
        this.updateMusicGain();
        this.musicGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private updateMusicGain() {
    if (this.musicGain && this.ctx) {
      const effectiveVol = this.isMuted ? 0 : this.masterVolume * this.musicVolume;
      this.musicGain.gain.setValueAtTime(effectiveVol * 0.28, this.ctx.currentTime);
    }
    if (this.ytPlayer) {
      const ytVol = this.isMuted ? 0 : Math.round(this.masterVolume * this.musicVolume * 100);
      try {
        this.ytPlayer.setVolume(ytVol);
      } catch {
        // ignore
      }
    }
  }

  // ─── Procedural Web Audio Music Sequencer ──────────────────────────────────
  private scheduleSoundtrackLoop() {
    if (!this.isPlaying || this.isPaused || this.currentSource !== 'soundtrack') return;
    this.initCtx();
    if (!this.ctx || !this.musicGain) return;

    const track = SOUNDTRACKS.find((s) => s.id === this.activeSoundtrackId) || SOUNDTRACKS[0];
    const bpm = track.tempo;
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    const totalBars = 4;
    const loopDuration = barDuration * totalBars;
    const now = this.ctx.currentTime + 0.05;

    // Melody and Bass patterns based on selected track
    if (track.id === 'sunny-hop') {
      this.playSunnyHop(now, beatDuration);
    } else if (track.id === 'meadow-breeze') {
      this.playMeadowBreeze(now, beatDuration);
    } else {
      this.playTurboRush(now, beatDuration);
    }

    // Schedule next loop iteration seamlessly
    this.loopTimer = window.setTimeout(() => {
      this.scheduleSoundtrackLoop();
    }, loopDuration * 1000 - 80);
  }

  private playTone(
    freq: number,
    start: number,
    duration: number,
    type: OscillatorType = 'sine',
    vol: number = 0.25
  ) {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(start);
      osc.stop(start + duration + 0.02);
    } catch {
      // ignore
    }
  }

  // Track 1: Sunny Farm Hop (Upbeat Country Bounce)
  private playSunnyHop(startTime: number, beat: number) {
    const bassNotes = [130.81, 164.81, 196.0, 164.81, 146.83, 174.61, 220.0, 174.61]; // C3, E3, G3, D3, F3, A3
    const melodyNotes = [
      523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 523.25,
      587.33, 698.46, 880.0, 698.46, 783.99, 880.0, 1046.5, 783.99
    ];

    // Bassline (half-beat pulse)
    bassNotes.forEach((f, i) => {
      const t = startTime + i * beat * 2;
      this.playTone(f, t, beat * 0.7, 'triangle', 0.35);
      this.playTone(f * 2, t + beat, beat * 0.45, 'sine', 0.2);
    });

    // Catchy Marimba / Banjo Lead (16 beats)
    melodyNotes.forEach((f, i) => {
      const t = startTime + i * beat;
      this.playTone(f, t, beat * 0.8, 'triangle', 0.22);
      this.playTone(f * 1.5, t + beat * 0.5, beat * 0.35, 'sine', 0.12);
    });
  }

  // Track 2: Meadow Breeze (Relaxed Pastoral Lo-Fi)
  private playMeadowBreeze(startTime: number, beat: number) {
    const chords = [
      [261.63, 329.63, 392.0], // C maj
      [220.0, 261.63, 329.63], // A min
      [174.61, 220.0, 261.63], // F maj
      [196.0, 246.94, 293.66]  // G maj
    ];
    const fluteNotes = [523.25, 587.33, 659.25, 783.99, 659.25, 523.25, 440.0, 493.88];

    chords.forEach((chord, bar) => {
      const barStart = startTime + bar * beat * 4;
      // Arpeggiated warm acoustic notes
      chord.forEach((f, noteIdx) => {
        this.playTone(f, barStart + noteIdx * beat, beat * 1.5, 'sine', 0.25);
      });
      // Soft sub bass
      this.playTone(chord[0] * 0.5, barStart, beat * 3.5, 'triangle', 0.3);
    });

    fluteNotes.forEach((f, i) => {
      const t = startTime + i * beat * 2;
      this.playTone(f, t, beat * 1.6, 'sine', 0.18);
    });
  }

  // Track 3: Turbo Barnyard Rush (Electro-Funk Driving Beat)
  private playTurboRush(startTime: number, beat: number) {
    const bassRiff = [110.0, 110.0, 130.81, 146.83, 110.0, 164.81, 146.83, 123.47]; // A2 funk
    const synthStabs = [440.0, 523.25, 659.25, 587.33, 440.0, 659.25, 783.99, 880.0];

    // Funk Bass
    for (let bar = 0; bar < 4; bar++) {
      bassRiff.forEach((f, i) => {
        const t = startTime + bar * beat * 4 + i * (beat * 0.5);
        this.playTone(f, t, beat * 0.35, 'sawtooth', 0.28);
      });
    }

    // High synth stabs
    synthStabs.forEach((f, i) => {
      const t = startTime + i * beat * 2;
      this.playTone(f, t, beat * 0.5, 'sine', 0.22);
      this.playTone(f * 1.5, t + beat * 0.75, beat * 0.3, 'triangle', 0.18);
    });
  }

  // ─── YouTube IFrame Integration ───────────────────────────────────────────
  private initYouTubeAPI() {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      this.isYTReady = true;
      this.mountYouTubePlayer();
    };

    if (window.YT && window.YT.Player) {
      this.isYTReady = true;
      this.mountYouTubePlayer();
    }
  }

  public mountYouTubePlayer() {
    if (typeof document === 'undefined' || !window.YT || !window.YT.Player) return;

    let host = document.getElementById('youtube-bgm-container');
    if (!host) {
      host = document.createElement('div');
      host.id = 'youtube-bgm-container';
      host.style.position = 'fixed';
      host.style.bottom = '-9999px';
      host.style.left = '-9999px';
      host.style.width = '10px';
      host.style.height = '10px';
      host.style.opacity = '0.01';
      host.style.pointerEvents = 'none';
      document.body.appendChild(host);
    }

    try {
      this.ytPlayer = new window.YT.Player('youtube-bgm-container', {
        height: '10',
        width: '10',
        videoId: this.currentYTVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          loop: 1,
          playlist: this.currentYTVideoId,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            this.updateMusicGain();
            if (this.isPlaying && !this.isPaused && this.currentSource === 'youtube') {
              this.ytPlayer?.playVideo();
            }
          }
        }
      });
    } catch {
      // ignore
    }
  }

  // ─── Public Playback Controls ─────────────────────────────────────────────
  public start() {
    this.isPlaying = true;
    this.isPaused = false;
    this.initCtx();

    if (this.currentSource === 'soundtrack') {
      if (this.ytPlayer) {
        try { this.ytPlayer.pauseVideo(); } catch { /* ignore */ }
      }
      this.scheduleSoundtrackLoop();
    } else {
      if (this.loopTimer) {
        clearTimeout(this.loopTimer);
        this.loopTimer = null;
      }
      if (this.ytPlayer) {
        try {
          this.ytPlayer.playVideo();
        } catch {
          // ignore
        }
      }
    }
  }

  public pause() {
    this.isPaused = true;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.ytPlayer) {
      try { this.ytPlayer.pauseVideo(); } catch { /* ignore */ }
    }
  }

  public resume() {
    if (!this.isPlaying) {
      this.start();
      return;
    }
    this.isPaused = false;
    if (this.currentSource === 'soundtrack') {
      this.scheduleSoundtrackLoop();
    } else if (this.ytPlayer) {
      try { this.ytPlayer.playVideo(); } catch { /* ignore */ }
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.ytPlayer) {
      try { this.ytPlayer.stopVideo(); } catch { /* ignore */ }
    }
  }

  public setSoundtrack(trackId: string) {
    this.activeSoundtrackId = trackId;
    this.currentSource = 'soundtrack';
    this.saveSettings();
    if (this.ytPlayer) {
      try { this.ytPlayer.pauseVideo(); } catch { /* ignore */ }
    }
    if (this.isPlaying && !this.isPaused) {
      if (this.loopTimer) clearTimeout(this.loopTimer);
      this.scheduleSoundtrackLoop();
    }
  }

  public setYouTubeVideo(videoIdOrUrl: string) {
    let id = videoIdOrUrl.trim();
    // Support full URLs: youtube.com/watch?v=ID or youtu.be/ID
    if (id.includes('youtube.com/watch?v=')) {
      id = id.split('watch?v=')[1]?.split('&')[0] || id;
    } else if (id.includes('youtu.be/')) {
      id = id.split('youtu.be/')[1]?.split('?')[0] || id;
    }

    if (id.length < 5) return false;

    this.currentYTVideoId = id;
    this.currentSource = 'youtube';
    this.saveSettings();

    // Stop synth loop
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    if (this.ytPlayer) {
      try {
        this.ytPlayer.loadVideoById(id);
        this.updateMusicGain();
        if (this.isPlaying && !this.isPaused) {
          this.ytPlayer.playVideo();
        }
      } catch {
        // ignore
      }
    }
    return true;
  }

  public setSource(source: MusicSourceType) {
    this.currentSource = source;
    this.saveSettings();
    if (source === 'soundtrack') {
      if (this.ytPlayer) {
        try { this.ytPlayer.pauseVideo(); } catch { /* ignore */ }
      }
      if (this.isPlaying && !this.isPaused) {
        this.scheduleSoundtrackLoop();
      }
    } else {
      if (this.loopTimer) {
        clearTimeout(this.loopTimer);
        this.loopTimer = null;
      }
      if (this.ytPlayer && this.isPlaying && !this.isPaused) {
        try { this.ytPlayer.playVideo(); } catch { /* ignore */ }
      }
    }
  }

  public setVolumes(master: number, music: number, sfx: number) {
    this.masterVolume = Math.max(0, Math.min(1, master));
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.updateMusicGain();
    this.saveSettings();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateMusicGain();
    this.saveSettings();
    return this.isMuted;
  }

  public getActiveTrackId() {
    return this.activeSoundtrackId;
  }

  public getYouTubeVideoId() {
    return this.currentYTVideoId;
  }
}

export const bgm = new BGMEngine();
export default bgm;
