import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { RiMailLine, RiLockLine, RiCheckLine } from 'react-icons/ri';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel Izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-12 flex-col justify-between">
        <div className="animate-fade-in">
          <img 
            src="/images/aristotest-isotipo.svg" 
            alt="AristoTest" 
            className="h-32 w-auto object-contain"
          />
        </div>
        
        <div className="space-y-6 animate-slide-up">
          <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
            Plataforma de Evaluación Inteligente
          </h1>
          <p className="text-gray-600 text-lg xl:text-xl">
            Crea, gestiona y analiza evaluaciones de forma eficiente con resultados en tiempo real
          </p>
          
          <div className="space-y-4 pt-8">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <RiCheckLine className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">Evaluaciones en tiempo real</p>
                <p className="text-gray-600 text-sm mt-1">Sesiones interactivas con resultados instantáneos</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <RiCheckLine className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">Análisis detallado</p>
                <p className="text-gray-600 text-sm mt-1">Métricas y estadísticas completas de rendimiento</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <RiCheckLine className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">Certificados automáticos</p>
                <p className="text-gray-600 text-sm mt-1">Genera certificados PDF profesionales al instante</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-gray-500 text-sm">
          © 2025 AristoTest. Todos los derechos reservados.
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="w-full lg:w-1/2 xl:w-3/5 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md xl:max-w-lg space-y-8">
          {/* Logo móvil y tablet */}
          <div className="lg:hidden">
            <img 
              src="/images/aristotest-logo.svg" 
              alt="AristoTest" 
              className="h-20 sm:h-24 w-auto mx-auto mb-8 object-contain"
            />
          </div>

          {/* Header - Matching left panel style */}
          <div className="text-center lg:text-left">
            <h2 className="text-4xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
              {t('auth.login.title', { defaultValue: 'Bienvenido de nuevo' })}
            </h2>
            <p className="mt-3 text-gray-600 text-lg xl:text-xl">
              {t('auth.login.subtitle', { defaultValue: 'Ingresa a tu cuenta para continuar' })}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-base font-semibold text-gray-900 mb-2">
                {t('auth.login.email', { defaultValue: 'Correo Electrónico' })}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.login.emailPlaceholder', { defaultValue: 'Ingresa tu correo' })}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                leftIcon={<RiMailLine className="w-5 h-5 text-gray-500" />}
                required
                fullWidth
                className="border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg h-12 text-base"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-semibold text-gray-900 mb-2">
                {t('auth.login.password', { defaultValue: 'Contraseña' })}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.login.passwordPlaceholder', { defaultValue: 'Ingresa tu contraseña' })}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                leftIcon={<RiLockLine className="w-5 h-5 text-gray-500" />}
                required
                fullWidth
                className="border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg h-12 text-base"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-600"
                />
                <span className="ml-2 text-base text-gray-600">
                  {t('auth.login.rememberMe', { defaultValue: 'Recordarme' })}
                </span>
              </label>
              <Link 
                to="/forgot-password" 
                className="text-base text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {t('auth.login.forgotPassword', { defaultValue: '¿Olvidaste tu contraseña?' })}
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              className="!bg-blue-600 hover:!bg-blue-700 focus:ring-4 focus:ring-blue-600/20 rounded-lg h-12 text-lg font-semibold text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {t('auth.login.submit', { defaultValue: 'Iniciar Sesión' })}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-base">
              <span className="px-4 bg-white text-gray-600">
                {t('auth.login.noAccount', { defaultValue: '¿No tienes una cuenta?' })}
              </span>
            </div>
          </div>

          {/* Sign up */}
          <div className="text-center">
            <Link to="/register">
              <Button 
                variant="outline" 
                size="lg" 
                fullWidth 
                className="border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 rounded-lg h-12 text-lg font-semibold text-gray-900 hover:text-blue-600 transition-all duration-200"
              >
                {t('auth.login.signup', { defaultValue: 'Regístrate' })}
              </Button>
            </Link>
          </div>

          {/* Mobile footer */}
          <div className="lg:hidden text-center pt-6">
            <p className="text-sm text-gray-500">
              © 2025 AristoTest. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}