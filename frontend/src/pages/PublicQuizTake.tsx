import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { FiClock, FiCheckCircle, FiCircle, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiConfig, buildApiUrl } from '../config/api.config';

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
  
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [session, setSession] = useState<QuizSession | null>(null);

  useEffect(() => {
    // Check if participant data exists
    const participantData = sessionStorage.getItem('publicQuizParticipant');
    if (!participantData) {
      toast.error(t('publicQuiz.identificationRequired'));
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
      
      // Fetch actual quiz questions from the API
      const response = await fetch(buildApiUrl(`/quizzes/${id}/questions/public`));
      
      if (!response.ok) {
        throw new Error('Failed to fetch quiz questions');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform the questions to match our interface
        const transformedQuestions: Question[] = data.data.questions.map((q: any) => {
          let options = q.options;
          
          // Transform simple array options to choices format for multiple choice
          if (q.question_type === 'multiple_choice' && Array.isArray(options) && typeof options[0] === 'string') {
            options = {
              choices: options.map((opt: string, index: number) => ({
                id: String.fromCharCode(97 + index), // a, b, c, d...
                text: opt
              }))
            };
          }
          
          // Ensure true/false questions have proper options
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
        
        // Set time limit from quiz data
        const timeLimitMinutes = data.data.timeLimit || 10;
        setTimeLeft(timeLimitMinutes * 60);
        
        // Create session
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
      toast.error(t('publicQuiz.errorLoadingQuiz'));
      
      // Fallback to navigate back to identification page
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
      
      // Calculate time spent in seconds
      const startTime = new Date(participantData.startTime || Date.now()).getTime();
      const endTime = Date.now();
      const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);
      
      // Send answers to backend for grading
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
        // Save graded results
        sessionStorage.setItem('publicQuizResults', JSON.stringify({
          ...result.data,
          quizId: id,
          participant: participantData,
          completedAt: new Date().toISOString()
        }));
        
        setQuizCompleted(true);
        toast.success(t('publicQuiz.quizCompleted'));
      } else {
        throw new Error(result.error || 'Failed to grade quiz');
      }
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error(t('publicQuiz.errorSubmitting'));
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const results = JSON.parse(sessionStorage.getItem('publicQuizResults') || '{}');
    const passed = parseFloat(results.score) >= 70;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className={`w-20 h-20 ${passed ? 'bg-success/10' : 'bg-warning/10'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <FiCheckCircle className={passed ? 'text-success' : 'text-warning'} size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-primary mb-4">
              {passed ? t('publicQuiz.congratulations') : t('publicQuiz.quizCompletedTitle')}
            </h2>
            
            <p className="text-text-secondary mb-6">
              {passed ? t('publicQuiz.passedMessage') : t('publicQuiz.failedMessage')}
            </p>
            
            <div className="bg-background rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-text-secondary">{t('publicQuiz.yourScore')}</p>
                  <p className={`text-2xl font-bold ${passed ? 'text-success' : 'text-warning'}`}>
                    {parseFloat(results.score || 0).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">{t('publicQuiz.correctAnswers')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {results.correctAnswers || 0}/{results.totalQuestions || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">{t('publicQuiz.pointsEarned')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {results.earnedPoints || 0}/{results.totalPoints || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">{t('publicQuiz.timeSpent')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatTime(results.timeSpent || 0)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Pass/Fail Badge */}
            <div className="mb-6">
              <span className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
                passed 
                  ? 'bg-success/10 text-success border-2 border-success' 
                  : 'bg-warning/10 text-warning border-2 border-warning'
              }`}>
                {passed ? t('publicQuiz.passed') : t('publicQuiz.needsImprovement')}
              </span>
            </div>
            
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/')}
                fullWidth
              >
                {t('publicQuiz.backToHome')}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  sessionStorage.removeItem('publicQuizParticipant');
                  sessionStorage.removeItem('publicQuizResults');
                  navigate(`/quiz/${id}/public`);
                }}
                fullWidth
              >
                {t('publicQuiz.takeAnother')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <div className="bg-surface shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/images/logoAristoTest.png" 
                alt="AristoTest" 
                className="h-8 w-auto"
              />
              <div>
                <p className="text-sm text-text-secondary">
                  {t('publicQuiz.question')} {currentQuestionIndex + 1} {t('publicQuiz.of')} {questions.length}
                </p>
                <div className="flex gap-1 mt-1">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-8 h-1 rounded-full ${
                        index < currentQuestionIndex
                          ? 'bg-success'
                          : index === currentQuestionIndex
                          ? 'bg-primary'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeLeft < 60 ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
            }`}>
              <FiClock />
              <span className="font-semibold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-primary">
                {currentQuestion.question_text}
              </h3>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {currentQuestion.points} {t('publicQuiz.points')}
              </span>
            </div>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options?.choices && (
              <>
                {currentQuestion.options.choices.map((option: any) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option.id}
                      checked={answers[currentQuestion.id] === option.id}
                      onChange={() => handleAnswerSelect(currentQuestion.id, option.id)}
                      className="text-primary"
                    />
                    <span className="text-text-primary">{option.text}</span>
                  </label>
                ))}
              </>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <>
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === 'true'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="true"
                    checked={answers[currentQuestion.id] === 'true'}
                    onChange={() => handleAnswerSelect(currentQuestion.id, 'true')}
                    className="text-primary"
                  />
                  <span className="text-text-primary">{t('publicQuiz.true')}</span>
                </label>
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === 'false'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="false"
                    checked={answers[currentQuestion.id] === 'false'}
                    onChange={() => handleAnswerSelect(currentQuestion.id, 'false')}
                    className="text-primary"
                  />
                  <span className="text-text-primary">{t('publicQuiz.false')}</span>
                </label>
              </>
            )}

            {currentQuestion.question_type === 'short_answer' && (
              <textarea
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                rows={4}
                placeholder={t('publicQuiz.typeYourAnswer')}
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              {t('common.previous')}
            </Button>

            <div className="flex items-center gap-2">
              {answers[currentQuestion.id] && (
                <FiCheckCircle className="text-success" size={20} />
              )}
              <span className="text-sm text-text-secondary">
                {answers[currentQuestion.id] ? t('publicQuiz.answered') : t('publicQuiz.notAnswered')}
              </span>
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleSubmitQuiz}
              >
                {t('publicQuiz.submit')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNextQuestion}
              >
                {t('common.next')}
              </Button>
            )}
          </div>
        </Card>

        {/* Question Navigator */}
        <Card className="mt-4 p-4">
          <p className="text-sm text-text-secondary mb-3">{t('publicQuiz.questionNavigator')}</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-primary text-white'
                    : answers[questions[index].id]
                    ? 'bg-success/10 text-success border-2 border-success'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}