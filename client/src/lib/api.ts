import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

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

export default api;
