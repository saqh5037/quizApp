import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Brain, Target, BookOpen, Lightbulb } from 'lucide-react';

interface InteractiveOverlayEnhancedProps {
  moment: {
    id: string;
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
  };
  onAnswer: (answer: string) => void;
  onSkip?: () => void;
  progress?: {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    currentScore: number;
  } | null;
  isFullscreen?: boolean;
}

const InteractiveOverlayEnhanced: React.FC<InteractiveOverlayEnhancedProps> = ({
  moment,
  onAnswer,
  onSkip,
  progress,
  isFullscreen = false
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shortAnswer, setShortAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(45);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (onSkip) onSkip();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onSkip]);

  useEffect(() => {
    // Reset state when moment changes
    setSelectedAnswer(null);
    setShowFeedback(false);
    setShowExplanation(false);
    setShortAnswer('');
    setTimeRemaining(45);
  }, [moment.id]);

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    const correct = answer === moment.question?.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Show explanation after feedback
    setTimeout(() => {
      setShowExplanation(true);
    }, 1000);
    
    // Continue after explanation
    setTimeout(() => {
      onAnswer(answer);
    }, correct ? 3500 : 4500);
  };

  const handleShortAnswerSubmit = () => {
    if (!shortAnswer.trim()) return;
    
    const correct = moment.question?.correctAnswer ? 
      shortAnswer.toLowerCase().includes(moment.question.correctAnswer.toLowerCase()) : false;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    setTimeout(() => {
      setShowExplanation(true);
    }, 1000);
    
    setTimeout(() => {
      onAnswer(shortAnswer);
    }, correct ? 3500 : 4500);
  };

  const getTypeIcon = () => {
    switch (moment.type) {
      case 'concept':
        return <Brain className="w-4 h-4 md:w-5 md:h-5" />;
      case 'example':
        return <BookOpen className="w-4 h-4 md:w-5 md:h-5" />;
      case 'exercise':
        return <Target className="w-4 h-4 md:w-5 md:h-5" />;
      default:
        return <Brain className="w-4 h-4 md:w-5 md:h-5" />;
    }
  };

  const getDifficultyColor = () => {
    switch (moment.question?.difficulty) {
      case 'easy':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'hard':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTimerColor = () => {
    if (timeRemaining > 30) return 'text-green-400';
    if (timeRemaining > 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  const overlayClasses = isFullscreen 
    ? "fixed inset-0 z-[9999]" 
    : "absolute inset-0 z-[100]";

  return (
    <div className={`${overlayClasses} bg-black bg-opacity-85 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm`} 
         style={{ pointerEvents: 'auto' }}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto animate-scale-in" 
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header - Mobile Optimized */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 md:p-6 rounded-t-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getTypeIcon()}
              <span className="text-white text-xs md:text-sm font-medium capitalize">
                {moment.type}
              </span>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              {moment.question?.difficulty && (
                <span className={`text-xs md:text-sm font-medium ${getDifficultyColor()}`}>
                  {moment.question.difficulty.toUpperCase()}
                </span>
              )}
              <div className={`flex items-center space-x-1 ${getTimerColor()} font-bold`}>
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">{timeRemaining}s</span>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg md:text-xl font-bold text-white mb-1">{moment.title}</h3>
          {moment.description && (
            <p className="text-blue-100 text-sm md:text-base">{moment.description}</p>
          )}
        </div>

        {/* Progress bar - Mobile Optimized */}
        {progress && (
          <div className="px-3 md:px-6 py-2 md:py-3 bg-gray-700">
            <div className="flex items-center justify-between text-xs md:text-sm text-gray-300 mb-2">
              <span>Pregunta {progress.answeredQuestions + 1} de {progress.totalQuestions}</span>
              <span className="text-green-400">Correctas: {progress.correctAnswers}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5 md:h-2">
              <div
                className="bg-blue-500 h-1.5 md:h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.answeredQuestions / progress.totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Question - Mobile Optimized */}
        <div className="p-3 md:p-6">
          <p className="text-white text-base md:text-lg font-medium mb-4 md:mb-6 leading-relaxed">
            {moment.question?.text || 'Pregunta no disponible'}
          </p>

          {/* Multiple choice options - Enhanced Mobile */}
          {moment.question?.type === 'multiple_choice' && moment.question?.options && (
            <div className="space-y-3 md:space-y-3">
              {moment.question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 md:p-4 rounded-lg transition-all duration-200 touch-manipulation min-h-[60px] md:min-h-[56px] flex items-center ${
                    showFeedback
                      ? option === moment.question?.correctAnswer
                        ? 'bg-green-600 text-white shadow-lg'
                        : selectedAnswer === option
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-400'
                      : selectedAnswer === option
                      ? 'bg-blue-600 text-white shadow-lg transform scale-[1.02]'
                      : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-600 active:scale-[0.98]'
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        showFeedback
                          ? option === moment.question?.correctAnswer
                            ? 'bg-green-700 text-green-100'
                            : selectedAnswer === option
                            ? 'bg-red-700 text-red-100'
                            : 'bg-gray-600 text-gray-300'
                          : selectedAnswer === option
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-sm md:text-base leading-relaxed flex-1">
                        {option}
                      </span>
                    </div>
                    {showFeedback && (
                      <div className="flex-shrink-0 ml-2">
                        {option === moment.question?.correctAnswer && (
                          <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-200" />
                        )}
                        {selectedAnswer === option && option !== moment.question?.correctAnswer && (
                          <XCircle className="w-5 h-5 md:w-5 md:h-5 text-red-200" />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* True/False options - Enhanced Mobile */}
          {moment.question?.type === 'true_false' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-3">
              {['Verdadero', 'Falso'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`p-4 md:p-4 rounded-lg transition-all duration-200 font-semibold text-base md:text-base touch-manipulation min-h-[60px] flex items-center justify-center ${
                    showFeedback
                      ? option === moment.question?.correctAnswer
                        ? 'bg-green-600 text-white shadow-lg'
                        : selectedAnswer === option
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-400'
                      : selectedAnswer === option
                      ? 'bg-blue-600 text-white shadow-lg transform scale-[1.02]'
                      : 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-600 active:scale-[0.98]'
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <div className="flex items-center gap-2">
                    {option}
                    {showFeedback && (
                      <>
                        {option === moment.question?.correctAnswer && (
                          <CheckCircle className="w-5 h-5 text-green-200" />
                        )}
                        {selectedAnswer === option && option !== moment.question?.correctAnswer && (
                          <XCircle className="w-5 h-5 text-red-200" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Short answer - Mobile Optimized */}
          {moment.question?.type === 'short_answer' && (
            <div className="space-y-3 md:space-y-4">
              <textarea
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                placeholder="Escriba su respuesta aquí..."
                disabled={showFeedback}
                className="w-full p-3 md:p-4 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm md:text-base"
                rows={3}
              />
              <button
                onClick={handleShortAnswerSubmit}
                disabled={!shortAnswer.trim() || showFeedback}
                className="w-full py-2 md:py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm md:text-base touch-manipulation"
              >
                Enviar Respuesta
              </button>
            </div>
          )}

          {/* Feedback - Mobile Optimized */}
          {showFeedback && (
            <div className={`mt-4 md:mt-6 p-3 md:p-4 rounded-lg ${
              isCorrect ? 'bg-green-900/50 border border-green-600/50' : 'bg-red-900/50 border border-red-600/50'
            }`}>
              <div className="flex items-start space-x-2 md:space-x-3">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-bold text-sm md:text-base mb-1 ${
                    isCorrect ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isCorrect ? '¡Correcto!' : 'Incorrecto'}
                  </p>
                  {!isCorrect && (
                    <p className="text-gray-300 text-sm">
                      Respuesta correcta: <span className="font-semibold text-green-400">
                        {moment.question?.correctAnswer}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Explanation - Mobile Optimized */}
          {showExplanation && moment.question?.explanation && (
            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg">
              <div className="flex items-start space-x-2 md:space-x-3">
                <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-semibold text-xs md:text-sm mb-1">Explicación:</p>
                  <p className="text-blue-200 text-sm md:text-base leading-relaxed">
                    {moment.question.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Skip button - Mobile Optimized */}
          {onSkip && !showFeedback && (
            <div className="mt-4 md:mt-6 text-center">
              <button
                onClick={onSkip}
                className="px-4 md:px-6 py-2 md:py-3 text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors text-sm md:text-base touch-manipulation"
              >
                Omitir pregunta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced styles for mobile and fullscreen */}
      <style jsx>{`
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Enhanced fullscreen support */
        .fixed.inset-0 {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 2147483647 !important;
        }
        
        /* Mobile specific improvements */
        @media (max-width: 768px) {
          .fixed.inset-0 {
            padding: 8px !important;
          }
          
          /* Better button spacing on mobile */
          button {
            min-height: 60px !important;
          }
          
          /* Larger touch targets */
          .touch-manipulation {
            min-height: 48px;
            min-width: 48px;
          }
        }
        
        /* Better mobile scrolling */
        @supports (-webkit-touch-callout: none) {
          .overflow-y-auto {
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
          }
        }
        
        /* Prevent zoom on iOS */
        @media screen and (max-width: 768px) {
          input, textarea, select, button {
            font-size: 16px !important;
          }
        }
        
        /* Better focus states for accessibility */
        button:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default InteractiveOverlayEnhanced;