/**
 * ClerkAuthProvider — only imported when VITE_CLERK_PUBLISHABLE_KEY is set.
 * This file is lazy-loaded so Clerk hooks are never called outside ClerkProvider.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from '@clerk/clerk-react';
import api, { registerClerkTokenGetter, clearClerkTokenGetter } from '../lib/api';
import { AuthContext, LegacyAuthProvider } from './AuthContext';
import type { UserProfile, RabbitItem, BicycleItem } from './AuthContext';

function createLocalUser(email: string): UserProfile {
  const guestBalance = Number(localStorage.getItem('rabbit_guest_balance') || 0);
  return {
    id: 'user_' + Date.now().toString(36),
    email: email.toLowerCase().trim(),
    balanceNaira: 50 + guestBalance,
    totalRides: 0,
    subscriptionTier: 'free',
    subscriptionExpiresAt: null,
    currentRabbit: { _id: 'rab_001', name: 'Starter White Rabbit', priceNaira: 0, speed: 10, jump: 10, stamina: 10, grip: 10, drift: 10, imageUrl: '/assets/rabbits/starter_rabbit.svg' } as RabbitItem,
    currentBike: { _id: 'bike_001', name: 'Classic Yellow Bike', priceNaira: 0, speed: 10, stability: 10, boost: 10, imageUrl: '/assets/bikes/starter_bike.svg' } as BicycleItem,
  };
}

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
      const res = await api.post('/auth/clerk-sync', {
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        firstName: clerkUser.firstName ?? '',
        avatarUrl: clerkUser.imageUrl ?? '',
        guestBalance
      });

      if (res.data.success) {
        setUser(res.data.user);
        setIsClerkUser(true);
        setClerkSynced(true);
        localStorage.removeItem('rabbit_guest_balance');
        localStorage.removeItem('rabbit_offline_user');
        setAuthModalOpen(false);
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

  // Fetch legacy profile when not signed in via Clerk
  const fetchProfile = useCallback(async () => {
    if (isSignedIn) return;
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
      if (res.data.success) setUser(res.data.user);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 401) { logout(); }
      else {
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
        setAuthModalOpen(false);
        return;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) throw err;
      const localUser = createLocalUser(email);
      const mockToken = 'offline_' + btoa(JSON.stringify({ email, time: Date.now() }));
      localStorage.setItem('rabbit_token', mockToken);
      localStorage.setItem('rabbit_offline_user', JSON.stringify(localUser));
      setToken(mockToken);
      setUser(localUser);
      setAuthModalOpen(false);
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
        setAuthModalOpen(false);
        return;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) throw err;
      const localUser = createLocalUser(email);
      const mockToken = 'offline_' + btoa(JSON.stringify({ email, time: Date.now() }));
      localStorage.setItem('rabbit_token', mockToken);
      localStorage.setItem('rabbit_offline_user', JSON.stringify(localUser));
      setToken(mockToken);
      setUser(localUser);
      setAuthModalOpen(false);
    }
  };

  const quickDemoLogin = async () => {
    try { await login('rider@rabbitride.com', 'Ride2Farm!'); }
    catch { await register('rider@rabbitride.com', 'Ride2Farm!'); }
  };

  const logout = () => {
    localStorage.removeItem('rabbit_token');
    localStorage.removeItem('rabbit_offline_user');
    setToken(null);
    setUser(null);
    setIsClerkUser(false);
    setClerkSynced(false);
    clearClerkTokenGetter();
    if (isSignedIn) clerkSignOut().catch(() => { /* ignore */ });
  };

  const updateBalance = (newBalance: number) => {
    setUser((prev) => {
      if (!prev) { localStorage.setItem('rabbit_guest_balance', String(newBalance)); return null; }
      const updated = { ...prev, balanceNaira: newBalance };
      if (!isClerkUser) localStorage.setItem('rabbit_offline_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, authModalOpen, authMode, isClerkUser,
      login, register, quickDemoLogin, logout,
      refreshUser: fetchProfile,
      updateBalance,
      openAuthModal: (mode = 'login') => { setAuthMode(mode); setAuthModalOpen(true); },
      closeAuthModal: () => setAuthModalOpen(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
};
