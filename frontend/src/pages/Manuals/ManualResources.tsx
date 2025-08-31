import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  GraduationCap,
  CreditCard,
  Eye,
  Clock,
  User,
  Calendar,
  Loader2,
  RefreshCw,
  BookOpen,
  Plus,
  Filter
} from 'lucide-react';
import educationalResourcesService, { ResourceList } from '../../services/educationalResourcesService';

const ManualResources: React.FC = () => {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'generating' | 'failed'>('all');

  const { data: resources, isLoading, error, refetch } = useQuery<ResourceList>({
    queryKey: ['manual-resources', manualId],
    queryFn: () => educationalResourcesService.listResources(manualId!),
    enabled: !!manualId,
    refetchInterval: (data) => {
      // Refetch every 3 seconds if there are generating resources
      const hasGenerating = data?.resources && (
        data.resources.summaries.some(r => r.status === 'generating') ||
        data.resources.studyGuides.some(r => r.status === 'generating') ||
        data.resources.flashCards.some(r => r.status === 'generating')
      );
      return hasGenerating ? 3000 : false;
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'ready':
        return <div className="h-2 w-2 bg-green-500 rounded-full" />;
      case 'failed':
        return <div className="h-2 w-2 bg-red-500 rounded-full" />;
      default:
        return <div className="h-2 w-2 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generating':
        return 'Generando...';
      case 'ready':
        return 'Listo';
      case 'failed':
        return 'Error';
      default:
        return 'Desconocido';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterResources = (resources: any[], type: string) => {
    if (filterStatus === 'all') return resources;
    return resources.filter(resource => resource.status === filterStatus);
  };

  const ResourceCard: React.FC<{ 
    resource: any; 
    type: 'summary' | 'study_guide' | 'flash_cards';
    icon: React.ElementType;
    colorClass: string;
  }> = ({ resource, type, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`${colorClass} rounded-lg p-3 mr-4`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {resource.title || resource.set_title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {type === 'summary' && (
                  <span className="capitalize">{resource.summary_type?.replace('_', ' ')}</span>
                )}
                {type === 'study_guide' && (
                  <>
                    <span className="capitalize">{resource.difficulty_level}</span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {resource.estimated_time} min
                    </span>
                  </>
                )}
                {type === 'flash_cards' && (
                  <>
                    <span>{resource.total_cards} tarjetas</span>
                    <span className="capitalize">{resource.difficulty_level}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(resource.status)}
            <span className="text-sm text-gray-600">{getStatusText(resource.status)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            {resource.user.firstName} {resource.user.lastName}
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(resource.created_at)}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => navigate(`/resources/${type}/${resource.id}`)}
            disabled={resource.status !== 'ready'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              resource.status === 'ready'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Eye className="h-4 w-4 inline mr-2" />
            Ver Contenido
          </button>
          
          {resource.status === 'generating' && (
            <div className="flex items-center text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generando con IA...
            </div>
          )}
          
          {resource.status === 'failed' && (
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Cargando recursos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-red-600">Error al cargar los recursos educativos</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allResources = [
    ...filterResources(resources?.resources.summaries || [], 'summary').map(r => ({ ...r, type: 'summary' })),
    ...filterResources(resources?.resources.studyGuides || [], 'study_guide').map(r => ({ ...r, type: 'study_guide' })),
    ...filterResources(resources?.resources.flashCards || [], 'flash_cards').map(r => ({ ...r, type: 'flash_cards' }))
  ];

  const totalCount = (resources?.resources.summaries.length || 0) +
                    (resources?.resources.studyGuides.length || 0) +
                    (resources?.resources.flashCards.length || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/manuals/${manualId}`)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 group"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver al Manual
          </button>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Recursos Educativos
            </h1>
            <p className="text-lg text-gray-600">
              {resources?.manual.title}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} recursos generados
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Filter */}
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-gray-500 mr-2" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="ready">Listos</option>
                  <option value="generating">Generando</option>
                  <option value="failed">Con errores</option>
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Actualizar
              </button>
            </div>

            <Link
              to={`/manuals/${manualId}/generate-summary`}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Crear Nuevo Recurso
            </Link>
          </div>
        </div>

        {/* Resources Grid */}
        {allResources.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No hay recursos creados' : `No hay recursos ${filterStatus === 'ready' ? 'listos' : filterStatus === 'generating' ? 'generándose' : 'con errores'}`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === 'all' 
                ? 'Comienza creando tu primer recurso educativo con IA'
                : 'Prueba cambiando el filtro para ver otros recursos'
              }
            </p>
            {filterStatus === 'all' && (
              <Link
                to={`/manuals/${manualId}/generate-summary`}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crear Primer Recurso
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Summaries */}
            {filterResources(resources?.resources.summaries || [], 'summary').map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                type="summary"
                icon={FileText}
                colorClass="bg-blue-500"
              />
            ))}

            {/* Study Guides */}
            {filterResources(resources?.resources.studyGuides || [], 'study_guide').map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                type="study_guide"
                icon={GraduationCap}
                colorClass="bg-green-500"
              />
            ))}

            {/* Flash Cards */}
            {filterResources(resources?.resources.flashCards || [], 'flash_cards').map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                type="flash_cards"
                icon={CreditCard}
                colorClass="bg-purple-500"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualResources;