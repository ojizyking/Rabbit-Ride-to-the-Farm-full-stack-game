import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { registerClerkTokenGetter, clearClerkTokenGetter } from '../lib/api';

export interface RabbitItem {
  _id: string;
  name: string;
  priceNaira: number;
  speed: number;
  jump: number;
  stamina: number;
  grip: number;
  drift: number;
  imageUrl: string;
  description?: string;
}

export interface BicycleItem {
  _id: string;
  name: string;
  priceNaira: number;
  speed: number;
  stability: number;
  boost: number;
  imageUrl: string;
  description?: string;
}

export interface UserProfile {
  id: string;
  playerId?: string;
  email: string;
  role?: 'user' | 'admin';
  balanceNaira: number;
  totalRides: number;
  subscriptionTier: 'free' | 'basic' | 'growth' | 'pro' | 'elite';
  subscriptionExpiresAt: string | null;
  dailyRidesToday?: number;
  referralCode?: string;
  referredBy?: string;
  referralsCount?: number;
  referralEarnings?: number;
  currentRabbit?: RabbitItem;
  currentBike?: BicycleItem;
  ownedRabbits?: (string | RabbitItem)[];
  ownedBikes?: (string | BicycleItem)[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  authModalOpen: boolean;
  authMode: 'login' | 'register';
  isClerkUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, referralCode?: string) => Promise<void>;
  quickDemoLogin: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  customizeReferralCode: (code: string) => Promise<{ success: boolean; message: string; referralCode?: string }>;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

export const DEFAULT_STARTER_RABBIT: RabbitItem = {
  _id: 'rab_001',
  name: 'Starter White Rabbit',
  priceNaira: 0,
  speed: 10,
  jump: 10,
  stamina: 10,
  grip: 10,
  drift: 10,
  imageUrl: '/assets/rabbits/starter_rabbit.svg',
  description: 'A nimble white bunny ready to ride and explore.'
};

export const DEFAULT_STARTER_BIKE: BicycleItem = {
  _id: 'bike_001',
  name: 'Classic Yellow Bike',
  priceNaira: 0,
  speed: 10,
  stability: 10,
  boost: 10,
  imageUrl: '/assets/bikes/starter_bike.svg',
  description: 'Reliable yellow farm bicycle with sturdy wheels.'
};

/**
 * Creates a local offline user. Uses the last known server balance
 * (from rabbit_last_server_balance) instead of hardcoded ₦50 to prevent
 * balance resets when the server is temporarily unreachable.
 */
export function createLocalUser(email: string): UserProfile {
  // Use last known server balance, fallback to guest balance, then default ₦50
  const lastServerBalance = Number(localStorage.getItem('rabbit_last_server_balance') || 0);
  const guestBalance = Number(localStorage.getItem('rabbit_guest_balance') || 0);
  const startBalance = lastServerBalance > 0 ? lastServerBalance : (50 + guestBalance);

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 3; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));

  const DIVERSE_PREFIXES = [
    'RIDER', 'SWIFT', 'TURBO', 'CHAMP', 'DASH', 'FARM',
    'HOP', 'CARROT', 'ACE', 'SPEEDY', 'FLASH', 'VELO',
    'TRAIL', 'SPARK', 'BLAZE', 'STAR', 'ZOOM', 'HERO'
  ];

  let prefix = DIVERSE_PREFIXES[Math.floor(Math.random() * DIVERSE_PREFIXES.length)];
  if (email && email.includes('@')) {
    const raw = email.split('@')[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (raw.length >= 3 && !['ADMIN', 'USER', 'TEST', 'MAIL', 'GUEST', 'RABBIT'].includes(raw)) {
      prefix = raw.slice(0, 5);
    }
  }

  const generatedCode = `${prefix}-${rand}`;

  return {
    id: 'user_' + Date.now().toString(36),
    email: email.toLowerCase().trim(),
    role: (email.toLowerCase().includes('admin') ? 'admin' : 'user') as 'user' | 'admin',
    balanceNaira: startBalance,
    totalRides: 0,
    subscriptionTier: 'free',
    subscriptionExpiresAt: null,
    referralCode: generatedCode,
    referralsCount: 0,
    referralEarnings: 0,
    currentRabbit: DEFAULT_STARTER_RABBIT,
    currentBike: DEFAULT_STARTER_BIKE,
    ownedRabbits: [DEFAULT_STARTER_RABBIT],
    ownedBikes: [DEFAULT_STARTER_BIKE]
  };
}

/**
 * Queue a failed ride to localStorage for later sync with the server.
 */
export function queueOfflineRide(rideData: {
  coins: number;
  distance: number;
  stars: number;
  carrots: number;
  boxes: number;
  adViews: number;
}) {
  try {
    const queue = JSON.parse(localStorage.getItem('rabbit_offline_rides') || '[]');
    queue.push({
      ...rideData,
      timestamp: new Date().toISOString()
    });
    // Cap at 50 queued rides to prevent localStorage bloat
    localStorage.setItem('rabbit_offline_rides', JSON.stringify(queue.slice(-50)));
  } catch {
    // ignore storage errors
  }
}

/**
 * Drain the offline ride queue by syncing all buffered rides to the server.
 * Returns the new authoritative balance from the server.
 */
export async function syncOfflineRides(
  updateBalanceFn: (balance: number) => void
): Promise<void> {
  try {
    const queue = JSON.parse(localStorage.getItem('rabbit_offline_rides') || '[]');
    if (queue.length === 0) return;

    const res = await api.post('/game/sync-offline', { rides: queue });
    if (res.data.success) {
      localStorage.removeItem('rabbit_offline_rides');
      if (res.data.newBalance !== undefined) {
        updateBalanceFn(res.data.newBalance);
        localStorage.setItem('rabbit_last_server_balance', String(res.data.newBalance));
      }
      console.log(`✅ Synced ${res.data.ridesProcessed} offline ride(s), earned ₦${res.data.totalNairaEarned}`);
    }
  } catch (err) {
    // Queue stays — will retry on next login
    console.warn('Offline ride sync failed, will retry later:', err);
  }
}

/**
 * Cache the server's authoritative balance to localStorage.
 * This prevents createLocalUser from falling back to ₦50.
 */
export function cacheServerBalance(balance: number) {
  localStorage.setItem('rabbit_last_server_balance', String(balance));
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Shared login/register/logout logic (used by both providers) ──────────────
function useLegacyAuth(setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>,
  setToken: React.Dispatch<React.SetStateAction<string | null>>,
  setAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  updateBalanceFn: (b: number) => void) {

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('rabbit_token', res.data.token);
        localStorage.removeItem('rabbit_offline_user');
        setToken(res.data.token);
        setUser(res.data.user);
        // Cache the authoritative server balance
        cacheServerBalance(res.data.user.balanceNaira);
        setAuthModalOpen(false);
        // Sync any offline rides queued while server was unreachable
        syncOfflineRides(updateBalanceFn);
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

  const register = async (email: string, password: string, referralCode?: string) => {
    try {
      const code = referralCode || localStorage.getItem('rabbit_referral_code') || undefined;
      const res = await api.post('/auth/register', { email, password, referralCode: code });
      if (res.data.success) {
        localStorage.setItem('rabbit_token', res.data.token);
        localStorage.removeItem('rabbit_offline_user');
        localStorage.removeItem('rabbit_referral_code');
        setToken(res.data.token);
        setUser(res.data.user);
        // Cache the authoritative server balance
        cacheServerBalance(res.data.user.balanceNaira);
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
      localStorage.removeItem('rabbit_referral_code');
      setToken(mockToken);
      setUser(localUser);
      setAuthModalOpen(false);
    }
  };

  const quickDemoLogin = async () => {
    try { await login('rider@rabbitride.com', 'Ride2Farm!'); }
    catch { await register('rider@rabbitride.com', 'Ride2Farm!'); }
  };

  return { login, register, quickDemoLogin };
}

// ─── Legacy-only provider (no Clerk) ─────────────────────────────────────────
export const LegacyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rabbit_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const updateBalance = (newBalance: number) => {
    setUser((prev) => {
      if (!prev) { localStorage.setItem('rabbit_guest_balance', String(newBalance)); return null; }
      const updated = { ...prev, balanceNaira: newBalance };
      localStorage.setItem('rabbit_offline_user', JSON.stringify(updated));
      // Also cache as last known server balance to prevent ₦50 resets
      localStorage.setItem('rabbit_last_server_balance', String(newBalance));
      return updated;
    });
  };

  const { login, register, quickDemoLogin } = useLegacyAuth(setUser, setToken, setAuthModalOpen, updateBalance);

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
      if (res.data.success) {
        setUser(res.data.user);
        // Cache the server's authoritative balance
        cacheServerBalance(res.data.user.balanceNaira);
        // Sync any pending offline rides
        syncOfflineRides(updateBalance);
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 401) {
        localStorage.removeItem('rabbit_token');
        setToken(null);
        setUser(null);
      } else {
        const saved = localStorage.getItem('rabbit_offline_user');
        if (saved) { try { setUser(JSON.parse(saved)); } catch { /* ignore */ } }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const logout = () => {
    localStorage.removeItem('rabbit_token');
    localStorage.removeItem('rabbit_offline_user');
    // Note: We do NOT clear rabbit_last_server_balance or rabbit_offline_rides on logout
    // so offline earnings survive and will sync on next login
    setToken(null);
    setUser(null);
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
      user, token, isLoading, authModalOpen, authMode, isClerkUser: false,
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

// ─── Clerk-aware provider — imported as a lazy chunk from ClerkAuthProvider.tsx
// Only mounted when ClerkProvider is in the tree (main.tsx handles this)
const LazyClerkProvider = React.lazy(() =>
  import('./ClerkAuthProvider').then((m) => ({ default: m.ClerkAuthProvider }))
);

// ─── Public AuthProvider: auto-selects Clerk or Legacy ───────────────────────
const CLERK_KEY = (import.meta.env.CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) as string | undefined;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (CLERK_KEY) {
    return (
      <React.Suspense fallback={null}>
        <LazyClerkProvider>{children}</LazyClerkProvider>
      </React.Suspense>
    );
  }
  return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
