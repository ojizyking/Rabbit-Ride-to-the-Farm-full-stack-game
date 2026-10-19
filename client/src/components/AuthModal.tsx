import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, authMode, closeAuthModal, openAuthModal, login, register, quickDemoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await quickDemoLogin();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeAuthModal}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={closeAuthModal}>
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', margin: '0 auto 0.75rem auto' }}>
            <img src="/assets/logo.svg" alt="Logo" style={{ width: '100%', height: '100%' }} />
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--green-dark)', fontWeight: 700 }}>
            {authMode === 'login' ? 'Welcome Back!' : 'Start Riding & Earning'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {authMode === 'login'
              ? 'Enter your credentials to hop back on your bike'
              : 'Create your account and claim your ₦50 welcome bonus!'}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#FFEBEE',
              border: '1px solid #FFCDD2',
              color: '#C62828',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              fontWeight: 500
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', color: '#90A4AE' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@rabbitride.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  border: '2px solid #CFD8DC',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', color: '#90A4AE' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  border: '2px solid #CFD8DC',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.8rem' }}
          >
            {authMode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>{loading ? 'Please wait...' : authMode === 'login' ? 'Sign In to Ride' : 'Create Rider Account'}</span>
          </button>
        </form>

        <div style={{ margin: '1.25rem 0', textAlign: 'center', position: 'relative' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #ECEFF1' }} />
          <span
            style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#FFF',
              padding: '0 0.75rem',
              fontSize: '0.8rem',
              color: '#90A4AE',
              fontWeight: 600
            }}
          >
            OR TEST WITH ONE CLICK
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemo}
          disabled={loading}
          className="btn-yellow"
          style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
        >
          <Sparkles size={18} />
          <span>Quick Demo Rider Login</span>
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: '#546E7A' }}>
          {authMode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                style={{ background: 'none', color: 'var(--green)', fontWeight: 700, padding: 0 }}
              >
                Sign Up Now
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                style={{ background: 'none', color: 'var(--green)', fontWeight: 700, padding: 0 }}
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
