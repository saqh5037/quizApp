/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

// Get environment variables with fallbacks
// Use dynamic URL detection for production
const getApiUrl = () => {
  const { hostname, origin } = window.location;

  // For any non-local host, reuse the page's own origin (protocol + host + port).
  // Hardcoding http://<hostname>:3001 breaks once the SPA is served over HTTPS
  // (mixed content is blocked by browsers). nginx (QA) and the Vite dev server
  // both proxy /api and /socket.io to the backend on the same origin, so the
  // page origin is always the correct base.
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return origin;
  }

  // Only use localhost when actually accessing from localhost
  return 'http://localhost:3001';
};

// Make API URL dynamic - recalculate on each access
const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX || '/api/v1';

// Export configuration with dynamic getters
export const apiConfig = {
  get baseURL() { 
    return `${getApiUrl()}${API_PREFIX}`;
  },
  get apiURL() { 
    return getApiUrl();
  },
  get socketURL() { 
    return (import.meta as any).env?.VITE_SOCKET_URL || getApiUrl();
  },
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      refresh: '/auth/refresh',
      logout: '/auth/logout',
      verify: '/auth/verify',
    },
    users: {
      profile: '/users/profile',
      updateProfile: '/users/profile',
      stats: '/users/stats',
      activity: '/users/activity',
    },
    quizzes: {
      list: '/quizzes',
      create: '/quizzes',
      get: (id: number) => `/quizzes/${id}`,
      update: (id: number) => `/quizzes/${id}`,
      delete: (id: number) => `/quizzes/${id}`,
      clone: (id: number) => `/quizzes/${id}/clone`,
    },
    sessions: {
      active: '/sessions/active',
      my: '/sessions/my',
      create: '/sessions',
      get: (id: string) => `/sessions/${id}`,
      join: (id: string) => `/sessions/${id}/join`,
      status: (id: string) => `/sessions/${id}/status`,
      currentQuestion: (id: string) => `/sessions/${id}/current-question`,
      submitAnswer: '/sessions/answer',
      results: (id: string) => `/sessions/${id}/results`,
      exportPDF: (id: string) => `/sessions/${id}/export/pdf`,
      exportExcel: (id: string) => `/sessions/${id}/export/excel`,
      emailResults: (id: string) => `/sessions/${id}/email-results`,
    },
    dashboard: {
      stats: '/dashboard/stats',
      activities: '/dashboard/activities',
      upcomingSessions: '/dashboard/upcoming-sessions',
    },
  },
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${apiConfig.baseURL}${endpoint}`;
};

// Helper function to get headers with authentication
export const getAuthHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export default apiConfig;