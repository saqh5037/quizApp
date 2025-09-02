import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import useInactivityDetector from '../../hooks/useInactivityDetector';
import { 
  RiRocketLine, 
  RiBookOpenLine, 
  RiBarChartBoxLine, 
  RiGroupLine, 
  RiFileListLine,
  RiUserLine,
  RiLogoutBoxLine,
  RiNotification3Line,
  RiVideoLine,
  RiFileTextLine,
  RiSettings3Line
} from 'react-icons/ri';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  
  // Activar detector de inactividad
  useInactivityDetector({
    enabled: true,
    timeout: 20 * 60 * 1000, // 20 minutos
    warningTime: 2 * 60 * 1000, // Advertencia 2 minutos antes
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if user is admin or super admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const navItems = [
    { path: '/dashboard', label: t('navigation.dashboard', { defaultValue: 'Dashboard' }), key: 'launch' },
    { path: '/quizzes', label: t('navigation.assessments', { defaultValue: 'Evaluaciones' }), key: 'library' },
    { path: '/classrooms', label: 'Salones', key: 'classrooms' },
    { path: '/manuals', label: 'Manuales', key: 'manuals' },
    { path: '/videos', label: 'Videos', key: 'videos' },
    { path: '/sessions', label: t('navigation.sessions', { defaultValue: 'Sesiones' }), key: 'rooms' },
    { path: '/public-results', label: 'Resultados', key: 'reports' },
    { path: '/results', label: 'Resultados En Vivo', key: 'live-results' },
    ...(isAdmin ? [{ path: '/docs', label: 'Documentación', key: 'docs' }] : []),
    ...(isSuperAdmin ? [{ path: '/admin', label: 'Administración', key: 'admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center">
              {/* Logo */}
              <Link to="/dashboard" className="flex items-center mr-8">
                <img 
                  src="/images/logoAristoTest.svg" 
                  alt="AristoTest" 
                  className="h-14 object-contain"
                />
              </Link>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-5 text-sm border-b-2 transition-all ${
                      location.pathname.startsWith(item.path)
                        ? 'text-gray-900 font-bold border-blue-600'
                        : 'text-gray-600 font-medium border-transparent hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            {/* Right side - User menu */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <RiNotification3Line className="w-5 h-5" />
              </button>
              
              {/* User Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block">{user?.email?.split('@')[0] || 'Usuario'}</span>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">PRO</span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link 
                    to="/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <RiUserLine className="w-4 h-4 mr-2" />
                    Mi Perfil
                  </Link>
                  {isAdmin && (
                    <>
                      <hr className="border-gray-200" />
                      <Link 
                        to="/tenant-settings" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <RiSettings3Line className="w-4 h-4 mr-2" />
                        Configuración de Organización
                      </Link>
                      <Link 
                        to="/docs" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <RiFileTextLine className="w-4 h-4 mr-2" />
                        Documentación
                      </Link>
                    </>
                  )}
                  <hr className="border-gray-200" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <RiLogoutBoxLine className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}