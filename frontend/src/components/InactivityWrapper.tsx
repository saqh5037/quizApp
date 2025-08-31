import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import useInactivityDetector from '../hooks/useInactivityDetector';

interface InactivityWrapperProps {
  children: React.ReactNode;
}

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/join',
  '/play',
  '/quiz/*/public',
  '/quiz/*/take',
  '/video/*/public',
  '/video/*/interactive',
  '/sessions/*/results'
];

function InactivityWrapper({ children }: InactivityWrapperProps) {
  const location = useLocation();
  const { isAuthenticated, checkSessionValidity } = useAuthStore();
  
  // Verificar si la ruta actual es pública
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    // Convertir el patrón a regex
    const pattern = route.replace(/\*/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(location.pathname);
  });

  // Solo activar el detector de inactividad en rutas protegidas
  const { extendSession } = useInactivityDetector({
    enabled: isAuthenticated && !isPublicRoute,
    timeout: 20 * 60 * 1000, // 20 minutos
    warningTime: 2 * 60 * 1000, // Advertencia 2 minutos antes
  });

  // Verificar validez de sesión al montar y cambiar de ruta
  useEffect(() => {
    if (isAuthenticated && !isPublicRoute) {
      const isValid = checkSessionValidity();
      if (!isValid) {
        window.location.href = '/login';
      }
    }
  }, [location.pathname, isAuthenticated, isPublicRoute, checkSessionValidity]);

  return <>{children}</>;
}

export default InactivityWrapper;