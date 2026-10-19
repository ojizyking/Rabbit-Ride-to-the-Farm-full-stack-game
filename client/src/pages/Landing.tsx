import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Bike, Wallet, ArrowRight, Zap, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
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
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-text-content">
            <h1 className="hero-title">Ride to the Farm &amp; Earn!</h1>
            <p className="hero-description">
              Hop on your bike, ride through the farm, collect rewards, and withdraw real earnings. A fun
              play-to-earn adventure for everyone.
            </p>

            <div className="hero-actions">
              <button onClick={handlePlayNow} className="btn-primary hero-btn-play">
                <span>Play Now</span>
                <ArrowRight size={22} />
              </button>
              <a href="#how-it-works" className="hero-btn-learn">
                Learn More
              </a>
            </div>

            <div className="hero-tags">
              <span>• Play-to-Earn</span>
              <span>• Secure</span>
              <span>• Instant Withdrawals</span>
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

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="how-section">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Get started in 3 simple steps</p>
        </div>

        <div className="steps-grid">
          {/* Step 1 */}
          <div className="step-card">
            <div className="step-icon-badge orange">
              <ClipboardList size={28} />
            </div>
            <h3 className="step-number-title">1. Register</h3>
            <p className="step-text">
              Create your account in seconds and connect your wallet to start your journey. Get a ₦50 welcome bonus
              instantly!
            </p>
          </div>

          {/* Step 2 */}
          <div className="step-card">
            <div className="step-icon-badge green">
              <Bike size={28} />
            </div>
            <h3 className="step-number-title">2. Ride &amp; Collect</h3>
            <p className="step-text">
              Ride your bike through farm tracks, perform 360° stunt loops, collect carrots, stars, and mystery crates.
              Convert 1,000 Coins = ₦100 real cash with tier multipliers!
            </p>
          </div>

          {/* Step 3 */}
          <div className="step-card">
            <div className="step-icon-badge yellow">
              <Wallet size={28} />
            </div>
            <h3 className="step-number-title">3. Withdraw</h3>
            <p className="step-text">
              Cash out your earnings directly to any Nigerian bank account via Paystack instant automated transfers.
            </p>
          </div>
        </div>

        {/* SUBSCRIPTION TIERS SECTION */}
        <div id="tiers" className="tiers-container">
          <div className="tiers-header">
            <h3>Subscription Tiers</h3>
            <p>Choose your plan and boost your earning potential</p>
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
                  <span>Daily rewards boost +10%</span>
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
                  <span>Daily rewards boost +5%</span>
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
                  <span>Daily rewards boost +25%</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#1565C0" />
                  <span>300 Carrot tokens per ride</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#1565C0" />
                  <span>Premium rewards &amp; NFTs</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#1565C0" />
                  <span>Priority Paystack withdrawals</span>
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
                  <span>Daily rewards boost +50%</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#7B1FA2" />
                  <span>600 Carrot tokens per ride</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#7B1FA2" />
                  <span>VIP airdrops &amp; exclusive farms</span>
                </li>
                <li>
                  <CheckCircle2 size={16} color="#7B1FA2" />
                  <span>Zero fee instant cashouts</span>
                </li>
              </ul>
              <button onClick={() => handleTierSelect(10000)} className="tier-btn-select">
                Select 10000
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text">
            © 2026 Rabbit Ride to the Farm • Play Responsibly • Terms • Privacy • Support
          </div>
          <div className="footer-links">
            <Link to="/play">Play Game</Link>
            <Link to="/shop">Shop Upgrades</Link>
            <Link to="/wallet">Wallet &amp; Withdraw</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
