import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Users,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  X,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface Tenant {
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
  user_count?: number;
  storage_used_mb?: number;
  max_users?: number;
  max_storage?: number;
}

const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  useEffect(() => {
    fetchTenants();
  }, [currentPage, search]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await api.get(`/admin/tenants?${params}`);
      console.log('API Response:', response);
      
      // El servicio api.get ya devuelve el objeto response.data del fetch
      // Verificamos si es el formato esperado
      if (response && response.success && Array.isArray(response.data)) {
        setTenants(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else if (Array.isArray(response)) {
        // Por si acaso la respuesta es directamente un array
        setTenants(response);
      } else {
        console.error('Unexpected response format:', response);
        setTenants([]);
      }
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTenants();
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;

    try {
      await api.delete(`/admin/tenants/${tenantToDelete.id}`);
      setTenants(prevTenants => prevTenants.filter(t => t.id !== tenantToDelete.id));
      setDeleteModalOpen(false);
      setTenantToDelete(null);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <Link to="/admin" className="hover:text-gray-700 dark:hover:text-gray-300">
                Admin
              </Link>
              <span>/</span>
              <span className="text-gray-700 dark:text-gray-300">Tenant Management</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tenant Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage organizational tenants and their settings
            </p>
          </div>
          <Link to="/admin/tenants/create">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Plus className="h-5 w-5" />
              Create Tenant
            </button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>
            <button
              type="submit"
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
            <X className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Tenants Table */}
        {!loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Usuarios
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Almacenamiento
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tenants && tenants.length > 0 ? (
                    tenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: tenant.branding?.primaryColor || '#3B82F6',
                                opacity: 0.1
                              }}
                            >
                              <Building2
                                className="h-5 w-5"
                                style={{ color: tenant.branding?.primaryColor || '#3B82F6' }}
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {tenant.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {tenant.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {tenant.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tenant.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}
                          >
                            {tenant.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {tenant.user_count || 0}
                            </span>
                            <span className="text-xs text-gray-500">
                              / {tenant.max_users || '∞'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <HardDrive className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {formatBytes(tenant.storage_used_mb * 1024 * 1024)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(tenant.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Link to={`/admin/tenants/${tenant.id}`}>
                              <button
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <Link to={`/admin/tenants/${tenant.id}/edit`}>
                              <button
                                className="p-1.5 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </Link>
                            <Link to={`/admin/tenants/${tenant.id}/users`}>
                              <button
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Gestionar usuarios"
                              >
                                <Users className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => {
                                setTenantToDelete(tenant);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    !loading && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No se encontraron tenants
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    currentPage === i + 1
                      ? 'bg-blue-500 text-white'
                      : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && tenantToDelete && (
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
                Are you sure you want to delete <strong>{tenantToDelete.name}</strong>? 
                All associated data including users, quizzes, and sessions will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setTenantToDelete(null);
                  }}
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

export default TenantManagement;