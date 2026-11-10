import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Music,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Compass,
  BatteryCharging,
  Ticket,
  ShoppingBag,
  Award,
  AlertTriangle
} from 'lucide-react';
import '../styles/landing.css';

export const Landing: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const handleTierSelect = (tier: number) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    navigate(`/wallet?tier=${tier}`);
  };

  const handlePlayNow = () => {
    if (!user) {
      openAuthModal('login');
    } else {
      navigate('/play');
    }
  };

  return (
    <div className="landing-page">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION A: WEBSITE HERO / HOMEPAGE INTRODUCTION            */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-text-content">
            <h1 className="hero-title">🐰 Rabbit Ride to the Farm</h1>
            <p style={{ fontSize: '1.35rem', fontWeight: 600, color: '#174D2A', marginBottom: '0.75rem' }}>
              Hop In. Play More. Grow Your Adventure!
            </p>
            <p className="hero-description">
              Welcome to Rabbit Ride to the Farm — a fun farming adventure where every ticket opens the door to more gameplay!
              <br /><br />
              Explore the farm, take on activities, use your energy wisely, and enjoy the journey as you work toward your next milestone.
              Whether you're a new player or a regular visitor, there's always another adventure to discover.
            </p>

            <div className="hero-actions">
              <button onClick={handlePlayNow} className="btn-primary hero-btn-play">
                <span>PLAY NOW</span>
                <ArrowRight size={22} />
              </button>
              <a href="#game-features" className="hero-btn-learn">
                Learn More
              </a>
            </div>

            <div style={{ margin: '0.75rem 0' }}>
                <Link
                  to="/play?jukebox=1"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
                    border: '1.5px solid #FF9800',
                    borderRadius: '9999px',
                    padding: '0.5rem 1.1rem',
                    color: '#BF360C',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(255,152,0,0.25)'
                  }}
                >
                  <Music size={18} color="#E65100" />
                  <span>🎵 Live YouTube Jukebox: Search Any Song!</span>
                  <span style={{ background: '#C62828', color: '#fff', borderRadius: '6px', fontSize: '0.68rem', padding: '0.15rem 0.45rem', textTransform: 'uppercase' }}>
                    Open 🎧
                  </span>
                </Link>
              </div>
              <div className="hero-tags">
              <span>🌾 Your farm adventure starts here!</span>
            </div>
          </div>

          <div className="hero-illustration-wrapper">
            <div className="hero-rabbit-card">
              <img
                src="/assets/logo.svg"
                alt="Rabbit Riding Bicycle on Farm"
                className="hero-rabbit-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION B: GAME FEATURES                                    */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section id="game-features" className="how-section">
        <div className="section-header">
          <h2 className="section-title">Game Features</h2>
          <p className="section-subtitle">Discover how to play, explore, and enjoy your farm adventure</p>
        </div>

        <div className="features-grid">
          {/* Feature 1 */}
          <div className="step-card">
            <div className="step-icon-badge green">
              <Compass size={28} />
            </div>
            <h3 className="step-number-title">Feature 1 — Explore the Game</h3>
            <p className="step-text">
              Discover available activities and enjoy the challenges waiting for you.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="step-card">
            <div className="step-icon-badge orange">
              <BatteryCharging size={28} />
            </div>
            <h3 className="step-number-title">Feature 2 — Manage Your Energy</h3>
            <p className="step-text">
              Energy helps you access eligible gameplay activities. Use it strategically and make the most of each session.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="step-card">
            <div className="step-icon-badge yellow">
              <Ticket size={28} />
            </div>
            <h3 className="step-number-title">Feature 3 — Get More Tickets</h3>
            <p className="step-text">
              Tickets can give you access to designated activities and additional gameplay opportunities, depending on the game's rules.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="step-card">
            <div className="step-icon-badge green">
              <ShoppingBag size={28} />
            </div>
            <h3 className="step-number-title">Feature 4 — Keep the Adventure Going</h3>
            <p className="step-text">
              Want to play more? Visit the in-game shop to explore available energy, tickets, and extra gameplay chances that can help you continue your journey.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="step-card">
            <div className="step-icon-badge orange">
              <Award size={28} />
            </div>
            <h3 className="step-number-title">Feature 5 — Work Toward Rewards</h3>
            <p className="step-text">
              Participate in eligible activities and check the game's reward rules to understand how rewards are earned and when withdrawals may be available.
            </p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION C: SHOPPING / IN-GAME SHOP                          */}
        {/* ─────────────────────────────────────────────────────────── */}
        {/* FUN FREE-USER UPSELL CALLOUT */}
        <div style={{
          background: 'linear-gradient(135deg, #FFF8E1 0%, #FFF3E0 100%)',
          border: '2.5px solid #FF7A00',
          borderRadius: '20px',
          padding: '1.5rem 1.75rem',
          margin: '0 0 1.5rem 0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(255,122,0,0.18)'
        }}>
          <div style={{ fontSize: '3rem', flexShrink: 0 }}>🥕</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.3rem', fontWeight: 800, color: '#BF360C' }}>
              🐰 Free Riders are Leaving Coins on the Table!
            </h3>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#5D4037', lineHeight: 1.5 }}>
              Without a Farm Pack, your carrot coins are <strong>capped at ₦50 per run</strong>. 🙈<br />
              Grab any pack to <strong>instantly unlock ₦50 → ₦600+ per ride</strong>, boost multipliers, and unlimited rides!
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
              <span style={{ background: '#E8F5E9', border: '1.5px solid #A5D6A7', borderRadius: '8px', padding: '0.25rem 0.65rem', fontSize: '0.82rem', fontWeight: 700, color: '#1B5E20' }}>✅ Basic: ₦50 → ₦52.50/run</span>
              <span style={{ background: '#E3F2FD', border: '1.5px solid #90CAF9', borderRadius: '8px', padding: '0.25rem 0.65rem', fontSize: '0.82rem', fontWeight: 700, color: '#0D47A1' }}>🚀 Growth: up to ₦110/run</span>
              <span style={{ background: '#F3E5F5', border: '1.5px solid #CE93D8', borderRadius: '8px', padding: '0.25rem 0.65rem', fontSize: '0.82rem', fontWeight: 700, color: '#4A148C' }}>⚡ Elite: up to ₦750/run!</span>
            </div>
          </div>
          <a href="#tiers" style={{
            background: '#FF7A00', color: '#fff', borderRadius: '12px',
            padding: '0.65rem 1.4rem', fontWeight: 800, fontSize: '1rem',
            textDecoration: 'none', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(255,122,0,0.4)'
          }}>
            Unlock Now 🌾
          </a>
        </div>

        <div id="shop-guide" className="shop-guide-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '2rem', color: '#174D2A', fontWeight: 700, marginBottom: '0.4rem' }}>
              Need More Energy? Visit the Farm Shop!
            </h2>
            <p style={{ fontSize: '1.15rem', color: '#E65100', fontWeight: 600 }}>
              Every good farmer knows when it's time to restock!
            </p>
            <p style={{ maxWidth: '750px', margin: '0.75rem auto 0 auto', color: '#546E7A', lineHeight: 1.6 }}>
              The Rabbit Ride to the Farm shop offers available gameplay items, including energy, tickets, and extra chances to participate in selected activities.
              Purchasing these items can help you access more gameplay opportunities when you need them.
            </p>
          </div>

          <div className="shop-steps-list">
            <div className="shop-step-item">
              <span className="shop-step-num">1</span>
              <span>Explore the available activities.</span>
            </div>
            <div className="shop-step-item">
              <span className="shop-step-num">2</span>
              <span>Check your energy and ticket balance.</span>
            </div>
            <div className="shop-step-item">
              <span className="shop-step-num">3</span>
              <span>Visit the shop to review available items and prices.</span>
            </div>
            <div className="shop-step-item">
              <span className="shop-step-num">4</span>
              <span>Choose the items that fit your gameplay needs.</span>
            </div>
            <div className="shop-step-item">
              <span className="shop-step-num">5</span>
              <span>Return to the farm and enjoy your next round!</span>
            </div>
          </div>

          <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: '12px', padding: '1rem', marginTop: '1.25rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.9rem', color: '#795548', fontWeight: 600 }}>
              Purchases are intended to provide the in-game benefits displayed at checkout. Review all prices and item descriptions before confirming a transaction.
            </p>
            <span style={{ fontSize: '1rem', color: '#2E7D32', fontWeight: 700 }}>
              Shop when it suits you. Play at your own pace.
            </span>
          </div>
        </div>

        {/* GAMEPLAY PACKS / TIERS */}
        <div id="tiers" className="tiers-container">
          <div className="tiers-header">
            <h3>Gameplay Packs</h3>
            <p>Choose an optional gameplay pack to extend your farm adventure</p>
          </div>

          <div className="tiers-cards-grid">
            {/* GROWTH PACK (POPULAR) */}
            <div className="tier-plan-card featured">
              <span className="popular-badge">POPULAR</span>
              <span className="tier-tag growth">GROWTH PACK PLUS</span>
              <div className="tier-price">2000 ₦</div>
              <div className="tier-name-label">Growth Pack</div>
              <ul className="tier-perks-list">
                <li>
                  <CheckCircle2 size={16} color="#FF7A00" />
                  <span>Session boost +10%</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#FF7A00" />
                  <span>120 Carrot tokens per ride</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#FF7A00" />
                  <span>Bonus loot crate weekly</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#FF7A00" />
                  <span>Unlimited daily rides</span>
                </li>
              </ul>
              <button onClick={() => handleTierSelect(2000)} className="tier-btn-select">
                Select 2000
              </button>
            </div>

            {/* BASIC STARTER PACK */}
            <div className="tier-plan-card">
              <span className="tier-tag basic">BASIC</span>
              <div className="tier-price">1000 ₦</div>
              <div className="tier-name-label">Starter Pack</div>
              <ul className="tier-perks-list">
                <li>
                  <CheckCircle2 size={16} color="#2D8A4E" />
                  <span>Session boost +5%</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#2D8A4E" />
                  <span>50 Carrot tokens per ride</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#2D8A4E" />
                  <span>Bonus loot crate weekly</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#2D8A4E" />
                  <span>Unlimited daily rides</span>
                </li>
              </ul>
              <button onClick={() => handleTierSelect(1000)} className="tier-btn-select">
                Select 1000
              </button>
            </div>

            {/* PRO PACK */}
            <div className="tier-plan-card">
              <span className="tier-tag pro">PRO</span>
              <div className="tier-price">5000 ₦</div>
              <div className="tier-name-label">Pro Pack</div>
              <ul className="tier-perks-list">
                <li>
                  <CheckCircle2 size={16} color="#1565C0" />
                  <span>Session boost +25%</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#1565C0" />
                  <span>300 Carrot tokens per ride</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#1565C0" />
                  <span>Exclusive cosmetics &amp; bikes</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#1565C0" />
                  <span>Fast Squad processing</span>
                </li>
              </ul>
              <button onClick={() => handleTierSelect(5000)} className="tier-btn-select">
                Select 5000
              </button>
            </div>

            {/* ELITE PACK */}
            <div className="tier-plan-card">
              <span className="tier-tag elite">ELITE</span>
              <div className="tier-price">10000 ₦</div>
              <div className="tier-name-label">Elite Pack</div>
              <ul className="tier-perks-list">
                <li>
                  <CheckCircle2 size={16} color="#7B1FA2" />
                  <span>Session boost +50%</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#7B1FA2" />
                  <span>600 Carrot tokens per ride</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#7B1FA2" />
                  <span>VIP exclusive farm tracks</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#7B1FA2" />
                  <span>Priority transfer processing</span>
                </li>
              </ul>
              <button onClick={() => handleTierSelect(10000)} className="tier-btn-select">
                Select 10000
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION D: REWARDS AND WITHDRAWALS                          */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div id="rewards-info" className="rewards-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '2rem', color: '#174D2A', fontWeight: 700, marginBottom: '0.4rem' }}>
              Play, Participate &amp; Discover Rewards
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#546E7A', lineHeight: 1.6, maxWidth: '780px', margin: '0 auto' }}>
              Your next adventure could bring a new opportunity to progress!
              <br />
              Rabbit Ride to the Farm may offer real-money rewards to players who meet the requirements of eligible activities and the applicable reward program.
            </p>
          </div>

          <div style={{ background: '#F9FBF9', border: '1px solid #C8E6C9', borderRadius: '16px', padding: '1.5rem 1.75rem' }}>
            <p style={{ fontWeight: 700, color: '#1E3D27', fontSize: '1rem', marginBottom: '0.75rem' }}>
              Before participating, make sure you understand:
            </p>
            <ul className="rewards-checklist">
              <li>
                <CheckCircle2 size={18} color="#2D8A4E" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>Which activities qualify for rewards.</span>
              </li>
              <li>
                <CheckCircle2 size={18} color="#2D8A4E" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>How rewards are calculated and credited (Base rate: 1,000 Coins = ₦50).</span>
              </li>
              <li>
                <CheckCircle2 size={18} color="#2D8A4E" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>Any eligibility, verification, or minimum withdrawal requirements (Minimum withdrawal: ₦1,000).</span>
              </li>
              <li>
                <CheckCircle2 size={18} color="#2D8A4E" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>Applicable withdrawal fees, processing times, and payment methods (Processed directly to verified Nigerian bank accounts via Squad by GTCO).</span>
              </li>
              <li>
                <CheckCircle2 size={18} color="#2D8A4E" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span>Any additional conditions that apply to your account.</span>
              </li>
            </ul>

            <div style={{ background: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: '10px', padding: '0.85rem 1rem', marginTop: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#BF360C', lineHeight: 1.5 }}>
                Rewards are subject to the game's published terms and eligibility rules. Purchasing energy, tickets, or extra gameplay chances does not guarantee a reward, a specific income, or a successful withdrawal.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#174D2A', marginBottom: '1rem' }}>
              Play with a plan, understand the rules, and enjoy the adventure!
            </p>
            <button onClick={handlePlayNow} className="btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', margin: '0 auto' }}>
              <span>EXPLORE THE FARM</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION E: CALL TO ACTION                                   */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="cta-banner-box">
          <h2>Your Next Hop Starts Here!</h2>
          <p>
            Ready for more farming fun? Join Rabbit Ride to the Farm, explore the available activities, manage your resources, and discover what awaits you.
            When you'd like to extend your gameplay, check out the shop and choose from the available items.
            <br /><br />
            <strong>Your adventure. Your decisions. Your pace.</strong>
          </p>
          <button onClick={handlePlayNow} className="btn-primary" style={{ padding: '0.9rem 2.25rem', fontSize: '1.1rem', margin: '0 auto' }}>
            <span>ENTER THE FARM</span>
            <ArrowRight size={22} />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECTION F: IMPORTANT INFORMATION / DISCLAIMER               */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="disclaimer-section-box">
          <div className="disclaimer-header">
            <AlertTriangle size={20} color="#689F38" />
            <span>Important Information &amp; Disclaimer</span>
          </div>
          <p className="disclaimer-text">
            Rabbit Ride to the Farm is a game featuring optional in-game purchases and eligible reward or withdrawal features.
            In-game purchases provide the items or gameplay access described at checkout. They do not guarantee cash rewards, profits, or financial returns.
            Reward eligibility and withdrawals are governed by the applicable game rules. Please review the terms and conditions before making a purchase or participating in reward activities.
            <br />
            <strong>Play responsibly and only spend what you can afford.</strong>
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SECTION G: FOOTER                                           */}
      {/* ─────────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text">
            © 2026 Rabbit Ride to the Farm • Play Responsibly • Terms &amp; Rules • Privacy • Support
          </div>
          <div className="footer-links">
            <Link to="/play">Play Game</Link>
            <Link to="/shop">Farm Shop</Link>
            <Link to="/wallet">Wallet &amp; Rewards</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
