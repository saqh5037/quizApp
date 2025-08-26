import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Users, 
  Hash,
  Calendar,
  User,
  Mail,
  Phone,
  Edit,
  Trash2,
  UserPlus,
  BookOpen,
  Award,
  Clock,
  UserX
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import apiConfig from '../../config/api.config';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  enrolledAt: string;
  status: string;
  role: string;
}

interface ClassroomDetail {
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
  students: Student[];
  enrollmentCount: number;
  availableSeats: number;
  created_at: string;
  updated_at: string;
  programs?: any[];
  quizzes?: any[];
}

const ClassroomDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken: token, user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'tenant_admin';

  const { data: classroom, isLoading, error, refetch } = useQuery({
    queryKey: ['classroom', id],
    queryFn: async () => {
      const response = await axios.get(`${apiConfig.baseURL}/classrooms/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data.data;
    },
    enabled: !!token && !!id
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete(`${apiConfig.baseURL}/classrooms/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Salón eliminado exitosamente');
      navigate('/classrooms');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el salón');
    }
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await axios.delete(`${apiConfig.baseURL}/classrooms/${id}/enroll/${studentId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Estudiante removido exitosamente');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al remover estudiante');
    }
  });

  const enrollStudentMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axios.post(
        `${apiConfig.baseURL}/classrooms/${id}/enroll`,
        { email, role: 'student' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Estudiante agregado exitosamente');
      setShowEnrollModal(false);
      setEnrollEmail('');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al agregar estudiante');
    }
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollEmail.trim()) {
      enrollStudentMutation.mutate(enrollEmail);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Error al cargar el salón</h2>
          <p className="text-gray-600 mb-4">No se pudo cargar la información del salón</p>
          <button
            onClick={() => navigate('/classrooms')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver a Salones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/classrooms')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{classroom.name}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    {classroom.code}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(classroom.created_at).toLocaleDateString('es-ES')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    classroom.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {classroom.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
            {isInstructor && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/classrooms/${id}/edit`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            )}
          </div>

          {classroom.description && (
            <p className="text-gray-600 mb-4">{classroom.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Estudiantes</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {classroom.enrollmentCount || 0} / {classroom.max_capacity}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Lugares Disponibles</p>
                  <p className="text-2xl font-bold text-green-900">
                    {classroom.availableSeats}
                  </p>
                </div>
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Programas</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {classroom.programs?.length || 0}
                  </p>
                </div>
                <BookOpen className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Evaluaciones</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {classroom.quizzes?.length || 0}
                  </p>
                </div>
                <Award className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Instructor Info */}
        {classroom.instructor && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Instructor
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {classroom.instructor.firstName} {classroom.instructor.lastName}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {classroom.instructor.email}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Estudiantes ({classroom.students?.length || 0})
            </h2>
            {isInstructor && classroom.availableSeats > 0 && (
              <button
                onClick={() => setShowEnrollModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Agregar Estudiante
              </button>
            )}
          </div>

          {classroom.students && classroom.students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nombre</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Teléfono</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Fecha de Inscripción</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Estado</th>
                    {isInstructor && (
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {classroom.students.map((student: Student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {student.email}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {student.phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(student.enrolledAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {student.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {isInstructor && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeStudentMutation.mutate(student.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remover estudiante"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay estudiantes inscritos en este salón</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">¿Eliminar Salón?</h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. Se eliminará el salón "{classroom.name}" permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Agregar Estudiante</h3>
            <form onSubmit={handleEnrollStudent}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email del Estudiante
                </label>
                <input
                  type="email"
                  value={enrollEmail}
                  onChange={(e) => setEnrollEmail(e.target.value)}
                  placeholder="estudiante@ejemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollEmail('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomDetail;