import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhaserGame } from '../components/game/PhaserGame';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../game/audio';
import api from '../lib/api';
import { Zap, Trophy, Coins, Volume2, VolumeX, ArrowLeft, RotateCcw, RotateCw, ShoppingCart, Wallet, AlertCircle, Tv, CheckCircle2, Sparkles, PlayCircle, Heart } from 'lucide-react';
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
    perk: 'Zero Wait Time • 1,000 Coins = ₦100 Direct to Bank',
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
  const { user, token, openAuthModal, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StatUpdateEvent>({
    coins: 0,
    distance: 0,
    stars: 0,
    carrots: 0,
    crates: 0,
    adViews: 0,
    boostMeter: 100,
    isBoosting: false
  });

  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gameOverData, setGameOverData] = useState<EndRideData | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [remainingRides, setRemainingRides] = useState<string | number>('10');

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
    };

    window.addEventListener('game:open_billboard_ad', handleOpenAd);
    return () => {
      window.removeEventListener('game:open_billboard_ad', handleOpenAd);
    };
  }, []);

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

      // Persist ad view & credit 100 coins directly to backend
      api.post('/game/collect', { type: 'ad', value: 100 })
        .then(() => refreshUser())
        .catch((err) => console.warn('Ad collect sync:', err));
    }
  }, [isBillboardOpen, billboardCountdown, isBillboardComplete]);

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

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setIsMuted(!sounds.enabled);
  };

  return (
    <div className="game-page-container">
      {/* HUD OVERLAY */}
      <div className="game-hud-overlay">
        <div className="game-hud-left">
          <button onClick={() => navigate('/shop')} className="hud-icon-btn" title="Back to Shop">
            <ArrowLeft size={20} />
          </button>

          {/* Coins Earned this ride */}
          <div className="hud-stat-pill coins" title="Conversion: 1,000 Coins = ₦100 (10 Coins = ₦1)">
            <Coins size={20} color="#FF7A00" />
            <span>{stats.coins} Coins (₦{(stats.coins / 10).toFixed(1)})</span>
          </div>

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
          <span className="key-badge">SPACE</span> / <span className="key-badge">W</span> / <span className="key-badge">TAP</span> Jump
        </span>
        <span>•</span>
        <span>
          <span className="key-badge">A</span> / <span className="key-badge">D</span> / <span className="key-badge">FLIP</span> 360° Stunt
        </span>
        <span>•</span>
        <span>
          <span className="key-badge">SHIFT</span> Nitro Boost
        </span>
        <span>•</span>
        <span>
          <span className="key-badge">TV</span> 30s Billboard Ad
        </span>
      </div>

      {/* MOUNT PHASER GAME */}
      <PhaserGame onCollect={handleCollect} onRideEnd={handleRideEnd} />

      {/* MOBILE ON-SCREEN TOUCH CONTROLS */}
      <div className="touch-controls" aria-hidden="true">
        <div className="touch-controls-left">
          <button
            className="touch-btn flip-btn"
            onTouchStart={(e) => { e.preventDefault(); handleTriggerFlip(); }}
            onClick={handleTriggerFlip}
            title="360° Flip"
          >
            🔄
          </button>
        </div>
        <div className="touch-controls-right">
          <button
            className="touch-btn boost-btn"
            onTouchStart={(e) => { e.preventDefault(); handleTriggerBoost(); }}
            onClick={handleTriggerBoost}
            disabled={stats.boostMeter < 25 || stats.isBoosting}
            title="Nitro Boost"
          >
            ⚡
          </button>
          <button
            className="touch-btn"
            onTouchStart={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('game:jump'));
            }}
            title="Jump"
            style={{ background: 'rgba(45,138,78,0.4)', borderColor: 'rgba(100,200,100,0.5)' }}
          >
            ☝️
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
                  +₦{(gameOverData.nairaEarned !== undefined ? gameOverData.nairaEarned : (gameOverData.coins / 10)).toLocaleString()}
                </span>
                <span className="gameover-stat-label">Reward Value (1,000 Coins = ₦100)</span>
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
    </div>
  );
};

export default Play;
