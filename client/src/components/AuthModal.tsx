import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

const CLERK_KEY = (import.meta.env.CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) as string | undefined;

export const AuthModal: React.FC = () => {
  const { authModalOpen, authMode, closeAuthModal, openAuthModal, login, register, quickDemoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLegacyForm, setShowLegacyForm] = useState(!CLERK_KEY); // show form immediately if no Clerk

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (authMode === 'login') await login(email, password);
      else await register(email, password);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        e.response?.data?.message ||
        (authMode === 'login' ? 'Invalid email or password.' : 'Registration failed. Try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try { await quickDemoLogin(); }
    catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Demo login failed.');
    } finally { setLoading(false); }
  };

  const clerkBtnBase: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    padding: '0.82rem 1rem',
    borderRadius: '14px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  // Lazy Clerk button wrapper — only rendered when Clerk key is present
  const ClerkButtons = CLERK_KEY ? React.lazy(() =>
    import('@clerk/clerk-react').then((m) => ({
      default: () => authMode === 'login' ? (
        <m.SignInButton mode="modal" fallbackRedirectUrl="/">
          <button
            style={{ ...clerkBtnBase, background: 'linear-gradient(135deg,#4285F4,#34A853)', color: '#fff', boxShadow: '0 4px 16px rgba(66,133,244,.35)' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <GoogleIcon /> Continue with Google
          </button>
        </m.SignInButton>
      ) : (
        <m.SignUpButton mode="modal" fallbackRedirectUrl="/">
          <button
            style={{ ...clerkBtnBase, background: 'linear-gradient(135deg,#4285F4,#34A853)', color: '#fff', boxShadow: '0 4px 16px rgba(66,133,244,.35)' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            <GoogleIcon /> Sign Up with Google
          </button>
        </m.SignUpButton>
      )
    }))
  ) : null;

  return (
    <div className="modal-overlay" onClick={closeAuthModal}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '95%' }}>
        <button className="modal-close-btn" onClick={closeAuthModal}><X size={18} /></button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', margin: '0 auto 0.75rem auto' }}>
            <img src="/assets/logo.svg" alt="Logo" style={{ width: '100%', height: '100%' }} />
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--green-dark)', fontWeight: 700 }}>
            {authMode === 'login' ? 'Welcome Back! 🐰' : 'Join the Farm Adventure 🌾'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.4rem' }}>
            {authMode === 'login'
              ? 'Sign in to save your coins, rides, and rewards.'
              : 'Create a free account and start earning today.'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Clerk Google button — only when key exists */}
          {CLERK_KEY && ClerkButtons && (
            <React.Suspense fallback={
              <div style={{ ...clerkBtnBase, background: '#f1f3f4', color: '#888', cursor: 'wait' }}>
                Loading Google Sign-In…
              </div>
            }>
              <ClerkButtons />
            </React.Suspense>
          )}

          {/* Quick Demo */}
          <button type="button" onClick={handleDemo} disabled={loading} className="btn-yellow"
            style={{ width: '100%', justifyContent: 'center', padding: '0.82rem' }}>
            <Sparkles size={18} />
            <span>⚡ Quick Demo — Play Instantly</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ margin: '1.2rem 0', textAlign: 'center', position: 'relative' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #ECEFF1' }} />
          <span style={{
            position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
            background: '#FFF', padding: '0 0.75rem', fontSize: '0.78rem', color: '#90A4AE', fontWeight: 600
          }}>
            OR USE EMAIL
          </span>
        </div>

        {/* Email/password toggle */}
        {!showLegacyForm ? (
          <button type="button" onClick={() => setShowLegacyForm(true)}
            style={{ width: '100%', padding: '0.7rem', borderRadius: '12px', border: '2px dashed #CFD8DC', background: 'transparent', color: '#546E7A', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer' }}>
            <Mail size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Sign {authMode === 'login' ? 'in' : 'up'} with Email &amp; Password
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', color: '#90A4AE' }} />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@rabbitride.com"
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '2px solid #CFD8DC', fontSize: '1rem' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', color: '#90A4AE' }} />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '2px solid #CFD8DC', fontSize: '1rem' }} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', padding: '0.8rem' }}>
              {authMode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              <span>{loading ? 'Please wait…' : authMode === 'login' ? 'Sign In to Ride' : 'Create Rider Account'}</span>
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: '#546E7A' }}>
          {authMode === 'login' ? (
            <span>Don't have an account?{' '}
              <button type="button" onClick={() => { openAuthModal('register'); setShowLegacyForm(!CLERK_KEY); }}
                style={{ background: 'none', color: 'var(--green)', fontWeight: 700, padding: 0 }}>Sign Up Now</button>
            </span>
          ) : (
            <span>Already have an account?{' '}
              <button type="button" onClick={() => { openAuthModal('login'); setShowLegacyForm(!CLERK_KEY); }}
                style={{ background: 'none', color: 'var(--green)', fontWeight: 700, padding: 0 }}>Sign In</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
    <path fill="#FFF" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
  </svg>
);

export default AuthModal;
