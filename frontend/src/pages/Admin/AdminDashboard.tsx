import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Building2,
  BookOpen,
  TrendingUp,
  Shield,
  Settings,
  Activity,
  Database
} from 'lucide-react';
import api from '../../services/api';
import LanguageSelector from '../../components/LanguageSelector';

interface SystemStats {
  activeTenants: number;
  activeUsers: number;
  totalClassrooms: number;
  totalQuizzes: number;
  totalSessions: number;
  totalPrograms: number;
  totalCertificates: number;
}

interface TenantDistribution {
  tenant_id: number;
  user_count: string;
  tenant: {
    name: string;
  };
}

interface SystemStatsResponse {
  overview: SystemStats;
  tenantDistribution: TenantDistribution[];
}

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [tenantDistribution, setTenantDistribution] = useState<TenantDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      console.log('Fetching admin dashboard overview...');
      const response = await api.get('/admin/dashboard/overview');
      console.log('Raw API Response:', response);
      
      // The API returns { success: true, data: { totals, active, storage } }
      if (response && response.data) {
        const { totals, active } = response.data;
        
        // Map the response to the expected stats structure
        const mappedStats: SystemStats = {
          activeTenants: active?.tenants || 0,
          activeUsers: active?.users || 0,
          totalClassrooms: totals?.classrooms || 0,
          totalQuizzes: totals?.quizzes || 0,
          totalSessions: totals?.sessions || 0,
          totalPrograms: 0, // Not provided by the current API
          totalCertificates: 0 // Not provided by the current API
        };
        
        console.log('Setting mapped stats:', mappedStats);
        setStats(mappedStats);
        setTenantDistribution([]); // Not provided by the current API
        setError(''); // Clear any previous errors
      } else {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Error fetching dashboard overview:', error);
      setError(`Failed to load system statistics: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    href?: string;
  }> = ({ title, value, icon, color, href }) => {
    const CardContent = (
      <div className={`p-6 rounded-lg border ${color} transition-all duration-200 hover:shadow-md`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-full bg-opacity-20">{icon}</div>
        </div>
      </div>
    );

    return href ? <Link to={href}>{CardContent}</Link> : CardContent;
  };

  const QuickActions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Link
        to="/admin/tenants/create"
        className="p-4 border border-dashed border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <div className="text-center">
          <Building2 className="h-8 w-8 mx-auto text-blue-500 mb-2" />
          <h3 className="font-medium">{t('admin.dashboard.createNewTenant')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.dashboard.createNewTenantDesc')}</p>
        </div>
      </Link>
      
      <Link
        to="/admin/users/create"
        className="p-4 border border-dashed border-green-300 dark:border-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
      >
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto text-green-500 mb-2" />
          <h3 className="font-medium">{t('admin.dashboard.createNewUser')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.dashboard.createNewUserDesc')}</p>
        </div>
      </Link>
      
      <Link
        to="/admin/system/activity"
        className="p-4 border border-dashed border-purple-300 dark:border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
      >
        <div className="text-center">
          <Activity className="h-8 w-8 mx-auto text-purple-500 mb-2" />
          <h3 className="font-medium">{t('admin.dashboard.viewSystemActivity')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.dashboard.viewSystemActivityDesc')}</p>
        </div>
      </Link>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Shield className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-red-600">{t('admin.dashboard.accessError')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-500" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('admin.dashboard.title')}
              </h1>
            </div>
            <LanguageSelector />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('admin.dashboard.description')}
          </p>
        </div>

        {/* System Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {t('admin.dashboard.systemOverview')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={t('admin.dashboard.activeTenants')}
              value={stats?.activeTenants || 0}
              icon={<Building2 className="h-6 w-6 text-blue-500" />}
              color="border-blue-200 dark:border-blue-800"
              href="/admin/tenants"
            />
            <StatCard
              title={t('admin.dashboard.activeUsers')}
              value={stats?.activeUsers || 0}
              icon={<Users className="h-6 w-6 text-green-500" />}
              color="border-green-200 dark:border-green-800"
              href="/admin/users"
            />
            <StatCard
              title={t('admin.dashboard.totalClassrooms')}
              value={stats?.totalClassrooms || 0}
              icon={<BookOpen className="h-6 w-6 text-purple-500" />}
              color="border-purple-200 dark:border-purple-800"
              href="/admin/classrooms"
            />
            <StatCard
              title={t('admin.dashboard.quizSessions')}
              value={stats?.totalSessions || 0}
              icon={<TrendingUp className="h-6 w-6 text-yellow-500" />}
              color="border-yellow-200 dark:border-yellow-800"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {t('admin.dashboard.quickActions')}
          </h2>
          <QuickActions />
        </div>

        {/* Tenant Distribution */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            {t('admin.dashboard.tenantDistribution')}
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.dashboard.tenant')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.dashboard.users')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('admin.dashboard.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {tenantDistribution.map((tenant, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {tenant.tenant.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {tenant.user_count} {t('admin.dashboard.users').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/admin/tenants/${tenant.tenant_id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          {t('admin.dashboard.manage')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/admin/tenants"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <Building2 className="h-8 w-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('admin.dashboard.tenantManagement')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('admin.dashboard.tenantManagementDesc')}
            </p>
          </Link>

          <Link
            to="/admin/users"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <Users className="h-8 w-8 text-green-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('admin.dashboard.userManagement')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('admin.dashboard.userManagementDesc')}
            </p>
          </Link>

          <Link
            to="/admin/classrooms"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <BookOpen className="h-8 w-8 text-purple-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('admin.dashboard.classroomManagement')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('admin.dashboard.classroomManagementDesc')}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;