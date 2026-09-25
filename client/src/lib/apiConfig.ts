// API configuration for hybrid deployment
// This handles routing between local development and production environments

// Get API base URL from environment variables
const getApiBaseUrl = (): string => {
  // In production, use the Heroku backend URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://ymovies-backend-a306d5f1eff3.herokuapp.com';
  }
  
  // In development, use local backend
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();

// Demo server URL for local development only
export const DEMO_SERVER_URL = 'http://localhost:5001';

// Check if we should use demo server (local development only)
export const USE_DEMO_SERVER = import.meta.env.VITE_USE_DEMO_SERVER === 'true' && !import.meta.env.PROD;

export default API_BASE_URL;
