import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  HardDrive, 
  Calendar, 
  Settings,
  ChevronLeft,
  Activity,
  Database,
  Package,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';

interface TenantDetail {
  id: number;
  name: string;
  slug: string;
  type: 'internal' | 'client' | 'partner';
  settings: any;
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Statistics
  user_count?: number;
  quiz_count?: number;
  session_count?: number;
  video_count?: number;
  manual_count?: number;
  classroom_count?: number;
  storage_used_mb?: number;
  max_users?: number;
  max_storage?: number;
  // Recent users
  recent_users?: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    created_at: string;
  }>;
}

const TenantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchTenantDetail();
  }, [id]);

  const fetchTenantDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/tenants/${id}`);
      
      if (response && response.success) {
        setTenant(response.data);
      } else {
        setError('Failed to load tenant details');
      }
    } catch (error: any) {
      console.error('Error fetching tenant detail:', error);
      setError('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!tenant) return;

    try {
      await api.delete(`/admin/tenants/${tenant.id}`);
      window.location.href = '/admin/tenants';
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      setError('Failed to delete tenant');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Error Loading Tenant</h2>
            <p>{error || 'Tenant not found'}</p>
            <Link to="/admin/tenants" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Back to Tenants
            </Link>
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
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link to="/admin" className="hover:text-gray-700 dark:hover:text-gray-300">
              Admin
            </Link>
            <span>/</span>
            <Link to="/admin/tenants" className="hover:text-gray-700 dark:hover:text-gray-300">
              Tenants
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">{tenant.name}</span>
          </div>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: tenant.branding?.primaryColor || '#3B82F6',
                  opacity: 0.1
                }}
              >
                <Building2
                  className="h-8 w-8"
                  style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tenant.name}
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-gray-500 dark:text-gray-400">{tenant.slug}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    {tenant.type}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {tenant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link to={`/admin/tenants/${tenant.id}/edit`}>
                <button className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </Link>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Statistics Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tenant.user_count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Max: {tenant.max_users || '∞'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quizzes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tenant.quiz_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tenant.session_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Storage</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatBytes((tenant.storage_used_mb || 0) * 1024 * 1024)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Max: {tenant.max_storage ? formatBytes(tenant.max_storage * 1024 * 1024) : '∞'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-cyan-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Videos</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tenant.video_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-indigo-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manuals</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tenant.manual_count || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Tenant Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(tenant.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(tenant.updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Primary Color</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: tenant.branding?.primaryColor || '#3B82F6' }}
                    />
                    <p className="text-sm text-gray-900 dark:text-white">
                      {tenant.branding?.primaryColor || '#3B82F6'}
                    </p>
                  </div>
                </div>
                {tenant.branding?.secondaryColor && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Secondary Color</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: tenant.branding.secondaryColor }}
                      />
                      <p className="text-sm text-gray-900 dark:text-white">
                        {tenant.branding.secondaryColor}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Users
                </h3>
                <Link
                  to={`/admin/tenants/${tenant.id}/users`}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View All Users →
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tenant.recent_users && tenant.recent_users.length > 0 ? (
                    tenant.recent_users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tenant Settings
            </h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-800 dark:text-gray-200">
              {JSON.stringify(tenant.settings || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Tenant
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete <strong>{tenant.name}</strong>? 
                All associated data including users, quizzes, and sessions will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTenant}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Tenant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDetail;