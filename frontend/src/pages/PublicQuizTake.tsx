import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  RiTimeLine, 
  RiCheckboxCircleLine, 
  RiRadioButtonLine,
  RiQuestionLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiSendPlaneLine,
  RiAwardLine,
  RiTrophyLine,
  RiLoader4Line,
  RiCheckLine,
  RiCloseLine,
  RiSmartphoneLine,
  RiTabletLine,
  RiComputerLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { apiConfig, buildApiUrl } from '../config/api.config';
import useDeviceDetect from '../hooks/useDeviceDetect';

interface Question {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: any;
  time_limit_seconds?: number;
  points: number;
}

interface QuizSession {
  id: number;
  quiz_id: number;
  current_question_index: number;
  total_questions: number;
  time_limit_minutes: number;
}

export default function PublicQuizTake() {
  const { t } = useTranslation();
  const { id, sessionId } = useParams<{ id: string; sessionId?: string }>();
  const navigate = useNavigate();
  const device = useDeviceDetect();
  
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(30);

  useEffect(() => {
    // Check if participant data exists
    const participantData = sessionStorage.getItem('publicQuizParticipant');
    if (!participantData) {
      toast.error('Por favor identifíquese primero');
      navigate(`/quiz/${id}/public`);
      return;
    }
    
    fetchQuizQuestions();
  }, [id]);

  useEffect(() => {
    if (quizStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [quizStarted, timeLeft]);

  const fetchQuizQuestions = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(buildApiUrl(`/quizzes/${id}/questions/public`));
      
      if (!response.ok) {
        throw new Error('Failed to fetch quiz questions');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const transformedQuestions: Question[] = data.data.questions.map((q: any) => {
          let options = q.options;
          
          if (q.question_type === 'multiple_choice' && Array.isArray(options) && typeof options[0] === 'string') {
            options = {
              choices: options.map((opt: string, index: number) => ({
                id: String.fromCharCode(97 + index),
                text: opt
              }))
            };
          }
          
          if (q.question_type === 'true_false' && (!options || !options.choices)) {
            options = {
              choices: [
                { id: 'true', text: 'Verdadero' },
                { id: 'false', text: 'Falso' }
              ]
            };
          }
          
          return {
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: options,
            time_limit_seconds: q.time_limit_seconds,
            points: q.points || 10
          };
        });
        
        setQuestions(transformedQuestions);
        
        const timeLimitMinutes = data.data.timeLimit || 10;
        setTimeLeft(timeLimitMinutes * 60);
        
        setSession({
          id: parseInt(sessionId || '1'),
          quiz_id: parseInt(id || '1'),
          current_question_index: 0,
          total_questions: transformedQuestions.length,
          time_limit_minutes: timeLimitMinutes
        });
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      toast.error('Error al cargar el quiz');
      
      setTimeout(() => {
        navigate(`/quiz/${id}/public`);
      }, 2000);
    } finally {
      setLoading(false);
      setQuizStarted(true);
    }
  };

  const handleAnswerSelect = (questionId: number, answer: any) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });

    // Auto-avanzar en móviles después de seleccionar respuesta
    if (device.isMobile && currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        handleNextQuestion();
      }, 300);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      const participantData = JSON.parse(sessionStorage.getItem('publicQuizParticipant') || '{}');
      
      const startTime = new Date(participantData.startTime || Date.now()).getTime();
      const endTime = Date.now();
      const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);
      
      const response = await fetch(buildApiUrl('/grading/submit-public'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: id,
          sessionId: session?.id,
          participant: participantData,
          answers,
          timeSpent: timeSpentSeconds,
          startedAt: participantData.startTime
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }
      
      const result = await response.json();
      
      if (result.success) {
        sessionStorage.setItem('publicQuizResults', JSON.stringify({
          ...result.data,
          quizId: id,
          participant: participantData,
          completedAt: new Date().toISOString()
        }));
        
        setQuizCompleted(true);
        toast.success('¡Quiz completado exitosamente!');
      } else {
        throw new Error(result.error || 'Failed to grade quiz');
      }
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Error al enviar el quiz');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeviceIcon = () => {
    if (device.isMobile) return <RiSmartphoneLine className="inline" />;
    if (device.isTablet) return <RiTabletLine className="inline" />;
    return <RiComputerLine className="inline" />;
  };

  // Auto-cerrar después de completar el quiz con contador
  useEffect(() => {
    if (quizCompleted) {
      const countdownInterval = setInterval(() => {
        setAutoCloseCountdown((prev) => {
          if (prev <= 1) {
            // Intentar cerrar la ventana
            if (window.opener) {
              window.close();
            } else {
              // Si no se puede cerrar, mostrar mensaje
              toast.info('Quiz finalizado. Puede cerrar esta ventana.');
              // Redirigir a página en blanco
              setTimeout(() => {
                window.location.href = 'about:blank';
              }, 2000);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    }
  }, [quizCompleted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="animate-spin text-6xl text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Preparando quiz...</p>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const results = JSON.parse(sessionStorage.getItem('publicQuizResults') || '{}');
    const passed = parseFloat(results.score) >= 70;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="text-center mb-8">
              <div className={`w-24 h-24 ${passed ? 'bg-green-500' : 'bg-orange-500'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                {passed ? (
                  <RiTrophyLine className="text-5xl text-white" />
                ) : (
                  <RiAwardLine className="text-5xl text-white" />
                )}
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                {passed ? '¡Felicitaciones!' : 'Quiz Completado'}
              </h2>
              
              <p className="text-gray-400">
                {passed ? 'Has aprobado exitosamente.' : 'Sigue practicando para mejorar.'}
              </p>
              
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-full">
                <RiTimeLine className="text-purple-400" />
                <p className="text-sm text-gray-300">
                  Cerrando en <span className="font-bold text-purple-400">{autoCloseCountdown}</span> segundos
                </p>
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Puntuación</p>
                  <p className={`text-3xl font-bold ${passed ? 'text-green-400' : 'text-orange-400'}`}>
                    {parseFloat(results.score || 0).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Correctas</p>
                  <p className="text-3xl font-bold text-white">
                    {results.correctAnswers || 0}/{results.totalQuestions || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Puntos</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {results.earnedPoints || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Tiempo</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatTime(results.timeSpent || 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-6 text-center">
              <span className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
                passed 
                  ? 'bg-green-900/30 text-green-400 border border-green-600' 
                  : 'bg-orange-900/30 text-orange-400 border border-orange-600'
              }`}>
                {passed ? 'APROBADO' : 'NECESITA MEJORAR'}
              </span>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => {
                  sessionStorage.removeItem('publicQuizParticipant');
                  sessionStorage.removeItem('publicQuizResults');
                  
                  // Intentar cerrar la ventana
                  if (window.opener || window.parent !== window) {
                    window.close();
                  } else {
                    // Si no se puede cerrar, limpiar y mostrar mensaje
                    toast.success('Quiz finalizado. Puede cerrar esta ventana.');
                    // Opcional: redirigir a una página en blanco
                    window.location.href = 'about:blank';
                  }
                }}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Sus resultados han sido guardados exitosamente
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header compacto para móviles */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuestionNav(!showQuestionNav)}
                className="md:hidden p-2 bg-gray-700 rounded-lg text-white"
              >
                <RiQuestionLine size={20} />
              </button>
              <div>
                <p className="text-xs text-gray-400">Pregunta</p>
                <p className="text-lg font-bold text-white">
                  {currentQuestionIndex + 1}/{questions.length}
                </p>
              </div>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              timeLeft < 60 ? 'bg-red-900/30 text-red-400' : 'bg-purple-900/30 text-purple-400'
            }`}>
              <RiTimeLine size={20} />
              <span className="font-semibold text-lg">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="mt-3">
            <div className="bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Panel de navegación de preguntas (móvil) */}
      {showQuestionNav && device.isMobile && (
        <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setShowQuestionNav(false)}>
          <div className="bg-gray-800 p-4 h-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-4">Navegación de Preguntas</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentQuestionIndex(index);
                    setShowQuestionNav(false);
                  }}
                  className={`p-3 rounded-lg font-semibold transition-all ${
                    answers[questions[index]?.id]
                      ? 'bg-green-600 text-white'
                      : index === currentQuestionIndex
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contenido de la pregunta */}
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
          {/* Indicador de puntos */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-semibold text-white leading-relaxed">
                {currentQuestion.question_text}
              </h3>
            </div>
            <span className="ml-4 px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-sm font-medium whitespace-nowrap">
              {currentQuestion.points} pts
            </span>
          </div>

          {/* Opciones de respuesta optimizadas para táctil */}
          <div className="space-y-3 mb-8">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options?.choices && (
              <>
                {currentQuestion.options.choices.map((option: any) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                    className={`w-full flex items-center gap-4 p-4 md:p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                      answers[currentQuestion.id] === option.id
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-600 hover:border-purple-400 bg-gray-700/50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestion.id] === option.id
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-400'
                    }`}>
                      {answers[currentQuestion.id] === option.id && (
                        <RiCheckLine className="text-white text-sm" />
                      )}
                    </div>
                    <span className={`text-base md:text-lg ${
                      answers[currentQuestion.id] === option.id
                        ? 'text-white font-medium'
                        : 'text-gray-300'
                    }`}>
                      {option.text}
                    </span>
                  </button>
                ))}
              </>
            )}

            {currentQuestion.question_type === 'true_false' && currentQuestion.options?.choices && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.choices.map((option: any) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      answers[currentQuestion.id] === option.id
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-600 hover:border-purple-400 bg-gray-700/50'
                    }`}
                  >
                    <div className="text-center">
                      {option.id === 'true' ? (
                        <RiCheckLine className={`text-4xl mb-2 mx-auto ${
                          answers[currentQuestion.id] === option.id
                            ? 'text-green-400'
                            : 'text-gray-400'
                        }`} />
                      ) : (
                        <RiCloseLine className={`text-4xl mb-2 mx-auto ${
                          answers[currentQuestion.id] === option.id
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`} />
                      )}
                      <span className={`text-lg font-medium ${
                        answers[currentQuestion.id] === option.id
                          ? 'text-white'
                          : 'text-gray-300'
                      }`}>
                        {option.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'short_answer' && (
              <div>
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={device.isMobile ? 4 : 6}
                />
              </div>
            )}
          </div>

          {/* Navegación de preguntas - Optimizada para móvil */}
          <div className="flex gap-3">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`flex-1 py-4 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                currentQuestionIndex === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <RiArrowLeftLine />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmitQuiz}
                className="flex-1 py-4 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RiSendPlaneLine />
                <span>Finalizar Quiz</span>
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="flex-1 py-4 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <RiArrowRightLine />
              </button>
            )}
          </div>

          {/* Indicador de respuestas para tablets y desktop */}
          {!device.isMobile && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-3">Progreso de respuestas:</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                      answers[q.id]
                        ? 'bg-green-600 text-white'
                        : index === currentQuestionIndex
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Indicador de dispositivo (solo desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center text-gray-500 text-sm">
            {getDeviceIcon()} {device.isMobile ? 'Móvil' : device.isTablet ? 'Tablet' : 'Desktop'} - {device.orientation}
          </div>
        )}
      </div>
    </div>
  );
}