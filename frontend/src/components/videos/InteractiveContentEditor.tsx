import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Save,
  X,
  Clock,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { interactiveVideoService } from '../../services/interactive-video.service';
import toast from 'react-hot-toast';

interface InteractiveContentEditorProps {
  layerId: number;
  videoId: number;
  videoDuration: number;
  onSave?: () => void;
  onCancel?: () => void;
}

interface KeyMoment {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  type: 'concept' | 'example' | 'summary' | 'exercise';
  question: {
    text: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  relevanceScore?: number;
}

const InteractiveContentEditor: React.FC<InteractiveContentEditorProps> = ({
  layerId,
  videoId,
  videoDuration,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'questions' | 'settings'>('questions');
  const [expandedMoment, setExpandedMoment] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    loadContent();
  }, [layerId]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const layer = await interactiveVideoService.getInteractiveLayer(videoId);
      if (layer.aiGeneratedContent) {
        setContent(layer.aiGeneratedContent);
        setTranscript(layer.aiGeneratedContent.transcript || '');
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Error al cargar el contenido');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Update content with edited transcript
      const updatedContent = {
        ...content,
        transcript: transcript
      };
      
      await interactiveVideoService.updateInteractiveLayer(layerId, {
        aiGeneratedContent: updatedContent
      });
      
      toast.success('Contenido guardado exitosamente');
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Error al guardar el contenido');
    } finally {
      setIsSaving(false);
    }
  };

  const updateKeyMoment = (momentId: string, updates: Partial<KeyMoment>) => {
    setContent((prev: any) => ({
      ...prev,
      keyMoments: prev.keyMoments.map((m: KeyMoment) =>
        m.id === momentId ? { ...m, ...updates } : m
      )
    }));
  };

  const deleteKeyMoment = (momentId: string) => {
    setContent((prev: any) => ({
      ...prev,
      keyMoments: prev.keyMoments.filter((m: KeyMoment) => m.id !== momentId)
    }));
  };

  const addKeyMoment = () => {
    const newMoment: KeyMoment = {
      id: `moment_${Date.now()}`,
      timestamp: Math.floor(videoDuration / 2),
      title: 'Nueva Pregunta',
      description: '',
      type: 'concept',
      question: {
        text: '¿Pregunta?',
        type: 'multiple_choice',
        options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctAnswer: 'Opción A',
        explanation: 'Explicación de la respuesta',
        difficulty: 'medium'
      }
    };
    
    setContent((prev: any) => ({
      ...prev,
      keyMoments: [...prev.keyMoments, newMoment].sort((a, b) => a.timestamp - b.timestamp)
    }));
  };

  const moveKeyMoment = (momentId: string, direction: 'up' | 'down') => {
    setContent((prev: any) => {
      const moments = [...prev.keyMoments];
      const index = moments.findIndex(m => m.id === momentId);
      if (index === -1) return prev;
      
      if (direction === 'up' && index > 0) {
        [moments[index], moments[index - 1]] = [moments[index - 1], moments[index]];
      } else if (direction === 'down' && index < moments.length - 1) {
        [moments[index], moments[index + 1]] = [moments[index + 1], moments[index]];
      }
      
      return { ...prev, keyMoments: moments };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p>No hay contenido generado para editar</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Editor de Contenido Interactivo</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-2 px-4 ${
            activeTab === 'questions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <HelpCircle className="w-4 h-4 inline mr-2" />
          Preguntas ({content.keyMoments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-2 px-4 ${
            activeTab === 'transcript'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Transcripción
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-2 px-4 ${
            activeTab === 'settings'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Edit3 className="w-4 h-4 inline mr-2" />
          Configuración
        </button>
      </div>

      {/* Content */}
      {activeTab === 'transcript' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transcripción del Video
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full h-96 px-3 py-2 bg-gray-700 text-white rounded-lg resize-none"
              placeholder="Edita la transcripción aquí..."
            />
            <p className="text-sm text-gray-400 mt-2">
              Puedes corregir errores de pronunciación o añadir contexto adicional
            </p>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-300">
              Preguntas interactivas que pausarán el video
            </p>
            <button
              onClick={addKeyMoment}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Añadir Pregunta
            </button>
          </div>

          {content.keyMoments?.map((moment: KeyMoment, index: number) => (
            <div
              key={moment.id}
              className="bg-gray-700 rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formatTime(moment.timestamp)}
                        onChange={(e) => {
                          const newTime = parseTime(e.target.value);
                          if (newTime >= 0 && newTime <= videoDuration) {
                            updateKeyMoment(moment.id, { timestamp: newTime });
                          }
                        }}
                        className="w-20 px-2 py-1 bg-gray-600 text-white rounded"
                        placeholder="00:00"
                      />
                    </div>
                    <select
                      value={moment.type}
                      onChange={(e) => updateKeyMoment(moment.id, { 
                        type: e.target.value as KeyMoment['type'] 
                      })}
                      className="px-2 py-1 bg-gray-600 text-white rounded"
                    >
                      <option value="concept">Concepto</option>
                      <option value="example">Ejemplo</option>
                      <option value="exercise">Ejercicio</option>
                      <option value="summary">Resumen</option>
                    </select>
                    <select
                      value={moment.question.difficulty}
                      onChange={(e) => updateKeyMoment(moment.id, {
                        question: { ...moment.question, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }
                      })}
                      className="px-2 py-1 bg-gray-600 text-white rounded"
                    >
                      <option value="easy">Fácil</option>
                      <option value="medium">Medio</option>
                      <option value="hard">Difícil</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={moment.title}
                    onChange={(e) => updateKeyMoment(moment.id, { title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded mb-2"
                    placeholder="Título de la pregunta"
                  />

                  <textarea
                    value={moment.question.text}
                    onChange={(e) => updateKeyMoment(moment.id, {
                      question: { ...moment.question, text: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded resize-none"
                    rows={2}
                    placeholder="Pregunta"
                  />

                  {moment.question.type === 'multiple_choice' && (
                    <div className="mt-3 space-y-2">
                      {moment.question.options?.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={moment.question.correctAnswer === option}
                            onChange={() => updateKeyMoment(moment.id, {
                              question: { ...moment.question, correctAnswer: option }
                            })}
                            className="text-blue-500"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(moment.question.options || [])];
                              newOptions[optIndex] = e.target.value;
                              updateKeyMoment(moment.id, {
                                question: { ...moment.question, options: newOptions }
                              });
                            }}
                            className="flex-1 px-2 py-1 bg-gray-600 text-white rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={moment.question.explanation}
                    onChange={(e) => updateKeyMoment(moment.id, {
                      question: { ...moment.question, explanation: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded resize-none mt-2"
                    rows={2}
                    placeholder="Explicación de la respuesta"
                  />
                </div>

                <div className="flex flex-col gap-1 ml-4">
                  <button
                    onClick={() => moveKeyMoment(moment.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveKeyMoment(moment.id, 'down')}
                    disabled={index === content.keyMoments.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteKeyMoment(moment.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resumen del Video
            </label>
            <textarea
              value={content.summary || ''}
              onChange={(e) => setContent({ ...content, summary: e.target.value })}
              className="w-full h-32 px-3 py-2 bg-gray-700 text-white rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temas Cubiertos
            </label>
            <input
              type="text"
              value={content.topics?.join(', ') || ''}
              onChange={(e) => setContent({ 
                ...content, 
                topics: e.target.value.split(',').map(t => t.trim()) 
              })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
              placeholder="Tema 1, Tema 2, Tema 3..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nivel Educativo
              </label>
              <select
                value={content.educationalLevel || ''}
                onChange={(e) => setContent({ ...content, educationalLevel: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
              >
                <option value="Básico">Básico</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
                <option value="Profesional">Profesional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Contenido
              </label>
              <select
                value={content.contentType || ''}
                onChange={(e) => setContent({ ...content, contentType: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
              >
                <option value="Tutorial">Tutorial</option>
                <option value="Conferencia">Conferencia</option>
                <option value="Demostración">Demostración</option>
                <option value="Explicación">Explicación</option>
                <option value="Capacitación">Capacitación</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nivel de Confianza
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={(content.confidenceScore || 0.5) * 100}
                onChange={(e) => setContent({ 
                  ...content, 
                  confidenceScore: parseInt(e.target.value) / 100 
                })}
                className="flex-1"
              />
              <span className="text-white">
                {Math.round((content.confidenceScore || 0.5) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveContentEditor;