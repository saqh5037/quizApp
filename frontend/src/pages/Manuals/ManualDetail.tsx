import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  RiArrowLeftLine,
  RiFileTextLine,
  RiEyeLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiCalendarLine,
  RiUserLine,
  RiChat3Line,
  RiSparklingLine,
  RiDownloadLine,
  RiLoader4Line,
  RiAlertLine,
  RiFilePdfLine,
  RiShareLine,
  RiBookOpenLine,
  RiFileListLine,
  RiSettings3Line,
  RiExternalLinkLine,
  RiFullscreenLine
} from 'react-icons/ri';
import { apiGet, apiDelete } from '../../utils/api.utils';
import { useAuthStore } from '../../stores/authStore';
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
  pageCount?: number;
}

const ManualDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Verificar si el usuario es administrador
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

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
      setShowPdfViewer(true);
    }
  };

  const handleDownload = () => {
    if (manual?.path) {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando manual...</p>
        </div>
      </div>
    );
  }

  if (isError || !manual) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <RiAlertLine className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Manual no encontrado</h2>
          <p className="text-gray-600 mb-6">
            {error?.message || 'No se pudo cargar el manual solicitado'}
          </p>
          <button
            onClick={() => navigate('/manuals')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg inline-flex items-center gap-2"
          >
            <RiArrowLeftLine />
            Volver a Manuales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/manuals')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 group"
          >
            <RiArrowLeftLine className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver a Manuales
          </button>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Información principal */}
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <RiFileTextLine className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{manual.title}</h1>
                    {manual.description && (
                      <p className="text-gray-600 text-lg leading-relaxed">{manual.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      manual.status === 'ready' 
                        ? 'bg-green-100 text-green-800'
                        : manual.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {manual.status === 'ready' ? '✓ Listo' : 
                       manual.status === 'processing' ? '⏳ Procesando' : '⚠ Error'}
                    </span>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <RiFilePdfLine className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{formatFileSize(manual.size)}</p>
                    <p className="text-xs text-gray-600">Tamaño</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <RiBookOpenLine className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{manual.pageCount || '—'}</p>
                    <p className="text-xs text-gray-600">Páginas</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <RiCalendarLine className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-900">{new Date(manual.createdAt).toLocaleDateString('es-ES')}</p>
                    <p className="text-xs text-gray-600">Creado</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <RiUserLine className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-900">Usuario</p>
                    <p className="text-xs text-gray-600">#{manual.userId}</p>
                  </div>
                </div>

                {/* Acciones Principales */}
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleView}
                    disabled={manual.status !== 'ready'}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RiEyeLine className="h-5 w-5" />
                    Ver PDF
                  </button>
                  
                  <button 
                    onClick={handleDownload}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RiDownloadLine className="h-5 w-5" />
                    Descargar
                  </button>

                  <button 
                    onClick={handleEdit}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RiPencilLine className="h-5 w-5" />
                    Editar
                  </button>

                  <button 
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <RiDeleteBinLine className="h-5 w-5" />
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Vista previa del PDF */}
              <div className="lg:w-80">
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <RiFilePdfLine className="h-20 w-20 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Vista previa</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {manual.originalName}
                  </p>
                  <button
                    onClick={handleView}
                    disabled={manual.status !== 'ready'}
                    className="w-full bg-blue-100 hover:bg-blue-200 disabled:bg-gray-200 text-blue-700 disabled:text-gray-500 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RiFullscreenLine className="h-4 w-4" />
                    Abrir visor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Funciones IA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chat IA */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <RiChat3Line className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Inteligente</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Conversa con IA sobre el contenido del manual. Haz preguntas específicas y obtén respuestas inmediatas.
                </p>
                <button 
                  onClick={() => navigate(`/manuals/${id}/chat`)}
                  disabled={manual.status !== 'ready'}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RiChat3Line className="h-4 w-4" />
                  Iniciar Chat
                </button>
              </div>
            </div>
          </div>

          {/* Generar Quiz */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-purple-100 p-3 rounded-xl">
                <RiSparklingLine className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Automático</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Genera evaluaciones automáticamente basadas en el contenido del manual usando IA avanzada.
                </p>
                <button 
                  onClick={() => navigate(`/manuals/${id}/generate-quiz`)}
                  disabled={manual.status !== 'ready'}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RiSparklingLine className="h-4 w-4" />
                  Crear Quiz
                </button>
              </div>
            </div>
          </div>

          {/* Recursos Educativos */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <RiFileListLine className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recursos Educativos</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Genera y gestiona resúmenes IA, guías de estudio y tarjetas interactivas.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/manuals/${id}/resources`)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RiEyeLine className="h-4 w-4" />
                    Ver Recursos
                  </button>
                  <button 
                    onClick={() => navigate(`/manuals/${id}/generate-summary`)}
                    disabled={manual.status !== 'ready'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RiFileListLine className="h-4 w-4" />
                    Crear Nuevo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información técnica (solo para administradores) */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RiSettings3Line className="h-5 w-5 text-gray-600" />
                Información Técnica
              </h2>
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showTechnicalDetails ? 'Ocultar' : 'Mostrar'} detalles
              </button>
            </div>
            
            {showTechnicalDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Original</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{manual.originalName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Archivo</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{manual.filename}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruta del Sistema</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">{manual.path}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MIME</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{manual.mimeType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID del Manual</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{manual.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{manual.tenantId}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visor de PDF Modal */}
        {showPdfViewer && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-6xl w-full h-5/6 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{manual.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`http://localhost:3001${manual.path}`, '_blank')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Abrir en nueva pestaña"
                  >
                    <RiExternalLinkLine className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowPdfViewer(false)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <RiDeleteBinLine className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <iframe
                  src={`http://localhost:3001${manual.path}`}
                  className="w-full h-full"
                  title={manual.title}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <RiAlertLine className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    ¿Eliminar manual?
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                El manual <strong>"{manual.title}"</strong> y todos sus datos asociados serán eliminados permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <RiLoader4Line className="h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <RiDeleteBinLine className="h-4 w-4" />
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