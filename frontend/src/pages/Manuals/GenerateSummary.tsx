import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  FileText
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface GenerateSummaryFormData {
  title: string;
  summaryType: 'brief' | 'detailed' | 'key_points';
  customPrompt?: string;
}

const GenerateSummary: React.FC = () => {
  const { manualId } = useParams<{ manualId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GenerateSummaryFormData>({
    title: '',
    summaryType: 'brief',
    customPrompt: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generateSummaryMutation = useMutation({
    mutationFn: async (data: GenerateSummaryFormData) => {
      const response = await fetch(`/api/v1/ai/manuals/${manualId}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      return response.json();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    generateSummaryMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof GenerateSummaryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getSummaryTypeDescription = (type: string) => {
    switch (type) {
      case 'brief':
        return 'Un resumen conciso de 2-3 párrafos con los puntos más importantes';
      case 'detailed':
        return 'Un resumen completo que cubre todas las secciones principales con ejemplos';
      case 'key_points':
        return 'Una lista estructurada con los conceptos y puntos clave principales';
      default:
        return '';
    }
  };

  const getSummaryTypeIcon = (type: string) => {
    switch (type) {
      case 'brief':
        return '📝';
      case 'detailed':
        return '📄';
      case 'key_points':
        return '📋';
      default:
        return '📄';
    }
  };

  if (generateSummaryMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ¡Resumen Generado Exitosamente!
            </h2>
            <p className="text-gray-600 mb-6">
              Tu resumen ha sido creado y estará listo en unos momentos. 
              Podrás acceder a él desde la página del manual.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/manuals/${manualId}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Volver al Manual
              </button>
              <button
                onClick={() => navigate('/manuals')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Ver Todos los Manuales
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (generateSummaryMutation.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Error al Generar Resumen
            </h2>
            <p className="text-gray-600 mb-6">
              Hubo un problema al generar el resumen. Por favor, intenta nuevamente.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => generateSummaryMutation.reset()}
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
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
              <FileText className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Generar Resumen con IA</h1>
                <p className="text-gray-600">Crea un resumen automático del contenido del manual</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Configuración del Resumen
            </h2>
            
            {/* Title */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título del Resumen *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: Resumen del Manual de Operaciones"
                required
              />
            </div>

            {/* Summary Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Resumen
              </label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: 'brief', label: 'Resumen Breve', emoji: '📝' },
                  { value: 'detailed', label: 'Resumen Detallado', emoji: '📄' },
                  { value: 'key_points', label: 'Puntos Clave', emoji: '📋' }
                ].map((type) => (
                  <label key={type.value} className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="summaryType"
                      value={type.value}
                      checked={formData.summaryType === type.value}
                      onChange={(e) => handleInputChange('summaryType', e.target.value)}
                      className="mt-1 mr-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-xl mr-2">{type.emoji}</span>
                        <span className="font-medium text-gray-900">{type.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {getSummaryTypeDescription(type.value)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Enfócate en los aspectos técnicos, incluye ejemplos prácticos, omite información histórica..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Proporciona instrucciones específicas para personalizar el resumen
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Vista Previa:</h3>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-lg mr-2">{getSummaryTypeIcon(formData.summaryType)}</span>
              <span>
                Se generará {formData.summaryType === 'brief' ? 'un resumen breve' : 
                            formData.summaryType === 'detailed' ? 'un resumen detallado' : 
                            'una lista de puntos clave'}
              </span>
            </div>
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
              disabled={!formData.title.trim() || generateSummaryMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              {generateSummaryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Generar Resumen</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateSummary;