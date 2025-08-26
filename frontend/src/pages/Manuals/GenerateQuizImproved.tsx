import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  FileText,
  Download,
  Upload,
  Globe,
  Clock,
  Target,
  RefreshCw,
  Eye,
  Hash,
  Brain
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import apiConfig from '../../config/api.config';
import toast from 'react-hot-toast';

interface QuizSettings {
  isPublic: boolean;
  timeLimit: number;
  passingScore: number;
  showResults: boolean;
  randomizeQuestions: boolean;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
}

interface GenerateQuizFormData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  customPrompt?: string;
  settings: QuizSettings;
}

const GenerateQuizImproved: React.FC = () => {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  
  const [formData, setFormData] = useState<GenerateQuizFormData>({
    title: '',
    description: '',
    difficulty: 'medium',
    questionCount: 10,
    customPrompt: '',
    settings: {
      isPublic: false,
      timeLimit: 30,
      passingScore: 60,
      showResults: true,
      randomizeQuestions: false,
      allowMultipleAttempts: true,
      maxAttempts: 3
    }
  });

  // Fetch manual info
  const { data: manual } = useQuery({
    queryKey: ['manual', manualId],
    queryFn: async () => {
      const response = await axios.get(`${apiConfig.baseURL}/manuals/${manualId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      return response.data.data;
    },
    enabled: !!manualId
  });

  const generateQuizMutation = useMutation({
    mutationFn: async (data: GenerateQuizFormData) => {
      const response = await axios.post(
        `${apiConfig.baseURL}/ai/manuals/${manualId}/generate-quiz`,
        {
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          questionCount: data.questionCount,
          customPrompt: data.customPrompt
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.data) {
        setGeneratedQuiz(data.data);
        toast.success('¡Evaluación generada exitosamente!');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al generar la evaluación');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    generateQuizMutation.mutate(formData);
  };

  const handleImportToEvaluations = async () => {
    if (!generatedQuiz) return;
    
    setImportLoading(true);
    try {
      // First save to AI generated quizzes if needed
      let aiQuizId = generatedQuiz.id;
      
      // If the quiz was generated but not saved to DB yet
      if (!generatedQuiz.saved) {
        const saveResponse = await axios.post(
          `${apiConfig.baseURL}/ai/quiz/${generatedQuiz.id}/import`,
          { userId: 2 },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
          }
        );
        
        if (saveResponse.data.success) {
          aiQuizId = saveResponse.data.data.quizId;
        }
      }
      
      // Now import to main evaluations with settings
      const response = await axios.post(
        `${apiConfig.baseURL}/ai/ai-quiz/${aiQuizId}/import-to-evaluations`,
        formData.settings,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('¡Evaluación importada exitosamente!');
        
        if (response.data.data.publicUrl && formData.settings.isPublic) {
          // Show public URL in a modal or toast
          const publicUrl = `${window.location.origin}${response.data.data.publicUrl}`;
          toast.success(
            <div>
              <p>Evaluación pública disponible en:</p>
              <a href={publicUrl} target="_blank" className="text-blue-600 underline">
                {publicUrl}
              </a>
            </div>,
            { duration: 10000 }
          );
        }
        
        // Navigate to edit page
        setTimeout(() => {
          navigate(response.data.data.editUrl);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error importing quiz:', error);
      toast.error(error.response?.data?.error || 'Error al importar la evaluación');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDirectCreate = async () => {
    if (!generatedQuiz) return;
    
    setImportLoading(true);
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/ai/manuals/${manualId}/create-quiz`,
        {
          title: generatedQuiz.title,
          description: generatedQuiz.description,
          questions: generatedQuiz.questions.map((q: any) => ({
            question: q.question,
            type: q.type || 'multiple_choice',
            options: q.options,
            correctAnswer: typeof q.correct_answer === 'number' 
              ? q.options[q.correct_answer] 
              : q.correct_answer,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            points: q.points || 10,
            metadata: {
              original: q
            }
          })),
          settings: formData.settings
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('¡Evaluación creada exitosamente!');
        navigate(`/quizzes/${response.data.data.id}/edit`);
      }
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      toast.error(error.response?.data?.error || 'Error al crear la evaluación');
    } finally {
      setImportLoading(false);
    }
  };

  const updateSettings = (key: keyof QuizSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  };

  if (generateQuizMutation.isSuccess && generatedQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Evaluación Generada Exitosamente!
              </h2>
              <p className="text-gray-600">
                Se han creado {generatedQuiz.questions?.length || 0} preguntas
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Quiz Preview */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Vista Previa de la Evaluación</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <h4 className="font-medium text-gray-900">{generatedQuiz.title}</h4>
                    {generatedQuiz.description && (
                      <p className="text-sm text-gray-600 mt-1">{generatedQuiz.description}</p>
                    )}
                  </div>
                  
                  {generatedQuiz.questions?.map((q: any, index: number) => (
                    <div key={index} className="border-t pt-4">
                      <p className="font-medium text-sm">
                        {index + 1}. {q.question}
                      </p>
                      {q.options && (
                        <ul className="mt-2 space-y-1">
                          {q.options.map((opt: string, i: number) => (
                            <li 
                              key={i} 
                              className={`text-sm ml-4 ${
                                i === q.correct_answer ? 'text-green-600 font-medium' : 'text-gray-600'
                              }`}
                            >
                              {String.fromCharCode(65 + i)}. {opt}
                              {i === q.correct_answer && ' ✓'}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.explanation && (
                        <p className="text-xs text-gray-500 mt-2 ml-4 italic">
                          Explicación: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings Configuration */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Configuración de la Evaluación</h3>
                <div className="bg-blue-50 rounded-lg p-6 space-y-4">
                  {/* Public Access */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">Acceso Público</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings.isPublic}
                        onChange={(e) => updateSettings('isPublic', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Time Limit */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Tiempo Límite (minutos)
                    </label>
                    <input
                      type="number"
                      value={formData.settings.timeLimit}
                      onChange={(e) => updateSettings('timeLimit', parseInt(e.target.value))}
                      min="5"
                      max="180"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  {/* Passing Score */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      Puntaje Aprobatorio (%)
                    </label>
                    <input
                      type="number"
                      value={formData.settings.passingScore}
                      onChange={(e) => updateSettings('passingScore', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  {/* Show Results */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">Mostrar Resultados</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings.showResults}
                        onChange={(e) => updateSettings('showResults', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Multiple Attempts */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">Múltiples Intentos</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings.allowMultipleAttempts}
                        onChange={(e) => updateSettings('allowMultipleAttempts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.settings.allowMultipleAttempts && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Hash className="w-4 h-4 text-blue-600" />
                        Número Máximo de Intentos
                      </label>
                      <input
                        type="number"
                        value={formData.settings.maxAttempts}
                        onChange={(e) => updateSettings('maxAttempts', parseInt(e.target.value))}
                        min="1"
                        max="10"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleDirectCreate}
                disabled={importLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importar a Evaluaciones
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(generatedQuiz, null, 2)], { 
                    type: 'application/json' 
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `quiz-${generatedQuiz.id || Date.now()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Exportar JSON
              </button>

              <button
                onClick={() => {
                  setGeneratedQuiz(null);
                  generateQuizMutation.reset();
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Generar Otra
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate(`/manuals/${manualId}`)}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Generar Evaluación con IA
              </h1>
              {manual && (
                <p className="text-sm text-gray-600 mt-1">
                  Desde: {manual.title}
                </p>
              )}
            </div>
            <Brain className="h-8 w-8 text-purple-600" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título de la Evaluación *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ej: Evaluación de Seguridad Industrial"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Describe el propósito de esta evaluación..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dificultad
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    difficulty: e.target.value as 'easy' | 'medium' | 'hard' 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Medio</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Preguntas
                </label>
                <input
                  type="number"
                  value={formData.questionCount}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    questionCount: parseInt(e.target.value) || 5 
                  })}
                  min="3"
                  max="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                <Settings className="w-4 h-4" />
                {showAdvanced ? 'Ocultar' : 'Mostrar'} Opciones Avanzadas
              </button>
              
              {showAdvanced && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instrucciones Personalizadas para la IA
                  </label>
                  <textarea
                    value={formData.customPrompt}
                    onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={4}
                    placeholder="Ej: Enfócate en los capítulos 3 y 4. Incluye preguntas sobre procedimientos de emergencia..."
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={generateQuizMutation.isPending || !formData.title.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generateQuizMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generando Evaluación...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  Generar Evaluación con IA
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuizImproved;