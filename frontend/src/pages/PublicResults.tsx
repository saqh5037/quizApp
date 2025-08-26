import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, Users, Trophy, Clock, TrendingUp, 
  Download, Calendar, Filter, Eye, ChevronDown,
  Award, Target, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { buildApiUrl } from '../config/api.config';

interface QuizResult {
  id: number;
  result_type?: 'quiz' | 'video';
  content_id?: number;
  content_title?: string;
  participant_name?: string;
  student_name?: string;
  participant_email?: string;
  student_email?: string;
  participant_phone?: string;
  student_phone?: string;
  participant_organization?: string;
  category?: string;
  difficulty?: string;
  score: number;
  earned_points?: number;
  total_points?: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds?: number;
  time_taken?: number;
  passed?: boolean;
  passing_score?: number;
  completed_at: string;
}

interface Statistics {
  total_attempts: number;
  unique_participants: number;
  average_score: number;
  min_score: number;
  max_score: number;
  avg_time_seconds: number;
  passed_count: number;
  failed_count: number;
  avg_correct_answers: number;
}

interface ScoreRange {
  range: string;
  count: number;
}

export default function PublicResults() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreRange[]>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [filterScore, setFilterScore] = useState<'all' | 'passed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');

  useEffect(() => {
    // Temporarily disabled auth check for testing
    // TODO: Re-enable after fixing auth issue
    /*
    if (!accessToken) {
      toast.error('Debes iniciar sesión para ver los resultados');
      navigate('/login');
      return;
    }
    */
    
    if (quizId) {
      fetchQuizResults();
      fetchStatistics();
    } else {
      fetchAllResults();
    }
  }, [quizId]);

  const fetchQuizResults = async () => {
    try {
      if (!accessToken) {
        console.error('No access token available');
        toast.error('Por favor, inicia sesión para ver los resultados');
        navigate('/login');
        return;
      }
      
      const response = await fetch(
        buildApiUrl(`/results/public/quiz/${quizId}`),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 401) {
        console.error('Authentication failed');
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch results');
      }

      const data = await response.json();
      setQuiz(data.data.quiz);
      setResults(data.data.results || []);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Error al cargar los resultados');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(
        buildApiUrl(`/results/public/quiz/${quizId}/stats`),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      setStatistics(data.data.statistics);
      setScoreDistribution(data.data.scoreDistribution);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchAllResults = async () => {
    try {
      // Temporarily disabled auth for testing
      const response = await fetch(
        buildApiUrl('/results/public'),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch results');
      }

      const data = await response.json();
      setResults(data.data.results || []);
      
      // If we have results, use the first quiz's data for display
      if (data.data.results && data.data.results.length > 0) {
        const firstResult = data.data.results[0];
        setQuiz({
          id: firstResult.quiz_id,
          title: firstResult.quiz_title,
          category: firstResult.category,
          difficulty: firstResult.difficulty,
          pass_percentage: 70
        });
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Error al cargar los resultados');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredResults = () => {
    let filtered = [...results];
    
    if (filterScore === 'passed') {
      filtered = filtered.filter(r => parseFloat(r.score) >= (quiz?.pass_percentage || 70));
    } else if (filterScore === 'failed') {
      filtered = filtered.filter(r => parseFloat(r.score) < (quiz?.pass_percentage || 70));
    }

    // Sort
    if (sortBy === 'score') {
      filtered.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => {
        const nameA = a.participant_name || a.student_name || '';
        const nameB = b.participant_name || b.student_name || '';
        return nameA.localeCompare(nameB);
      });
    } else {
      filtered.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    }

    return filtered;
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Tipo', 'Nombre', 'Email', 'Contenido', 'Puntuación', 'Respuestas Correctas', 'Tiempo', 'Fecha'],
      ...results.map(r => [
        r.result_type === 'video' ? 'Video' : 'Quiz',
        r.participant_name || r.student_name || '',
        r.participant_email || r.student_email || '',
        r.content_title || quiz?.title || '',
        parseFloat(r.score).toFixed(2),
        `${r.correct_answers}/${r.total_questions}`,
        formatTime(r.time_spent_seconds || r.time_taken || 0),
        formatDate(r.completed_at)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${quiz?.title || 'quiz'}-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Resultados de Evaluaciones Públicas
            </h1>
            {quiz && (
              <p className="text-gray-600 text-sm mt-1">
                {quiz.title} - {quiz.category}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">{statistics.unique_participants}</span>
            </div>
            <h3 className="text-xs font-medium text-gray-600">Participantes Únicos</h3>
            <p className="text-xs text-gray-500 mt-1">{statistics.total_attempts} intentos totales</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span className="text-xl font-bold text-gray-900">{parseFloat(statistics.average_score).toFixed(1)}%</span>
            </div>
            <h3 className="text-xs font-medium text-gray-600">Puntuación Promedio</h3>
            <p className="text-xs text-gray-500 mt-1">
              Min: {statistics.min_score}% | Max: {statistics.max_score}%
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <Target className="w-6 h-6 text-green-500" />
              <span className="text-xl font-bold text-gray-900">{statistics.passed_count}</span>
            </div>
            <h3 className="text-xs font-medium text-gray-600">Aprobados</h3>
            <p className="text-xs text-gray-500 mt-1">
              {((parseFloat(statistics.passed_count) / parseFloat(statistics.total_attempts)) * 100).toFixed(1)}% tasa de aprobación
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-6 h-6 text-purple-500" />
              <span className="text-xl font-bold text-gray-900">{formatTime(statistics.avg_time_seconds)}</span>
            </div>
            <h3 className="text-xs font-medium text-gray-600">Tiempo Promedio</h3>
            <p className="text-xs text-gray-500 mt-1">Por evaluación</p>
          </div>
        </div>
      )}

      {/* Score Distribution Chart */}
      {scoreDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Distribución de Puntuaciones</h2>
          <div className="flex items-end space-x-2 h-40">
            {scoreDistribution.map((range) => {
              const maxCount = Math.max(...scoreDistribution.map(r => parseInt(r.count.toString())));
              const height = (parseInt(range.count.toString()) / maxCount) * 100;
              
              return (
                <div key={range.range} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-600 rounded-t transition-all hover:bg-blue-700 relative group"
                       style={{ height: `${height}%` }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
                        {range.count}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs mt-2 text-gray-600">{range.range}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="all">Todos</option>
                <option value="passed">Aprobados</option>
                <option value="failed">No Aprobados</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="date">Fecha</option>
                <option value="score">Puntuación</option>
                <option value="name">Nombre</option>
              </select>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo / Participante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contenido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Puntuación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Respuestas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiempo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getFilteredResults().map((result) => {
                const passed = parseFloat(result.score) >= (quiz?.pass_percentage || 70);
                
                return (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {result.participant_name || result.student_name}
                        </div>
                        <div className="text-xs text-gray-500">{result.participant_email || result.student_email}</div>
                        {result.result_type && (
                          <div className="text-xs text-gray-400">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              result.result_type === 'video' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {result.result_type === 'video' ? 'Video Interactivo' : 'Evaluación'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {result.content_title || quiz?.title || 'Sin título'}
                      </div>
                      {result.category && (
                        <div className="text-xs text-gray-500">{result.category}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`text-lg font-bold ${
                          passed ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(result.score).toFixed(1)}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {result.correct_answers}/{result.total_questions}
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.earned_points}/{result.total_points} pts
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatTime(result.time_spent_seconds)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(result.completed_at)}
                    </td>
                    <td className="px-6 py-4">
                      {passed ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Aprobado
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          No Aprobado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate(`/results/detail/${result.result_type || 'quiz'}/${result.id}`)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {results.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay resultados disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}