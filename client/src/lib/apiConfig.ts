// API configuration for hybrid deployment
// This handles routing between local development and production environments

// Get API base URL from environment variables
const getApiBaseUrl = (): string => {
  // In production, use the Heroku backend URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://ymovies-backend-a306d5f1eff3.herokuapp.com';
  }
  
  // A localhost override belongs to the computer, not to a phone on the LAN.
  const configuredUrl = import.meta.env.VITE_API_URL;
  const loopbackUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(configuredUrl || '');
  const localPage = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return configuredUrl && (!loopbackUrl || localPage) ? configuredUrl : window.location.origin;
};

export const API_BASE_URL = getApiBaseUrl();

// Movie data is served by a same-origin Vercel Function in production.
// Other app APIs can continue to use the configured backend URL.
export const TMDB_PROXY_URL = import.meta.env.PROD
  ? '/api/tmdb'
  : `${API_BASE_URL.replace(/\/$/, '')}/api/tmdb`;

// Demo server URL for local development only
export const DEMO_SERVER_URL = 'http://localhost:5001';

// Check if we should use demo server (local development only)
export const USE_DEMO_SERVER = import.meta.env.VITE_USE_DEMO_SERVER === 'true' && !import.meta.env.PROD;

export default API_BASE_URL;
