import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { apiConfig, buildApiUrl } from '../config/api.config';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FiDownload, FiMail, FiChevronLeft, FiEye, FiEyeOff, FiCheckCircle, FiXCircle, FiMinusCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface SessionResult {
  id: number;
  sessionId: number;
  sessionCode: string;
  quizTitle: string;
  quizId: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string;
  participants: ParticipantResult[];
  questions: QuestionResult[];
  statistics: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    totalParticipants: number;
    completionRate: number;
  };
}

interface ParticipantResult {
  id: number;
  name: string;
  email?: string;
  score: number;
  percentage: number;
  responses: ResponseDetail[];
  timeSpent: number;
  completedAt: string;
}

interface ResponseDetail {
  questionId: number;
  questionIndex: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

interface QuestionResult {
  id: number;
  index: number;
  text: string;
  type: string;
  correctAnswer: string;
  options: string[];
  statistics: {
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    averageTime: number;
  };
}

export default function Results() {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showNames, setShowNames] = useState(true);
  const [showResponses, setShowResponses] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantResult | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSessionResults();
    } else {
      fetchLatestResults();
    }
  }, [sessionId]);

  const fetchSessionResults = async () => {
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.sessions.results(sessionId!)), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.data);
      } else {
        toast.error('Failed to load results');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestResults = async () => {
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.sessions.my), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const completedSessions = data.data.filter((s: any) => s.status === 'completed');
        
        if (completedSessions.length > 0) {
          const latestSession = completedSessions[0];
          navigate(`/results/${latestSession.id}`, { replace: true });
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching latest results:', error);
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.sessions.exportPDF(sessionId!)), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `results-${result?.sessionCode}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('PDF exported successfully');
      } else {
        toast.error('Failed to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.sessions.exportExcel(sessionId!)), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `results-${result?.sessionCode}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Excel exported successfully');
      } else {
        toast.error('Failed to export Excel');
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const handleEmailResults = async () => {
    setEmailLoading(true);
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.sessions.emailResults(sessionId!)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Results sent to all participants');
      } else {
        toast.error('Failed to send results');
      }
    } catch (error) {
      console.error('Error sending results:', error);
      toast.error('Failed to send results');
    } finally {
      setEmailLoading(false);
    }
  };

  const getResponseIcon = (response: ResponseDetail | undefined, questionIndex: number) => {
    if (!showResults) return null;
    
    if (!response) {
      return <FiMinusCircle className="text-gray-400" size={20} />;
    }
    
    if (response.isCorrect) {
      return <FiCheckCircle className="text-green-500" size={20} />;
    }
    
    return <FiXCircle className="text-red-500" size={20} />;
  };

  const getResponseDisplay = (response: ResponseDetail | undefined) => {
    if (!showResponses || !response) return '-';
    return response.selectedAnswer || '-';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">{t('results.noResults', { defaultValue: 'No Results Available' })}</h2>
          <p className="text-gray-600 mb-6">{t('results.noCompletedSessions', { defaultValue: 'There are no completed sessions to display.' })}</p>
          <Button onClick={() => navigate('/sessions')}>
            {t('results.goToSessions', { defaultValue: 'Go to Sessions' })}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            leftIcon={<FiChevronLeft />}
            onClick={() => navigate('/sessions')}
            className="mb-4"
          >
            {t('common.back')} to {t('sessions.title')}
          </Button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{result.quizTitle}</h1>
                <p className="text-gray-600 mt-1">
                  {t('sessions.sessionCode', { defaultValue: 'Session Code' })}: <span className="font-mono font-semibold">{result.sessionCode}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {t('results.completed', { defaultValue: 'Completed' })}: {new Date(result.completedAt).toLocaleString()}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  leftIcon={<FiDownload />}
                  onClick={handleExportPDF}
                  loading={exportLoading}
                >
                  {t('results.export.pdf')}
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<FiDownload />}
                  onClick={handleExportExcel}
                  loading={exportLoading}
                >
                  {t('results.export.excel')}
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<FiMail />}
                  onClick={handleEmailResults}
                  loading={emailLoading}
                >
                  {t('results.export.email')}
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-5 gap-4 mt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('results.summary.participants')}</p>
                <p className="text-2xl font-bold text-primary">{result.statistics.totalParticipants}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('results.averageScore', { defaultValue: 'Average Score' })}</p>
                <p className="text-2xl font-bold text-primary">{result.statistics.averageScore.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('results.highestScore', { defaultValue: 'Highest Score' })}</p>
                <p className="text-2xl font-bold text-green-600">{result.statistics.highestScore.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('results.lowestScore', { defaultValue: 'Lowest Score' })}</p>
                <p className="text-2xl font-bold text-red-600">{result.statistics.lowestScore.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('results.completionRate', { defaultValue: 'Completion Rate' })}</p>
                <p className="text-2xl font-bold text-primary">{result.statistics.completionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <Card className="mb-6 p-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showNames}
                onChange={(e) => setShowNames(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium">{t('results.showNames', { defaultValue: 'Show Names' })}</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResponses}
                onChange={(e) => setShowResponses(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium">{t('results.showResponses', { defaultValue: 'Show Responses' })}</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResults}
                onChange={(e) => setShowResults(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium">{t('results.showResults', { defaultValue: 'Show Results' })}</span>
            </label>
          </div>
        </Card>

        {/* Results Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('results.name', { defaultValue: 'Name' })}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('results.summary.score')}
                  </th>
                  {result.questions.map((q, idx) => (
                    <th key={q.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Q{idx + 1}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('results.time', { defaultValue: 'Time' })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.participants.map((participant) => (
                  <tr
                    key={participant.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedParticipant(participant)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {showNames ? participant.name : `Student ${participant.id}`}
                      </div>
                      {participant.email && showNames && (
                        <div className="text-sm text-gray-500">{participant.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        participant.percentage >= 80
                          ? 'bg-green-100 text-green-800'
                          : participant.percentage >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {participant.percentage.toFixed(1)}%
                      </span>
                    </td>
                    {result.questions.map((q, idx) => {
                      const response = participant.responses.find(r => r.questionIndex === idx);
                      return (
                        <td key={q.id} className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {getResponseIcon(response, idx)}
                            {showResponses && response && (
                              <span className="text-xs text-gray-600">
                                {getResponseDisplay(response)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {Math.floor(participant.timeSpent / 60)}:{(participant.timeSpent % 60).toString().padStart(2, '0')}
                    </td>
                  </tr>
                ))}
                
                {/* Class Total Row */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {t('results.classTotal', { defaultValue: 'Class Total' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-primary">
                      {result.statistics.averageScore.toFixed(1)}%
                    </span>
                  </td>
                  {result.questions.map((q) => (
                    <td key={q.id} className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-xs">
                        <span className="text-green-600">{q.statistics.correctCount}</span>
                        {' / '}
                        <span className="text-gray-600">{result.statistics.totalParticipants}</span>
                      </div>
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Question Analysis */}
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold mb-4">{t('results.details.questionAnalysis')}</h2>
          <div className="space-y-4">
            {result.questions.map((question, idx) => (
              <div key={question.id} className="border-l-4 border-primary pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {idx + 1}. {question.text}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('results.correctAnswer', { defaultValue: 'Correct Answer' })}: {question.correctAnswer}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-green-600 font-medium">
                          {question.statistics.correctCount}
                        </span>
                        <span className="text-gray-500"> {t('results.summary.correct')}</span>
                      </p>
                      <p>
                        <span className="text-red-600 font-medium">
                          {question.statistics.incorrectCount}
                        </span>
                        <span className="text-gray-500"> {t('results.summary.incorrect')}</span>
                      </p>
                      <p>
                        <span className="text-gray-600 font-medium">
                          {question.statistics.skippedCount}
                        </span>
                        <span className="text-gray-500"> {t('results.skipped', { defaultValue: 'skipped' })}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Success Rate Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>{t('results.successRate', { defaultValue: 'Success Rate' })}</span>
                    <span>
                      {((question.statistics.correctCount / result.statistics.totalParticipants) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${(question.statistics.correctCount / result.statistics.totalParticipants) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Participant Detail Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {showNames ? selectedParticipant.name : `Student ${selectedParticipant.id}`}
              </h2>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">{t('results.summary.score')}</p>
              <p className="text-2xl font-bold text-primary">
                {selectedParticipant.score} / {result.totalQuestions} ({selectedParticipant.percentage.toFixed(1)}%)
              </p>
            </div>
            
            <div className="space-y-3">
              {result.questions.map((question, idx) => {
                const response = selectedParticipant.responses.find(r => r.questionIndex === idx);
                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{idx + 1}. {question.text}</p>
                        <p className="text-sm text-gray-600 mt-2">
                          {t('results.selected', { defaultValue: 'Selected' })}: {response ? response.selectedAnswer : t('results.noAnswer', { defaultValue: 'No answer' })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t('results.correctAnswer', { defaultValue: 'Correct' })}: {question.correctAnswer}
                        </p>
                      </div>
                      <div className="ml-4">
                        {response?.isCorrect ? (
                          <FiCheckCircle className="text-green-500" size={24} />
                        ) : (
                          <FiXCircle className="text-red-500" size={24} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedParticipant(null)}>
                {t('common.close')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}