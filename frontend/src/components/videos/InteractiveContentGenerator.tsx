import React, { useState, useEffect } from 'react';
import { interactiveVideoService } from '../../services/interactive-video.service';
import { apiConfig } from '../../config/api.config';
import { useAuthStore } from '../../stores/authStore';
import { Play, Settings, Loader, AlertCircle, CheckCircle, FileText, Brain, HelpCircle } from 'lucide-react';

interface InteractiveContentGeneratorProps {
  videoId: number;
  layerId?: number;
  onComplete?: () => void;
}

const InteractiveContentGenerator: React.FC<InteractiveContentGeneratorProps> = ({
  videoId,
  layerId: initialLayerId,
  onComplete
}) => {
  const { accessToken } = useAuthStore();
  const [layerId, setLayerId] = useState<number | null>(initialLayerId || null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [questionTypes, setQuestionTypes] = useState({
    multiple_choice: true,
    true_false: false,
    short_answer: false
  });
  const [focusAreas, setFocusAreas] = useState<string>('');
  
  // Processing state
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  useEffect(() => {
    checkExistingLayer();
    
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [videoId]);

  const checkExistingLayer = async () => {
    try {
      const layer = await interactiveVideoService.getInteractiveLayer(videoId);
      if (layer) {
        setLayerId(layer.id);
        
        // Check if it has content
        if (layer.aiGeneratedContent?.keyMoments?.length > 0) {
          setGeneratedQuestions(layer.aiGeneratedContent.keyMoments);
          setTranscription(layer.aiGeneratedContent.transcription);
        }
        
        if (layer.processingStatus === 'processing') {
          startStatusChecking(layer.id);
        }
      }
    } catch (error) {
      console.log('No existing layer found');
    }
  };

  const createInteractiveLayer = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiConfig.baseURL}/interactive-video/videos/${videoId}/interactive-layer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          isEnabled: true,
          autoPause: true,
          requireAnswers: false,
          passingScore: 70,
          maxAttempts: 3
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear capa interactiva');
      }
      
      setLayerId(data.data.id);
      setIsCreating(false);
      
    } catch (error: any) {
      setError(error.message);
      setIsCreating(false);
    }
  };

  const generateContent = async () => {
    if (!layerId) {
      await createInteractiveLayer();
      if (!layerId) return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    const selectedTypes = Object.entries(questionTypes)
      .filter(([_, selected]) => selected)
      .map(([type, _]) => type);
    
    const focusAreasArray = focusAreas
      .split(',')
      .map(area => area.trim())
      .filter(area => area.length > 0);
    
    try {
      const response = await fetch(`${apiConfig.baseURL}/interactive-video/interactive-layers/${layerId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          numberOfQuestions,
          difficulty,
          questionTypes: selectedTypes,
          focusAreas: focusAreasArray
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al generar contenido');
      }
      
      setProcessingStatus('processing');
      startStatusChecking(layerId);
      
    } catch (error: any) {
      setError(error.message);
      setIsGenerating(false);
    }
  };

  const startStatusChecking = (id: number) => {
    // Don't start polling if id is invalid
    if (!id || id <= 0) {
      console.warn('Invalid layer ID, skipping status checking');
      return;
    }
    
    // Clear any existing interval before starting a new one
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiConfig.baseURL}/interactive-video/interactive-layers/${id}/status`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        // If we get 404, stop polling
        if (response.status === 404) {
          console.log('Layer not found, stopping status checks');
          clearInterval(interval);
          setIsGenerating(false);
          setProcessingStatus(null);
          return;
        }
        
        const data = await response.json();
        
        setProcessingStatus(data.status);
        
        // Update progress based on processing status
        if (data.processingLog) {
          setProcessingStep(data.processingLog);
          
          // Calculate approximate progress
          if (data.processingLog.includes('Extrayendo audio')) {
            setProcessingProgress(25);
          } else if (data.processingLog.includes('Transcribiendo')) {
            setProcessingProgress(50);
          } else if (data.processingLog.includes('Generando preguntas')) {
            setProcessingProgress(75);
          } else if (data.processingLog.includes('completado')) {
            setProcessingProgress(100);
          }
        }
        
        if (data.status === 'ready') {
          clearInterval(interval);
          setIsGenerating(false);
          
          // Load the generated content
          const layer = await interactiveVideoService.getInteractiveLayer(videoId);
          if (layer?.aiGeneratedContent) {
            setGeneratedQuestions(layer.aiGeneratedContent.keyMoments || []);
            setTranscription(layer.aiGeneratedContent.transcription);
          }
          
          if (onComplete) {
            onComplete();
          }
        } else if (data.status === 'error') {
          clearInterval(interval);
          setIsGenerating(false);
          setError(data.error || 'Error durante el procesamiento');
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 3000); // Check every 3 seconds
    
    setStatusCheckInterval(interval);
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Brain className="text-orange-500" />
        Generador de Contenido Interactivo con IA
      </h2>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex items-start gap-2">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Layer Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Settings className="text-gray-400" />
            <div>
              <p className="text-white font-medium">Capa Interactiva</p>
              <p className="text-sm text-gray-400">
                {layerId ? `ID: ${layerId}` : 'No creada'}
              </p>
            </div>
          </div>
          {!layerId && (
            <button
              onClick={createInteractiveLayer}
              disabled={isCreating}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {isCreating ? 'Creando...' : 'Crear Capa'}
            </button>
          )}
          {layerId && (
            <CheckCircle className="text-green-500" />
          )}
        </div>
      </div>

      {/* Step 2: Configuration Form */}
      {layerId && !isGenerating && processingStatus !== 'processing' && (
        <div className="space-y-6">
          <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">
              Configuración de Generación
            </h3>
            
            {/* Number of Questions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número de Preguntas
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Las preguntas se distribuirán uniformemente a lo largo del video
              </p>
            </div>

            {/* Difficulty */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="easy">Fácil</option>
                <option value="medium">Medio</option>
                <option value="hard">Difícil</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>

            {/* Question Types */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipos de Pregunta
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={questionTypes.multiple_choice}
                    onChange={(e) => setQuestionTypes({
                      ...questionTypes,
                      multiple_choice: e.target.checked
                    })}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  Opción Múltiple
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={questionTypes.true_false}
                    onChange={(e) => setQuestionTypes({
                      ...questionTypes,
                      true_false: e.target.checked
                    })}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  Verdadero/Falso
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={questionTypes.short_answer}
                    onChange={(e) => setQuestionTypes({
                      ...questionTypes,
                      short_answer: e.target.checked
                    })}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  Respuesta Corta
                </label>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Áreas de Enfoque (opcional)
              </label>
              <input
                type="text"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="Ej: conceptos clave, ejemplos prácticos, definiciones"
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Separa las áreas con comas
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateContent}
              disabled={!Object.values(questionTypes).some(v => v)}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Brain size={20} />
              Generar Contenido Interactivo
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing Status */}
      {(isGenerating || processingStatus === 'processing') && (
        <div className="bg-gray-700 p-6 rounded-lg">
          <div className="flex items-center justify-center mb-4">
            <Loader className="animate-spin text-orange-500" size={48} />
          </div>
          <h3 className="text-lg font-semibold text-white text-center mb-2">
            Procesando Video...
          </h3>
          <p className="text-gray-300 text-center mb-4">
            {processingStep || 'Iniciando procesamiento...'}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 text-center">
            {processingProgress}% completado
          </p>
          
          {/* Processing Steps */}
          <div className="mt-6 space-y-2">
            <div className={`flex items-center gap-2 ${processingProgress >= 25 ? 'text-green-400' : 'text-gray-500'}`}>
              {processingProgress >= 25 ? <CheckCircle size={16} /> : <Loader size={16} className="animate-spin" />}
              <span className="text-sm">Extrayendo audio del video</span>
            </div>
            <div className={`flex items-center gap-2 ${processingProgress >= 50 ? 'text-green-400' : 'text-gray-500'}`}>
              {processingProgress >= 50 ? <CheckCircle size={16} /> : <Loader size={16} className={processingProgress >= 25 ? 'animate-spin' : ''} />}
              <span className="text-sm">Transcribiendo contenido</span>
            </div>
            <div className={`flex items-center gap-2 ${processingProgress >= 75 ? 'text-green-400' : 'text-gray-500'}`}>
              {processingProgress >= 75 ? <CheckCircle size={16} /> : <Loader size={16} className={processingProgress >= 50 ? 'animate-spin' : ''} />}
              <span className="text-sm">Generando preguntas con IA</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-400 text-center mt-4">
            Este proceso puede tomar varios minutos dependiendo de la duración del video.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-300">
              <div className={`w-4 h-4 rounded-full ${processingStatus === 'processing' ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'}`} />
              <span>Extrayendo audio del video</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className={`w-4 h-4 rounded-full ${processingStatus === 'transcribing' ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'}`} />
              <span>Transcribiendo contenido</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className={`w-4 h-4 rounded-full ${processingStatus === 'generating' ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'}`} />
              <span>Generando preguntas con IA</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-6">
          {/* Transcription Preview */}
          {transcription && (
            <div className="bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="text-orange-500" />
                Transcripción
              </h3>
              <div className="bg-gray-800 p-4 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {transcription.substring(0, 500)}
                  {transcription.length > 500 && '...'}
                </p>
              </div>
            </div>
          )}

          {/* Generated Questions */}
          <div className="bg-gray-700 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="text-orange-500" />
              Preguntas Generadas ({generatedQuestions.length})
            </h3>
            <div className="space-y-4">
              {generatedQuestions.map((moment, index) => (
                <div key={moment.id || index} className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {index + 1}. {moment.title}
                      </p>
                      <p className="text-sm text-gray-400">
                        Momento: {formatTimestamp(moment.timestamp)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      moment.question?.difficulty === 'easy' ? 'bg-green-900 text-green-200' :
                      moment.question?.difficulty === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-red-900 text-red-200'
                    }`}>
                      {moment.question?.difficulty || 'mixed'}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    {moment.question?.text}
                  </p>
                  {moment.question?.options && (
                    <div className="space-y-1">
                      {moment.question.options.map((option: string, i: number) => (
                        <div key={i} className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className={moment.question?.correctAnswer === option ? 'text-green-400' : ''}>
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-green-900/30 border border-green-500 text-green-200 p-4 rounded-lg flex items-center gap-3">
            <CheckCircle size={24} />
            <div>
              <p className="font-medium">¡Contenido Interactivo Generado!</p>
              <p className="text-sm mt-1">
                El video ahora tiene {generatedQuestions.length} puntos interactivos que pausarán 
                automáticamente el video para hacer preguntas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveContentGenerator;