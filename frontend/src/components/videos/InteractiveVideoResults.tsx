import React from 'react';
import { Trophy, Award, Target, Clock, CheckCircle, XCircle, TrendingUp, AlertCircle } from 'lucide-react';

interface InteractiveVideoResultsProps {
  results: {
    finalScore: number;
    passingScore: number;
    certificateEarned: boolean;
    totalQuestions: number;
    correctAnswers: number;
    watchTimeSeconds: number;
    completionPercentage: number;
    detailedResponses?: Array<{
      momentId: string;
      questionText: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      responseTimeSeconds: number;
    }>;
  };
  onRetry?: () => void;
  onClose?: () => void;
}

const InteractiveVideoResults: React.FC<InteractiveVideoResultsProps> = ({
  results,
  onRetry,
  onClose
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreMessage = (score: number): string => {
    if (score >= 90) return '¡Excelente trabajo!';
    if (score >= 70) return '¡Buen trabajo!';
    if (score >= 50) return 'Puedes mejorar';
    return 'Sigue practicando';
  };

  const accuracy = results.totalQuestions > 0 
    ? (results.correctAnswers / results.totalQuestions) * 100 
    : 0;

  const avgResponseTime = results.detailedResponses && results.detailedResponses.length > 0
    ? results.detailedResponses.reduce((sum, r) => sum + r.responseTimeSeconds, 0) / results.detailedResponses.length
    : 0;

  return (
    <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
      {/* Header with score */}
      <div className={`bg-gradient-to-r ${
        results.certificateEarned 
          ? 'from-green-600 to-green-500' 
          : 'from-blue-600 to-purple-600'
      } p-8 text-center`}>
        <div className="mb-4">
          {results.certificateEarned ? (
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto animate-pulse" />
          ) : (
            <Target className="w-20 h-20 text-white mx-auto" />
          )}
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">
          {results.certificateEarned ? '¡Felicitaciones!' : 'Resultados'}
        </h2>
        
        <div className="text-6xl font-bold text-white mb-2">
          {results.finalScore.toFixed(1)}%
        </div>
        
        <p className="text-xl text-white opacity-90">
          {getScoreMessage(results.finalScore)}
        </p>

        {results.certificateEarned && (
          <div className="mt-4 inline-flex items-center bg-white bg-opacity-20 px-4 py-2 rounded-full">
            <Award className="w-5 h-5 text-yellow-400 mr-2" />
            <span className="text-white font-medium">Certificado Obtenido</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-xs text-gray-400">Correctas</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {results.correctAnswers}/{results.totalQuestions}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-gray-400">Precisión</span>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(accuracy)}`}>
            {accuracy.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-400">Tiempo</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatTime(results.watchTimeSeconds)}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-yellow-500" />
            <span className="text-xs text-gray-400">Completado</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {results.completionPercentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Pass/Fail indicator */}
      <div className="px-6 pb-6">
        <div className={`p-4 rounded-lg ${
          results.certificateEarned 
            ? 'bg-green-900 border border-green-700' 
            : 'bg-red-900 border border-red-700'
        }`}>
          <div className="flex items-start space-x-3">
            {results.certificateEarned ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${
                results.certificateEarned ? 'text-green-400' : 'text-red-400'
              }`}>
                {results.certificateEarned ? 'Aprobado' : 'No Aprobado'}
              </p>
              <p className="text-gray-300 text-sm mt-1">
                {results.certificateEarned 
                  ? `Has superado el puntaje mínimo de ${results.passingScore}% para obtener el certificado.`
                  : `Necesitas al menos ${results.passingScore}% para aprobar. Tu puntaje: ${results.finalScore.toFixed(1)}%`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed responses */}
      {results.detailedResponses && results.detailedResponses.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Detalle de Respuestas</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {results.detailedResponses.map((response, index) => (
              <div key={index} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">Pregunta {index + 1}</p>
                    <p className="text-white text-sm mb-2">{response.questionText}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-400">
                        Tu respuesta: <span className={response.isCorrect ? 'text-green-400' : 'text-red-400'}>
                          {response.userAnswer}
                        </span>
                      </span>
                      {!response.isCorrect && (
                        <span className="text-gray-400">
                          Correcta: <span className="text-green-400">{response.correctAnswer}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tiempo de respuesta: {response.responseTimeSeconds}s
                    </p>
                  </div>
                  <div className="ml-4">
                    {response.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 bg-gray-800 flex justify-center space-x-4">
        {onRetry && !results.certificateEarned && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
};

export default InteractiveVideoResults;