import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface MobileInteractiveOverlayProps {
  moment: {
    id: string;
    title: string;
    question: {
      text: string;
      type: 'multiple_choice' | 'true_false' | 'short_answer';
      options?: string[];
      correctAnswer: string;
      explanation?: string;
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

const MobileInteractiveOverlay: React.FC<MobileInteractiveOverlayProps> = ({
  moment,
  onAnswer,
  onSkip,
  progress
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
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
    setTimeRemaining(30);
  }, [moment.id]);

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    const correct = answer === moment.question?.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Auto-continue after feedback
    setTimeout(() => {
      onAnswer(answer);
    }, correct ? 1500 : 2500);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 flex flex-col"
      style={{ 
        zIndex: 2147483647,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2 text-sm">
            <span>Pregunta {(progress?.answeredQuestions || 0) + 1}/{progress?.totalQuestions || 0}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold">
            <Clock className="w-4 h-4" />
            <span>{timeRemaining}s</span>
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="w-full bg-white/20 rounded-full h-1 mt-2">
          <div
            className="bg-white h-1 rounded-full transition-all"
            style={{ width: `${((progress?.answeredQuestions || 0) / (progress?.totalQuestions || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Question - Centered and Readable */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6 overflow-auto">
        <div className="max-w-md mx-auto w-full">
          <p className="text-white text-lg font-medium mb-6 text-center leading-relaxed">
            {moment.question?.text}
          </p>

          {/* Multiple Choice - Large Touch Targets */}
          {moment.question?.type === 'multiple_choice' && moment.question?.options && (
            <div className="space-y-3">
              {moment.question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`w-full p-4 rounded-xl text-left transition-all min-h-[60px] ${
                    showFeedback
                      ? option === moment.question?.correctAnswer
                        ? 'bg-green-500 text-white'
                        : selectedAnswer === option
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-400'
                      : 'bg-gray-700 text-white active:scale-95'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      showFeedback
                        ? option === moment.question?.correctAnswer
                          ? 'bg-green-600'
                          : selectedAnswer === option
                          ? 'bg-red-600'
                          : 'bg-gray-600'
                        : 'bg-gray-600'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-base">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* True/False - Simple Buttons */}
          {moment.question?.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              {['Verdadero', 'Falso'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`p-6 rounded-xl font-semibold text-lg transition-all ${
                    showFeedback
                      ? option === moment.question?.correctAnswer
                        ? 'bg-green-500 text-white'
                        : selectedAnswer === option
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-400'
                      : 'bg-gray-700 text-white active:scale-95'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Feedback - Compact */}
          {showFeedback && (
            <div className={`mt-6 p-4 rounded-lg text-center ${
              isCorrect ? 'bg-green-900/50' : 'bg-red-900/50'
            }`}>
              <div className="flex items-center justify-center gap-2">
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <span className={`font-bold text-lg ${
                  isCorrect ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isCorrect ? '¡Correcto!' : 'Incorrecto'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skip Button - Bottom */}
      {onSkip && !showFeedback && (
        <div className="p-4 text-center">
          <button
            onClick={onSkip}
            className="px-6 py-2 text-gray-400 text-sm"
          >
            Omitir pregunta
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileInteractiveOverlay;