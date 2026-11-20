import axios from 'axios';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // When running on same-origin (Railway or Render serving both frontend+backend),
    // use relative '/api' to avoid cross-origin preflights and CORS latency
    if (
      window.location.hostname.endsWith('railway.app') ||
      window.location.hostname.endsWith('onrender.com') ||
      window.location.hostname.endsWith('vercel.app') ||
      window.location.hostname === 'rabbitride.tech' ||
      window.location.hostname === 'www.rabbitride.tech' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      return '/api';
    }
  }
  return (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : 'https://rabbit-ride-backend.onrender.com/api')
  );
}

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 12000
});

// ─── Clerk token getter (registered by AuthContext on mount) ──────────────────
type AsyncTokenGetter = () => Promise<string | null>;
let _clerkTokenGetter: AsyncTokenGetter | null = null;

export function registerClerkTokenGetter(getter: AsyncTokenGetter) {
  _clerkTokenGetter = getter;
}

export function clearClerkTokenGetter() {
  _clerkTokenGetter = null;
}
// ─────────────────────────────────────────────────────────────────────────────

// Attach token to every request — check backend token first, then fallback to Clerk token
api.interceptors.request.use(
  async (config) => {
    // 1. Try backend JWT token first (guaranteed valid for backend endpoints)
    const token = localStorage.getItem('rabbit_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    }

    // 2. Fall back to live Clerk session token if available
    if (_clerkTokenGetter) {
      try {
        const clerkToken = await _clerkTokenGetter();
        if (clerkToken) {
          config.headers.Authorization = `Bearer ${clerkToken}`;
          return config;
        }
      } catch {
        // ignore
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Authentication token invalid or expired.');
    }
    return Promise.reject(error);
  }
);

// ─── Typed API helpers ────────────────────────────────────────────────────────

export interface FarmPack {
  packId: string;
  name: string;
  priceNaira: number;
  playCoinsGranted: number;
  boostPct: number;
  durationDays: number;
  dailyCapNaira: number;
  lifetimeMaxNaira: number;
}

export interface ActivePack extends FarmPack {
  packName: string;
  purchasedAt: string;
  expiresAt: string;
  lifetimeEarnedNaira: number;
  daysLeft: number;
  canEarnMore: boolean;
  status: 'active' | 'expired';
}

export interface DailyStatus {
  dailyCoinsEarned: number;
  dailyAdCoinsEarned: number;
  dailyAdsWatched: number;
  adsRemainingToday: number;
  gameCapCoins: number;
  adCapCoins: number;
  totalDailyCoins: number;
  boostPct: number;
  packDailyCapNaira: number;
  activePacks: ActivePack[];
  balanceNaira: number;
  withdrawableNaira: number;
  coinExpiresAt: string | null;
}

/** GET /api/shop/packs */
export const fetchPacks = () => api.get<{ success: boolean; packs: FarmPack[] }>('/shop/packs');

/** GET /api/shop/my-packs */
export const fetchMyPacks = () => api.get<{ success: boolean; activePacks: ActivePack[] }>('/shop/my-packs');

/** POST /api/shop/buy-pack */
export const initPackPurchase = (packId: string) =>
  api.post<{ success: boolean; authorization_url: string; checkout_url: string; reference: string }>('/shop/buy-pack', { packId });

/** POST /api/shop/verify-pack */
export const verifyPackPurchase = (reference: string) =>
  api.post<{ success: boolean; message: string; activePacks: ActivePack[] }>('/shop/verify-pack', { reference });

/** GET /api/game/daily-status */
export const fetchDailyStatus = () => api.get<DailyStatus>('/game/daily-status');

/** POST /api/wallet/withdraw */
export const submitWithdrawal = (payload: {
  method: 'bank' | 'airtime';
  amount: number;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  phoneNumber?: string;
}) => api.post('/wallet/withdraw', payload);

export default api;
