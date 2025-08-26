import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Save, 
  Users,
  Hash,
  FileText,
  User
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import apiConfig from '../../config/api.config';
import toast from 'react-hot-toast';

interface ClassroomFormData {
  name: string;
  code: string;
  description: string;
  max_capacity: number;
  is_active: boolean;
  instructor_id?: number;
}

const ClassroomEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken: token, user } = useAuthStore();
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    code: '',
    description: '',
    max_capacity: 30,
    is_active: true,
    instructor_id: undefined
  });

  const { data: classroom, isLoading: loadingClassroom } = useQuery({
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

  const { data: instructors } = useQuery({
    queryKey: ['instructors'],
    queryFn: async () => {
      const response = await axios.get(`${apiConfig.baseURL}/users`, {
        params: { role: 'instructor' },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data.data || [];
    },
    enabled: !!token
  });

  useEffect(() => {
    if (classroom) {
      setFormData({
        name: classroom.name || '',
        code: classroom.code || '',
        description: classroom.description || '',
        max_capacity: classroom.max_capacity || 30,
        is_active: classroom.is_active !== undefined ? classroom.is_active : true,
        instructor_id: classroom.instructor?.id
      });
    }
  }, [classroom]);

  const updateClassroomMutation = useMutation({
    mutationFn: async (data: ClassroomFormData) => {
      const response = await axios.put(
        `${apiConfig.baseURL}/classrooms/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Salón actualizado exitosamente');
      navigate(`/classrooms/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al actualizar el salón');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre del salón es requerido');
      return;
    }
    
    if (!formData.code.trim()) {
      toast.error('El código del salón es requerido');
      return;
    }
    
    if (formData.max_capacity < 1) {
      toast.error('La capacidad debe ser al menos 1');
      return;
    }
    
    updateClassroomMutation.mutate(formData);
  };

  if (loadingClassroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Salón no encontrado</h2>
          <button
            onClick={() => navigate('/classrooms')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver a Salones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/classrooms/${id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Users className="w-7 h-7 text-blue-600" />
                Editar Salón
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Salón *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Matemáticas Avanzadas"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={255}
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código del Salón *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ej: MAT-101"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={50}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Este código será usado por los estudiantes para unirse al salón
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el propósito y contenido del salón..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Max Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacidad Máxima *
              </label>
              <div className="relative max-w-xs">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="500"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Número máximo de estudiantes que pueden inscribirse
              </p>
            </div>

            {/* Instructor */}
            {instructors && instructors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={formData.instructor_id || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      instructor_id: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin instructor asignado</option>
                    {instructors.map((instructor: any) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.firstName} {instructor.lastName} - {instructor.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado del Salón
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="true"
                    checked={formData.is_active === true}
                    onChange={() => setFormData({ ...formData, is_active: true })}
                    className="mr-2"
                  />
                  <span className="text-sm">Activo</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="false"
                    checked={formData.is_active === false}
                    onChange={() => setFormData({ ...formData, is_active: false })}
                    className="mr-2"
                  />
                  <span className="text-sm">Inactivo</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Los salones inactivos no permiten nuevas inscripciones
              </p>
            </div>

            {/* Current Stats */}
            {classroom && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Información Actual</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Estudiantes inscritos:</span>
                    <span className="ml-2 font-medium text-blue-900">
                      {classroom.enrollmentCount || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Lugares disponibles:</span>
                    <span className="ml-2 font-medium text-blue-900">
                      {classroom.availableSeats || formData.max_capacity}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/classrooms/${id}`)}
                className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateClassroomMutation.isPending}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updateClassroomMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClassroomEdit;