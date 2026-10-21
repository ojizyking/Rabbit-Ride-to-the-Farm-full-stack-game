import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useClerk,
} from '@clerk/clerk-react';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();
  const { signOut: clerkSignOut } = useClerk();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rabbit_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isClerkUser, setIsClerkUser] = useState<boolean>(false);
  const [clerkSynced, setClerkSynced] = useState<boolean>(false);

  // ── Register Clerk token getter so api.ts can attach live JWTs ──────────────
  useEffect(() => {
    if (isSignedIn && getToken) {
      registerClerkTokenGetter(() => getToken({ template: 'default' }).catch(() => null));
    } else {
      clearClerkTokenGetter();
    }
  }, [isSignedIn, getToken]);

  // ── Sync Clerk session with our backend ─────────────────────────────────────
  const syncClerkUser = useCallback(async () => {
    if (!isSignedIn || !clerkUser || !clerkLoaded) return;

    setIsLoading(true);
    try {
      const clerkToken = await getToken({ template: 'default' });
      if (!clerkToken) return;

      // Temporarily store token so the api interceptor can use it
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
      console.error('Clerk sync failed — falling back to guest session:', err);
      // Allow play to continue even if sync fails
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, clerkUser, clerkLoaded, getToken]);

  // Auto-sync when Clerk session becomes available
  useEffect(() => {
    if (clerkLoaded && isSignedIn && !clerkSynced) {
      syncClerkUser();
    }

    // Clerk signed out — clear our state too
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

  // ── Legacy email/password: fetch profile on mount if token exists ────────────
  const fetchProfile = useCallback(async () => {
    // If Clerk is handling auth, skip legacy fetch
    if (isSignedIn) return;

    const currentToken = localStorage.getItem('rabbit_token');
    if (!currentToken) {
      setIsLoading(false);
      return;
    }

    // Handle offline session
    if (currentToken.startsWith('offline_')) {
      const saved = localStorage.getItem('rabbit_offline_user');
      if (saved) {
        try { setUser(JSON.parse(saved)); } catch { setUser(createLocalUser('farmer@rabbitride.com')); }
      }
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) setUser(res.data.user);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { status?: number } };
      if (errorResponse.response?.status === 401) {
        logout();
      } else {
        const saved = localStorage.getItem('rabbit_offline_user');
        if (saved) {
          try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clerkLoaded && !isSignedIn) {
      fetchProfile();
    }
  }, [clerkLoaded, isSignedIn, fetchProfile]);

  // ── Legacy login ─────────────────────────────────────────────────────────────
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
      const errorResponse = err as { response?: { data?: { message?: string } } };
      if (errorResponse.response?.data?.message) throw err;

      // Backend unreachable — resilient local session
      console.warn('Backend unreachable; initializing resilient local session for:', email);
      const localUser = createLocalUser(email);
      const mockToken = 'offline_' + btoa(JSON.stringify({ email, time: Date.now() }));
      localStorage.setItem('rabbit_token', mockToken);
      localStorage.setItem('rabbit_offline_user', JSON.stringify(localUser));
      setToken(mockToken);
      setUser(localUser);
      setAuthModalOpen(false);
    }
  };

  // ── Legacy register ──────────────────────────────────────────────────────────
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
      const errorResponse = err as { response?: { data?: { message?: string } } };
      if (errorResponse.response?.data?.message) throw err;

      console.warn('Backend unreachable; registering in resilient local session for:', email);
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
    try {
      await login(demoEmail, demoPass);
    } catch {
      await register(demoEmail, demoPass);
    }
  };

  const logout = () => {
    localStorage.removeItem('rabbit_token');
    localStorage.removeItem('rabbit_offline_user');
    setToken(null);
    setUser(null);
    setIsClerkUser(false);
    setClerkSynced(false);
    clearClerkTokenGetter();

    // Also sign out of Clerk if active
    if (isSignedIn) {
      clerkSignOut().catch(() => { /* ignore */ });
    }
  };

  const refreshUser = async () => {
    if (isSignedIn && clerkUser) {
      setClerkSynced(false); // triggers re-sync
    } else {
      await fetchProfile();
    }
  };

  const updateBalance = (newBalance: number) => {
    setUser((prev) => {
      if (!prev) {
        localStorage.setItem('rabbit_guest_balance', String(newBalance));
        return null;
      }
      const updated = { ...prev, balanceNaira: newBalance };
      if (!isClerkUser) {
        localStorage.setItem('rabbit_offline_user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => setAuthModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        authModalOpen,
        authMode,
        isClerkUser,
        login,
        register,
        quickDemoLogin,
        logout,
        refreshUser,
        updateBalance,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
