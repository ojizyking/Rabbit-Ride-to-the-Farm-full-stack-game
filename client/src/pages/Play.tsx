import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhaserGame } from '../components/game/PhaserGame';
import { useAuth, cacheServerBalance } from '../context/AuthContext';
import { sounds } from '../game/audio';
import { bgm, SOUNDTRACKS, YOUTUBE_PRESETS, MusicSourceType } from '../game/bgm';
import api from '../lib/api';
import {
  Zap, Trophy, Coins, Volume2, VolumeX, ArrowLeft, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, RotateCcw, RotateCw,
  ShoppingCart, Wallet, AlertCircle, Tv, CheckCircle2, Sparkles, PlayCircle, Heart, X,
  Pause, Play as PlayIcon, Music, Sliders, ExternalLink
} from 'lucide-react';
import '../styles/game.css';

interface SponsorInfo {
  tag: string;
  title: string;
  subtitle: string;
  perk: string;
  accentColor: string;
  bgColor: string;
  icon: string;
  slogan: string;
}

const SPONSORS: SponsorInfo[] = [
  {
    tag: 'FARM FUEL',
    title: 'Crunchy Carrot Nitro Juice 🥕⚡',
    subtitle: '100% Organic Farm-Pressed Stamina Drink for Champions',
    perk: '+50% Jump Power & Instant 360° Flip Torque',
    accentColor: '#FF7A00',
    bgColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
    icon: '🥕',
    slogan: '"Munch faster. Jump higher. Dominate the dirt track!"'
  },
  {
    tag: 'OFFICIAL PAYOUTS',
    title: 'Paystack Instant Cashouts 🏦⚡',
    subtitle: 'Automated Real Naira Bank Transfers in Under 10 Seconds',
    perk: 'Zero Wait Time • 1,000 Coins = ₦50 Direct to Bank',
    accentColor: '#00C853',
    bgColor: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
    icon: '💳',
    slogan: '"Play daily. Collect coins. Cash out direct to your account."'
  },
  {
    tag: 'SPEED & STYLE',
    title: 'Hyper Bunny Turbo Bicycles 🚴🔥',
    subtitle: 'Aerodynamic Racing Frames, Gold Rims & Rocket Exhaust',
    perk: 'Loop-de-Loop Balance Stabilizer + 2X Nitrous Burn Time',
    accentColor: '#FFB300',
    bgColor: 'linear-gradient(135deg, #FFFDE7 0%, #FFF9C4 100%)',
    icon: '⚡',
    slogan: '"Equip pro gear in the shop to crush every track record."'
  },
  {
    tag: 'LUCKY HARVEST',
    title: 'Golden Carrot Jackpot Seeds 🌾⭐',
    subtitle: 'Mystery Crates Spawning Across Every 100 Meters',
    perk: 'Up to ₦10,000 Surprise Jackpot Coins in Loot Crates',
    accentColor: '#8E24AA',
    bgColor: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
    icon: '🎁',
    slogan: '"Collect crates on the run and watch your wallet explode."'
  }
];

interface StatUpdateEvent {
  coins: number;
  distance: number;
  stars: number;
  carrots: number;
  crates: number;
  adViews: number;
  flipsCompleted?: number;
  loopsCompleted?: number;
  boostMeter: number;
  isBoosting: boolean;
  lives?: number;
  combo?: number;
  hasShield?: boolean;
  magnetActive?: boolean;
}

interface EndRideData {
  coins: number;
  distance: number;
  stars: number;
  carrots: number;
  boxes: number;
  adViews: number;
  nairaEarned?: number;
  newBalance?: number;
}

export const Play: React.FC = () => {
  const { user, token, openAuthModal, refreshUser, updateBalance } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StatUpdateEvent>({
    coins: 0,
    distance: 0,
    stars: 0,
    carrots: 0,
    crates: 0,
    adViews: 0,
    boostMeter: 100,
    isBoosting: false,
    lives: 3,
    combo: 0,
    hasShield: false,
    magnetActive: false
  });

  const [isMuted, setIsMuted] = useState(() => bgm.isMuted);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gameOverData, setGameOverData] = useState<EndRideData | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [remainingRides, setRemainingRides] = useState<string | number>('10');

  // Pause State
  const [isPaused, setIsPaused] = useState(false);

  // Barn Checkpoint State
  const [isBarnOpen, setIsBarnOpen] = useState(false);
  const [barnData, setBarnData] = useState<{
    distance: number;
    coins: number;
    carrots: number;
    bonusCoins: number;
    bonusCarrots: number;
  } | null>(null);

  // Audio Mixer & BGM State
  const [musicSource, setMusicSource] = useState<MusicSourceType>(() => bgm.currentSource);
  const [activeTrack, setActiveTrack] = useState<string>(() => bgm.getActiveTrackId());
  const [ytInput, setYtInput] = useState<string>(() => bgm.getYouTubeVideoId());
  const [masterVol, setMasterVol] = useState<number>(() => bgm.masterVolume);
  const [musicVol, setMusicVol] = useState<number>(() => bgm.musicVolume);
  const [sfxVol, setSfxVol] = useState<number>(() => bgm.sfxVolume);
  const [currentBiomeName, setCurrentBiomeName] = useState<string>('Sunny Emerald Meadows');

  // 30-Second Billboard Ad State
  const [isBillboardOpen, setIsBillboardOpen] = useState(false);
  const [billboardCountdown, setBillboardCountdown] = useState(30);
  const [isBillboardComplete, setIsBillboardComplete] = useState(false);
  const [sponsorIdx, setSponsorIdx] = useState(0);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);

  // Verify auth & check daily ride limits on mount
  useEffect(() => {
    if (!token) {
      openAuthModal('login');
      return;
    }

    const checkRideLimit = async () => {
      try {
        const res = await api.post('/game/start-ride');
        if (res.data.success) {
          setRemainingRides(res.data.remainingRidesToday);
        }
      } catch (err: unknown) {
        const errorResponse = err as { response?: { status?: number; data?: { limitReached?: boolean } } };
        if (errorResponse.response?.status === 403 || errorResponse.response?.data?.limitReached) {
          setLimitModalOpen(true);
        }
      }
    };

    checkRideLimit();
  }, [token]);

  // Listen to live stats from Phaser scene
  useEffect(() => {
    const handleStatUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<StatUpdateEvent>;
      setStats(customEvent.detail);
    };

    window.addEventListener('game:stat_update', handleStatUpdate);
    return () => {
      window.removeEventListener('game:stat_update', handleStatUpdate);
    };
  }, []);

  // Listen to Billboard Ad Trigger from Phaser Game Scene
  useEffect(() => {
    const handleOpenAd = () => {
      setIsBillboardOpen(true);
      setBillboardCountdown(30);
      setIsBillboardComplete(false);
      setSponsorIdx(0);
      setReactions([]);
      bgm.pause(); // Pause BGM during sponsor ad!
    };

    window.addEventListener('game:open_billboard_ad', handleOpenAd);
    return () => {
      window.removeEventListener('game:open_billboard_ad', handleOpenAd);
    };
  }, []);

  // Background Music Lifecycle
  useEffect(() => {
    const handleRideStart = () => {
      bgm.start();
    };
    window.addEventListener('game:ride_start', handleRideStart);
    const startTimer = setTimeout(() => {
      bgm.start();
    }, 600);

    return () => {
      clearTimeout(startTimer);
      window.removeEventListener('game:ride_start', handleRideStart);
      bgm.stop();
    };
  }, []);

  // Listen for Barn Checkpoint and Biome changes
  useEffect(() => {
    const handleEnterBarn = (e: Event) => {
      const customEvent = e as CustomEvent<{
        distance: number;
        coins: number;
        carrots: number;
        bonusCoins: number;
        bonusCarrots: number;
      }>;
      setBarnData(customEvent.detail);
      setIsBarnOpen(true);

      // Note: Barn bonus coins are included in the ride's total coins and
      // will be credited server-side when the ride ends via /api/game/end-ride.
      // No direct updateBalance() call here — trust the server.
    };

    const handleBiomeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ biome: string }>;
      const biomeMap: Record<string, string> = {
        meadow: '🌻 Sunny Emerald Meadows',
        sunflower: '🌾 Sunflower Windmill Valley',
        orchard: '🍎 Autumn Apple Orchard',
        twilight: '✨ Twilight Lantern Trail',
        golden: '🌟 Golden Harvest Gateway'
      };
      const name = biomeMap[customEvent.detail.biome] || '🌾 Farm Trail';
      setCurrentBiomeName(name);
      setToastMessage(name);
      setTimeout(() => setToastMessage(null), 2500);
    };

    window.addEventListener('game:enter_barn', handleEnterBarn);
    window.addEventListener('game:biome_change', handleBiomeChange);
    return () => {
      window.removeEventListener('game:enter_barn', handleEnterBarn);
      window.removeEventListener('game:biome_change', handleBiomeChange);
    };
  }, [user]);

  // Keyboard shortcut listener: Escape or P to Pause/Resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
        e.preventDefault();
        handleTogglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOverData, isBillboardOpen, isBarnOpen]);

  // 30-Second Countdown Timer with Metronome Tick, Sponsor Rotation & Fanfare
  useEffect(() => {
    if (!isBillboardOpen) return;

    if (billboardCountdown > 0) {
      const timer = setTimeout(() => {
        setBillboardCountdown((prev) => {
          const next = prev - 1;
          sounds.playTick();
          // Cycle sponsor every 7.5 seconds
          const slide = Math.floor((30 - next) / 7.5) % SPONSORS.length;
          setSponsorIdx(slide);
          return next;
        });
      }, 1000);

      return () => clearTimeout(timer);
    } else if (billboardCountdown === 0 && !isBillboardComplete) {
      setIsBillboardComplete(true);
      sounds.playAdFanfare();
      setToastMessage('🎉 30s Billboard Watched! +100 Coins (₦10) Credited!');
      setTimeout(() => setToastMessage(null), 3000);

      // Directly credit ₦10 to the wallet!
      const currentBal = user?.balanceNaira !== undefined ? user.balanceNaira : Number(localStorage.getItem('rabbit_guest_balance') || 0);
      const newBal = Math.round((currentBal + 10) * 100) / 100;
      updateBalance(newBal);

      // Record local transaction
      try {
        const existingTx = JSON.parse(localStorage.getItem('rabbit_offline_transactions') || '[]');
        existingTx.unshift({
          _id: 'tx_ad_' + Date.now(),
          type: 'earn',
          amount: 10,
          description: 'Sponsor Billboard Ad View (30s) - +100 Coins',
          status: 'completed',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('rabbit_offline_transactions', JSON.stringify(existingTx.slice(0, 50)));
      } catch {
        // ignore
      }

      // Persist ad view & credit 100 coins directly to backend if online
      api.post('/game/collect', { type: 'ad', value: 100 })
        .then((res) => {
          if (res.data?.newBalance !== undefined) {
            updateBalance(res.data.newBalance);
            cacheServerBalance(res.data.newBalance);
          }
        })
        .catch((err) => console.warn('Ad collect sync:', err));

      // Automatically remove ad modal after countdown and resume ride
      const autoCloseTimer = setTimeout(() => {
        setIsBillboardOpen(false);
        window.dispatchEvent(
          new CustomEvent('game:resume_ride', {
            detail: { earned: true, value: 100 }
          })
        );
      }, 1200);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [isBillboardOpen, billboardCountdown, isBillboardComplete, user]);

  const handleBankAndEndRide = () => {
    if (stats.coins > 0 || stats.distance > 0) {
      sounds.playAdFanfare();
      window.dispatchEvent(
        new CustomEvent('game:ride_end', {
          detail: {
            coins: stats.coins,
            distance: stats.distance,
            stars: stats.stars,
            carrots: stats.carrots,
            boxes: stats.crates,
            adViews: stats.adViews
          }
        })
      );
    } else {
      navigate('/wallet');
    }
  };

  const handleSendReaction = (emoji: string) => {
    sounds.playCollect('carrot');
    const newReaction = {
      id: Date.now() + Math.random(),
      emoji,
      x: 15 + Math.random() * 70
    };
    setReactions((prev) => [...prev.slice(-8), newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 1800);
  };

  const handleResumeAfterAd = () => {
    setIsBillboardOpen(false);
    // Tell Phaser game to unpause and boost forward!
    window.dispatchEvent(
      new CustomEvent('game:resume_ride', {
        detail: { earned: true, value: 100 }
      })
    );
  };

  const handleTriggerBillboard = () => {
    window.dispatchEvent(new CustomEvent('game:trigger_ad_view'));
  };

  const handleCollect = (item: { type: string; value: number }) => {
    let msg = `+${item.value} Coins!`;
    if (item.type === 'star') msg = `⭐ +${item.value} Star Bonus!`;
    else if (item.type === 'carrot') msg = `🥕 +${item.value} Carrot Token!`;
    else if (item.type === 'crate') msg = `🎁 +${item.value} MYSTERY CRATE!`;
    else if (item.type === 'ad') msg = `📺 +${item.value} SPONSOR REWARD!`;

    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 1200);
  };

  const handleRideEnd = (results: EndRideData) => {
    setGameOverData(results);
    refreshUser();
  };

  const handleRestartRide = () => {
    setGameOverData(null);
    window.dispatchEvent(new CustomEvent('game:restart_ride'));
  };

  const handleTriggerBoost = () => {
    window.dispatchEvent(new CustomEvent('game:trigger_boost'));
  };

  const handleTriggerFlip = () => {
    window.dispatchEvent(new CustomEvent('game:trigger_flip_360'));
  };

  const handleTriggerJump = () => {
    window.dispatchEvent(new CustomEvent('game:jump'));
  };

  const handleTriggerSlide = () => {
    window.dispatchEvent(new CustomEvent('game:slide'));
  };

  const handleTriggerMoveLeft = () => {
    window.dispatchEvent(new CustomEvent('game:move_left'));
  };

  const handleTriggerMoveRight = () => {
    window.dispatchEvent(new CustomEvent('game:move_right'));
  };

  const handleTogglePause = () => {
    if (gameOverData || isBillboardOpen || isBarnOpen) return;
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        bgm.pause();
        window.dispatchEvent(new CustomEvent('game:pause'));
      } else {
        bgm.resume();
        window.dispatchEvent(new CustomEvent('game:resume'));
      }
      return next;
    });
  };

  const handleExitBarn = () => {
    setIsBarnOpen(false);
    sounds.playBoost();
    window.dispatchEvent(new CustomEvent('game:exit_barn', { detail: { boost: true } }));
    setToastMessage('🚀 Super Nitro Launch! (5s Boost)');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleMasterVolChange = (v: number) => {
    setMasterVol(v);
    bgm.setVolumes(v, musicVol, sfxVol);
    sounds.setVolumes(sfxVol, v, isMuted);
  };

  const handleMusicVolChange = (v: number) => {
    setMusicVol(v);
    bgm.setVolumes(masterVol, v, sfxVol);
  };

  const handleSfxVolChange = (v: number) => {
    setSfxVol(v);
    bgm.setVolumes(masterVol, musicVol, v);
    sounds.setVolumes(v, masterVol, isMuted);
  };

  const handleSelectSoundtrack = (id: string) => {
    setActiveTrack(id);
    setMusicSource('soundtrack');
    bgm.setSoundtrack(id);
  };

  const handleApplyYouTube = (videoIdOrUrl: string) => {
    const success = bgm.setYouTubeVideo(videoIdOrUrl);
    if (success) {
      setMusicSource('youtube');
      setToastMessage('🎵 YouTube Soundtrack Connected!');
      setTimeout(() => setToastMessage(null), 2000);
    } else {
      setToastMessage('⚠️ Invalid YouTube URL or Video ID');
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const toggleSound = () => {
    const muted = bgm.toggleMute();
    setIsMuted(muted);
    sounds.setVolumes(sfxVol, masterVol, muted);
  };

  return (
    <div className="game-page-container">
      {/* HUD OVERLAY */}
      <div className="game-hud-overlay">
        <div className="game-hud-left">
          <button
            onClick={() => {
              if (stats.coins > 0) {
                handleBankAndEndRide();
              } else {
                navigate('/shop');
              }
            }}
            className="hud-icon-btn"
            title="Back / Bank Coins"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Coins Earned this ride */}
          <div
            className="hud-stat-pill coins"
            onClick={handleBankAndEndRide}
            style={{ cursor: 'pointer' }}
            title="Click to Bank Coins to Wallet! (Conversion: 1,000 Coins = ₦100)"
          >
            <Coins size={20} color="#FF7A00" />
            <span>{stats.coins} Coins (₦{(stats.coins / 10).toFixed(1)})</span>
          </div>

          {/* BANK COINS ACTION BUTTON */}
          {stats.coins > 0 && (
            <button
              onClick={handleBankAndEndRide}
              className="hud-btn-bank"
              title="Finish ride and bank your collected coins into your wallet"
              style={{
                background: 'linear-gradient(135deg, #FF7A00 0%, #FF9E00 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(255, 122, 0, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Wallet size={15} />
              <span>BANK (+₦{(stats.coins / 20).toFixed(1)})</span>
            </button>
          )}

          {/* 3 Hearts Remaining */}
          <div className="hud-stat-pill" title={`${stats.lives ?? 3} Hearts Left`} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3].map((h) => (
              <Heart
                key={h}
                size={16}
                fill={h <= (stats.lives ?? 3) ? '#FF1744' : 'none'}
                color={h <= (stats.lives ?? 3) ? '#FF1744' : '#90A4AE'}
              />
            ))}
          </div>

          {/* Active Combo Multiplier */}
          {stats.combo !== undefined && stats.combo > 1 && (
            <div
              className="hud-stat-pill combo"
              style={{
                background: 'linear-gradient(135deg, #FF6D00 0%, #FFAB00 100%)',
                color: '#FFFFFF',
                fontWeight: 800
              }}
            >
              <Sparkles size={15} />
              <span>x{stats.combo} ({stats.combo >= 20 ? '2.0x' : stats.combo >= 10 ? '1.5x' : stats.combo >= 5 ? '1.2x' : '1.0x'})</span>
            </div>
          )}

          {/* Active Shield Power-up */}
          {stats.hasShield && (
            <div className="hud-stat-pill" style={{ background: '#00E5FF', color: '#004D40', fontWeight: 800 }}>
              <span>🛡️ SHIELD</span>
            </div>
          )}

          {/* Active Magnet Power-up */}
          {stats.magnetActive && (
            <div className="hud-stat-pill" style={{ background: '#FF1744', color: '#FFFFFF', fontWeight: 800 }}>
              <span>🧲 MAGNET</span>
            </div>
          )}

          {/* Distance */}
          <div className="hud-stat-pill distance">
            <Trophy size={18} color="#2D8A4E" />
            <span>{(stats.distance / 1000).toFixed(2)} km</span>
          </div>

          {/* Daily Rides Counter */}
          <div className="hud-stat-pill" style={{ fontSize: '0.9rem' }}>
            <span>Rides: {remainingRides}</span>
          </div>
        </div>

        <div className="game-hud-right">
          {/* 30s AD SPONSOR BUTTON */}
          <button
            onClick={handleTriggerBillboard}
            className="hud-btn-ad"
            title="Watch 30s Animated Billboard Ad for +100 Coins (₦10)"
          >
            <Tv size={18} />
            <span>30s AD (+₦10)</span>
          </button>

          {/* 360 STUNT FLIP BUTTON */}
          <button
            onClick={handleTriggerFlip}
            className="hud-btn-flip"
            title="Press A / D or Tap in Air to Spin 360°"
          >
            <RotateCw size={18} />
            <span>360° FLIP</span>
          </button>

          {/* Boost Energy Bar */}
          <div className="hud-boost-container">
            <div className="hud-boost-label">
              <Zap size={14} />
              <span>NITRO BOOST</span>
            </div>
            <div className="hud-boost-bar-bg">
              <div className="hud-boost-bar-fill" style={{ width: `${stats.boostMeter}%` }} />
            </div>
          </div>

          {/* BOOST BUTTON (with Zap icon) */}
          <button
            onClick={handleTriggerBoost}
            disabled={stats.boostMeter < 25 || stats.isBoosting}
            className="hud-btn-boost"
            title="Press SHIFT or Tap"
          >
            <Zap size={20} fill="#FFF" />
            <span>{stats.isBoosting ? 'BOOSTING!' : 'BOOST'}</span>
          </button>

          {/* Music Audio Drawer Toggle */}
          <button
            onClick={handleTogglePause}
            className="hud-icon-btn"
            title="Background Music & Audio Settings"
          >
            <Music size={20} />
          </button>

          {/* Pause / Resume Button */}
          <button
            onClick={handleTogglePause}
            className="hud-icon-btn"
            title={isPaused ? "Resume (ESC)" : "Pause Game (ESC / P)"}
            style={{
              background: isPaused ? '#FFC93C' : undefined,
              color: isPaused ? '#1B3824' : undefined,
              boxShadow: isPaused ? '0 0 16px rgba(255, 201, 60, 0.8)' : undefined
            }}
          >
            {isPaused ? <PlayIcon size={20} /> : <Pause size={20} />}
          </button>

          {/* Sound Toggle */}
          <button onClick={toggleSound} className="hud-icon-btn" title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      {/* COLLECT TOAST ANIMATION */}
      {toastMessage && (
        <div className="collect-toast-container">
          <div className="collect-toast">{toastMessage}</div>
        </div>
      )}

      {/* CONTROLS HINT BAR (desktop only) */}
      <div className="game-controls-hint">
        <span>
          <span className="key-badge">A</span> / <span className="key-badge">D</span> or <span className="key-badge">←</span> <span className="key-badge">→</span> Dodge Lanes
        </span>
        <span>•</span>
        <span>
          <span className="key-badge">W</span> / <span className="key-badge">SPACE</span> / <span className="key-badge">↑</span> Jump
        </span>
        <span>•</span>
        <span>
          <span className="key-badge">S</span> / <span className="key-badge">↓</span> Duck &amp; Slide
        </span>
        <span>•</span>
        <span>
          <span className="key-badge">SHIFT</span> Nitro Boost
        </span>
        <span>•</span>
        <span>
          <span className="key-badge">ESC</span> / <span className="key-badge">P</span> Pause
        </span>
      </div>

      {/* MOUNT PHASER GAME */}
      <PhaserGame onCollect={handleCollect} onRideEnd={handleRideEnd} />

      {/* MOBILE ON-SCREEN TOUCH CONTROLS */}
      <div className="touch-controls" aria-hidden="true">
        <div className="touch-controls-left">
          {/* Dodge Left Button */}
          <button
            className="touch-btn steer-btn"
            onTouchStart={(e) => { e.preventDefault(); handleTriggerMoveLeft(); }}
            onClick={handleTriggerMoveLeft}
            title="Dodge Left"
          >
            <ChevronLeft size={24} strokeWidth={3} />
            <span className="touch-btn-label">LEFT</span>
          </button>

          {/* Dodge Right Button */}
          <button
            className="touch-btn steer-btn"
            onTouchStart={(e) => { e.preventDefault(); handleTriggerMoveRight(); }}
            onClick={handleTriggerMoveRight}
            title="Dodge Right"
          >
            <ChevronRight size={24} strokeWidth={3} />
            <span className="touch-btn-label">RIGHT</span>
          </button>

          {/* Nitro Boost Button with Glow & Ready State */}
          <button
            className={`touch-btn boost-btn ${stats.boostMeter >= 25 && !stats.isBoosting ? 'ready' : ''} ${stats.isBoosting ? 'boosting' : ''}`}
            onTouchStart={(e) => { e.preventDefault(); handleTriggerBoost(); }}
            onClick={handleTriggerBoost}
            disabled={stats.boostMeter < 25 || stats.isBoosting}
            title="Nitro Boost"
          >
            <Zap size={22} fill="#FFF" />
            <span className="touch-btn-label">{stats.isBoosting ? 'TURBO' : 'BOOST'}</span>
          </button>
        </div>

        <div className="touch-controls-right">
          {/* Duck / Slide Button */}
          <button
            className="touch-btn slide-btn"
            onTouchStart={(e) => { e.preventDefault(); handleTriggerSlide(); }}
            onClick={handleTriggerSlide}
            title="Duck & Slide Under Arches"
          >
            <ArrowDown size={24} strokeWidth={3} />
            <span className="touch-btn-label">SLIDE</span>
          </button>

          {/* Big Tactile Jump Button */}
          <button
            className="touch-btn jump-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              handleTriggerJump();
            }}
            onClick={handleTriggerJump}
            title="Tap to Jump"
          >
            <ArrowUp size={30} strokeWidth={3.5} />
            <span className="touch-jump-text">JUMP</span>
          </button>
        </div>
      </div>


      {/* GAME OVER SUMMARY MODAL */}
      {gameOverData && (
        <div className="modal-overlay">
          <div className="gameover-modal-card">
            <div style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>🏁</div>
            <h2 className="gameover-title">Ride Complete!</h2>
            <p className="gameover-subtitle">Great ride! Your collected tokens and ride rewards have been credited.</p>

            {/* Near-Miss Dopamine Milestone Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
              border: '2px dashed #FFA000',
              borderRadius: '12px',
              padding: '0.65rem 1rem',
              margin: '0.75rem 0 1rem 0',
              fontSize: '0.92rem',
              color: '#E65100',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <Sparkles size={18} color="#FF6D00" />
              <span>Near-Miss: Just {1000 - (gameOverData.distance % 1000)}m away from next Gold Barn Milestone!</span>
            </div>

            <div className="gameover-stats-grid">
              <div className="gameover-stat-box">
                <span className="gameover-stat-val">{(gameOverData.distance / 1000).toFixed(2)} km</span>
                <span className="gameover-stat-label">Distance Covered</span>
              </div>
              <div className="gameover-stat-box">
                <span className="gameover-stat-val">{gameOverData.coins}</span>
                <span className="gameover-stat-label">Coins Collected</span>
              </div>
              <div className="gameover-stat-box">
                <span className="gameover-stat-val earnings">
                  +₦{(gameOverData.nairaEarned !== undefined ? gameOverData.nairaEarned : (gameOverData.coins / 20)).toLocaleString()}
                </span>
                <span className="gameover-stat-label">Reward Value (1,000 Coins = ₦50)</span>
              </div>
              <div className="gameover-stat-box">
                <span className="gameover-stat-val" style={{ color: '#2E7D32' }}>
                  ₦{(gameOverData.newBalance || user?.balanceNaira || 0).toLocaleString()}
                </span>
                <span className="gameover-stat-label">Total Balance</span>
              </div>
            </div>

            <div className="gameover-actions">
              <button onClick={handleRestartRide} className="btn-primary" style={{ justifyContent: 'center' }}>
                <RotateCcw size={18} />
                <span>Claim &amp; Ride Again</span>
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => navigate('/shop')}
                  className="btn-yellow"
                  style={{ justifyContent: 'center' }}
                >
                  <ShoppingCart size={18} />
                  <span>Farm Shop</span>
                </button>
                <button
                  onClick={() => navigate('/wallet')}
                  className="btn-green"
                  style={{ justifyContent: 'center' }}
                >
                  <Wallet size={18} />
                  <span>Wallet &amp; Rewards</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 30-SECOND ANIMATED BILLBOARD AD MODAL */}
      {isBillboardOpen && (
        <div className="modal-overlay">
          <div className="billboard-modal-frame">
            {/* Wooden scaffolding roof trim with bulbs */}
            <div className="billboard-roof-trim">
              <div className="billboard-marquee-bulbs">
                {[...Array(14)].map((_, i) => (
                  <span key={i} className={`marquee-bulb bulb-${i % 4}`} />
                ))}
              </div>
              <div className="billboard-header-tag">
                <Tv size={18} />
                <span>SPONSOR BILLBOARD • 30s COUNTDOWN</span>
                <Sparkles size={18} color="#FFD54F" />
              </div>
              <button
                type="button"
                className="billboard-header-close-btn"
                onClick={handleResumeAfterAd}
                title="Close and Resume"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '8px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  zIndex: 20
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Inner Billboard Screen */}
            <div className="billboard-screen-casing">
              {/* Scanlines & Glow Overlay */}
              <div className="billboard-scanlines" />

              {/* Floating Cheer Reaction Sprites */}
              <div className="billboard-reaction-layer">
                {reactions.map((r) => (
                  <span
                    key={r.id}
                    className="floating-reaction-emoji"
                    style={{ left: `${r.x}%` }}
                  >
                    {r.emoji}
                  </span>
                ))}
              </div>

              {/* Top Countdown Ring & Status */}
              <div className="billboard-countdown-row">
                <div className="billboard-timer-badge">
                  <div className="timer-radial-wrap">
                    <svg className="timer-svg" viewBox="0 0 100 100">
                      <circle className="timer-track" cx="50" cy="50" r="42" />
                      <circle
                        className="timer-indicator"
                        cx="50"
                        cy="50"
                        r="42"
                        style={{
                          strokeDashoffset: 264 * (1 - billboardCountdown / 30)
                        }}
                      />
                    </svg>
                    <div className="timer-number-center">
                      <span className="timer-val">{billboardCountdown}s</span>
                      <span className="timer-sub">COUNTDOWN</span>
                    </div>
                  </div>
                </div>

                <div className="billboard-reward-pitch">
                  <div className="billboard-reward-tag">
                    <Coins size={18} color="#FF7A00" />
                    <span>SPONSOR BONUS</span>
                  </div>
                  <h3 className="billboard-reward-amount">+100 Coins (₦10.00)</h3>
                  <p className="billboard-reward-sub">
                    {isBillboardComplete
                      ? '🎉 30s View Completed! +100 Coins credited to your session!'
                      : 'Watch this 30s sponsor spotlight to collect 100 game coins.'}
                  </p>
                </div>
              </div>

              {/* Linear Progress Bar */}
              <div className="billboard-progress-bar-bg">
                <div
                  className="billboard-progress-bar-fill"
                  style={{ width: `${((30 - billboardCountdown) / 30) * 100}%` }}
                />
              </div>

              {/* Dynamic Animated Sponsor Spotlight */}
              {SPONSORS[sponsorIdx] && (
                <div
                  className="billboard-sponsor-card"
                  style={{
                    background: SPONSORS[sponsorIdx].bgColor,
                    borderColor: SPONSORS[sponsorIdx].accentColor
                  }}
                >
                  <div className="sponsor-card-top">
                    <span
                      className="sponsor-tag"
                      style={{ background: SPONSORS[sponsorIdx].accentColor }}
                    >
                      {SPONSORS[sponsorIdx].tag}
                    </span>
                    <span className="sponsor-slide-counter">
                      Commercial {sponsorIdx + 1} of {SPONSORS.length}
                    </span>
                  </div>

                  <div className="sponsor-card-body">
                    <div className="sponsor-icon-animated">{SPONSORS[sponsorIdx].icon}</div>
                    <div className="sponsor-copy">
                      <h4 className="sponsor-title">{SPONSORS[sponsorIdx].title}</h4>
                      <p className="sponsor-desc">{SPONSORS[sponsorIdx].subtitle}</p>
                      <div className="sponsor-perk-pill">
                        <CheckCircle2 size={16} color={SPONSORS[sponsorIdx].accentColor} />
                        <span>{SPONSORS[sponsorIdx].perk}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sponsor-slogan-bar">
                    <em>{SPONSORS[sponsorIdx].slogan}</em>
                  </div>
                </div>
              )}

              {/* Interactive Reaction Cheers */}
              <div className="billboard-cheer-bar">
                <span className="cheer-label">Cheer the sponsor! Tap reactions:</span>
                <div className="cheer-buttons-row">
                  {[
                    { emoji: '🥕', label: 'Crunch' },
                    { emoji: '⚡', label: 'Nitro' },
                    { emoji: '₦', label: 'Naira' },
                    { emoji: '🐰', label: 'Bunny' },
                    { emoji: '⭐', label: 'Star' }
                  ].map((btn) => (
                    <button
                      key={btn.emoji}
                      onClick={() => handleSendReaction(btn.emoji)}
                      className="cheer-btn"
                      title={btn.label}
                    >
                      <span>{btn.emoji}</span>
                      <small>{btn.label}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions & Footer */}
            <div className="billboard-footer">
              {isBillboardComplete ? (
                <button onClick={handleResumeAfterAd} className="billboard-claim-btn">
                  <PlayCircle size={22} />
                  <span>CLAIM +100 🪙 &amp; RESUME RIDE 🚴</span>
                </button>
              ) : (
                <div className="billboard-waiting-hint">
                  <span className="spinner-dot" />
                  <span>Viewing 30s Sponsor Billboard • Unlocks in {billboardCountdown}s...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DAILY LIMIT MODAL */}
      {limitModalOpen && (
        <div className="modal-overlay">
          <div className="gameover-modal-card">
            <div style={{ color: '#FF7A00', marginBottom: '0.5rem' }}>
              <AlertCircle size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 className="gameover-title">Daily Free Rides Completed!</h2>
            <p className="gameover-subtitle">
              You have completed your 10 free rides for today. Explore optional gameplay packs to access unlimited daily rides
              and session boosts, or visit the farm shop for more items!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => navigate('/wallet')} className="btn-primary" style={{ justifyContent: 'center' }}>
                <span>View Gameplay Packs</span>
              </button>
              <button onClick={() => navigate('/shop')} className="btn-outline" style={{ justifyContent: 'center' }}>
                <span>Visit Farm Shop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PAUSE OVERLAY MODAL                                        */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isPaused && (
        <div className="pause-overlay-modal" onClick={handleTogglePause}>
          <div className="pause-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pause-header">
              <div className="pause-badge-icon">🐰</div>
              <h2 className="pause-title">Game Paused</h2>
              <p style={{ color: '#607D8B', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Take a breather! Your ride progress is safely frozen.
              </p>
            </div>

            {/* Run Stats Snapshot */}
            <div className="pause-stats-summary">
              <div className="pause-stat-item">
                <div className="pause-stat-label">Distance</div>
                <div className="pause-stat-val">{(stats.distance / 1000).toFixed(2)} km</div>
              </div>
              <div className="pause-stat-item">
                <div className="pause-stat-label">Coins</div>
                <div className="pause-stat-val">+{stats.coins} (₦{(stats.coins / 20).toFixed(1)})</div>
              </div>
              <div className="pause-stat-item">
                <div className="pause-stat-label">Carrots</div>
                <div className="pause-stat-val">{stats.carrots} 🥕</div>
              </div>
            </div>

            {/* Audio Settings & Music Selector */}
            <div className="audio-mixer-box">
              <div className="audio-mixer-title">
                <Music size={18} color="#2D8A4E" />
                <span>Background Music &amp; Volume Control</span>
              </div>

              {/* Sliders */}
              <div className="volume-row">
                <span className="volume-label">Master:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVol}
                  onChange={(e) => handleMasterVolChange(parseFloat(e.target.value))}
                  className="volume-slider"
                />
                <span className="volume-val-pct">{Math.round(masterVol * 100)}%</span>
              </div>

              <div className="volume-row">
                <span className="volume-label">Music:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVol}
                  onChange={(e) => handleMusicVolChange(parseFloat(e.target.value))}
                  className="volume-slider"
                />
                <span className="volume-val-pct">{Math.round(musicVol * 100)}%</span>
              </div>

              <div className="volume-row">
                <span className="volume-label">Sound FX:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVol}
                  onChange={(e) => handleSfxVolChange(parseFloat(e.target.value))}
                  className="volume-slider"
                />
                <span className="volume-val-pct">{Math.round(sfxVol * 100)}%</span>
              </div>

              {/* Music Source Selector */}
              <div style={{ marginTop: '0.4rem' }}>
                <div className="music-selector-tabs">
                  <button
                    className={`music-tab-btn ${musicSource === 'soundtrack' ? 'active' : ''}`}
                    onClick={() => { setMusicSource('soundtrack'); bgm.setSource('soundtrack'); }}
                  >
                    📻 Farm Soundtracks
                  </button>
                  <button
                    className={`music-tab-btn ${musicSource === 'youtube' ? 'active' : ''}`}
                    onClick={() => { setMusicSource('youtube'); bgm.setSource('youtube'); }}
                  >
                    📺 YouTube Player
                  </button>
                </div>

                {musicSource === 'soundtrack' ? (
                  <div className="soundtrack-pill-list">
                    {SOUNDTRACKS.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handleSelectSoundtrack(track.id)}
                        className={`soundtrack-pill ${activeTrack === track.id ? 'active' : ''}`}
                      >
                        <div>
                          <div className="soundtrack-name">{track.name}</div>
                          <div className="soundtrack-genre">{track.description}</div>
                        </div>
                        {activeTrack === track.id && (
                          <span style={{ color: '#2D8A4E', fontWeight: 800, fontSize: '0.85rem' }}>Playing</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="youtube-input-wrap">
                      <input
                        type="text"
                        value={ytInput}
                        onChange={(e) => setYtInput(e.target.value)}
                        placeholder="Paste YouTube Video URL or ID"
                        className="youtube-input"
                      />
                      <button
                        onClick={() => handleApplyYouTube(ytInput)}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                      >
                        Play
                      </button>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#90A4AE', textTransform: 'uppercase' }}>
                        Curated Presets:
                      </span>
                      <div className="youtube-presets-row">
                        {YOUTUBE_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            className="preset-chip"
                            onClick={() => { setYtInput(p.id); handleApplyYouTube(p.id); }}
                          >
                            ▶ {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pause-actions-row">
              <button onClick={handleTogglePause} className="pause-btn-primary">
                <PlayIcon size={20} />
                <span>Resume Ride</span>
              </button>
              <button
                onClick={() => {
                  handleTogglePause();
                  handleRestartRide();
                }}
                className="pause-btn-secondary"
              >
                <RotateCcw size={16} />
                <span>Restart</span>
              </button>
              <button onClick={() => navigate('/')} className="pause-btn-secondary">
                <span>Exit Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* BARN REST STOP CHECKPOINT MODAL                            */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isBarnOpen && barnData && (
        <div className="barn-modal-overlay">
          <div className="barn-modal-card">
            <div className="barn-top-icon">🌾</div>
            <div>
              <h2 className="barn-modal-title">Pappy's Barn Rest Stop!</h2>
              <p style={{ color: '#5D4037', fontSize: '0.92rem', marginTop: '0.25rem', fontWeight: 600 }}>
                Milestone Checkpoint reached at {barnData.distance}m! Take a well-deserved breather.
              </p>
            </div>

            {/* Perks & Milestone rewards */}
            <div className="barn-perks-grid">
              <div className="barn-perk-card">
                <div className="barn-perk-icon">🥕</div>
                <div className="barn-perk-title">Milestone Reward</div>
                <div className="barn-perk-desc">+{barnData.bonusCoins} Coins &amp; +10 Carrots</div>
              </div>
              <div className="barn-perk-card">
                <div className="barn-perk-icon">🥤</div>
                <div className="barn-perk-title">Carrot Nitro Juice</div>
                <div className="barn-perk-desc">100% Boost Refilled!</div>
              </div>
              <div className="barn-perk-card">
                <div className="barn-perk-icon">💖</div>
                <div className="barn-perk-title">Tune-Up Service</div>
                <div className="barn-perk-desc">Gears Oiled &amp; Checked</div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#78909C' }}>
              Your bike is fully tuned. Launch out of the barn with an automatic <strong>5-Second Super Nitro Boost</strong>!
            </p>

            <button onClick={handleExitBarn} className="barn-launch-btn">
              <Zap size={24} fill="#FFF" />
              <span>Hit the Road! (5s Super Boost)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Play;
