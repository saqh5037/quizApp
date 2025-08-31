import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';
import { apiConfig, buildApiUrl } from '../config/api.config';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActivity: number | null;
  sessionStartTime: number | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  updateUser: (user: User) => void;
  clearAuth: () => void;
  updateActivity: () => void;
  checkSessionValidity: () => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      lastActivity: null,
      sessionStartTime: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(buildApiUrl(apiConfig.endpoints.auth.login), {
            email,
            password,
          });
          
          const { user, accessToken, refreshToken = null } = response.data.data;
          const now = Date.now();
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            lastActivity: now,
            sessionStartTime: now,
          });
          
          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          
          toast.success('Login successful!');
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.response?.data?.error?.message || 'Login failed');
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await axios.post(buildApiUrl(apiConfig.endpoints.auth.register), data);
          
          const { user, accessToken, refreshToken = null } = response.data.data;
          const now = Date.now();
          
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            lastActivity: now,
            sessionStartTime: now,
          });
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          
          toast.success('Registration successful!');
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.response?.data?.error?.message || 'Registration failed');
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          lastActivity: null,
          sessionStartTime: null,
        });
        
        delete axios.defaults.headers.common['Authorization'];
        toast.success('Logged out successfully');
      },

      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          get().clearAuth();
          return;
        }

        try {
          const response = await axios.post(buildApiUrl(apiConfig.endpoints.auth.refresh), {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          
          set({
            accessToken,
            refreshToken: newRefreshToken,
          });
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error) {
          get().clearAuth();
          throw error;
        }
      },

      updateUser: (user: User) => {
        set({ user });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          lastActivity: null,
          sessionStartTime: null,
        });
        
        delete axios.defaults.headers.common['Authorization'];
      },
      
      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },
      
      checkSessionValidity: () => {
        const state = get();
        if (!state.isAuthenticated || !state.lastActivity) {
          return false;
        }
        
        const now = Date.now();
        const timeSinceLastActivity = now - state.lastActivity;
        const maxInactivityTime = 20 * 60 * 1000; // 20 minutos
        
        if (timeSinceLastActivity > maxInactivityTime) {
          get().clearAuth();
          return false;
        }
        
        return true;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
        sessionStartTime: state.sessionStartTime,
      }),
    }
  )
);

// Set up axios interceptor for token refresh
axios.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry for login or refresh endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/refresh');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      
      try {
        await useAuthStore.getState().refreshAccessToken();
        return axios(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);