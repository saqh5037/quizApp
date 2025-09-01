import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Users,
  Building2,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';

interface Classroom {
  id: number;
  name: string;
  code: string;
  description: string;
  max_capacity: number;
  is_active: boolean;
  created_at: string;
  tenant: {
    id: number;
    name: string;
    slug: string;
    type: string;
  };
  enrollmentCount?: number;
}

interface Tenant {
  id: number;
  name: string;
  slug: string;
  type: string;
}

interface ClassroomsResponse {
  data: Classroom[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const ClassroomManagement: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [classroomToTransfer, setClassroomToTransfer] = useState<Classroom | null>(null);
  const [targetTenant, setTargetTenant] = useState('');

  useEffect(() => {
    fetchClassrooms();
    fetchTenants();
  }, [currentPage, tenantFilter]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(tenantFilter && { tenant_id: tenantFilter })
      });

      const response = await api.get<ClassroomsResponse>(`/admin/classrooms?${params}`);
      setClassrooms(response.data.data);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Error fetching classrooms:', error);
      setError('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await api.get<{ data: Tenant[] }>('/tenants');
      setTenants(response.data.data);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleTransferClassroom = async () => {
    if (!classroomToTransfer || !targetTenant) return;

    try {
      await api.patch(`/admin/classrooms/${classroomToTransfer.id}/transfer-tenant`, {
        tenant_id: parseInt(targetTenant)
      });

      // Update the classroom in the local state
      setClassrooms(classrooms.map(classroom => 
        classroom.id === classroomToTransfer.id 
          ? { ...classroom, tenant: tenants.find(t => t.id === parseInt(targetTenant))! }
          : classroom
      ));

      setTransferModalOpen(false);
      setClassroomToTransfer(null);
      setTargetTenant('');
    } catch (error: any) {
      console.error('Error transferring classroom:', error);
      setError('Failed to transfer classroom');
    }
  };

  const ClassroomCard: React.FC<{ classroom: Classroom }> = ({ classroom }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {classroom.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
              {classroom.code}
            </p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
              classroom.is_active
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}>
              {classroom.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setClassroomToTransfer(classroom);
            setTransferModalOpen(true);
          }}
          className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
          title="Transfer to Different Tenant"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {classroom.description || 'No description available'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Capacity</p>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{classroom.max_capacity}</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Enrolled</p>
          <span className="font-medium">{classroom.enrollmentCount || 0}</span>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tenant</p>
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-sm">{classroom.tenant.name}</span>
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                {classroom.tenant.type}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Created: {new Date(classroom.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const TransferModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Transfer Classroom to Different Tenant
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Transfer <strong>{classroomToTransfer?.name}</strong> to a different tenant.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current Tenant
          </label>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{classroomToTransfer?.tenant.name}</span>
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">
                {classroomToTransfer?.tenant.type}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Target Tenant
          </label>
          <select
            value={targetTenant}
            onChange={(e) => setTargetTenant(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select tenant...</option>
            {tenants
              .filter(t => t.id !== classroomToTransfer?.tenant.id)
              .map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.type})
                </option>
              ))
            }
          </select>
        </div>

        <div className="flex gap-4 justify-end">
          <button
            onClick={() => {
              setTransferModalOpen(false);
              setClassroomToTransfer(null);
              setTargetTenant('');
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleTransferClassroom}
            disabled={!targetTenant}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg"
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );

  if (loading && classrooms.length === 0) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/admin" className="text-gray-500 hover:text-gray-700">
                Admin
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white">Classroom Management</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Classroom Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage classrooms across all tenants and handle tenant transfers
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Classrooms</p>
                <p className="text-3xl font-bold mt-2">{pagination.total}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Classrooms</p>
                <p className="text-3xl font-bold mt-2">
                  {classrooms.filter(c => c.is_active).length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tenants</p>
                <p className="text-3xl font-bold mt-2">{tenants.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <select
                value={tenantFilter}
                onChange={(e) => {
                  setTenantFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Tenants</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.type})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setTenantFilter('');
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Classrooms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {classrooms.map((classroom) => (
            <ClassroomCard key={classroom.id} classroom={classroom} />
          ))}
        </div>

        {/* Empty State */}
        {classrooms.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No classrooms found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tenantFilter
                ? 'No classrooms found for the selected tenant'
                : 'No classrooms have been created yet'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(currentPage * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 bg-blue-500 text-white rounded">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && <TransferModal />}
    </div>
  );
};

export default ClassroomManagement;