import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  FileText,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  MessageCircle,
  CheckCircle,
  FileDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { apiGet, apiDelete } from '../../utils/api.utils';
import toast from 'react-hot-toast';

interface Manual {
  id: number;
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  userId: number;
  tenantId: number;
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
}

const ManualDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch manual data
  const { data: manual, isLoading, isError, error } = useQuery({
    queryKey: ['manual', id],
    queryFn: async () => {
      const response = await apiGet(`/manuals/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiDelete(`/manuals/${id}`);
    },
    onSuccess: () => {
      toast.success('Manual eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['manuals'] });
      navigate('/manuals');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al eliminar el manual');
    }
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleView = () => {
    if (manual?.path) {
      // In production, you'd implement a proper PDF viewer
      window.open(`http://localhost:3001${manual.path}`, '_blank');
    }
  };

  const handleEdit = () => {
    navigate(`/manuals/${id}/edit`);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando manual...</p>
        </div>
      </div>
    );
  }

  if (isError || !manual) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar el manual</h2>
          <p className="text-gray-600 mb-4">
            {error?.message || 'No se pudo cargar el manual solicitado'}
          </p>
          <button
            onClick={() => navigate('/manuals')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Volver a Manuales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/manuals')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver a Manuales
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <FileText className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{manual.title}</h1>
                    <p className="text-sm text-gray-500">ID: {manual.id}</p>
                  </div>
                </div>
                
                {manual.description && (
                  <p className="text-gray-700 mb-4">{manual.description}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDate(manual.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    <span>Usuario {manual.userId}</span>
                  </div>
                  <div>
                    <span className="font-medium">Tamaño:</span> {formatFileSize(manual.size)}
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span> {manual.mimeType}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  manual.status === 'ready' 
                    ? 'bg-green-100 text-green-800'
                    : manual.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {manual.status === 'ready' ? 'Listo' : 
                   manual.status === 'processing' ? 'Procesando' : 'Error'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button 
            onClick={handleView}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center transition-colors"
          >
            <Eye className="h-5 w-5 mr-2" />
            Ver Manual
          </button>
          
          <button 
            onClick={handleEdit}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center transition-colors"
          >
            <Edit className="h-5 w-5 mr-2" />
            Editar
          </button>
          
          <button 
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center transition-colors"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Eliminar
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Chat con IA</h3>
                <p className="text-sm text-gray-600">Conversa sobre el contenido del manual</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/manuals/${id}/chat`)}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Iniciar Chat
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-lg p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Generar Quiz</h3>
                <p className="text-sm text-gray-600">Crea preguntas basadas en el manual</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/manuals/${id}/generate-quiz`)}
              className="w-full bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Crear Quiz
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 rounded-lg p-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Resumen</h3>
                <p className="text-sm text-gray-600">Obtén un resumen del contenido</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/manuals/${id}/generate-summary`)}
              className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Generar Resumen
            </button>
          </div>
        </div>

        {/* File Information */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Archivo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Original</label>
              <p className="text-sm text-gray-900">{manual.originalName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Archivo</label>
              <p className="text-sm text-gray-900 font-mono">{manual.filename}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
              <p className="text-sm text-gray-900 font-mono text-xs break-all">{manual.path}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <p className="text-sm text-gray-900">{manual.status}</p>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ¿Eliminar manual?
              </h3>
              <p className="text-gray-600 mb-6">
                Esta acción no se puede deshacer. El manual "{manual.title}" y su archivo asociado serán eliminados permanentemente.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium px-4 py-2 rounded-lg flex items-center"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualDetail;