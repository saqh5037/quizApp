import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
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
  instructor_id?: number;
}

const NewClassroom: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken: token, user } = useAuthStore();
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    code: '',
    description: '',
    max_capacity: 30,
    instructor_id: user?.id
  });

  const createClassroomMutation = useMutation({
    mutationFn: async (data: ClassroomFormData) => {
      const response = await axios.post(
        `${apiConfig.baseURL}/classrooms`,
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
      toast.success('Salón creado exitosamente');
      navigate('/classrooms');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear el salón');
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
    
    createClassroomMutation.mutate(formData);
  };

  const generateCode = () => {
    const code = `SALON-${Date.now().toString(36).toUpperCase()}`;
    setFormData({ ...formData, code });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto">
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
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Users className="w-7 h-7 text-blue-600" />
                Crear Nuevo Salón
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
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Generar
                </button>
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

            {/* Instructor Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <User className="w-4 h-4" />
                <span>Instructor: {user?.email}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/classrooms')}
                className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createClassroomMutation.isPending}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {createClassroomMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Crear Salón
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Información Importante</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Los estudiantes podrán unirse al salón usando el código único</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Una vez creado, podrás asignar programas de entrenamiento y evaluaciones</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>La capacidad máxima puede ser modificada posteriormente si es necesario</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Como instructor, tendrás acceso completo a las estadísticas del salón</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NewClassroom;