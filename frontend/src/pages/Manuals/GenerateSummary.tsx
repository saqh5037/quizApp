import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  FileText,
  BookOpen,
  Brain,
  Share2,
  Clock,
  Users,
  Target,
  Zap,
  Lightbulb,
  GraduationCap,
  CreditCard,
  List,
  Eye,
  Lock
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import educationalResourcesService, { EducationalResourceRequest } from '../../services/educationalResourcesService';
import toast from 'react-hot-toast';

type ContentType = 'summary' | 'study_guide' | 'flash_cards';

interface GenerateContentFormData {
  contentType: ContentType;
  title: string;
  description?: string;
  // Summary specific
  summaryType?: 'brief' | 'detailed' | 'key_points';
  // Study Guide specific  
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number;
  learningObjectives?: string[];
  // Flash Cards specific
  cardCount?: number;
  cardDifficulty?: 'easy' | 'medium' | 'hard';
  categories?: string[];
  // General
  isPublic?: boolean;
  customPrompt?: string;
}

const GenerateSummary: React.FC = () => {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GenerateContentFormData>({
    contentType: 'summary',
    title: '',
    description: '',
    summaryType: 'brief',
    difficultyLevel: 'beginner',
    estimatedTime: 60,
    learningObjectives: [''],
    cardCount: 20,
    cardDifficulty: 'medium',
    categories: [],
    isPublic: false,
    customPrompt: ''
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: keyof GenerateContentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateSummaryMutation = useMutation({
    mutationFn: async (data: GenerateContentFormData): Promise<any> => {
      if (!manualId) throw new Error('Manual ID is required');

      const requestData: EducationalResourceRequest = {
        contentType: data.contentType,
        title: data.title,
        description: data.description,
        summaryType: data.summaryType,
        difficultyLevel: data.difficultyLevel,
        estimatedTime: data.estimatedTime,
        learningObjectives: data.learningObjectives?.filter(obj => obj.trim()) || [],
        cardCount: data.cardCount,
        cardDifficulty: data.cardDifficulty,
        categories: data.categories || [],
        isPublic: data.isPublic,
        customPrompt: data.customPrompt
      };

      return educationalResourcesService.generateResource(manualId, requestData);
    },
    onSuccess: (response) => {
      console.log('Resource generation started:', response);
      
      // Show success notification
      const resourceType = response.contentType === 'summary' ? 'Resumen' :
                          response.contentType === 'study_guide' ? 'Guía de Estudio' :
                          'Tarjetas de Estudio';
      
      toast.success(
        <div>
          <strong>¡{resourceType} en proceso!</strong>
          <p className="text-sm mt-1">Se está generando tu {resourceType.toLowerCase()}. Esto puede tomar unos momentos.</p>
        </div>,
        { duration: 5000 }
      );
      
      // Navigate to the resources page where they can see all generated resources
      navigate(`/manuals/${manualId}/resources`);
    },
    onError: (error: any) => {
      console.error('Error generating content:', error);
      toast.error(
        error.response?.data?.error || 
        'Error al generar el recurso educativo. Por favor, intenta de nuevo.'
      );
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateSummaryMutation.mutate(formData);
  };

  const contentTypes = [
    {
      type: 'summary' as ContentType,
      title: 'Resumen IA',
      description: 'Extrae los puntos clave y genera un resumen ejecutivo del manual completo',
      icon: FileText,
      color: 'bg-blue-500',
      features: ['Síntesis automática', 'Puntos clave', 'Estructura clara', 'Fácil lectura'],
      estimatedTime: '2-3 minutos'
    },
    {
      type: 'study_guide' as ContentType,
      title: 'Guía de Estudio',
      description: 'Crea una guía completa con objetivos de aprendizaje y estructura pedagógica',
      icon: GraduationCap,
      color: 'bg-green-500',
      features: ['Objetivos claros', 'Estructura didáctica', 'Ejercicios prácticos', 'Evaluación'],
      estimatedTime: '3-5 minutos'
    },
    {
      type: 'flash_cards' as ContentType,
      title: 'Tarjetas de Estudio',
      description: 'Genera tarjetas interactivas con preguntas y respuestas para memorización',
      icon: CreditCard,
      color: 'bg-purple-500',
      features: ['Preguntas dinámicas', 'Respuestas claras', 'Categorización', 'Gamificación'],
      estimatedTime: '4-6 minutos'
    }
  ];

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
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Recursos Educativos
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transforma tu manual en recursos de aprendizaje personalizados con IA avanzada. 
              Crea resúmenes, guías de estudio y tarjetas interactivas para maximizar tu experiencia educativa.
            </p>
          </div>
        </div>

        {/* Step 1: Content Type Selection */}
        {currentStep === 1 && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">
                ¿Qué tipo de recurso educativo quieres crear?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {contentTypes.map((type) => (
                  <div
                    key={type.type}
                    onClick={() => setFormData(prev => ({ ...prev, contentType: type.type }))}
                    className={`relative cursor-pointer rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                      formData.contentType === type.type
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className={`${type.color} rounded-lg p-3`}>
                          <type.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-gray-900">{type.title}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="h-4 w-4 mr-1" />
                            {type.estimatedTime}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-4">{type.description}</p>
                      
                      <div className="space-y-2">
                        {type.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {formData.contentType === type.type && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-blue-500 rounded-full p-2">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!formData.contentType}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
              >
                Continuar con la Configuración
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configuration Form */}
        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  {formData.contentType === 'summary' && <FileText className="h-6 w-6 text-blue-600" />}
                  {formData.contentType === 'study_guide' && <GraduationCap className="h-6 w-6 text-green-600" />}
                  {formData.contentType === 'flash_cards' && <CreditCard className="h-6 w-6 text-purple-600" />}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Configurar {contentTypes.find(t => t.type === formData.contentType)?.title}
                </h2>
                <p className="text-gray-600">
                  Personaliza los detalles para obtener el mejor recurso educativo
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Título *
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Título del ${contentTypes.find(t => t.type === formData.contentType)?.title.toLowerCase()}`}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción (Opcional)
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe el propósito y alcance de este recurso"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Configuration */}
                {formData.contentType === 'summary' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Resumen</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Tipo de Resumen
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { value: 'brief', label: 'Resumen Breve', icon: FileText, desc: 'Conciso, 2-3 párrafos principales' },
                            { value: 'detailed', label: 'Resumen Detallado', icon: BookOpen, desc: 'Completo con ejemplos y contexto' },
                            { value: 'key_points', label: 'Puntos Clave', icon: List, desc: 'Lista estructurada de conceptos principales' }
                          ].map((type) => (
                            <label key={type.value} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                              formData.summaryType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                            }`}>
                              <input
                                type="radio"
                                name="summaryType"
                                value={type.value}
                                checked={formData.summaryType === type.value}
                                onChange={(e) => handleInputChange('summaryType', e.target.value)}
                                className="mr-3"
                              />
                              <type.icon className="h-5 w-5 text-blue-600 mr-3" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{type.label}</div>
                                <div className="text-sm text-gray-600">{type.desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Study Guide Configuration */}
                {formData.contentType === 'study_guide' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de la Guía de Estudio</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nivel de Dificultad
                        </label>
                        <select
                          value={formData.difficultyLevel}
                          onChange={(e) => handleInputChange('difficultyLevel', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="beginner">Principiante - Conceptos básicos</option>
                          <option value="intermediate">Intermedio - Aplicación práctica</option>
                          <option value="advanced">Avanzado - Análisis profundo</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tiempo Estimado (minutos)
                        </label>
                        <input
                          type="number"
                          min="15"
                          max="480"
                          value={formData.estimatedTime}
                          onChange={(e) => handleInputChange('estimatedTime', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Objetivos de Aprendizaje
                      </label>
                      {formData.learningObjectives?.map((objective, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={objective}
                            onChange={(e) => {
                              const newObjectives = [...(formData.learningObjectives || [])];
                              newObjectives[index] = e.target.value;
                              handleInputChange('learningObjectives', newObjectives);
                            }}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Objetivo ${index + 1}`}
                          />
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newObjectives = formData.learningObjectives?.filter((_, i) => i !== index);
                                handleInputChange('learningObjectives', newObjectives);
                              }}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleInputChange('learningObjectives', [...(formData.learningObjectives || []), ''])}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        + Agregar objetivo
                      </button>
                    </div>
                  </div>
                )}

                {/* Flash Cards Configuration */}
                {formData.contentType === 'flash_cards' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de las Tarjetas</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número de Tarjetas
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="100"
                          value={formData.cardCount}
                          onChange={(e) => handleInputChange('cardCount', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dificultad
                        </label>
                        <select
                          value={formData.cardDifficulty}
                          onChange={(e) => handleInputChange('cardDifficulty', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="easy">Fácil - Conceptos básicos</option>
                          <option value="medium">Medio - Aplicación de conceptos</option>
                          <option value="hard">Difícil - Análisis y síntesis</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sharing Options */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Opciones de Compartir</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${formData.isPublic ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {formData.isPublic ? <Eye className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-gray-600" />}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">
                            {formData.isPublic ? 'Público' : 'Privado'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formData.isPublic 
                              ? 'Otros usuarios pueden ver y usar este recurso'
                              : 'Solo tú puedes acceder a este recurso'
                            }
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInputChange('isPublic', !formData.isPublic)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.isPublic ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {formData.isPublic && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <Users className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium text-blue-900">Beneficios de compartir públicamente</span>
                        </div>
                        <ul className="text-sm text-blue-800 space-y-1 ml-7">
                          <li>• Ayuda a otros estudiantes a aprender</li>
                          <li>• Contribuye al conocimiento colectivo</li>
                          <li>• Recibe feedback y mejoras de la comunidad</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-left"
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
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                        Instrucciones Personalizadas (Opcional)
                      </label>
                      <textarea
                        id="customPrompt"
                        value={formData.customPrompt}
                        onChange={(e) => handleInputChange('customPrompt', e.target.value)}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Enfócate en aspectos técnicos, incluye ejemplos prácticos, omite información histórica..."
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Proporciona instrucciones específicas para personalizar el contenido generado
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.title.trim() || generateSummaryMutation.isPending}
                    className="flex-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-8 rounded-xl flex items-center justify-center space-x-2 transition-all"
                  >
                    {generateSummaryMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Generando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span>Generar {contentTypes.find(t => t.type === formData.contentType)?.title}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateSummary;