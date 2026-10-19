import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  quickDemoLogin: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rabbit_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch {
      // invalid token
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('rabbit_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setAuthModalOpen(false);
    }
  };

  const register = async (email: string, password: string) => {
    const res = await api.post('/auth/register', { email, password });
    if (res.data.success) {
      localStorage.setItem('rabbit_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setAuthModalOpen(false);
    }
  };

  const quickDemoLogin = async () => {
    const demoEmail = 'rider@rabbitride.com';
    const demoPass = 'Ride2Farm!';
    try {
      await login(demoEmail, demoPass);
    } catch {
      // If demo account doesn't exist yet, register it
      await register(demoEmail, demoPass);
    }
  };

  const logout = () => {
    localStorage.removeItem('rabbit_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  const updateBalance = (newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, balanceNaira: newBalance } : null));
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        authModalOpen,
        authMode,
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
