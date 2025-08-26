import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, Award, CheckCircle, AlertCircle } from 'lucide-react';

interface Question {
  id: string | number;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number | null;
  correct_answer?: string;
  points: number;
  timeLimit?: number;
  explanation?: string;
}

interface QuizPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: {
    title: string;
    description: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
    passingScore: number;
    questions: Question[];
  };
}

export default function QuizPreviewModal({ isOpen, onClose, quiz }: QuizPreviewModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: any }>({});

  if (!isOpen) return null;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleAnswerSelect = (answer: any) => {
    setUserAnswers({
      ...userAnswers,
      [currentQuestionIndex]: answer
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCorrectAnswer = () => {
    if (!currentQuestion) return null;
    
    if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
      const correctIndex = typeof currentQuestion.correctAnswer === 'number' 
        ? currentQuestion.correctAnswer 
        : parseInt(currentQuestion.correctAnswer as string);
      return currentQuestion.options[correctIndex] || currentQuestion.correct_answer;
    } else if (currentQuestion.type === 'true_false') {
      return currentQuestion.correctAnswer?.toString() || currentQuestion.correct_answer;
    }
    return currentQuestion.correctAnswer || currentQuestion.correct_answer;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vista Previa del Quiz</h2>
              <p className="text-sm text-gray-500 mt-1">{quiz.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quiz Info Bar */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Categoría</p>
                <p className="text-sm font-medium">{quiz.category}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                {quiz.difficulty === 'easy' ? 'Fácil' : quiz.difficulty === 'medium' ? 'Medio' : 'Difícil'}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Tiempo</p>
                <p className="text-sm font-medium">{quiz.timeLimit ? `${quiz.timeLimit} min` : 'Sin límite'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Para aprobar</p>
                <p className="text-sm font-medium">{quiz.passingScore}%</p>
              </div>
            </div>
          </div>

          {/* Question Display */}
          {currentQuestion ? (
            <div className="mb-6">
              {/* Question Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-blue-600">
                      Pregunta {currentQuestionIndex + 1} de {quiz.questions.length}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({currentQuestion.points} {currentQuestion.points === 1 ? 'punto' : 'puntos'})
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {currentQuestion.question}
                  </h3>
                </div>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <>
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = userAnswers[currentQuestionIndex] === index;
                      const isCorrect = index === currentQuestion.correctAnswer;
                      const showCorrectness = showAnswer;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            showCorrectness && isCorrect
                              ? 'border-green-500 bg-green-50'
                              : showCorrectness && isSelected && !isCorrect
                              ? 'border-red-500 bg-red-50'
                              : isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start">
                            <span className="inline-flex items-center justify-center w-6 h-6 mr-3 text-sm font-medium border-2 rounded-full">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {showCorrectness && isCorrect && (
                              <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                            )}
                            {showCorrectness && isSelected && !isCorrect && (
                              <AlertCircle className="w-5 h-5 text-red-600 ml-2" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {currentQuestion.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['true', 'false'].map((answer) => {
                      const isSelected = userAnswers[currentQuestionIndex] === answer;
                      const isCorrect = currentQuestion.correctAnswer?.toString() === answer;
                      const showCorrectness = showAnswer;
                      
                      return (
                        <button
                          key={answer}
                          onClick={() => handleAnswerSelect(answer)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            showCorrectness && isCorrect
                              ? 'border-green-500 bg-green-50'
                              : showCorrectness && isSelected && !isCorrect
                              ? 'border-red-500 bg-red-50'
                              : isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <span className="font-medium">
                            {answer === 'true' ? 'Verdadero' : 'Falso'}
                          </span>
                          {showCorrectness && isCorrect && (
                            <CheckCircle className="w-5 h-5 text-green-600 ml-2 inline" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'short_answer' && (
                  <div>
                    <input
                      type="text"
                      placeholder="Escribe tu respuesta aquí..."
                      value={userAnswers[currentQuestionIndex] || ''}
                      onChange={(e) => handleAnswerSelect(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showAnswer && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">Respuesta correcta:</p>
                        <p className="text-sm text-blue-700">{getCorrectAnswer()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Explanation */}
              {showAnswer && currentQuestion.explanation && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-900 mb-1">Explicación:</p>
                  <p className="text-sm text-yellow-800">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay preguntas en este quiz</p>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentQuestionIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                {showAnswer ? 'Ocultar Respuesta' : 'Ver Respuesta'}
              </button>
            </div>

            <button
              onClick={handleNext}
              disabled={currentQuestionIndex >= quiz.questions.length - 1}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentQuestionIndex >= quiz.questions.length - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}