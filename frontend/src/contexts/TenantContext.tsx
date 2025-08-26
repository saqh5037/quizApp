import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import apiConfig from '../config/api.config';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  type: 'internal' | 'client';
  settings: Record<string, any>;
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  is_active: boolean;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  loading: boolean;
  error: string | null;
  userRole: string;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isInstructor: boolean;
  isStudent: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, token } = useAuthStore();
  const userRole = user?.role || '';

  const fetchCurrentTenant = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${apiConfig.baseURL}/tenants/current`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setCurrentTenant(response.data.data);
    } catch (err: any) {
      console.error('Error fetching tenant:', err);
      setError(err.response?.data?.error || 'Failed to fetch tenant information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTenant();
  }, [token]);

  // Apply tenant branding to CSS variables
  useEffect(() => {
    if (currentTenant?.branding) {
      const root = document.documentElement;
      const branding = currentTenant.branding;
      
      if (branding.primaryColor) {
        root.style.setProperty('--color-primary', branding.primaryColor);
      }
      if (branding.secondaryColor) {
        root.style.setProperty('--color-secondary', branding.secondaryColor);
      }
    }
  }, [currentTenant]);

  const value: TenantContextType = {
    currentTenant,
    loading,
    error,
    userRole,
    isSuperAdmin: userRole === 'super_admin',
    isTenantAdmin: userRole === 'tenant_admin' || userRole === 'admin',
    isInstructor: ['super_admin', 'tenant_admin', 'admin', 'instructor', 'teacher'].includes(userRole),
    isStudent: userRole === 'student',
    refreshTenant: fetchCurrentTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};