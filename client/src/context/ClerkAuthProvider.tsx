/**
 * ClerkAuthProvider — only imported when VITE_CLERK_PUBLISHABLE_KEY is set.
 * This file is lazy-loaded so Clerk hooks are never called outside ClerkProvider.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from '@clerk/clerk-react';
import api, { registerClerkTokenGetter, clearClerkTokenGetter } from '../lib/api';
import { AuthContext, LegacyAuthProvider, createLocalUser, cacheServerBalance, syncOfflineRides } from './AuthContext';
import type { UserProfile, RabbitItem, BicycleItem } from './AuthContext';

export const ClerkAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clerk hooks — safe here because this component is only mounted inside <ClerkProvider>
  const { isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();
  const { signOut: clerkSignOut } = useClerk();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rabbit_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isClerkUser, setIsClerkUser] = useState(false);
  const [clerkSynced, setClerkSynced] = useState(false);

  const updateBalance = (newBalance: number) => {
    setUser((prev) => {
      if (!prev) { localStorage.setItem('rabbit_guest_balance', String(newBalance)); return null; }
      const updated = { ...prev, balanceNaira: newBalance };
      if (!isClerkUser) localStorage.setItem('rabbit_offline_user', JSON.stringify(updated));
      // Always cache the latest balance to prevent ₦50 resets
      localStorage.setItem('rabbit_last_server_balance', String(newBalance));
      return updated;
    });
  };

  // Register Clerk token getter for api.ts interceptor
  useEffect(() => {
    if (isSignedIn && getToken) {
      registerClerkTokenGetter(() => getToken({ template: 'default' }).catch(() => null));
    } else {
      clearClerkTokenGetter();
    }
  }, [isSignedIn, getToken]);

  // Sync Clerk session with our backend
  const syncClerkUser = useCallback(async () => {
    if (!isSignedIn || !clerkUser || !clerkLoaded) return;
    setIsLoading(true);
    try {
      const clerkToken = await getToken({ template: 'default' });
      if (!clerkToken) return;

      localStorage.setItem('rabbit_token', clerkToken);
      setToken(clerkToken);

      const guestBalance = Number(localStorage.getItem('rabbit_guest_balance') || 0);
      const referralCode = localStorage.getItem('rabbit_referral_code') || undefined;
      const res = await api.post('/auth/clerk-sync', {
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        firstName: clerkUser.firstName ?? '',
        avatarUrl: clerkUser.imageUrl ?? '',
        guestBalance,
        referralCode
      });

      if (res.data.success) {
        setUser(res.data.user);
        // Cache server's authoritative balance
        cacheServerBalance(res.data.user.balanceNaira);
        if (res.data.token) {
          localStorage.setItem('rabbit_token', res.data.token);
          setToken(res.data.token);
        }
        setIsClerkUser(true);
        setClerkSynced(true);
        localStorage.removeItem('rabbit_guest_balance');
        localStorage.removeItem('rabbit_offline_user');
        localStorage.removeItem('rabbit_referral_code');
        setAuthModalOpen(false);
        // Sync any offline rides queued while server was unreachable
        syncOfflineRides(updateBalance);
      }
    } catch (err) {
      console.error('Clerk sync failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, clerkUser, clerkLoaded, getToken]);

  useEffect(() => {
    if (clerkLoaded && isSignedIn && !clerkSynced) {
      syncClerkUser();
    }
    if (clerkLoaded && !isSignedIn && isClerkUser) {
      setUser(null);
      setToken(null);
      setIsClerkUser(false);
      setClerkSynced(false);
      localStorage.removeItem('rabbit_token');
      localStorage.removeItem('rabbit_offline_user');
      setIsLoading(false);
    }
  }, [clerkLoaded, isSignedIn, clerkSynced, isClerkUser, syncClerkUser]);

  // Fetch profile when loaded or refreshed
  const fetchProfile = useCallback(async () => {
    const currentToken = localStorage.getItem('rabbit_token');
    if (!currentToken) { setIsLoading(false); return; }

    if (currentToken.startsWith('offline_')) {
      const saved = localStorage.getItem('rabbit_offline_user');
      try { setUser(saved ? JSON.parse(saved) : createLocalUser('farmer@rabbitride.com')); }
      catch { setUser(createLocalUser('farmer@rabbitride.com')); }
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
        // Cache server's authoritative balance
        cacheServerBalance(res.data.user.balanceNaira);
        // Sync any pending offline rides
        syncOfflineRides(updateBalance);
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 401) {
        if (!isSignedIn) logout();
      } else {
        const saved = localStorage.getItem('rabbit_offline_user');
        if (saved) { try { setUser(JSON.parse(saved)); } catch { /* ignore */ } }
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  useEffect(() => {
    if (clerkLoaded && !isSignedIn) fetchProfile();
  }, [clerkLoaded, isSignedIn, fetchProfile]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('rabbit_token', res.data.token);
        localStorage.removeItem('rabbit_offline_user');
        setToken(res.data.token);
        setUser(res.data.user);
        // Cache server's authoritative balance
        cacheServerBalance(res.data.user.balanceNaira);
        setAuthModalOpen(false);
        // Sync any offline rides
        syncOfflineRides(updateBalance);
        return;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      if (e.response?.data?.message) {
        throw new Error(e.response.data.message);
      }
      throw new Error(e.message || 'Cannot connect to game server. Please ensure the backend is running.');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/register', { email, password });
      if (res.data.success) {
        localStorage.setItem('rabbit_token', res.data.token);
        localStorage.removeItem('rabbit_offline_user');
        setToken(res.data.token);
        setUser(res.data.user);
        // Cache server's authoritative balance
        cacheServerBalance(res.data.user.balanceNaira);
        setAuthModalOpen(false);
        return;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      if (e.response?.data?.message) {
        throw new Error(e.response.data.message);
      }
      throw new Error(e.message || 'Cannot connect to game server to register account. Please check your connection.');
    }
  };

  const quickDemoLogin = async () => {
    try {
      await login('rider@rabbitride.com', 'Ride2Farm!');
    } catch {
      try {
        await register('rider@rabbitride.com', 'Ride2Farm!');
      } catch {
        const localUser = createLocalUser('rider@rabbitride.com');
        const mockToken = 'offline_' + btoa(JSON.stringify({ email: 'rider@rabbitride.com', time: Date.now() }));
        localStorage.setItem('rabbit_token', mockToken);
        localStorage.setItem('rabbit_offline_user', JSON.stringify(localUser));
        setToken(mockToken);
        setUser(localUser);
        setAuthModalOpen(false);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('rabbit_token');
    localStorage.removeItem('rabbit_offline_user');
    localStorage.removeItem('rabbit_last_server_balance');
    localStorage.removeItem('rabbit_guest_balance');
    setToken(null);
    setUser(null);
    setIsClerkUser(false);
    setClerkSynced(false);
    clearClerkTokenGetter();
    if (isSignedIn) clerkSignOut().catch(() => { /* ignore */ });
  };

  const customizeReferralCode = async (code: string) => {
    try {
      let res;
      try {
        res = await api.post('/auth/customize-referral-code', { customCode: code });
      } catch (postErr: unknown) {
        const pe = postErr as { response?: { status?: number } };
        if (pe.response?.status === 405 || pe.response?.status === 404) {
          try {
            res = await api.put('/auth/customize-referral-code', { customCode: code });
          } catch (putErr: unknown) {
            const pue = putErr as { response?: { status?: number } };
            if (pue.response?.status === 405 || pue.response?.status === 404) {
              res = await api.patch('/auth/customize-referral-code', { customCode: code });
            } else {
              throw putErr;
            }
          }
        } else {
          throw postErr;
        }
      }
      const clean = code.trim().toUpperCase();
      if (res && res.data.success) {
        const newCode = res.data.referralCode || clean;
        setUser((prev) => {
          if (!prev) return null;
          const updated = { ...prev, referralCode: newCode };
          localStorage.setItem('rabbit_offline_user', JSON.stringify(updated));
          return updated;
        });
        return { success: true, message: res.data.message || 'Referral code customized successfully!', referralCode: newCode };
      }
      return { success: false, message: res?.data?.message || 'Failed to update code' };
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const msg = e.response?.data?.message || e.message || 'Unable to save referral code to server. Please try again.';
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, authModalOpen, authMode, isClerkUser,
      login, register, quickDemoLogin, logout,
      refreshUser: fetchProfile,
      updateBalance,
      customizeReferralCode,
      openAuthModal: (mode = 'login') => { setAuthMode(mode); setAuthModalOpen(true); },
      closeAuthModal: () => setAuthModalOpen(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
};
