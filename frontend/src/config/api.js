/**
 * UrbanPulse Unified API Configuration
 * Live Production Backend: https://urban-pulse-88nq.onrender.com
 */
export const BACKEND_URL = 'https://urban-pulse-88nq.onrender.com';

export const API_BASE = (() => {
  // If explicitly defined in environment (.env or Vercel dashboard)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return `${BACKEND_URL}/api`;
})();

export default API_BASE;
