import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import api from '../lib/api';

const ADMIN_EMAILS = ['etizzer@gmail.com', 'admin@rabbitride.farm', 'admin@farm.com'];

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already have a valid admin session, redirect immediately
  useEffect(() => {
    const existingToken = localStorage.getItem('rabbit_token');
    if (!existingToken || existingToken.startsWith('offline_')) return;

    // Try to verify the existing token against the server
    api.get('/auth/me')
      .then(res => {
        if (res.data?.success && res.data?.user) {
          const u = res.data.user;
          const emailIsAdmin = ADMIN_EMAILS.includes((u.email || '').toLowerCase().trim());
          if (u.role === 'admin' || emailIsAdmin) {
            navigate('/admin', { replace: true });
          }
        }
      })
      .catch(() => {
        // Token invalid — clear it and show the login form
        localStorage.removeItem('rabbit_token');
      });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: cleanEmail, password });

      if (res.data?.success && res.data?.user) {
        const u = res.data.user;
        const emailIsAdmin = ADMIN_EMAILS.includes((u.email || '').toLowerCase().trim());

        if (u.role !== 'admin' && !emailIsAdmin) {
          setError('This account does not have administrator privileges.');
          setLoading(false);
          return;
        }

        // If Clerk has an active non-admin session, sign out of Clerk so it doesn't conflict
        try {
          const clerk = (window as unknown as { Clerk?: { session?: unknown; signOut: () => Promise<void> } }).Clerk;
          if (clerk?.session && typeof clerk.signOut === 'function') {
            await clerk.signOut();
          }
        } catch {
          // ignore
        }

        // Store the fresh token and force-clear any stale user cache
        localStorage.setItem('rabbit_token', res.data.token);
        localStorage.removeItem('rabbit_offline_user');
        localStorage.setItem('rabbit_last_server_balance', String(u.balanceNaira || 0));

        // Direct hard reload to /admin so all context states reinitialize cleanly
        window.location.href = '/admin';
      } else {
        setError(res.data?.message || 'Login failed. Please try again.');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Cannot reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '2rem',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
          }}>
            <ShieldCheck size={36} color="#fff" />
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Admin Mission Control
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Sign in with your administrator credentials
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
            lineHeight: 1.5
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="etizzer@gmail.com"
              autoComplete="email"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Admin password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 1rem',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  color: '#f1f5f9',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.95rem',
              background: loading
                ? 'rgba(99,102,241,0.4)'
                : 'linear-gradient(135deg, #3b82f6, #6366f1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              transition: 'opacity 0.2s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)'
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Verifying…
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign in to Mission Control
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <a href="/" style={{ color: '#475569', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Return to Game
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
};

export default AdminLogin;
