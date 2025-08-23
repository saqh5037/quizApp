/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

// Get environment variables with fallbacks
// Use dynamic URL detection for production
const getApiUrl = () => {
  // If explicitly set in environment, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use same origin (for when frontend and backend are on same server)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Default for development
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

// Export configuration
export const apiConfig = {
  baseURL: `${API_URL}${API_PREFIX}`,
  apiURL: API_URL,
  socketURL: SOCKET_URL,
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