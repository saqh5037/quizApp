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
  Filter,
  Edit2,
  Trash2,
  RotateCcw,
  Power,
  UserCheck,
  Shield,
  GraduationCap,
  UserPlus
} from 'lucide-react';
import { FiEdit2, FiTrash2, FiPower, FiRotateCcw, FiUserCheck } from 'react-icons/fi';
import { HiOutlinePencilAlt, HiOutlineTrash, HiOutlineBan } from 'react-icons/hi';
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
      return { canDelete: false, reason: 'No se puede eliminar un usuario super administrador' };
    }

    // If user is admin, check if they're the last active admin
    if (user.role === 'admin') {
      const activeAdmins = users.filter(u => 
        u.role === 'admin' && 
        u.isActive && 
        u.id !== user.id // Exclude current user from count
      );
      
      if (activeAdmins.length === 0) {
        return { canDelete: false, reason: 'No se puede eliminar el último administrador del tenant' };
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
        setError('Error al cargar usuarios');
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
        setCreateError('Error al crear usuario');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      setCreateError(error.response?.data?.error || 'Error al crear usuario');
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
        setEditError('Error al actualizar usuario');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      setEditError(error.response?.data?.error || 'Error al actualizar usuario');
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
        setDeleteError('Error al eliminar usuario');
      }
    } catch (error: any) {
      console.error('Error removing user:', error);
      setDeleteError(error.response?.data?.error || 'Error al eliminar usuario');
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
        console.error('Error al reactivar usuario');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !tenantInfo) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Error al Cargar Usuarios</h2>
            <p>{error}</p>
            <Link to="/admin/tenants" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              ← Volver a Tenants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link to="/admin" className="hover:text-gray-700">
                Admin
              </Link>
              <span>/</span>
              <Link to="/admin/tenants" className="hover:text-gray-700">
                Tenants
              </Link>
              <span>/</span>
              <Link to={`/admin/tenants/${id}`} className="hover:text-gray-700">
                {tenantInfo?.name || 'Tenant'}
              </Link>
              <span>/</span>
              <span className="text-gray-700 font-medium">Usuarios</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Users className="text-blue-600" />
                  Gestión de Usuarios - {tenantInfo?.name}
                </h1>
                <p className="text-base text-gray-600 mt-2">
                  Administra los usuarios de este tenant
                </p>
              </div>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <UserPlus size={18} />
                Nuevo Usuario
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3 items-center justify-between mb-6">
          <div className="flex gap-3 items-center flex-1">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filterRole === '' 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:border-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setFilterRole('')}
              >
                Todos
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filterRole === 'student' 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:border-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setFilterRole('student')}
              >
                <div className="flex items-center gap-1">
                  <GraduationCap size={16} />
                  Estudiantes
                </div>
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filterRole === 'teacher' 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:border-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setFilterRole('teacher')}
              >
                <div className="flex items-center gap-1">
                  <UserCheck size={16} />
                  Profesores
                </div>
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filterRole === 'admin' 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:border-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setFilterRole('admin')}
              >
                <div className="flex items-center gap-1">
                  <Shield size={16} />
                  Admins
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 via-white via-50% to-blue-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors bg-gradient-to-r from-blue-50/50 via-white via-50% to-blue-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <span className="text-white font-semibold text-sm">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {user.full_name}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'admin' && <Shield size={12} />}
                          {user.role === 'teacher' && <UserCheck size={12} />}
                          {user.role === 'student' && <GraduationCap size={12} />}
                          {user.role === 'admin' ? 'Administrador' :
                           user.role === 'teacher' ? 'Profesor' :
                           'Estudiante'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.isActive ? (
                              <><Check className="h-3 w-3" /> Activo</>
                            ) : (
                              <><X className="h-3 w-3" /> Inactivo</>
                            )}
                          </span>
                          {user.isVerified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Verificado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString('es-ES', { 
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group relative"
                            title="Editar usuario"
                          >
                            <HiOutlinePencilAlt size={18} />
                            <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Editar
                            </span>
                          </button>
                          {user.isActive ? (
                            <button 
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors group relative"
                              title="Desactivar usuario"
                            >
                              <HiOutlineBan size={18} />
                              <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Desactivar
                              </span>
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleReactivateUser(user)}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors group relative"
                                disabled={deleting}
                                title="Reactivar usuario"
                              >
                                <FiRotateCcw size={18} />
                                <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Reactivar
                                </span>
                              </button>
                              {(() => {
                                const deleteCheck = canUserBeDeleted(user);
                                return deleteCheck.canDelete ? (
                                  <button 
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group relative"
                                    title="Eliminar permanentemente"
                                  >
                                    <HiOutlineTrash size={18} />
                                    <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                      Eliminar
                                    </span>
                                  </button>
                                ) : (
                                  <button 
                                    className="p-1.5 text-gray-300 cursor-not-allowed rounded-lg"
                                    title={deleteCheck.reason || 'No se puede eliminar este usuario'}
                                    disabled
                                  >
                                    <HiOutlineTrash size={18} />
                                  </button>
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
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-gray-400" />
                        <p className="text-base font-medium">
                          {searchTerm || filterRole ? 'No se encontraron usuarios con los filtros aplicados.' : 'No hay usuarios registrados en este tenant.'}
                        </p>
                        {!searchTerm && !filterRole && (
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md inline-flex items-center gap-2"
                          >
                            <UserPlus size={18} />
                            Agregar Primer Usuario
                          </button>
                        )}
                      </div>
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
                Agregar Nuevo Usuario
              </h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.first_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={createForm.last_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ingrese contraseña"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rol
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Profesor</option>
                    <option value="admin">Administrador</option>
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
                    Enviar correo de invitación
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
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {creating ? 'Creando...' : 'Crear Usuario'}
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
                Editar Usuario: {selectedUser.full_name}
              </h3>
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rol
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Profesor</option>
                    <option value="admin">Administrador</option>
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
                    Usuario activo
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
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editing}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {editing ? 'Actualizando...' : 'Actualizar Usuario'}
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
                {selectedUser.isActive ? 'Desactivar Usuario' : 'Eliminar Usuario'}: {selectedUser.full_name}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {selectedUser.isActive 
                  ? 'Esto desactivará al usuario. No podrá iniciar sesión, pero sus datos se conservarán. Puedes reactivarlo más tarde o eliminarlo permanentemente.'
                  : 'Este usuario está actualmente desactivado. Puedes eliminarlo permanentemente, lo que eliminará todos sus datos y no se puede deshacer.'
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
                      {deleting ? 'Desactivando...' : 'Desactivar Usuario'}
                    </div>
                    <div className="text-sm text-orange-100">El usuario será desactivado pero los datos se conservarán</div>
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
                        {deleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
                      </div>
                      <div className="text-sm text-red-100">El usuario y todos sus datos serán eliminados permanentemente</div>
                    </button>
                  ) : (
                    <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <div className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        No se puede eliminar el usuario
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
                  Cancelar
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