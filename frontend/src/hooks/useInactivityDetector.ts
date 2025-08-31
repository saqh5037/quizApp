import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface UseInactivityDetectorOptions {
  timeout?: number; // tiempo en milisegundos (default: 20 minutos)
  warningTime?: number; // tiempo antes de mostrar advertencia (default: 2 minutos antes)
  enabled?: boolean; // si el detector está habilitado
  onTimeout?: () => void; // callback personalizado al timeout
}

export function useInactivityDetector({
  timeout = 20 * 60 * 1000, // 20 minutos por defecto
  warningTime = 2 * 60 * 1000, // advertencia 2 minutos antes
  enabled = true,
  onTimeout
}: UseInactivityDetectorOptions = {}) {
  const { isAuthenticated, logout } = useAuthStore();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hasShownWarningRef = useRef<boolean>(false);

  const handleLogout = useCallback(() => {
    if (onTimeout) {
      onTimeout();
    } else {
      toast.error('Sesión expirada por inactividad', {
        duration: 5000,
        icon: '⏰'
      });
      logout();
      window.location.href = '/login';
    }
  }, [logout, onTimeout]);

  const resetTimer = useCallback(() => {
    // Actualizar última actividad
    lastActivityRef.current = Date.now();
    hasShownWarningRef.current = false;

    // Limpiar timers existentes
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current);
    }

    if (!enabled || !isAuthenticated) {
      return;
    }

    // Configurar advertencia
    warningTimeoutIdRef.current = setTimeout(() => {
      if (!hasShownWarningRef.current) {
        hasShownWarningRef.current = true;
        toast.warning('Su sesión expirará en 2 minutos por inactividad', {
          duration: 10000,
          icon: '⚠️'
        });
      }
    }, timeout - warningTime);

    // Configurar timeout principal
    timeoutIdRef.current = setTimeout(() => {
      handleLogout();
    }, timeout);
  }, [enabled, isAuthenticated, timeout, warningTime, handleLogout]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    // Eventos que resetean el timer de inactividad
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel'
    ];

    const handleActivity = () => {
      // Solo resetear si ha pasado al menos 1 segundo desde la última actividad
      // para evitar reseteos excesivos
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        resetTimer();
      }
    };

    // Agregar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (warningTimeoutIdRef.current) {
        clearTimeout(warningTimeoutIdRef.current);
      }
    };
  }, [enabled, isAuthenticated, resetTimer]);

  // Función para extender la sesión manualmente
  const extendSession = useCallback(() => {
    resetTimer();
    toast.success('Sesión extendida por 20 minutos más', {
      duration: 3000,
      icon: '✅'
    });
  }, [resetTimer]);

  return {
    extendSession,
    lastActivity: lastActivityRef.current
  };
}

export default useInactivityDetector;