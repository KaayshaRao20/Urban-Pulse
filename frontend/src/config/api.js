/**
 * UrbanPulse Unified API Configuration
 * Supports local development, custom remote backends, and Vercel hosting.
 * When running in the browser on Vercel or any non-localhost domain, always use relative '/api'
 * so all client calls go to the same host's Serverless Function router.
 */
export const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // On any hosted environment (Vercel, custom domain, etc.), always use relative '/api'
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0') {
      return '/api';
    }
  }
  return import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');
})();

export default API_BASE;
