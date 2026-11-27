/**
 * UrbanPulse Unified API Configuration
 * Supports automatic localhost development and live production deployments (Render / Vercel).
 */
export const BACKEND_URL = (() => {
  // If explicitly configured in environment (.env or Vercel dashboard)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
  }
  return 'https://urban-pulse-88nq.onrender.com';
})();

export const API_BASE = (() => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return `${BACKEND_URL}/api`;
})();

export default API_BASE;
