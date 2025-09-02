import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  UserCheck,
  UserX,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft
} from 'lucide-react';
import api from '../../services/api';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  created_at: string;
  tenant: {
    id: number;
    name: string;
    slug: string;
    type: string;
  };
  stats?: {
    quizzesCreated: number;
    sessionsHosted: number;
    classroomsEnrolled: number;
    certificatesEarned: number;
  };
}

interface Tenant {
  id: number;
  name: string;
  slug: string;
  type: string;
}

interface UsersResponse {
  data: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [userToTransfer, setUserToTransfer] = useState<User | null>(null);
  const [targetTenant, setTargetTenant] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [currentPage, search, roleFilter, tenantFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(tenantFilter && { tenant_id: tenantFilter })
      });

      const response = await api.get<UsersResponse>(`/admin/users?${params}`);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
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

  const handleTransferUser = async () => {
    if (!userToTransfer || !targetTenant) return;

    try {
      await api.patch(`/admin/users/${userToTransfer.id}/transfer-tenant`, {
        tenant_id: parseInt(targetTenant)
      });

      // Update the user in the local state
      setUsers(users.map(user => 
        user.id === userToTransfer.id 
          ? { ...user, tenant: tenants.find(t => t.id === parseInt(targetTenant))! }
          : user
      ));

      setTransferModalOpen(false);
      setUserToTransfer(null);
      setTargetTenant('');
    } catch (error: any) {
      console.error('Error transferring user:', error);
      setError('Failed to transfer user');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'tenant_admin':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'admin':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'instructor':
      case 'teacher':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'student':
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const UserCard: React.FC<{ user: User }> = ({ user }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.isActive
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/admin/users/${user.id}/edit`}
            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit User"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            onClick={() => {
              setUserToTransfer(user);
              setTransferModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            title="Transfer Tenant"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tenant</p>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{user.tenant.name}</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
          <span className="font-medium capitalize">{user.tenant.type}</span>
        </div>
      </div>

      {user.stats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Quizzes Created</p>
            <p className="font-medium">{user.stats.quizzesCreated}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sessions Hosted</p>
            <p className="font-medium">{user.stats.sessionsHosted}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );

  const TransferModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Transfer User to Different Tenant
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Transfer <strong>{userToTransfer?.firstName} {userToTransfer?.lastName}</strong> to a different tenant.
        </p>
        
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
              .filter(t => t.id !== userToTransfer?.tenant.id)
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
              setUserToTransfer(null);
              setTargetTenant('');
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleTransferUser}
            disabled={!targetTenant}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg"
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );

  if (loading && users.length === 0) {
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
              <span className="text-gray-900 dark:text-white">User Management</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage users across all tenants and handle tenant assignments
            </p>
          </div>
          <Link
            to="/admin/users/create"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create User
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="tenant_admin">Tenant Admin</option>
                <option value="admin">Admin</option>
                <option value="instructor">Instructor</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Tenants</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>

        {/* Empty State */}
        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No users found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {search || roleFilter || tenantFilter
                ? 'Try adjusting your search criteria'
                : 'Get started by creating your first user'}
            </p>
            <Link
              to="/admin/users/create"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First User
            </Link>
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

export default UserManagement;