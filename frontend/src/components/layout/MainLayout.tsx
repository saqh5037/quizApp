import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { FiHome, FiBookOpen, FiUsers, FiBarChart2, FiUser, FiHelpCircle } from 'react-icons/fi';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: t('navigation.dashboard'), icon: <FiHome className="w-5 h-5" /> },
    { path: '/quizzes', label: t('navigation.assessments'), icon: <FiBookOpen className="w-5 h-5" /> },
    { path: '/sessions', label: t('navigation.sessions'), icon: <FiUsers className="w-5 h-5" /> },
    { path: '/public-results', label: 'Resultados', icon: <FiBarChart2 className="w-5 h-5" /> },
    { path: '/profile', label: t('navigation.profile'), icon: <FiUser className="w-5 h-5" /> },
    { path: '/docs', label: t('navigation.docs', { defaultValue: 'Docs' }), icon: <FiHelpCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white shadow-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <img 
                  src="/images/logoAristoTest.png" 
                  alt="AristoTest" 
                  className="h-10 mr-3"
                />
              </Link>
              <div className="hidden md:ml-10 md:flex md:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === item.path
                        ? 'text-primary bg-primary/10'
                        : 'text-text-secondary hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <span className="text-sm text-text-secondary">
                    {user.name || user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                  >
                    {t('common.logout')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}