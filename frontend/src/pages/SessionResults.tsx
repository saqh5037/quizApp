import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, CheckCircle, XCircle, Clock, Target, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface ParticipantResult {
  participant: string;
  quizTitle: string;
  totalScore: number;
  totalPossible: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
  responses: {
    question: string;
    answer: string;
    correctAnswer: string;
    isCorrect: boolean;
    score: number;
    options: string[] | null;
  }[];
}

interface LeaderboardEntry {
  participant_name: string;
  total_score: number;
  questions_answered: number;
  correct_answers: number;
  avg_time: number;
}

interface OverallResults {
  quizTitle: string;
  participants: LeaderboardEntry[];
  totalParticipants: number;
}

export default function SessionResults() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const participantName = searchParams.get('participant');
  
  const [results, setResults] = useState<ParticipantResult | OverallResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'participant' | 'leaderboard'>(
    participantName ? 'participant' : 'leaderboard'
  );

  useEffect(() => {
    fetchResults();
  }, [id, participantName, viewMode]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const url = viewMode === 'participant' && participantName
        ? `http://localhost:3001/api/v1/sessions/${id}/results?participantName=${participantName}`
        : `http://localhost:3001/api/v1/sessions/${id}/results`;
        
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.data);
      } else {
        toast.error('Failed to load results');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Error loading results');
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (position: number) => {
    switch (position) {
      case 1: return '>G';
      case 2: return '>H';
      case 3: return '>I';
      default: return '';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No results available</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Participant View
  if (viewMode === 'participant' && 'participant' in results) {
    const participantResults = results as ParticipantResult;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quiz Completed!
              </h1>
              <p className="text-xl text-gray-600">{participantResults.quizTitle}</p>
            </div>

            {/* Score Circle */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-8 border-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <p className={`text-5xl font-bold ${getScoreColor(participantResults.percentage)}`}>
                      {participantResults.percentage}%
                    </p>
                    <p className="text-gray-600 mt-2">
                      {participantResults.totalScore}/{participantResults.totalPossible}
                    </p>
                  </div>
                </div>
                {participantResults.percentage >= 90 && (
                  <Trophy className="absolute -top-4 -right-4 w-12 h-12 text-yellow-500" />
                )}
              </div>
            </div>

            {/* Pass/Fail Status */}
            <div className={`text-center p-4 rounded-lg ${
              participantResults.passed ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className={`text-xl font-bold ${
                participantResults.passed ? 'text-green-600' : 'text-red-600'
              }`}>
                {participantResults.passed ? 'PASSED' : 'FAILED'}
              </p>
              <p className="text-gray-600 mt-1">
                Passing score: {participantResults.passingScore}%
              </p>
            </div>

            {/* Toggle View Button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setViewMode('leaderboard')}
                className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                View Leaderboard
              </button>
            </div>
          </div>

          {/* Question Review */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Question Review
            </h2>
            
            <div className="space-y-4">
              {participantResults.responses.map((response, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {index + 1}. {response.question}
                      </p>
                    </div>
                    <div className="ml-4">
                      {response.isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-600">Your answer:</span>
                      <span className={response.isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {response.options && !isNaN(Number(response.answer)) 
                          ? response.options[Number(response.answer)]
                          : response.answer}
                      </span>
                    </div>
                    
                    {!response.isCorrect && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600">Correct answer:</span>
                        <span className="text-green-600">
                          {response.options && !isNaN(Number(response.correctAnswer))
                            ? response.options[Number(response.correctAnswer)]
                            : response.correctAnswer}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-600">Points:</span>
                      <span className={response.isCorrect ? 'text-green-600' : 'text-gray-500'}>
                        {response.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => navigate('/play')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Join Another Quiz
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Leaderboard View
  const leaderboardResults = results as OverallResults;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Final Results
            </h1>
            <p className="text-xl text-gray-600">{leaderboardResults.quizTitle}</p>
            <div className="flex items-center justify-center mt-4 text-gray-500">
              <Users className="w-5 h-5 mr-2" />
              <span>{leaderboardResults.totalParticipants} Participants</span>
            </div>
          </div>

          {/* Toggle View Button */}
          {participantName && (
            <div className="text-center">
              <button
                onClick={() => setViewMode('participant')}
                className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                View My Results
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Medal className="w-8 h-8 text-yellow-500 mr-2" />
            Leaderboard
          </h2>
          
          <div className="space-y-3">
            {leaderboardResults.participants.map((participant, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-300' : 'bg-gray-50'
                } ${participantName === participant.participant_name ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    index < 3 ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>
                    {getRankEmoji(index + 1) || index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {participant.participant_name}
                      {participantName === participant.participant_name && (
                        <span className="ml-2 text-sm text-primary">(You)</span>
                      )}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                        {participant.correct_answers}/{participant.questions_answered}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {Math.round(participant.avg_time)}s avg
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {participant.total_score}
                  </p>
                  <p className="text-sm text-gray-500">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => navigate('/sessions/host')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Host New Session
          </button>
          <button
            onClick={() => navigate('/quizzes')}
            className="px-6 py-3 border border-white text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    </div>
  );
}