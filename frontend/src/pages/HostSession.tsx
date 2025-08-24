import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Play, Users, ChevronRight, ChevronLeft, Eye, EyeOff, Pause, StopCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { buildApiUrl } from '../config/api.config';

interface Session {
  id: number;
  code: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  currentQuestion: number;
  quiz: {
    id: number;
    title: string;
    description: string;
    questionsCount: number;
    timeLimit: number | null;
  };
  participantsCount: number;
}

interface Question {
  id: number;
  type: string;
  question: string;
  options: string[] | null;
  points: number;
  timeLimit: number | null;
}

export default function HostSession() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const quizId = searchParams.get('quiz');
  
  const [session, setSession] = useState<Session | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [responses, setResponses] = useState<number>(0);

  useEffect(() => {
    if (!quizId) {
      toast.error('No quiz selected');
      navigate('/quizzes');
      return;
    }
    createSession();
  }, [quizId]);
  
  // Load current question when session becomes active
  useEffect(() => {
    if (session && session.status === 'active' && !currentQuestion && !loading) {
      console.log('Session is active, loading question...');
      loadCurrentQuestion();
    }
  }, [session?.status]);

  useEffect(() => {
    if (timer !== null && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev !== null ? Math.max(0, prev - 1) : null);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const createSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('/sessions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ quizId })
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.data);
        setTotalQuestions(data.data.quiz.questionsCount);
        toast.success(`Session created! Code: ${data.data.code}`);
      } else {
        toast.error('Failed to create session');
        navigate('/quizzes');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Error creating session');
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    if (!session) return;
    
    console.log('Starting session:', session.id);
    
    try {
      const response = await fetch(buildApiUrl(`/sessions/${session.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: 'active', currentQuestion: 0 })
      });

      console.log('Start session response:', response.status);

      if (response.ok) {
        // Update local state
        const updatedSession = { ...session, status: 'active' as const, currentQuestion: 0 };
        setSession(updatedSession);
        toast.success('Session started!');
        
        // Load the first question immediately
        setTimeout(() => {
          loadCurrentQuestion();
        }, 100);
      } else {
        const error = await response.text();
        console.error('Failed to start session:', error);
        toast.error('Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Error starting session');
    }
  };

  const loadCurrentQuestion = async () => {
    if (!session) return;
    
    console.log('Loading question for session:', session.id);
    
    try {
      const response = await fetch(buildApiUrl(`/sessions/${session.id}/current-question`));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Question data received:', data);
        
        if (data.data.finished) {
          endSession();
        } else {
          setCurrentQuestion(data.data.question);
          setQuestionNumber(data.data.questionNumber);
          setTotalQuestions(data.data.totalQuestions);
          setShowAnswers(false);
          setResponses(0);
          
          // Set timer if question has time limit
          if (data.data.question && data.data.question.timeLimit) {
            setTimer(data.data.question.timeLimit);
          } else {
            setTimer(null);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to load question:', errorText);
        toast.error('Failed to load question: ' + response.status);
      }
    } catch (error) {
      console.error('Error loading question:', error);
      toast.error('Error loading question');
    }
  };

  const nextQuestion = async () => {
    if (!session) return;
    
    const newQuestionIndex = session.currentQuestion + 1;
    
    try {
      const response = await fetch(buildApiUrl(`/sessions/${session.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          status: 'active', 
          currentQuestion: newQuestionIndex 
        })
      });

      if (response.ok) {
        setSession({ ...session, currentQuestion: newQuestionIndex });
        loadCurrentQuestion();
      } else {
        toast.error('Failed to advance question');
      }
    } catch (error) {
      console.error('Error advancing question:', error);
      toast.error('Error advancing question');
    }
  };

  const previousQuestion = async () => {
    if (!session || session.currentQuestion === 0) return;
    
    const newQuestionIndex = session.currentQuestion - 1;
    
    try {
      const response = await fetch(buildApiUrl(`/sessions/${session.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          status: 'active', 
          currentQuestion: newQuestionIndex 
        })
      });

      if (response.ok) {
        setSession({ ...session, currentQuestion: newQuestionIndex });
        loadCurrentQuestion();
      } else {
        toast.error('Failed to go back');
      }
    } catch (error) {
      console.error('Error going back:', error);
      toast.error('Error going back');
    }
  };

  const pauseSession = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(buildApiUrl(`/sessions/${session.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: 'paused' })
      });

      if (response.ok) {
        setSession({ ...session, status: 'paused' });
        setTimer(null);
        toast.success('Session paused');
      } else {
        toast.error('Failed to pause session');
      }
    } catch (error) {
      console.error('Error pausing session:', error);
      toast.error('Error pausing session');
    }
  };

  const resumeSession = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(buildApiUrl(`/sessions/${session.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: 'active' })
      });

      if (response.ok) {
        setSession({ ...session, status: 'active' });
        toast.success('Session resumed');
      } else {
        toast.error('Failed to resume session');
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      toast.error('Error resuming session');
    }
  };

  const endSession = async () => {
    if (!session) return;
    
    try {
      const response = await fetch(buildApiUrl(`/sessions/${session.id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (response.ok) {
        setSession({ ...session, status: 'completed' });
        toast.success('Session ended!');
        navigate(`/sessions/${session.id}/results`);
      } else {
        toast.error('Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Error ending session');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Creating session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">No session available</p>
          <button
            onClick={() => navigate('/quizzes')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-600-dark"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session.quiz.title}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-3xl font-bold text-blue-600">
                  Code: {session.code}
                </span>
                <span className="text-sm text-gray-500">
                  <Users className="inline w-4 h-4 mr-1" />
                  {session.participantsCount} participants
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {session.status === 'waiting' && (
                <>
                  <button
                    onClick={startSession}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Start Quiz</span>
                  </button>
                  <button
                    onClick={loadCurrentQuestion}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Load Question (Debug)
                  </button>
                </>
              )}
              
              {session.status === 'active' && (
                <>
                  <button
                    onClick={pauseSession}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                  <button
                    onClick={endSession}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <StopCircle className="w-5 h-5" />
                  </button>
                </>
              )}
              
              {session.status === 'paused' && (
                <button
                  onClick={resumeSession}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Resume</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug info */}
        <div className="bg-yellow-100 p-4 rounded mb-4">
          <p>Debug: Session Status = {session.status}</p>
          <p>Session ID = {session.id}</p>
          <p>Current Question = {session.currentQuestion}</p>
        </div>
        
        {session.status === 'waiting' ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="mb-8">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {session.code}
              </div>
              <p className="text-xl text-gray-600 mb-2">
                Share this code with participants
              </p>
              <p className="text-gray-500">
                Or they can join at: 
                <span className="font-mono ml-2 text-blue-600">
                  http://localhost:5173/play
                </span>
              </p>
            </div>
            
            <div className="border-t pt-8">
              <p className="text-gray-600 mb-4">
                Waiting for participants to join...
              </p>
              <div className="text-3xl font-bold text-blue-600">
                <Users className="inline w-8 h-8 mr-2" />
                {session.participantsCount} joined
              </div>
            </div>
          </div>
        ) : session.status === 'paused' ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-4xl font-bold text-yellow-600 mb-4">
              Session Paused
            </div>
            <p className="text-xl text-gray-600">
              Click Resume to continue the quiz
            </p>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {questionNumber} of {totalQuestions}
                </span>
                {timer !== null && (
                  <span className={`text-lg font-bold ${timer <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatTime(timer)}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium px-3 py-1 bg-blue-600/10 text-blue-600 rounded-full">
                  {currentQuestion.type.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  {currentQuestion.points} points
                </span>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                {currentQuestion.question}
              </h2>
              
              {currentQuestion.options && (
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`p-6 rounded-lg border-2 ${
                        showAnswers 
                          ? 'border-gray-300 bg-gray-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="flex-shrink-0 w-10 h-10 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-lg">{option}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {currentQuestion.type === 'short_answer' && (
                <div className="text-center text-gray-500">
                  <p className="text-lg">Participants will type their answer</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={previousQuestion}
                  disabled={questionNumber === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Previous</span>
                </button>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                  >
                    {showAnswers ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    <span>{showAnswers ? 'Hide' : 'Show'} Answers</span>
                  </button>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Responses</p>
                    <p className="text-2xl font-bold text-blue-600">{responses}</p>
                  </div>
                </div>
                
                <button
                  onClick={nextQuestion}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-600-dark transition-colors flex items-center space-x-2"
                >
                  <span>{questionNumber === totalQuestions ? 'Finish' : 'Next'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-xl text-gray-600">Loading question...</p>
          </div>
        )}
      </div>
    </div>
  );
}