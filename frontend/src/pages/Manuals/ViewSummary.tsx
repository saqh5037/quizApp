import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Loader2,
  Download,
  Share2,
  BookOpen,
  Clock,
  Hash
} from 'lucide-react';
import educationalResourcesService from '../../services/educationalResourcesService';
import toast from 'react-hot-toast';

const ViewSummary: React.FC = () => {
  const { summaryId } = useParams<{ summaryId: string }>();
  const navigate = useNavigate();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['summary', summaryId],
    queryFn: () => educationalResourcesService.getResource('summary', summaryId!),
    enabled: !!summaryId,
    refetchInterval: (data) => {
      // Refetch every 2 seconds if still generating
      return data?.status === 'generating' ? 2000 : false;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSummaryTypeLabel = (type: string) => {
    switch (type) {
      case 'brief': return 'Resumen Breve';
      case 'detailed': return 'Resumen Detallado';
      case 'key_points': return 'Puntos Clave';
      default: return 'Resumen';
    }
  };

  const handleDownload = () => {
    if (!summary?.content) return;
    
    const blob = new Blob([summary.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Resumen descargado');
  };

  const handleShare = () => {
    if (navigator.share && summary) {
      navigator.share({
        title: summary.title,
        text: summary.content?.substring(0, 200) + '...',
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando resumen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error al cargar el resumen</h2>
            <p className="text-red-600">No se pudo cargar el resumen solicitado.</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (summary?.status === 'generating') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Generando Resumen con IA
            </h2>
            <p className="text-gray-600 mb-6">
              Nuestro asistente de IA está analizando el contenido del manual y creando un resumen personalizado. 
              Esto puede tomar unos momentos.
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Consejo:</strong> Los resúmenes generados por IA capturan los puntos más importantes 
                del documento de manera concisa y estructurada.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (summary?.status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error al generar el resumen</h2>
            <p className="text-red-600">
              Hubo un problema al generar el resumen. Por favor, intenta crear uno nuevo.
            </p>
            <button
              onClick={() => navigate(`/manuals/${summary.manual?.id}/generate-summary`)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/manuals/${summary?.manual?.id}/resources`)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-600">
                  {getSummaryTypeLabel(summary?.summary_type || '')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Descargar resumen"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Compartir resumen"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Title and Meta */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {summary?.title}
          </h1>
          
          {/* Manual Info */}
          {summary?.manual && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Manual origen:</span>
                <Link 
                  to={`/manuals/${summary.manual.id}`}
                  className="hover:underline"
                >
                  {summary.manual.title}
                </Link>
              </div>
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {summary?.user && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{summary.user.firstName} {summary.user.lastName}</span>
              </div>
            )}
            {summary?.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(summary.created_at)}</span>
              </div>
            )}
            {summary?.word_count && (
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                <span>{summary.word_count} palabras</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              {summary?.content?.split('\n').map((paragraph, index) => (
                paragraph.trim() && (
                  <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate(`/manuals/${summary?.manual?.id}/resources`)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Ver Todos los Recursos
          </button>
          <button
            onClick={() => navigate(`/manuals/${summary?.manual?.id}/generate-summary`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generar Nuevo Recurso
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewSummary;