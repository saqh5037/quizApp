import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Upload, 
  BookOpen, 
  Search,
  Plus,
  Download,
  Eye,
  MessageSquare,
  Sparkles,
  Calendar,
  User,
  Loader2
} from 'lucide-react';
import { manualService } from '../../services/manual.service';

const ManualsIndex: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: manualsData, isLoading, isError, error } = useQuery({
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Manuales Inteligentes
              </h1>
              <p className="text-gray-600 mt-2">
                Gestiona y analiza documentos con IA
              </p>
            </div>
            <Link
              to="/manuals/upload"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Subir Manual
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar manuales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Buscar
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Carga de PDFs</h3>
            <p className="text-sm text-gray-600">Sube documentos PDF para análisis</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Chat con IA</h3>
            <p className="text-sm text-gray-600">Pregunta sobre el contenido</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Quiz Automático</h3>
            <p className="text-sm text-gray-600">Genera evaluaciones con IA</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Resúmenes</h3>
            <p className="text-sm text-gray-600">Extrae puntos clave</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Loader2 className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin" />
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
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Error al cargar manuales
            </h3>
            <p className="text-gray-500 mb-6">
              {error?.message || 'Hubo un problema al obtener los manuales'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredManuals.length === 0 && manuals.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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
              <Plus className="w-5 h-5" />
              Subir Primer Manual
            </Link>
          </div>
        )}

        {/* No Search Results */}
        {!isLoading && !isError && filteredManuals.length === 0 && manuals.length > 0 && searchTerm && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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

        {/* Manuals Grid */}
        {!isLoading && !isError && filteredManuals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManuals.map((manual: any) => (
              <div key={manual.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {manual.title}
                    </h3>
                    {manual.description && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {manual.description}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(manual.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{formatFileSize(manual.size)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Link
                      to={`/manuals/${manual.id}`}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </Link>
                    <button className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </button>
                  </div>
                  <button className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <Download className="w-4 h-4" />
                    Descargar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-blue-600" />
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