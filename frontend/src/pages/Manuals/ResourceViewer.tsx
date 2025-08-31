import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  GraduationCap,
  CreditCard,
  User,
  Calendar,
  Clock,
  Target,
  Hash,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Loader2,
  BookOpen,
  Eye,
  Lock
} from 'lucide-react';
import educationalResourcesService, { ResourceContent } from '../../services/educationalResourcesService';

const ResourceViewer: React.FC = () => {
  const { resourceType, resourceId } = useParams<{ resourceType: string; resourceId: string }>();
  const navigate = useNavigate();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardStats, setCardStats] = useState({ correct: 0, incorrect: 0 });

  const { data: resource, isLoading, error } = useQuery<ResourceContent>({
    queryKey: ['resource', resourceType, resourceId],
    queryFn: () => educationalResourcesService.getResource(
      resourceType as 'summary' | 'study_guide' | 'flash_cards',
      resourceId!
    ),
    enabled: !!resourceType && !!resourceId
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCardAnswer = (isCorrect: boolean) => {
    setCardStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1)
    }));
    setShowAnswer(false);
    
    // Auto-advance to next card after a short delay
    setTimeout(() => {
      if (currentCardIndex < (resource?.cards?.length || 0) - 1) {
        setCurrentCardIndex(prev => prev + 1);
      }
    }, 1000);
  };

  const resetCardSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setCardStats({ correct: 0, incorrect: 0 });
  };

  const getResourceIcon = () => {
    switch (resourceType) {
      case 'summary':
        return <FileText className="h-6 w-6 text-blue-600" />;
      case 'study_guide':
        return <GraduationCap className="h-6 w-6 text-green-600" />;
      case 'flash_cards':
        return <CreditCard className="h-6 w-6 text-purple-600" />;
      default:
        return <BookOpen className="h-6 w-6 text-gray-600" />;
    }
  };

  const getResourceTitle = () => {
    switch (resourceType) {
      case 'summary':
        return 'Resumen IA';
      case 'study_guide':
        return 'Guía de Estudio';
      case 'flash_cards':
        return 'Tarjetas de Estudio';
      default:
        return 'Recurso Educativo';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Cargando recurso...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Error al cargar el recurso educativo</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resource.status === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generando Recurso</h2>
            <p className="text-gray-600">La IA está creando tu contenido educativo. Esto puede tomar unos minutos.</p>
          </div>
        </div>
      </div>
    );
  }

  if (resource.status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error en la Generación</h2>
            <p className="text-gray-600 mb-6">Hubo un problema al generar este recurso. Intenta crear uno nuevo.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = resource.cards?.[currentCardIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/manuals/${resource.manual?.id}/resources`)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 group"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver a Recursos
          </button>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-gray-100 rounded-lg p-3 mr-4">
                  {getResourceIcon()}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {resource.title || resource.set_title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {getResourceTitle()}
                    </span>
                    {resource.is_public ? (
                      <span className="flex items-center text-green-600">
                        <Eye className="h-4 w-4 mr-1" />
                        Público
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-500">
                        <Lock className="h-4 w-4 mr-1" />
                        Privado
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                  <Download className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                {resource.user?.firstName} {resource.user?.lastName}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(resource.created_at)}
              </div>
              {resourceType === 'summary' && (
                <div className="flex items-center">
                  <Hash className="h-4 w-4 mr-2" />
                  {resource.word_count} palabras
                </div>
              )}
              {resourceType === 'study_guide' && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {resource.estimated_time} minutos
                </div>
              )}
              {resourceType === 'flash_cards' && (
                <div className="flex items-center">
                  <Hash className="h-4 w-4 mr-2" />
                  {resource.total_cards} tarjetas
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Summary Content */}
          {resourceType === 'summary' && (
            <div className="prose max-w-none">
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {resource.summary_type?.replace('_', ' ').charAt(0).toUpperCase() + resource.summary_type?.replace('_', ' ').slice(1)}
                </span>
              </div>
              <div 
                className="text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: resource.content?.replace(/\n/g, '<br/>') || '' }}
              />
            </div>
          )}

          {/* Study Guide Content */}
          {resourceType === 'study_guide' && (
            <div>
              <div className="mb-6 flex flex-wrap gap-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  resource.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800' :
                  resource.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {resource.difficulty_level?.charAt(0).toUpperCase() + resource.difficulty_level?.slice(1)}
                </span>
                
                {resource.topics && resource.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {resource.topics.map((topic, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {resource.learning_objectives && resource.learning_objectives.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-green-600" />
                    Objetivos de Aprendizaje
                  </h3>
                  <ul className="space-y-2">
                    {resource.learning_objectives.map((objective, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="prose max-w-none">
                <div 
                  className="text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: resource.content?.replace(/\n/g, '<br/>') || '' }}
                />
              </div>
            </div>
          )}

          {/* Flash Cards Content */}
          {resourceType === 'flash_cards' && resource.cards && (
            <div>
              {/* Stats */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{cardStats.correct}</div>
                    <div className="text-sm text-gray-600">Correctas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{cardStats.incorrect}</div>
                    <div className="text-sm text-gray-600">Incorrectas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentCardIndex + 1}</div>
                    <div className="text-sm text-gray-600">de {resource.cards.length}</div>
                  </div>
                </div>
                
                <button
                  onClick={resetCardSession}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reiniciar
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentCardIndex + 1) / resource.cards.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Card */}
              {currentCard && (
                <div className="mb-6">
                  <div 
                    className={`min-h-[300px] bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white cursor-pointer transition-transform hover:scale-[1.02] ${
                      showAnswer ? 'transform rotateY-180' : ''
                    }`}
                    onClick={() => setShowAnswer(!showAnswer)}
                  >
                    <div className="text-center h-full flex items-center justify-center">
                      {!showAnswer ? (
                        <div>
                          <div className="text-sm opacity-90 mb-4">PREGUNTA</div>
                          <div className="text-2xl font-semibold leading-relaxed">
                            {currentCard.front}
                          </div>
                          <div className="text-sm opacity-75 mt-6">Toca para ver la respuesta</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm opacity-90 mb-4">RESPUESTA</div>
                          <div className="text-xl leading-relaxed mb-4">
                            {currentCard.back}
                          </div>
                          {currentCard.hints && (
                            <div className="text-sm opacity-75 italic">
                              💡 {currentCard.hints}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Answer Buttons */}
                  {showAnswer && (
                    <div className="flex justify-center gap-4 mt-6">
                      <button
                        onClick={() => handleCardAnswer(false)}
                        className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                      >
                        <X className="h-5 w-5 mr-2" />
                        No sabía
                      </button>
                      <button
                        onClick={() => handleCardAnswer(true)}
                        className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Lo sabía
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setCurrentCardIndex(prev => Math.max(0, prev - 1));
                    setShowAnswer(false);
                  }}
                  disabled={currentCardIndex === 0}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  Anterior
                </button>

                <div className="text-sm text-gray-600">
                  {currentCard?.category && (
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {currentCard.category}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setCurrentCardIndex(prev => Math.min(resource.cards!.length - 1, prev + 1));
                    setShowAnswer(false);
                  }}
                  disabled={currentCardIndex === resource.cards.length - 1}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="h-5 w-5 ml-1" />
                </button>
              </div>

              {/* Session Complete */}
              {currentCardIndex === resource.cards.length - 1 && showAnswer && (
                <div className="mt-8 text-center bg-green-50 border border-green-200 rounded-xl p-6">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    ¡Sesión Completada!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Has completado todas las tarjetas. Puntuación: {cardStats.correct} de {resource.cards.length}
                  </p>
                  <button
                    onClick={resetCardSession}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
                  >
                    Estudiar de Nuevo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceViewer;