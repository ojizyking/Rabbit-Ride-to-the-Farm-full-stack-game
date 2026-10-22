import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Gamepad2,
  Wallet,
  Coins,
  Users,
  Copy,
  Check,
  Share2,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Edit3,
  Award,
  Zap,
  X,
  Compass,
  ShieldCheck
} from 'lucide-react';
import '../styles/dashboard.css';
import RabbitRunningLoader from '../components/common/RabbitRunningLoader';

export const Dashboard: React.FC = () => {
  const { user, refreshUser, customizeReferralCode } = useAuth();
  const navigate = useNavigate();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customMsg, setCustomMsg] = useState<{ success: boolean; text: string } | null>(null);

  if (!user) {
    return (
      <div className="dashboard-page" style={{ padding: '2rem 1rem' }}>
        <RabbitRunningLoader fullscreen={false} message="Loading your rider profile... 🐰" />
      </div>
    );
  }

  const referralCode = user.referralCode || (user.email ? user.email.split('@')[0].toUpperCase().slice(0, 6) : 'RIDER');
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;
  const referralEarnings = user.referralEarnings || 0;
  const referralsCount = user.referralsCount || 0;

  // Estimated Coin Bank: roughly 20 coins per Naira balance (1000 coins = ₦50)
  const estimatedCoins = Math.round(user.balanceNaira * 20);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveCustomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customCode.length < 3) {
      setCustomMsg({ success: false, text: 'Code must be at least 3 characters long.' });
      return;
    }
    setCustomLoading(true);
    setCustomMsg(null);
    try {
      const res = await customizeReferralCode(customCode);
      setCustomMsg({ success: res.success, text: res.message });
      if (res.success) {
        if (refreshUser) refreshUser();
        setTimeout(() => {
          setShowCustomModal(false);
          setCustomMsg(null);
          setCustomCode('');
        }, 1500);
      }
    } catch {
      setCustomMsg({ success: false, text: 'Failed to update referral code. Try another!' });
    } finally {
      setCustomLoading(false);
    }
  };

  const shareText = encodeURIComponent(
    `Join me on Rabbit Ride to the Farm! Use my invite code ${referralCode} to get ₦50 instant starter bonus: ${referralLink}`
  );

  return (
    <div className="dashboard-page">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION 1: HERO RIDER WELCOME                               */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="dashboard-hero">
        <div className="hero-profile-info">
          <div className="hero-avatar-ring">
            <img src="/assets/logo.svg" alt="Rider Avatar" className="hero-avatar-img" />
          </div>
          <div>
            <h1 className="hero-greeting">
              Welcome back, {user.email.split('@')[0]}! 🐰
            </h1>
            <div className="hero-email">
              <span>{user.email}</span>
              <span className={`tier-pill ${user.subscriptionTier}`}>
                {user.subscriptionTier} Rider
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {user.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #FF6F00, #E65100)',
                color: '#FFFFFF',
                fontWeight: 700,
                padding: '0.75rem 1.35rem',
                borderRadius: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 14px rgba(230, 81, 0, 0.35)'
              }}
            >
              <ShieldCheck size={22} />
              <span>Admin Mission Control</span>
            </button>
          )}

          <button onClick={() => navigate('/play')} className="hero-play-btn">
            <Gamepad2 size={24} />
            <span>Hop On &amp; Ride Now</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION 2: CORE METRICS GRID                                */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="dashboard-grid">
        {/* Metric 1: Wallet Balance */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Wallet Balance</span>
              <div className="metric-icon-wrap icon-green">
                <Wallet size={22} />
              </div>
            </div>
            <div className="metric-val">₦{user.balanceNaira.toLocaleString()}</div>
            <div className="metric-sub">Ready for games &amp; payouts</div>
          </div>
          <Link to="/wallet" className="metric-action-btn">
            <span>Deposit / Cashout</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Metric 2: Coin Economy */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Farm Coins</span>
              <div className="metric-icon-wrap icon-orange">
                <Coins size={22} />
              </div>
            </div>
            <div className="metric-val">~{estimatedCoins.toLocaleString()} 🪙</div>
            <div className="metric-sub">Rate: 1,000 Coins = ₦50</div>
          </div>
          <Link to="/wallet" className="metric-action-btn">
            <span>Convert to Naira</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Metric 3: Rides & Energy */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Ride Adventure</span>
              <div className="metric-icon-wrap icon-blue">
                <Zap size={22} />
              </div>
            </div>
            <div className="metric-val">{user.totalRides || 0} Rides</div>
            <div className="metric-sub">
              {user.dailyRidesToday ? `${user.dailyRidesToday} completed today` : 'Ready to hop in!'}
            </div>
          </div>
          <Link to="/play" className="metric-action-btn">
            <span>Start Adventure</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Metric 4: Referral Rewards */}
        <div className="metric-card">
          <div>
            <div className="metric-header">
              <span className="metric-title">Referral Earnings</span>
              <div className="metric-icon-wrap icon-purple">
                <Users size={22} />
              </div>
            </div>
            <div className="metric-val">₦{referralEarnings.toLocaleString()}</div>
            <div className="metric-sub">{referralsCount} friends invited (₦100/ea)</div>
          </div>
          <button
            onClick={() => {
              setCustomCode(referralCode);
              setShowCustomModal(true);
            }}
            className="metric-action-btn"
          >
            <Edit3 size={14} />
            <span>Customize Code</span>
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION 3: TWO COLUMNS (REFERRAL HUB + COMPANION LOADOUT)   */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="dashboard-columns">
        {/* Column A: Referral Hub */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Users size={20} />
              <span>Invite Friends &amp; Earn ₦100 Each</span>
            </h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2D8A4E' }}>
              🎁 Unlimited Rewards
            </span>
          </div>

          <div className="referral-highlight-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E65100' }}>
                YOUR UNIQUE REFERRAL CODE
              </span>
              <button
                onClick={() => {
                  setCustomCode(referralCode);
                  setShowCustomModal(true);
                }}
                style={{
                  background: 'none',
                  color: '#2D8A4E',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: 0
                }}
              >
                <Edit3 size={13} /> Customize
              </button>
            </div>

            <div className="ref-code-display">
              <span className="ref-code-text">{referralCode}</span>
              <div className="ref-btn-group">
                <button onClick={handleCopyCode} className="ref-action-btn">
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
                <button onClick={handleCopyLink} className="ref-action-btn secondary">
                  {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#607D8B', marginTop: '0.5rem' }}>
              Friends get an instant <strong>₦50 Starter Bonus</strong> upon joining, and you earn{' '}
              <strong style={{ color: '#2D8A4E' }}>₦100 cash</strong> credited directly to your wallet!
            </p>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#90A4AE', textTransform: 'uppercase' }}>
              Quick Social Share
            </span>
            <div className="social-share-row">
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="social-share-btn btn-whatsapp"
              >
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Rabbit Ride and earn ₦50 bonus!')}`}
                target="_blank"
                rel="noreferrer"
                className="social-share-btn btn-telegram"
              >
                <span>Telegram</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="social-share-btn btn-twitter"
              >
                <span>X / Twitter</span>
              </a>
            </div>
          </div>
        </div>

        {/* Column B: Companion & Equipment Loadout */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Sparkles size={20} />
              <span>Current Ride Companion</span>
            </h3>
            <Link to="/shop" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2D8A4E' }}>
              Farm Shop &rarr;
            </Link>
          </div>

          <div className="companion-cards">
            {/* Active Rabbit */}
            <div className="companion-item">
              <div className="companion-img-box">🐰</div>
              <div className="companion-details">
                <div className="companion-name">
                  {user.currentRabbit?.name || 'Starter Rabbit'}
                </div>
                <div className="companion-stats">
                  Speed: {user.currentRabbit?.speed || 10} • Jump: {user.currentRabbit?.jump || 10}
                </div>
              </div>
              <Link to="/shop" className="metric-action-btn" style={{ margin: 0 }}>
                Upgrade
              </Link>
            </div>

            {/* Active Bike */}
            <div className="companion-item">
              <div className="companion-img-box">🚲</div>
              <div className="companion-details">
                <div className="companion-name">
                  {user.currentBike?.name || 'Classic Farm Bike'}
                </div>
                <div className="companion-stats">
                  Stability: {user.currentBike?.stability || 10} • Boost: {user.currentBike?.boost || 10}
                </div>
              </div>
              <Link to="/shop" className="metric-action-btn" style={{ margin: 0 }}>
                Upgrade
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <Link
              to="/shop"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <ShoppingBag size={18} />
              <span>Unlock Faster Bikes &amp; Rabbits</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION 4: QUICK ACTIONS SHORTCUTS                         */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1B3824', marginBottom: '1rem' }}>
          Explore Your Farm Hub
        </h3>
        <div className="quick-actions-grid">
          <Link to="/play" className="action-tile">
            <div className="action-tile-icon icon-green">
              <Gamepad2 size={24} />
            </div>
            <div className="action-tile-text">
              <h4>Play Adventure</h4>
              <p>Hop on your bike &amp; gather coins</p>
            </div>
          </Link>

          <Link to="/wallet" className="action-tile">
            <div className="action-tile-icon icon-blue">
              <Wallet size={24} />
            </div>
            <div className="action-tile-text">
              <h4>Wallet &amp; Payouts</h4>
              <p>Top up &amp; withdraw directly</p>
            </div>
          </Link>

          <Link to="/shop" className="action-tile">
            <div className="action-tile-icon icon-orange">
              <ShoppingBag size={24} />
            </div>
            <div className="action-tile-text">
              <h4>Farm Shop</h4>
              <p>Bikes, skins &amp; boost upgrades</p>
            </div>
          </Link>

          <a href="/#game-features" className="action-tile">
            <div className="action-tile-icon icon-purple">
              <Compass size={24} />
            </div>
            <div className="action-tile-text">
              <h4>Game Guide</h4>
              <p>Rules, controls &amp; tips</p>
            </div>
          </a>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL: CUSTOMIZE REFERRAL CODE                             */}
      {/* ─────────────────────────────────────────────────────────── */}
      {showCustomModal && (
        <div className="modal-overlay" onClick={() => setShowCustomModal(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', width: '92%' }}
          >
            <button className="modal-close-btn" onClick={() => setShowCustomModal(false)}>
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#E8F5E9',
                  color: '#2D8A4E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <Edit3 size={24} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1B3824' }}>
                Customize Referral Code
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#607D8B', marginTop: '0.35rem' }}>
                Choose a memorable code for your friends (3-15 letters/numbers).
              </p>
            </div>

            {customMsg && (
              <div
                style={{
                  background: customMsg.success ? '#E8F5E9' : '#FFEBEE',
                  border: `1px solid ${customMsg.success ? '#A5D6A7' : '#FFCDD2'}`,
                  color: customMsg.success ? '#1E6336' : '#C62828',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  marginBottom: '1rem',
                  fontWeight: 600
                }}
              >
                {customMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveCustomCode}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#37474F',
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase'
                  }}
                >
                  Custom Code
                </label>
                <input
                  type="text"
                  required
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SPEEDY77"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '2px solid #C8E6C9',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                    textAlign: 'center',
                    textTransform: 'uppercase'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.8rem',
                    borderRadius: '12px',
                    border: '1px solid #CFD8DC',
                    background: '#ECEFF1',
                    color: '#455A64',
                    fontWeight: 700
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customLoading || customCode.length < 3}
                  className="btn-primary"
                  style={{ flex: 1.5, justifyContent: 'center', padding: '0.8rem' }}
                >
                  {customLoading ? 'Saving...' : 'Save Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
