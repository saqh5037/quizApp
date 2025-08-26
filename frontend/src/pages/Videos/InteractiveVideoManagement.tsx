import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Play, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Loader,
  AlertCircle,
  BarChart,
  QrCode
} from 'lucide-react';
import { interactiveVideoService } from '../../services/interactive-video.service';
import { videoService } from '../../services/video.service';
import InteractiveVideoWrapper from '../../components/videos/InteractiveVideoWrapper';
import InteractiveVideoResults from '../../components/videos/InteractiveVideoResults';
import InteractiveContentGenerator from '../../components/videos/InteractiveContentGenerator';
import VideoShareModal from '../../components/video/VideoShareModal';
import toast from 'react-hot-toast';

const InteractiveVideoManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const videoId = id;
  const navigate = useNavigate();
  
  const [video, setVideo] = useState<any>(null);
  const [interactiveLayer, setInteractiveLayer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sessionResults, setSessionResults] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [config, setConfig] = useState({
    isEnabled: true,
    autoPause: true,
    requireAnswers: true,
    passingScore: 70,
    maxAttempts: 3
  });

  useEffect(() => {
    if (videoId) {
      loadVideoAndLayer();
    }
  }, [videoId]);

  const loadVideoAndLayer = async () => {
    try {
      setIsLoading(true);
      
      // Cargar información del video
      const videoData = await videoService.getVideo(parseInt(videoId!));
      setVideo(videoData);
      
      // Intentar cargar capa interactiva
      try {
        const layer = await interactiveVideoService.getInteractiveLayer(parseInt(videoId!));
        setInteractiveLayer(layer);
        setConfig({
          isEnabled: layer.isEnabled,
          autoPause: layer.autoPause,
          requireAnswers: layer.requireAnswers,
          passingScore: layer.passingScore,
          maxAttempts: layer.maxAttempts
        });
        
        // Si hay capa, cargar analytics
        if (layer.id) {
          loadAnalytics(layer.id);
        }
      } catch (error) {
        console.log('No interactive layer found');
      }
      
    } catch (error) {
      console.error('Error loading video:', error);
      toast.error('Error al cargar el video');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async (layerId: number) => {
    try {
      const data = await interactiveVideoService.getVideoAnalytics(layerId);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleCreateLayer = async () => {
    try {
      const layer = await interactiveVideoService.createInteractiveLayer(
        parseInt(videoId!), 
        config
      );
      setInteractiveLayer(layer);
      toast.success('Capa interactiva creada');
      
      // Iniciar procesamiento automáticamente
      handleProcessVideo(layer.id);
    } catch (error) {
      console.error('Error creating layer:', error);
      toast.error('Error al crear capa interactiva');
    }
  };

  const handleUpdateConfig = async () => {
    if (!interactiveLayer) return;
    
    try {
      await interactiveVideoService.updateInteractiveLayer(
        interactiveLayer.id,
        config
      );
      toast.success('Configuración actualizada');
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Error al actualizar configuración');
    }
  };

  const handleProcessVideo = async (layerId?: number) => {
    const id = layerId || interactiveLayer?.id;
    if (!id) return;
    
    try {
      setIsProcessing(true);
      await interactiveVideoService.processVideoWithAI(id, false);
      toast.success('Procesamiento iniciado');
      
      // Poll para actualizar estado
      const timer = interactiveVideoService.pollProcessingStatus(
        id,
        (status) => {
          if (status === 'ready') {
            setIsProcessing(false);
            loadVideoAndLayer();
            toast.success('Video procesado exitosamente');
          } else if (status === 'error') {
            setIsProcessing(false);
            toast.error('Error al procesar video');
          }
        }
      );
      
      // Cleanup en caso de que el componente se desmonte
      return () => clearInterval(timer);
    } catch (error) {
      console.error('Error processing video:', error);
      toast.error('Error al procesar video');
      setIsProcessing(false);
    }
  };

  const handleVideoComplete = (results: any) => {
    setSessionResults(results.result);
    setShowResults(true);
    setShowPlayer(false);
  };

  const handleRetry = () => {
    setShowResults(false);
    setShowPlayer(true);
  };

  const getStatusBadge = () => {
    if (!interactiveLayer) {
      return (
        <span className="px-3 py-1 bg-gray-600 text-gray-200 rounded-full text-sm">
          Sin capa interactiva
        </span>
      );
    }
    
    switch (interactiveLayer.processingStatus) {
      case 'ready':
        return (
          <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            Listo
          </span>
        );
      case 'processing':
        return (
          <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm flex items-center">
            <Loader className="w-4 h-4 mr-1 animate-spin" />
            Procesando
          </span>
        );
      case 'error':
        return (
          <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm flex items-center">
            <XCircle className="w-4 h-4 mr-1" />
            Error
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Pendiente
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (showPlayer && interactiveLayer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => setShowPlayer(false)}
          className="mb-4 text-gray-400 hover:text-white"
        >
          ← Volver
        </button>
        
        <InteractiveVideoWrapper
          videoId={parseInt(videoId!)}
          videoUrl={video.streamUrl || video.hlsPlaylistUrl || ''}
          videoTitle={video.title}
          onComplete={handleVideoComplete}
        />
      </div>
    );
  }

  if (showResults && sessionResults) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <InteractiveVideoResults
          results={sessionResults}
          onRetry={handleRetry}
          onClose={() => {
            setShowResults(false);
            loadAnalytics(interactiveLayer.id);
          }}
        />
      </div>
    );
  }

  if (showGenerator) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => setShowGenerator(false)}
          className="mb-4 text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← Volver a configuración
        </button>
        
        <InteractiveContentGenerator
          videoId={parseInt(videoId!)}
          layerId={interactiveLayer?.id}
          onComplete={() => {
            setShowGenerator(false);
            loadVideoAndLayer(); // Refresh data after generation
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Gestión de Video Interactivo
        </h1>
        <div className="flex items-center space-x-4">
          <h2 className="text-xl text-gray-400">{video?.title}</h2>
          {getStatusBadge()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Preview */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Vista Previa</h3>
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
            {video?.thumbnailUrl ? (
              <img 
                src={video.thumbnailUrl} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Play className="w-16 h-16 text-gray-600" />
              </div>
            )}
          </div>
          
          <div className="space-y-2 text-sm text-gray-400">
            <p>Duración: {Math.floor((video?.durationSeconds || 0) / 60)}:{((video?.durationSeconds || 0) % 60).toString().padStart(2, '0')}</p>
            <p>Formato: MP4</p>
            <p>Tamaño: {((parseInt(video?.fileSizeBytes || '0')) / (1024 * 1024)).toFixed(2)} MB</p>
          </div>

          {interactiveLayer?.processingStatus === 'ready' && (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setShowPlayer(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Reproducir Modo Interactivo
              </button>
              
              <button
                onClick={() => setShowShareModal(true)}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Compartir con QR
              </button>
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configuración
          </h3>

          {!interactiveLayer ? (
            <div className="text-center py-8">
              <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                No hay capa interactiva configurada para este video
              </p>
              <button
                onClick={handleCreateLayer}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Crear Capa Interactiva
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Habilitado</label>
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300">Pausar automáticamente</label>
                <input
                  type="checkbox"
                  checked={config.autoPause}
                  onChange={(e) => setConfig({ ...config, autoPause: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300">Requerir respuestas</label>
                <input
                  type="checkbox"
                  checked={config.requireAnswers}
                  onChange={(e) => setConfig({ ...config, requireAnswers: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-2">
                  Puntaje mínimo: {config.passingScore}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.passingScore}
                  onChange={(e) => setConfig({ ...config, passingScore: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-2">Intentos máximos</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxAttempts}
                  onChange={(e) => setConfig({ ...config, maxAttempts: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleUpdateConfig}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>

                <button
                  onClick={() => setShowGenerator(true)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 flex items-center justify-center"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Generar con IA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Generated Content */}
      {interactiveLayer?.aiGeneratedContent?.keyMoments && (
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Contenido Generado por IA
          </h3>
          
          <div className="mb-4">
            <p className="text-gray-400 mb-2">
              <strong>Resumen:</strong> {interactiveLayer.aiGeneratedContent.summary}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {interactiveLayer.aiGeneratedContent.topics?.map((topic: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* Transcription Section */}
          {interactiveLayer.aiGeneratedContent.transcription && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-white mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Transcripción del Video
              </h4>
              
              {/* Full transcription text */}
              {(interactiveLayer.aiGeneratedContent.transcription.fullText || 
                interactiveLayer.aiGeneratedContent.transcription) && (
                <div className="bg-gray-700 p-4 rounded-lg mb-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Transcripción Completa</h5>
                  <div className="max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {interactiveLayer.aiGeneratedContent.transcription.fullText || 
                       interactiveLayer.aiGeneratedContent.transcription}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Transcription segments with timestamps */}
              {interactiveLayer.aiGeneratedContent.transcriptionSegments && 
               interactiveLayer.aiGeneratedContent.transcriptionSegments.length > 0 && (
                <div className="bg-gray-750 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Segmentos por Tiempo
                  </h5>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {interactiveLayer.aiGeneratedContent.transcriptionSegments.map((segment: any, idx: number) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-400 bg-blue-900 rounded">
                            {Math.floor(segment.start / 60).toString().padStart(2, '0')}:
                            {Math.floor(segment.start % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-300">
                            {segment.text}
                          </p>
                          <span className="text-xs text-gray-500 mt-1 inline-block">
                            Duración: {Math.round(segment.end - segment.start)}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <h4 className="text-md font-medium text-white mb-3">
            Momentos Clave ({interactiveLayer.aiGeneratedContent.keyMoments.length})
          </h4>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {interactiveLayer.aiGeneratedContent.keyMoments.map((moment: any) => (
              <div key={moment.id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-medium text-white">{moment.title}</h5>
                    <p className="text-sm text-gray-400">
                      {Math.floor(moment.timestamp / 60)}:{(moment.timestamp % 60).toString().padStart(2, '0')} - 
                      {' ' + moment.type} - Dificultad: {moment.question.difficulty}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-2">{moment.question.text}</p>
                {moment.question.options && (
                  <div className="text-xs text-gray-400">
                    {moment.question.options.map((opt: string, i: number) => (
                      <div key={i} className={opt === moment.question.correctAnswer ? 'text-green-400' : ''}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics */}
      {analytics && (
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart className="w-5 h-5 mr-2" />
            Analíticas
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Sesiones Totales</p>
              <p className="text-2xl font-bold text-white">{analytics.totalSessions}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Completadas</p>
              <p className="text-2xl font-bold text-white">{analytics.completedSessions}</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Puntuación Promedio</p>
              <p className="text-2xl font-bold text-white">{analytics.averageScore.toFixed(1)}%</p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Tasa de Aprobación</p>
              <p className="text-2xl font-bold text-white">{(analytics.passRate * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && video && (
        <VideoShareModal
          videoId={parseInt(videoId!)}
          videoTitle={video.title}
          isInteractive={true}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default InteractiveVideoManagement;