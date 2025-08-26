import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Brain, Target, BookOpen } from 'lucide-react';

interface InteractiveOverlayProps {
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
}

const InteractiveOverlay: React.FC<InteractiveOverlayProps> = ({
  moment,
  onAnswer,
  onSkip,
  progress
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shortAnswer, setShortAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (onSkip) onSkip();
          return 30;
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
    setShortAnswer('');
    setTimeRemaining(30);
  }, [moment.id]);

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    const correct = answer === moment.question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    setTimeout(() => {
      onAnswer(answer);
    }, 2000);
  };

  const handleShortAnswerSubmit = () => {
    if (!shortAnswer.trim()) return;
    
    const correct = shortAnswer.toLowerCase().includes(moment.question.correctAnswer.toLowerCase());
    setIsCorrect(correct);
    setShowFeedback(true);
    
    setTimeout(() => {
      onAnswer(shortAnswer);
    }, 2000);
  };

  const getTypeIcon = () => {
    switch (moment.type) {
      case 'concept':
        return <Brain className="w-5 h-5" />;
      case 'example':
        return <BookOpen className="w-5 h-5" />;
      case 'exercise':
        return <Target className="w-5 h-5" />;
      default:
        return <Brain className="w-5 h-5" />;
    }
  };

  const getDifficultyColor = () => {
    switch (moment.question.difficulty) {
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

  return (
    <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getTypeIcon()}
              <span className="text-white text-sm font-medium capitalize">
                {moment.type}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`text-sm font-medium ${getDifficultyColor()}`}>
                {moment.question.difficulty.toUpperCase()}
              </span>
              <div className="flex items-center space-x-1 text-white">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-bold">{timeRemaining}s</span>
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white">{moment.title}</h3>
          {moment.description && (
            <p className="text-blue-100 text-sm mt-1">{moment.description}</p>
          )}
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="px-6 py-3 bg-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <span>Progreso: {progress.answeredQuestions} / {progress.totalQuestions}</span>
              <span>Correctas: {progress.correctAnswers}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.answeredQuestions / progress.totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Question */}
        <div className="p-6">
          <p className="text-white text-lg font-medium mb-6">
            {moment.question.text}
          </p>

          {/* Multiple choice options */}
          {moment.question.type === 'multiple_choice' && moment.question.options && (
            <div className="space-y-3">
              {moment.question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                    showFeedback
                      ? option === moment.question.correctAnswer
                        ? 'bg-green-600 text-white'
                        : selectedAnswer === option
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                      : selectedAnswer === option
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{String.fromCharCode(65 + index)}. {option}</span>
                    {showFeedback && (
                      <>
                        {option === moment.question.correctAnswer && (
                          <CheckCircle className="w-5 h-5 text-green-200" />
                        )}
                        {selectedAnswer === option && option !== moment.question.correctAnswer && (
                          <XCircle className="w-5 h-5 text-red-200" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* True/False options */}
          {moment.question.type === 'true_false' && (
            <div className="flex space-x-4">
              {['Verdadero', 'Falso'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`flex-1 p-4 rounded-lg transition-all duration-200 ${
                    showFeedback
                      ? option === moment.question.correctAnswer
                        ? 'bg-green-600 text-white'
                        : selectedAnswer === option
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                      : selectedAnswer === option
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span className="font-medium">{option}</span>
                    {showFeedback && (
                      <>
                        {option === moment.question.correctAnswer && (
                          <CheckCircle className="w-5 h-5 ml-2 text-green-200" />
                        )}
                        {selectedAnswer === option && option !== moment.question.correctAnswer && (
                          <XCircle className="w-5 h-5 ml-2 text-red-200" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Short answer input */}
          {moment.question.type === 'short_answer' && (
            <div className="space-y-4">
              <input
                type="text"
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleShortAnswerSubmit()}
                disabled={showFeedback}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full p-4 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleShortAnswerSubmit}
                disabled={showFeedback || !shortAnswer.trim()}
                className="w-full p-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Enviar Respuesta
              </button>
            </div>
          )}

          {/* Feedback */}
          {showFeedback && (
            <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-900' : 'bg-red-900'}`}>
              <div className="flex items-start space-x-3">
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {isCorrect ? '¡Correcto!' : 'Incorrecto'}
                  </p>
                  <p className="text-gray-300 text-sm mt-1">
                    {moment.question.explanation}
                  </p>
                  {!isCorrect && (
                    <p className="text-gray-400 text-sm mt-2">
                      Respuesta correcta: <span className="text-white">{moment.question.correctAnswer}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Skip button */}
          {onSkip && !showFeedback && (
            <button
              onClick={onSkip}
              className="mt-6 w-full p-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Saltar pregunta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveOverlay;