import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Session {
  id: number;
  code: string;
  status: string;
  currentQuestion: number;
  quiz: {
    id: number;
    title: string;
    description: string;
    questionsCount: number;
  };
}

interface Question {
  id: number;
  type: string;
  question: string;
  options: string[] | null;
  points: number;
  timeLimit: number | null;
}

interface QuestionState {
  questionNumber: number;
  totalQuestions: number;
  question: Question;
  finished: boolean;
}

export default function PlayQuiz() {
  const navigate = useNavigate();
  const [sessionCode, setSessionCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (timer !== null && timer > 0 && !hasAnswered) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev !== null && prev <= 1) {
            // Auto-submit when time runs out
            if (!hasAnswered) {
              submitAnswer();
            }
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, hasAnswered]);

  useEffect(() => {
    // Poll for new questions when session is active
    if (session && session.status === 'active') {
      checkForNewQuestion();
      
      if (!hasAnswered) {
        const interval = setInterval(() => {
          checkForNewQuestion();
        }, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [session?.status, session?.currentQuestion, hasAnswered]);

  const joinSession = async () => {
    if (!sessionCode || !participantName) {
      toast.error('Please enter both session code and your name');
      return;
    }

    setJoining(true);
    try {
      // Get session by code
      const response = await fetch(`http://localhost:3001/api/v1/sessions/${sessionCode}`);
      
      if (response.ok) {
        const data = await response.json();
        setSession(data.data);
        
        // Check if session is active
        if (data.data.status === 'waiting') {
          toast.success('Joined session! Waiting for host to start...');
        } else if (data.data.status === 'active') {
          toast.success('Joined active session!');
          checkForNewQuestion();
        } else if (data.data.status === 'completed') {
          toast('This session has ended', { icon: 'ℹ️' });
          navigate(`/sessions/${data.data.id}/results?participant=${participantName}`);
        }
      } else {
        toast.error('Invalid session code');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    } finally {
      setJoining(false);
    }
  };

  const checkForNewQuestion = async () => {
    if (!session) return;


    try {
      const response = await fetch(`http://localhost:3001/api/v1/sessions/${session.id}/current-question`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data.finished) {
          // Quiz is finished
          toast.success('Quiz completed!');
          navigate(`/sessions/${session.id}/results?participant=${participantName}`);
        } else if (!currentQuestion || currentQuestion.question.id !== data.data.question.id) {
          // New question available
          setCurrentQuestion(data.data);
          setHasAnswered(false);
          setSelectedAnswer('');
          setShortAnswer('');
          setIsCorrect(null);
          
          // Set timer if question has time limit
          if (data.data.question.timeLimit) {
            setTimer(data.data.question.timeLimit);
          } else {
            setTimer(null);
          }
        }
      } else {
        console.error('Failed to fetch question:', response.status);
      }
    } catch (error) {
      console.error('Error checking for question:', error);
    }
  };

  const submitAnswer = async () => {
    if (!session || !currentQuestion || hasAnswered) return;

    const answer = currentQuestion.question.type === 'short_answer' ? shortAnswer : selectedAnswer;
    
    if (!answer) {
      toast.error('Please select or enter an answer');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/v1/sessions/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: currentQuestion.question.id,
          answer,
          participantName,
          timeSpent: currentQuestion.question.timeLimit ? 
            currentQuestion.question.timeLimit - (timer || 0) : 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        setHasAnswered(true);
        setIsCorrect(data.data.isCorrect);
        setScore(data.data.score);
        setTotalScore(prev => prev + data.data.score);
        setTimer(null);
        
        if (data.data.isCorrect) {
          toast.success(`Correct! +${data.data.score} points`);
        } else {
          toast.error('Incorrect answer');
        }
      } else {
        toast.error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Error submitting answer');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Join screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Join Quiz Session
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            Enter the session code to participate
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Code
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-center text-2xl font-bold uppercase"
                maxLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none"
              />
            </div>
            
            <button
              onClick={joinSession}
              disabled={joining || !sessionCode || !participantName}
              className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {joining ? 'Joining...' : 'Join Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen
  if (session.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="animate-pulse">
              <div className="w-24 h-24 bg-primary/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Clock className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              You're in! 🎉
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Welcome, <span className="font-semibold">{participantName}</span>
            </p>
            <p className="text-gray-500">
              Waiting for the host to start the quiz...
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-2">Quiz Title</p>
            <p className="text-2xl font-bold text-gray-900">{session.quiz.title}</p>
            <p className="text-gray-500 mt-2">
              {session.quiz.questionsCount} questions
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Paused screen
  if (session.status === 'paused') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">⏸️</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Session Paused
          </h2>
          <p className="text-xl text-gray-600">
            The host has paused the quiz. Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Question screen
  if (currentQuestion && !currentQuestion.finished) {
    const { question, questionNumber, totalQuestions } = currentQuestion;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-90">Question {questionNumber} of {totalQuestions}</p>
                <p className="text-2xl font-bold">{participantName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Total Score</p>
                <p className="text-2xl font-bold">{totalScore}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/10 backdrop-blur rounded-full h-2 mb-6">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Debug Info */}
          <div className="bg-yellow-100 p-3 mb-4 rounded text-sm">
            <p>Debug: hasAnswered = {String(hasAnswered)}, selectedAnswer = {selectedAnswer}, shortAnswer = {shortAnswer}</p>
            <p>Question Type: {question.type}</p>
          </div>
          
          {/* Question Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Timer and Points */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {question.type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-gray-500">
                  {question.points} points
                </span>
              </div>
              {timer !== null && !hasAnswered && (
                <div className={`flex items-center space-x-2 ${timer <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                  <Clock className="w-5 h-5" />
                  <span className="text-xl font-bold">{formatTime(timer)}</span>
                </div>
              )}
            </div>

            {/* Question Text */}
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              {question.question}
            </h2>

            {/* Answer Options */}
            {question.type === 'multiple_choice' && question.options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      console.log('Option clicked:', index, 'hasAnswered:', hasAnswered);
                      if (!hasAnswered) {
                        setSelectedAnswer(String(index));
                        console.log('Selected answer set to:', String(index));
                      }
                    }}
                    disabled={hasAnswered}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      hasAnswered
                        ? isCorrect && selectedAnswer === String(index)
                          ? 'border-green-500 bg-green-50'
                          : !isCorrect && selectedAnswer === String(index)
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                        : selectedAnswer === String(index)
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-primary hover:bg-gray-50'
                    } ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        hasAnswered
                          ? isCorrect && selectedAnswer === String(index)
                            ? 'bg-green-500 text-white'
                            : !isCorrect && selectedAnswer === String(index)
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                          : selectedAnswer === String(index)
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-left">{option}</span>
                      {hasAnswered && selectedAnswer === String(index) && (
                        <span className="ml-auto">
                          {isCorrect ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {question.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {['true', 'false'].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      console.log('True/False clicked:', option, 'hasAnswered:', hasAnswered);
                      if (!hasAnswered) {
                        setSelectedAnswer(option);
                        console.log('Selected answer set to:', option);
                      }
                    }}
                    disabled={hasAnswered}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      hasAnswered
                        ? isCorrect && selectedAnswer === option
                          ? 'border-green-500 bg-green-50'
                          : !isCorrect && selectedAnswer === option
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                        : selectedAnswer === option
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-primary hover:bg-gray-50'
                    } ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-xl font-semibold capitalize">
                      {option}
                    </span>
                    {hasAnswered && selectedAnswer === option && (
                      <span className="ml-4">
                        {isCorrect ? (
                          <CheckCircle className="w-6 h-6 text-green-500 inline" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500 inline" />
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {question.type === 'short_answer' && (
              <div className="mb-6">
                <input
                  type="text"
                  value={shortAnswer}
                  onChange={(e) => {
                    console.log('Input changed:', e.target.value);
                    if (!hasAnswered) {
                      setShortAnswer(e.target.value);
                    }
                  }}
                  onFocus={() => console.log('Input focused')}
                  disabled={hasAnswered}
                  placeholder="Type your answer here..."
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                    hasAnswered
                      ? isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300 focus:border-primary'
                  }`}
                />
              </div>
            )}

            {/* Submit Button or Result */}
            {!hasAnswered ? (
              <button
                onClick={() => {
                  console.log('Submit clicked, answer:', selectedAnswer || shortAnswer);
                  submitAnswer();
                }}
                disabled={loading || (!selectedAnswer && !shortAnswer)}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>{loading ? 'Submitting...' : 'Submit Answer'}</span>
              </button>
            ) : (
              <div className={`text-center p-4 rounded-lg ${
                isCorrect ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className={`text-xl font-bold ${
                  isCorrect ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isCorrect ? `Correct! +${score} points` : 'Incorrect'}
                </p>
                <p className="text-gray-600 mt-2">
                  Waiting for next question...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-xl text-gray-600">Loading question...</p>
      </div>
    </div>
  );
}