import React, { useState, Suspense, lazy } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, LogOut, Home, Gamepad2, HelpCircle, Award, ShoppingBag } from 'lucide-react';

const CLERK_KEY = (import.meta.env.CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) as string | undefined;

// Only import UserButton when Clerk is available
const ClerkUserButton = CLERK_KEY
  ? lazy(() => import('@clerk/clerk-react').then((m) => ({ default: m.UserButton })))
  : null;

export const Navbar: React.FC = () => {
  const { user, isClerkUser, openAuthModal, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="navbar">
        <Link to="/" className="nav-brand" onClick={closeMenu}>
          <div className="nav-logo-badge">
            <img src="/assets/logo.svg" alt="Rabbit Ride Logo" />
          </div>
          <span className="nav-title">Rabbit Ride</span>
        </Link>

        {/* Desktop nav links */}
        <nav>
          <ul className="nav-links">
            <li><Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>{user ? 'Dashboard' : 'Home'}</Link></li>
            <li><Link to="/play" className={`nav-link ${isActive('/play') ? 'active' : ''}`}>Play Game</Link></li>
            <li><a href="/#game-features" className="nav-link">Features</a></li>
            <li><a href="/#tiers" className="nav-link">Gameplay Packs</a></li>
            <li><Link to="/shop" className={`nav-link ${isActive('/shop') ? 'active' : ''}`}>Farm Shop</Link></li>
            <li><Link to="/wallet" className={`nav-link ${isActive('/wallet') ? 'active' : ''}`}>Wallet &amp; Rewards</Link></li>
          </ul>
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <Link to="/wallet" className="nav-wallet-chip" title="View Wallet & Rewards" onClick={closeMenu}>
                <span style={{ fontSize: '1.1rem' }}>🥕</span>
                <span>₦{user.balanceNaira.toLocaleString()}</span>
              </Link>
              <span className={`badge-tier ${user.subscriptionTier}`}>{user.subscriptionTier}</span>

              {isClerkUser && ClerkUserButton ? (
                <Suspense fallback={<div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e0e0' }} />}>
                  <ClerkUserButton
                    afterSignOutUrl="/"
                    appearance={{ elements: { avatarBox: { width: '36px', height: '36px', borderRadius: '50%' } } }}
                  />
                </Suspense>
              ) : (
                <button onClick={logout} className="hud-icon-btn" style={{ width: '36px', height: '36px' }} title="Sign Out">
                  <LogOut size={16} />
                </button>
              )}
            </>
          ) : (
            <button onClick={() => { openAuthModal('login'); closeMenu(); }} className="btn-primary">
              <Wallet size={18} />
              <span>Sign In / Join</span>
            </button>
          )}

          {/* Hamburger toggle - mobile only */}
          <button
            className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Mobile slide-down panel */}
      <div className={`mobile-nav-panel ${menuOpen ? 'open' : ''}`} role="navigation">
        <Link to="/" className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`} onClick={closeMenu}>
          <Home size={20} /> {user ? 'Dashboard' : 'Home'}
        </Link>
        <Link to="/play" className={`mobile-nav-link ${isActive('/play') ? 'active' : ''}`} onClick={closeMenu}>
          <Gamepad2 size={20} /> Play Game
        </Link>
        <a href="/#game-features" className="mobile-nav-link" onClick={closeMenu}>
          <HelpCircle size={20} /> Game Features
        </a>
        <a href="/#tiers" className="mobile-nav-link" onClick={closeMenu}>
          <Award size={20} /> Gameplay Packs
        </a>
        <Link to="/shop" className={`mobile-nav-link ${isActive('/shop') ? 'active' : ''}`} onClick={closeMenu}>
          <ShoppingBag size={20} /> Farm Shop
        </Link>
        <Link to="/wallet" className={`mobile-nav-link ${isActive('/wallet') ? 'active' : ''}`} onClick={closeMenu}>
          <Wallet size={20} /> Wallet &amp; Rewards
        </Link>

        <div className="mobile-nav-divider" />

        {user ? (
          <div className="mobile-nav-user-row">
            <div className="mobile-nav-wallet">
              <span>🥕</span>
              <span>₦{user.balanceNaira.toLocaleString()}</span>
              <span className={`badge-tier ${user.subscriptionTier}`} style={{ display: 'inline-flex' }}>
                {user.subscriptionTier}
              </span>
            </div>
            {isClerkUser && ClerkUserButton ? (
              <Suspense fallback={null}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ClerkUserButton afterSignOutUrl="/" />
                  <span style={{ fontSize: '0.85rem', color: '#546E7A' }}>Manage Account</span>
                </div>
              </Suspense>
            ) : (
              <button onClick={() => { logout(); closeMenu(); }} className="mobile-logout-btn">Sign Out</button>
            )}
          </div>
        ) : (
          <button
            onClick={() => { openAuthModal('login'); closeMenu(); }}
            className="btn-primary"
            style={{ justifyContent: 'center', marginTop: '0.5rem' }}
          >
            <Wallet size={18} /> Sign In / Join
          </button>
        )}
      </div>

      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.2)' }}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Navbar;
