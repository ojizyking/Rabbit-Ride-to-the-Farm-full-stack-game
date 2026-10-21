import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

// Attach token to every request — Clerk JWT takes priority over legacy localStorage token
api.interceptors.request.use(
  async (config) => {
    // 1. Try live Clerk session token first
    if (_clerkTokenGetter) {
      try {
        const clerkToken = await _clerkTokenGetter();
        if (clerkToken) {
          config.headers.Authorization = `Bearer ${clerkToken}`;
          return config;
        }
      } catch {
        // fall through to legacy token
      }
    }

    // 2. Fall back to legacy localStorage token (email/password flow)
    const token = localStorage.getItem('rabbit_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
