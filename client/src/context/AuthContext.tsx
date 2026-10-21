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
  email: string;
  balanceNaira: number;
  totalRides: number;
  subscriptionTier: 'free' | 'basic' | 'growth' | 'pro' | 'elite';
  subscriptionExpiresAt: string | null;
  dailyRidesToday?: number;
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
  register: (email: string, password: string) => Promise<void>;
  quickDemoLogin: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const DEFAULT_STARTER_RABBIT: RabbitItem = {
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

const DEFAULT_STARTER_BIKE: BicycleItem = {
  _id: 'bike_001',
  name: 'Classic Yellow Bike',
  priceNaira: 0,
  speed: 10,
  stability: 10,
  boost: 10,
  imageUrl: '/assets/bikes/starter_bike.svg',
  description: 'Reliable yellow farm bicycle with sturdy wheels.'
};

function createLocalUser(email: string): UserProfile {
  const guestBalance = Number(localStorage.getItem('rabbit_guest_balance') || 0);
  return {
    id: 'user_' + Date.now().toString(36),
    email: email.toLowerCase().trim(),
    balanceNaira: 50 + guestBalance,
    totalRides: 0,
    subscriptionTier: 'free',
    subscriptionExpiresAt: null,
    currentRabbit: DEFAULT_STARTER_RABBIT,
    currentBike: DEFAULT_STARTER_BIKE,
    ownedRabbits: [DEFAULT_STARTER_RABBIT],
    ownedBikes: [DEFAULT_STARTER_BIKE]
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Clerk-aware inner provider (only rendered when ClerkProvider is present) ─
const ClerkBridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Dynamically import Clerk hooks — safe because this component is only
  // mounted when ClerkProvider wraps the tree (see AuthProvider below)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAuth: useClerkAuth, useUser: useClerkUser, useClerk } = require('@clerk/clerk-react');
  const { isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();
  const { signOut: clerkSignOut } = useClerk();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rabbit_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isClerkUser, setIsClerkUserFlag] = useState<boolean>(false);
  const [clerkSynced, setClerkSynced] = useState<boolean>(false);

  // Register Clerk token getter for api.ts
  useEffect(() => {
    if (isSignedIn && getToken) {
      registerClerkTokenGetter(() =>
        getToken({ template: 'default' }).catch(() => null)
      );
    } else {
      clearClerkTokenGetter();
    }
  }, [isSignedIn, getToken]);

  // Sync Clerk user with backend
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
        setIsClerkUserFlag(true);
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
      setIsClerkUserFlag(false);
      setClerkSynced(false);
      localStorage.removeItem('rabbit_token');
      localStorage.removeItem('rabbit_offline_user');
      setIsLoading(false);
    }
  }, [clerkLoaded, isSignedIn, clerkSynced, isClerkUser, syncClerkUser]);

  // Legacy profile fetch (only when not signed in via Clerk)
  const fetchProfile = useCallback(async () => {
    if (isSignedIn) return;
    const currentToken = localStorage.getItem('rabbit_token');
    if (!currentToken) { setIsLoading(false); return; }

    if (currentToken.startsWith('offline_')) {
      const saved = localStorage.getItem('rabbit_offline_user');
      if (saved) { try { setUser(JSON.parse(saved)); } catch { setUser(createLocalUser('farmer@rabbitride.com')); } }
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
    const demoEmail = 'rider@rabbitride.com';
    const demoPass = 'Ride2Farm!';
    try { await login(demoEmail, demoPass); } catch { await register(demoEmail, demoPass); }
  };

  const logout = () => {
    localStorage.removeItem('rabbit_token');
    localStorage.removeItem('rabbit_offline_user');
    setToken(null);
    setUser(null);
    setIsClerkUserFlag(false);
    setClerkSynced(false);
    clearClerkTokenGetter();
    if (isSignedIn) clerkSignOut().catch(() => { /* ignore */ });
  };

  const refreshUser = async () => {
    if (isSignedIn && clerkUser) { setClerkSynced(false); }
    else { await fetchProfile(); }
  };

  const updateBalance = (newBalance: number) => {
    setUser((prev) => {
      if (!prev) { localStorage.setItem('rabbit_guest_balance', String(newBalance)); return null; }
      const updated = { ...prev, balanceNaira: newBalance };
      if (!isClerkUser) localStorage.setItem('rabbit_offline_user', JSON.stringify(updated));
      return updated;
    });
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => { setAuthMode(mode); setAuthModalOpen(true); };
  const closeAuthModal = () => setAuthModalOpen(false);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, authModalOpen, authMode, isClerkUser,
      login, register, quickDemoLogin, logout, refreshUser, updateBalance,
      openAuthModal, closeAuthModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Legacy-only provider (no Clerk) ─────────────────────────────────────────
const LegacyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rabbit_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const fetchProfile = async () => {
    const currentToken = localStorage.getItem('rabbit_token');
    if (!currentToken) { setIsLoading(false); return; }

    if (currentToken.startsWith('offline_')) {
      const saved = localStorage.getItem('rabbit_offline_user');
      if (saved) { try { setUser(JSON.parse(saved)); } catch { setUser(createLocalUser('farmer@rabbitride.com')); } }
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
  };

  useEffect(() => { fetchProfile(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

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
  };

  const refreshUser = async () => { await fetchProfile(); };

  const updateBalance = (newBalance: number) => {
    setUser((prev) => {
      if (!prev) { localStorage.setItem('rabbit_guest_balance', String(newBalance)); return null; }
      const updated = { ...prev, balanceNaira: newBalance };
      localStorage.setItem('rabbit_offline_user', JSON.stringify(updated));
      return updated;
    });
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => { setAuthMode(mode); setAuthModalOpen(true); };
  const closeAuthModal = () => setAuthModalOpen(false);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, authModalOpen, authMode, isClerkUser: false,
      login, register, quickDemoLogin, logout, refreshUser, updateBalance,
      openAuthModal, closeAuthModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Public AuthProvider: auto-selects Clerk or Legacy ───────────────────────
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (CLERK_KEY) {
    return <ClerkBridgeProvider>{children}</ClerkBridgeProvider>;
  }
  return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
