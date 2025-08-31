import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  RiFileTextLine,
  RiUploadLine,
  RiBookOpenLine,
  RiSearchLine,
  RiAddLine,
  RiDownloadLine,
  RiEyeLine,
  RiChat3Line,
  RiSparklingLine,
  RiCalendarLine,
  RiUserLine,
  RiLoader4Line,
  RiPencilLine,
  RiDeleteBinLine,
  RiFilePdfLine,
  RiQuestionLine,
  RiFileListLine
} from 'react-icons/ri';
import { manualService } from '../../services/manual.service';
import toast from 'react-hot-toast';

const ManualsIndex: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: manualsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['manuals'],
    queryFn: () => manualService.getManuals(),
  });

  const manuals = manualsData?.data || [];
  
  const filteredManuals = manuals.filter((manual: any) =>
    manual.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manual.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDeleteManual = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este manual?')) {
      try {
        await manualService.deleteManual(id);
        toast.success('Manual eliminado exitosamente');
        refetch();
      } catch (error) {
        toast.error('Error al eliminar el manual');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <RiFileTextLine className="text-3xl text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Manuales Inteligentes
                </h1>
                <p className="text-sm text-gray-600">
                  Gestiona y analiza documentos con IA
                </p>
              </div>
            </div>
            <Link
              to="/manuals/upload"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md inline-flex items-center gap-2"
            >
              <RiUploadLine size={18} />
              Subir Manual
            </Link>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar manuales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Manuales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{manuals.length}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <RiBookOpenLine className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Con IA Chat</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {manuals.filter((m: any) => m.status === 'ready').length}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <RiChat3Line className="text-green-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Quiz Generados</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {manuals.filter((m: any) => m.hasQuiz).length || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <RiSparklingLine className="text-purple-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Tamaño Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatFileSize(manuals.reduce((acc: number, m: any) => acc + (m.size || 0), 0))}
                </p>
              </div>
              <div className="bg-orange-100 p-2 rounded-lg">
                <RiFilePdfLine className="text-orange-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
            <RiLoader4Line className="animate-spin text-6xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Cargando manuales...
            </h3>
            <p className="text-gray-500">
              Obteniendo la lista de manuales de la base de datos
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
            <RiFileTextLine className="text-6xl text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Error al cargar manuales
            </h3>
            <p className="text-gray-500 mb-6">
              {error?.message || 'Hubo un problema al obtener los manuales'}
            </p>
            <button 
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredManuals.length === 0 && manuals.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
            <RiFileTextLine className="text-6xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay manuales disponibles
            </h3>
            <p className="text-gray-500 mb-6">
              Comienza subiendo tu primer manual para usar las funciones de IA
            </p>
            <Link
              to="/manuals/upload"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RiAddLine size={20} />
              Subir Primer Manual
            </Link>
          </div>
        )}

        {/* No Search Results */}
        {!isLoading && !isError && filteredManuals.length === 0 && manuals.length > 0 && searchTerm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
            <RiSearchLine className="text-6xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-gray-500 mb-6">
              No hay manuales que coincidan con "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {/* Manuals List View */}
        {!isLoading && !isError && filteredManuals.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-50 via-white via-50% to-blue-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-2/5">
                      Manual
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-2/5">
                      Información
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredManuals.map((manual: any) => (
                    <tr key={manual.id} className="hover:bg-blue-50/30 transition-colors bg-gradient-to-r from-blue-50/50 via-white via-50% to-blue-50/50">
                      {/* Columna Manual */}
                      <td className="px-4 py-3 w-2/5">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            {manual.title}
                          </h4>
                          <p className="text-xs text-gray-500 truncate max-w-sm" title={manual.description}>
                            {manual.description && manual.description.length > 60 
                              ? `${manual.description.substring(0, 60)}...` 
                              : manual.description || 'Sin descripción'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                              manual.status === 'ready' 
                                ? 'bg-green-100 text-green-700'
                                : manual.status === 'processing'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {manual.status === 'ready' ? 'Listo' : 
                               manual.status === 'processing' ? 'Procesando' : 'Error'}
                            </span>
                            {manual.hasQuiz && (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                                <RiQuestionLine size={12} />
                                Quiz generado
                              </span>
                            )}
                            {manual.hasSummary && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                                <RiFileListLine size={12} />
                                Resumen
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Columna Información */}
                      <td className="px-4 py-3 w-2/5">
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1" title="Tamaño">
                            <RiFilePdfLine size={16} className="text-red-500" />
                            <span className="font-semibold text-sm text-gray-900">{formatFileSize(manual.size)}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Páginas">
                            <RiBookOpenLine size={16} className="text-blue-500" />
                            <span className="font-semibold text-sm text-gray-900">{manual.pageCount || 0}</span>
                            <span className="text-xs text-gray-500">páginas</span>
                          </div>
                          <div className="flex items-center gap-1" title="Fecha de carga">
                            <RiCalendarLine size={16} className="text-green-500" />
                            <span className="text-xs text-gray-600">{formatDate(manual.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Columna Acciones */}
                      <td className="px-4 py-3 w-1/5">
                        <div className="flex items-center justify-center gap-1">
                          <Link to={`/manuals/${manual.id}`}>
                            <button 
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
                              title="Ver detalles"
                            >
                              <RiEyeLine size={18} />
                              <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Ver detalles
                              </span>
                            </button>
                          </Link>
                          <Link to={`/manuals/${manual.id}/chat`}>
                            <button 
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors group relative"
                              title="Chat IA"
                              disabled={manual.status !== 'ready'}
                            >
                              <RiChat3Line size={18} />
                              <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Chat IA
                              </span>
                            </button>
                          </Link>
                          <Link to={`/manuals/${manual.id}/generate-quiz`}>
                            <button 
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors group relative"
                              title="Generar Quiz"
                              disabled={manual.status !== 'ready'}
                            >
                              <RiSparklingLine size={18} />
                              <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Generar Quiz
                              </span>
                            </button>
                          </Link>
                          <button
                            onClick={() => window.open(manual.fileUrl, '_blank')}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group relative"
                            title="Descargar"
                          >
                            <RiDownloadLine size={18} />
                            <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Descargar
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteManual(manual.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                            title="Eliminar"
                          >
                            <RiDeleteBinLine size={18} />
                            <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Eliminar
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <RiSparklingLine className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                Funcionalidad de IA Avanzada
              </h4>
              <p className="text-sm text-blue-700">
                Esta sección utiliza inteligencia artificial para analizar documentos, 
                responder preguntas, generar evaluaciones y extraer información clave de 
                tus manuales y documentos PDF.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualsIndex;