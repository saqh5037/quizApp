import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  ChevronLeft, 
  Mail, 
  Calendar,
  Check,
  X,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import api from '../../services/api';

interface TenantUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  full_name: string;
  role: string;
  tenant_role: string;
  isActive: boolean;
  isVerified: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantInfo {
  id: number;
  name: string;
  slug: string;
}

const TenantUsers: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  
  // Create user form state
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'student',
    send_invite: false
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit user form state
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'student',
    is_active: true
  });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete user state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchTenantInfo();
    fetchUsers();
  }, [id, currentPage]);

  const fetchTenantInfo = async () => {
    try {
      const response = await api.get(`/admin/tenants/${id}`);
      if (response && response.success) {
        setTenantInfo({
          id: response.data.id,
          name: response.data.name,
          slug: response.data.slug
        });
      }
    } catch (error: any) {
      console.error('Error fetching tenant info:', error);
    }
  };

  // Check if user can be deleted (not last admin, not super admin)
  const canUserBeDeleted = (user: TenantUser) => {
    // Never allow deletion of super admin
    if (user.role === 'super_admin') {
      return { canDelete: false, reason: 'Cannot delete super admin user' };
    }

    // If user is admin, check if they're the last active admin
    if (user.role === 'admin') {
      const activeAdmins = users.filter(u => 
        u.role === 'admin' && 
        u.isActive && 
        u.id !== user.id // Exclude current user from count
      );
      
      if (activeAdmins.length === 0) {
        return { canDelete: false, reason: 'Cannot remove the last admin of the tenant' };
      }
    }

    return { canDelete: true, reason: null };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/tenants/${id}/users?page=${currentPage}&limit=10`);
      
      if (response && response.success) {
        setUsers(response.data);
        setTotalPages(response.pagination?.totalPages || 1);
      } else {
        setError('Failed to load users');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    try {
      const response = await api.post(`/admin/tenants/${id}/users`, createForm);
      
      if (response && response.success) {
        setShowCreateModal(false);
        setCreateForm({
          email: '',
          first_name: '',
          last_name: '',
          password: '',
          role: 'student',
          send_invite: false
        });
        fetchUsers(); // Refresh users list
      } else {
        setCreateError('Failed to create user');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      setCreateError(error.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = (user: TenantUser) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      is_active: user.isActive
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setEditing(true);
    setEditError('');

    try {
      const response = await api.put(`/admin/tenants/${id}/users/${selectedUser.id}`, editForm);
      
      if (response && response.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh users list
      } else {
        setEditError('Failed to update user');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      setEditError(error.response?.data?.error || 'Failed to update user');
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = (user: TenantUser) => {
    setSelectedUser(user);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (permanent = false) => {
    if (!selectedUser) return;
    
    setDeleting(true);
    setDeleteError('');

    try {
      const response = await api.delete(`/admin/tenants/${id}/users/${selectedUser.id}`, {
        data: { permanent }
      });
      
      if (response && response.success) {
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh users list
      } else {
        setDeleteError('Failed to remove user');
      }
    } catch (error: any) {
      console.error('Error removing user:', error);
      setDeleteError(error.response?.data?.error || 'Failed to remove user');
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivateUser = async (user: TenantUser) => {
    setDeleting(true);
    try {
      const response = await api.post(`/admin/tenants/${id}/users/${user.id}/reactivate`);
      
      if (response && response.success) {
        fetchUsers(); // Refresh users list
      } else {
        console.error('Failed to reactivate user');
      }
    } catch (error: any) {
      console.error('Error reactivating user:', error);
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === '' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !tenantInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Error Loading Users</h2>
            <p>{error}</p>
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
            <Link to={`/admin/tenants/${id}`} className="hover:text-gray-700 dark:hover:text-gray-300">
              {tenantInfo?.name || 'Tenant'}
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">Users</span>
          </div>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tenantInfo?.name} Users
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Manage users for this tenant
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.full_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 capitalize">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {user.isActive ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-sm ${user.isActive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="ml-2">
                            {user.isVerified ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                Unverified
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                          {user.isActive ? (
                            <button 
                              onClick={() => handleDeleteUser(user)}
                              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleReactivateUser(user)}
                                className="text-green-600 hover:text-green-700 text-sm font-medium"
                                disabled={deleting}
                              >
                                Reactivate
                              </button>
                              {(() => {
                                const deleteCheck = canUserBeDeleted(user);
                                return deleteCheck.canDelete ? (
                                  <button 
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                  >
                                    Delete
                                  </button>
                                ) : (
                                  <span 
                                    className="text-gray-400 text-sm font-medium cursor-not-allowed"
                                    title={deleteCheck.reason || 'Cannot delete this user'}
                                  >
                                    Delete
                                  </span>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm || filterRole ? 'No users found matching your search.' : 'No users found for this tenant.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add New User
              </h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.first_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={createForm.last_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter password"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="send_invite"
                    checked={createForm.send_invite}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, send_invite: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <label htmlFor="send_invite" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Send invitation email
                  </label>
                </div>

                {createError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{createError}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Edit User: {selectedUser.full_name}
              </h3>
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="editIsActive" className="text-sm text-gray-700 dark:text-gray-300">
                    User is active
                  </label>
                </div>

                {editError && (
                  <div className="text-red-600 text-sm flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {editError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                      setEditError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editing}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {editing ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedUser.isActive ? 'Deactivate User' : 'Delete User'}: {selectedUser.full_name}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {selectedUser.isActive 
                  ? 'This will deactivate the user. They will not be able to log in, but their data will be preserved. You can reactivate them later or delete them permanently.'
                  : 'This user is currently deactivated. You can permanently delete them, which will remove all their data and cannot be undone.'
                }
              </p>

              {deleteError && (
                <div className="text-red-600 text-sm flex items-center gap-1 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  {deleteError}
                </div>
              )}

              <div className="space-y-3">
                {selectedUser.isActive ? (
                  <button
                    onClick={() => handleConfirmDelete(false)}
                    disabled={deleting}
                    className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition-colors text-left"
                  >
                    <div className="font-medium">
                      {deleting ? 'Deactivating...' : 'Deactivate User'}
                    </div>
                    <div className="text-sm text-orange-100">User will be deactivated but data will be preserved</div>
                  </button>
                ) : (() => {
                  const deleteCheck = canUserBeDeleted(selectedUser);
                  return deleteCheck.canDelete ? (
                    <button
                      onClick={() => handleConfirmDelete(true)}
                      disabled={deleting}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors text-left"
                    >
                      <div className="font-medium">
                        {deleting ? 'Deleting...' : 'Delete Permanently'}
                      </div>
                      <div className="text-sm text-red-100">User and all data will be permanently removed</div>
                    </button>
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <div className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Cannot Delete User
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {deleteCheck.reason}
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                    setDeleteError('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantUsers;