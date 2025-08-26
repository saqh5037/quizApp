import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  BookOpen, 
  ChevronRight,
  Calendar,
  User,
  Clock,
  Trash2,
  AlertTriangle
} from 'lucide-react';
// import { useTenant } from '../../contexts/TenantContext';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import apiConfig from '../../config/api.config';
import toast from 'react-hot-toast';

interface Classroom {
  id: number;
  name: string;
  code: string;
  description?: string;
  max_capacity: number;
  is_active: boolean;
  instructor?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  enrollmentCount: number;
  availableSeats: number;
  created_at: string;
}

const ClassroomsIndex: React.FC = () => {
  // const { currentTenant, isInstructor, isTenantAdmin } = useTenant();
  const currentTenant = { id: 1, name: 'Default' }; // Default tenant for development
  const isInstructor = true; // Allow all for development
  const isTenantAdmin = true;
  const { accessToken: token } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; classroom: any | null }>({
    show: false,
    classroom: null
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['classrooms', currentPage, searchTerm],
    queryFn: async () => {
      const response = await axios.get(`${apiConfig.baseURL}/classrooms`, {
        params: {
          page: currentPage,
          limit: 10,
          search: searchTerm
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    enabled: !!token
  });

  const classrooms = data?.data || [];
  const pagination = data?.pagination;
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (classroomId: number) => {
      const response = await axios.delete(
        `${apiConfig.baseURL}/classrooms/${classroomId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Salón eliminado exitosamente');
      // Refetch the data immediately
      refetch();
      // Also invalidate for good measure
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setDeleteModal({ show: false, classroom: null });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el salón');
      setDeleteModal({ show: false, classroom: null });
    }
  });

  const handleDelete = () => {
    if (deleteModal.classroom) {
      deleteMutation.mutate(deleteModal.classroom.id);
    }
  };

  const getStatusColor = (classroom: Classroom) => {
    if (!classroom.is_active) return 'bg-gray-100 text-gray-600';
    if (classroom.availableSeats === 0) return 'bg-red-100 text-red-600';
    if (classroom.availableSeats < 5) return 'bg-yellow-100 text-yellow-600';
    return 'bg-green-100 text-green-600';
  };

  const getStatusText = (classroom: Classroom) => {
    if (!classroom.is_active) return 'Inactivo';
    if (classroom.availableSeats === 0) return 'Lleno';
    if (classroom.availableSeats < 5) return `${classroom.availableSeats} lugares`;
    return 'Disponible';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                Salones de Clase
              </h1>
              <p className="text-gray-600 mt-2">
                {currentTenant?.name} - Gestión de Salones
              </p>
            </div>
            {(isInstructor || isTenantAdmin) && (
              <Link
                to="/classrooms/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo Salón
              </Link>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            Error al cargar los salones. Por favor, intente nuevamente.
          </div>
        )}

        {/* Classrooms Table */}
        {!isLoading && !error && classrooms.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Salón
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Instructor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Estudiantes
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-white uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {classrooms.map((classroom: Classroom, index: number) => (
                    <tr 
                      key={classroom.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {classroom.name}
                          </div>
                          {classroom.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {classroom.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {classroom.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {classroom.instructor ? (
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              {classroom.instructor.firstName} {classroom.instructor.lastName}
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin instructor</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {classroom.enrollmentCount || 0} / {classroom.max_capacity}
                            </div>
                            <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ 
                                  width: `${((classroom.enrollmentCount || 0) / classroom.max_capacity) * 100}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(classroom)}`}>
                          {getStatusText(classroom)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/classrooms/${classroom.id}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Ver detalles"
                          >
                            <BookOpen className="w-5 h-5" />
                          </Link>
                          {(isInstructor || isTenantAdmin) && (
                            <>
                              <Link
                                to={`/classrooms/${classroom.id}/edit`}
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                                title="Editar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                                  />
                                </svg>
                              </Link>
                              <button
                                onClick={() => setDeleteModal({ show: true, classroom })}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && classrooms.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay salones disponibles
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'No se encontraron salones con ese criterio de búsqueda.'
                : 'Comienza creando tu primer salón de clase.'}
            </p>
            {(isInstructor || isTenantAdmin) && !searchTerm && (
              <Link
                to="/classrooms/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear Primer Salón
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                .filter(page => {
                  return page === 1 || 
                         page === pagination.pages || 
                         Math.abs(page - currentPage) <= 1;
                })
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg shadow ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white hover:shadow-md'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
              disabled={currentPage === pagination.pages}
              className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && deleteModal.classroom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800">
                Confirmar Eliminación
              </h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas eliminar el salón <strong>"{deleteModal.classroom.name}"</strong>?
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Advertencia:</strong> Esta acción desactivará el salón. 
                Los estudiantes inscritos serán marcados como dados de baja.
              </p>
            </div>

            {deleteModal.classroom.enrollmentCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  Este salón tiene <strong>{deleteModal.classroom.enrollmentCount} estudiantes</strong> inscritos.
                </p>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ show: false, classroom: null })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar Salón
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomsIndex;