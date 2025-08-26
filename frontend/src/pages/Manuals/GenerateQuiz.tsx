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
  Upload
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface GenerateQuizFormData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  customPrompt?: string;
}

const GenerateQuiz: React.FC = () => {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GenerateQuizFormData>({
    title: '',
    description: '',
    difficulty: 'medium',
    questionCount: 5,
    customPrompt: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  const generateQuizMutation = useMutation({
    mutationFn: async (data: GenerateQuizFormData) => {
      const response = await fetch(`/api/v1/ai/manuals/${manualId}/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.data) {
        setGeneratedQuiz(data.data);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    generateQuizMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof GenerateQuizFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportQuiz = async () => {
    if (!generatedQuiz) return;
    
    try {
      const response = await fetch(`/api/v1/ai/quiz/${generatedQuiz.id}/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to export quiz');
      
      const data = await response.json();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-${generatedQuiz.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting quiz:', error);
      alert('Error al exportar el quiz');
    }
  };

  const handleImportToEvaluations = async () => {
    if (!generatedQuiz) return;
    
    setImportLoading(true);
    try {
      const response = await fetch(`/api/v1/ai/quiz/${generatedQuiz.id}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: 1 // This should come from auth context
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Handle different storage types
        if (result.data.status === 'saved_locally') {
          alert(`¡Quiz guardado exitosamente!\n\nEl quiz "${result.data.title}" ha sido guardado localmente.\nPuede exportarlo a JSON para uso posterior.`);
        } else {
          alert(`¡Quiz guardado exitosamente!\n\nEl quiz "${result.data.title}" ha sido guardado en la base de datos.`);
        }
        // Don't navigate away, let user continue working with the quiz
      } else {
        // If it fails, suggest using export
        alert(result.error || 'No se pudo guardar el quiz. Use la opción de exportar JSON para descargar el quiz.');
      }
    } catch (error) {
      console.error('Error importing quiz:', error);
      alert('Error al guardar el quiz. Use la opción de exportar JSON para descargar el quiz.');
    } finally {
      setImportLoading(false);
    }
  };

  const getDifficultyDescription = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Preguntas básicas de comprensión y definiciones simples';
      case 'medium':
        return 'Preguntas que requieren análisis y aplicación de conceptos';
      case 'hard':
        return 'Preguntas complejas que requieren síntesis y evaluación crítica';
      default:
        return '';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (generateQuizMutation.isSuccess && generatedQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Quiz Generado Exitosamente!
              </h2>
              <p className="text-gray-600">
                Tu quiz ha sido creado con {generatedQuiz.questions?.length || 0} preguntas
              </p>
            </div>

            {/* Quiz Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">{generatedQuiz.title}</h3>
              {generatedQuiz.description && (
                <p className="text-gray-600 mb-4">{generatedQuiz.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total de preguntas:</span>
                  <span className="ml-2 font-medium">{generatedQuiz.questions?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Puntos totales:</span>
                  <span className="ml-2 font-medium">{generatedQuiz.totalPoints || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <span className="ml-2 font-medium text-green-600">{generatedQuiz.status || 'Listo'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Manual origen:</span>
                  <span className="ml-2 font-medium">{generatedQuiz.manualTitle}</span>
                </div>
              </div>
            </div>

            {/* Preview Questions */}
            {generatedQuiz.questions && generatedQuiz.questions.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Vista previa de preguntas:</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {generatedQuiz.questions.slice(0, 3).map((q: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium mb-2">
                        {index + 1}. {q.question}
                      </p>
                      <div className="ml-4 space-y-1">
                        {q.options?.map((opt: string, i: number) => (
                          <div key={i} className={`text-sm ${i === q.correct_answer ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {generatedQuiz.questions.length > 3 && (
                    <p className="text-gray-500 text-sm italic">
                      ... y {generatedQuiz.questions.length - 3} preguntas más
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleExportQuiz}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <Download className="h-5 w-5" />
                <span>Exportar JSON</span>
              </button>
              
              <button
                onClick={handleImportToEvaluations}
                disabled={importLoading}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span>Guardar Quiz</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
              <button
                onClick={() => generateQuizMutation.reset()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Generar Otro Quiz
              </button>
              <button
                onClick={() => navigate(`/manuals/${manualId}`)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Volver al Manual
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (generateQuizMutation.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Error al Generar Quiz
            </h2>
            <p className="text-gray-600 mb-6">
              Hubo un problema al generar el quiz. Por favor, intenta nuevamente.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => generateQuizMutation.reset()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Intentar Nuevamente
              </button>
              <button
                onClick={() => navigate(`/manuals/${manualId}`)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Volver al Manual
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/manuals/${manualId}`)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver al Manual
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Generar Quiz con IA</h1>
                <p className="text-gray-600">Crea preguntas automáticamente basadas en el contenido del manual</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Configuración del Quiz
            </h2>
            
            {/* Title */}
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título del Quiz *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Quiz sobre Manual de Operaciones"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (Opcional)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción del quiz..."
              />
            </div>

            {/* Difficulty */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nivel de Dificultad
              </label>
              <div className="space-y-2">
                {['easy', 'medium', 'hard'].map((level) => (
                  <label key={level} className="flex items-center">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={formData.difficulty === level}
                      onChange={(e) => handleInputChange('difficulty', e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium capitalize mr-2">
                          {level === 'easy' ? 'Fácil' : level === 'medium' ? 'Intermedio' : 'Difícil'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getDifficultyColor(level)}`}>
                          {level === 'easy' ? 'Básico' : level === 'medium' ? 'Analítico' : 'Avanzado'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {getDifficultyDescription(level)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div className="mb-4">
              <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Preguntas
              </label>
              <select
                id="questionCount"
                value={formData.questionCount}
                onChange={(e) => handleInputChange('questionCount', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[5, 10, 15, 20].map((count) => (
                  <option key={count} value={count}>
                    {count} preguntas
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-white rounded-lg shadow-md">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-gray-500 mr-2" />
                <span className="font-medium text-gray-700">Opciones Avanzadas</span>
              </div>
              <span className="text-gray-400">
                {showAdvanced ? '▲' : '▼'}
              </span>
            </button>
            
            {showAdvanced && (
              <div className="px-6 pb-6">
                <div className="border-t pt-4">
                  <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Instrucciones Personalizadas (Opcional)
                  </label>
                  <textarea
                    id="customPrompt"
                    value={formData.customPrompt}
                    onChange={(e) => handleInputChange('customPrompt', e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Enfócate en los capítulos 3 y 4, incluye preguntas sobre procedimientos de seguridad..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Proporciona instrucciones específicas para personalizar la generación del quiz
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/manuals/${manualId}`)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || generateQuizMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              {generateQuizMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Generar Quiz</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateQuiz;