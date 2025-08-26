import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { apiConfig, buildApiUrl } from '../config/api.config';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import PublicQuizShare from '../components/quiz/PublicQuizShare';
import { 
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiPlay, FiCopy, FiBarChart, 
  FiShare2, FiX, FiBookOpen, FiUsers, FiGlobe, FiGrid, FiList,
  FiEye, FiDownload, FiActivity, FiAward, FiClock, FiLayers
} from 'react-icons/fi';
import { HiOutlineSparkles, HiOutlineDuplicate, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineEye, HiOutlineShare } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface Quiz {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionsCount: number;
  timeLimit: number;
  isPublic: boolean;
  createdAt: string;
  lastUsed?: string;
  timesPlayed: number;
}

export default function Quizzes() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [shareModalQuiz, setShareModalQuiz] = useState<Quiz | null>(null);
  const [viewType, setViewType] = useState<'list' | 'grid'>('list'); // Default to list view

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(apiConfig.endpoints.quizzes.list), {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched quizzes from API:', data.data?.length || 0);
        // Mapear los datos del API a la estructura esperada
        const mappedQuizzes = (data.data || []).map((quiz: any) => ({
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          category: quiz.category || 'General',
          difficulty: quiz.difficulty || 'medium',
          questionsCount: quiz.totalQuestions || quiz.question_count || 0, // Usar totalQuestions del API
          timeLimit: (quiz.estimatedTimeMinutes || quiz.time_limit || quiz.timeLimit || 10) * 60, // Convertir minutos a segundos, usar 10 min por defecto si es null
          isPublic: quiz.isPublic !== undefined ? quiz.isPublic : quiz.is_public,
          createdAt: quiz.createdAt || quiz.created_at,
          lastUsed: quiz.lastUsed || quiz.last_used,
          timesPlayed: quiz.timesTaken || quiz.times_played || 0
        }));
        setQuizzes(mappedQuizzes);
      } else {
        console.error('API response not OK:', response.status, response.statusText);
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error('API error:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
        // Only use mock data if we absolutely can't get real data
        if (response.status >= 500) {
          console.warn('Using mock data due to server error');
          setQuizzes(getMockQuizzes());
        } else {
          setQuizzes([]);
        }
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      // Only use mock data if network is completely down
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Using mock data due to network error');
        setQuizzes(getMockQuizzes());
      } else {
        setQuizzes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getMockQuizzes = (): Quiz[] => [
    {
      id: 1,
      title: 'Mathematics Basics',
      description: 'Test your knowledge of basic mathematics including arithmetic, algebra, and geometry',
      category: 'Mathematics',
      difficulty: 'easy',
      questionsCount: 10,
      timeLimit: 600,
      isPublic: true,
      createdAt: '2024-01-15',
      lastUsed: '2024-01-20',
      timesPlayed: 45,
    },
    {
      id: 2,
      title: 'Science Quiz',
      description: 'General science questions covering physics, chemistry, and biology',
      category: 'Science',
      difficulty: 'medium',
      questionsCount: 15,
      timeLimit: 900,
      isPublic: true,
      createdAt: '2024-01-10',
      lastUsed: '2024-01-19',
      timesPlayed: 32,
    },
    {
      id: 3,
      title: 'History Timeline',
      description: 'Important events in world history from ancient to modern times',
      category: 'History',
      difficulty: 'hard',
      questionsCount: 20,
      timeLimit: 1200,
      isPublic: false,
      createdAt: '2024-01-05',
      timesPlayed: 18,
    },
    {
      id: 4,
      title: 'Geography Challenge',
      description: 'Test your knowledge of world geography, capitals, and landmarks',
      category: 'Geography',
      difficulty: 'medium',
      questionsCount: 12,
      timeLimit: 720,
      isPublic: true,
      createdAt: '2024-01-18',
      lastUsed: '2024-01-21',
      timesPlayed: 28,
    },
  ];

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm(t('confirmation.delete'))) return;
    
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.quizzes.delete(quizId)), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (response.ok) {
        // Remove from local state immediately for better UX
        setQuizzes(quizzes.filter(q => q.id !== quizId));
        toast.success('Quiz deleted successfully');
        
        // Refetch to ensure consistency with backend
        // This will get fresh data from the server
        setTimeout(() => {
          fetchQuizzes();
        }, 500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Error deleting quiz');
    }
  };

  const handleDuplicateQuiz = async (quizId: number) => {
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.quizzes.clone(quizId)), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Quiz duplicated: "${data.data.title}"`);
        fetchQuizzes();
      } else {
        toast.error('Failed to duplicate quiz');
      }
    } catch (error) {
      toast.error('Error duplicating quiz');
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                          (filter === 'public' && quiz.isPublic) ||
                          (filter === 'private' && !quiz.isPublic);
    
    return matchesSearch && matchesFilter;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FiBookOpen className="text-blue-600" />
                Mis Evaluaciones
              </h1>
              <p className="text-base text-gray-600 mt-2">
                Gestiona y administra todas tus evaluaciones
              </p>
            </div>
            <Link to="/quizzes/create">
              <button className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2">
                <FiPlus size={18} />
                Nueva Evaluación
              </button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3 items-center justify-between">
          <div className="flex gap-3 items-center flex-1">
            <div className="flex-1 max-w-md relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar evaluación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:border-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setFilter('all')}
              >
                Todas
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filter === 'public' 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:border-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setFilter('public')}
              >
                Públicas
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filter === 'private' 
                    ? 'bg-blue-600 text-white' 
                    : 'border border-gray-300 text-gray-700 hover:border-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setFilter('private')}
              >
                Privadas
              </button>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              className={`p-2 rounded transition-all ${
                viewType === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setViewType('list')}
              title="Vista de lista"
            >
              <FiList size={18} />
            </button>
            <button
              className={`p-2 rounded transition-all ${
                viewType === 'grid' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setViewType('grid')}
              title="Vista de tarjetas"
            >
              <FiGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Evaluaciones</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{quizzes.length}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <FiBookOpen className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Preguntas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {quizzes.reduce((acc, q) => acc + (q.questionsCount || 0), 0)}
              </p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <FiBarChart className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Veces Jugadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {quizzes.reduce((acc, q) => acc + (q.timesPlayed || 0), 0)}
              </p>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <FiPlay className="text-purple-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Evaluaciones Públicas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {quizzes.filter(q => q.isPublic).length}
              </p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <FiGlobe className="text-blue-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 text-center py-12">
          <div className="text-gray-400 mb-4">
            <FiSearch size={48} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900">{t('quizzes.empty.title')}</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? t('quizzes.empty.searchSubtitle') : t('quizzes.empty.subtitle')}
          </p>
          {!searchTerm && (
            <Link to="/quizzes/create">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md inline-flex items-center gap-2">
                <FiPlus size={18} />
                {t('quizzes.empty.createFirst')}
              </button>
            </Link>
          )}
        </div>
      ) : viewType === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="p-5">
                {/* Quiz Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {quiz.title}
                    </h3>
                    <span className={`text-xs font-medium ${
                      quiz.difficulty === 'easy' ? 'text-green-600' :
                      quiz.difficulty === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {t(`quizzes.card.difficulty.${quiz.difficulty}`)}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    quiz.isPublic 
                      ? 'bg-blue-100 text-blue-600 font-medium' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {quiz.isPublic ? t('common.public') : t('common.private')}
                  </span>
                </div>

                {/* Quiz Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {quiz.description}
                </p>

                {/* Quiz Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                  <span>{quiz.questionsCount} {t('quizzes.card.questions')}</span>
                  <span>•</span>
                  <span>{formatTime(quiz.timeLimit)}</span>
                  <span>•</span>
                  <span>{quiz.timesPlayed} {t('quizzes.card.plays')}</span>
                </div>

                {/* Category Badge */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                    {quiz.category}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link to={`/sessions/host?quiz=${quiz.id}`} className="flex-1">
                    <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-1">
                      <FiActivity size={18} />
                      {t('quizzes.card.actions.start')}
                    </button>
                  </Link>
                  <Link to={`/quizzes/${quiz.id}/edit`} className="flex-1">
                    <button className="w-full px-3 py-2 border border-gray-300 hover:border-blue-600 hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-1">
                      <HiOutlinePencilAlt size={18} />
                      {t('quizzes.card.actions.edit')}
                    </button>
                  </Link>
                  {quiz.isPublic && (
                    <button
                      onClick={() => setShareModalQuiz(quiz)}
                      title={t('publicQuiz.shareLink')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <HiOutlineShare size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicateQuiz(quiz.id)}
                    title={t('quizzes.card.actions.duplicate')}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <HiOutlineDuplicate size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('quizzes.card.actions.delete')}
                  >
                    <HiOutlineTrash size={18} />
                  </button>
                </div>

                {/* Last Used */}
                {quiz.lastUsed && (
                  <p className="text-xs text-gray-500 mt-4">
                    {t('quizzes.card.lastUsed')}: {new Date(quiz.lastUsed).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View - Con degradado y encabezados
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 via-white via-50% to-blue-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-2/5">
                    Mi Evaluación
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-2/5">
                    Información
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-blue-50/30 transition-colors bg-gradient-to-r from-blue-50/50 via-white via-50% to-blue-50/50">
                    {/* Columna Evaluación */}
                    <td className="px-4 py-3 w-2/5">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">
                          {quiz.title}
                        </h4>
                        <p className="text-xs text-gray-500 truncate max-w-sm" title={quiz.description}>
                          {quiz.description && quiz.description.length > 60 
                            ? `${quiz.description.substring(0, 60)}...` 
                            : quiz.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {quiz.category}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                            quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {quiz.difficulty === 'easy' ? 'Fácil' :
                             quiz.difficulty === 'medium' ? 'Medio' : 'Difícil'}
                          </span>
                          {quiz.isPublic ? (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                              <FiGlobe size={12} />
                              Público
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <FiEye size={12} />
                              Privado
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Columna Información */}
                    <td className="px-4 py-3 w-2/5">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1" title="Preguntas">
                          <FiLayers size={16} className="text-blue-500" />
                          <span className="font-semibold text-sm text-gray-900">{quiz.questionsCount || 0}</span>
                          <span className="text-xs text-gray-500">preguntas</span>
                        </div>
                        <div className="flex items-center gap-1" title="Puntuación total">
                          <FiAward size={16} className="text-yellow-500" />
                          <span className="font-semibold text-sm text-gray-900">{(quiz.questionsCount || 0) * 10}</span>
                          <span className="text-xs text-gray-500">puntos</span>
                        </div>
                        <div className="flex items-center gap-1" title="Tiempo límite">
                          <FiClock size={16} className="text-green-500" />
                          <span className="font-semibold text-sm text-gray-900">{Math.floor((quiz.timeLimit || 0) / 60)}</span>
                          <span className="text-xs text-gray-500">minutos</span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Columna Acciones */}
                    <td className="px-4 py-3 w-1/5">
                      <div className="flex items-center justify-center gap-1">
                          <Link to={`/sessions/host?quiz=${quiz.id}`}>
                          <button 
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
                            title="Iniciar sesión"
                          >
                            <FiActivity size={18} />
                            <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Iniciar sesión
                            </span>
                          </button>
                        </Link>
                        <Link to={`/quizzes/${quiz.id}/edit`}>
                          <button 
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group relative"
                            title="Editar"
                          >
                            <HiOutlinePencilAlt size={18} />
                            <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Editar
                            </span>
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDuplicateQuiz(quiz.id)}
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group relative"
                          title="Duplicar"
                        >
                          <HiOutlineDuplicate size={18} />
                          <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Duplicar
                          </span>
                        </button>
                        {quiz.isPublic && (
                          <button
                            onClick={() => setShareModalQuiz(quiz)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
                            title="Compartir"
                          >
                            <HiOutlineShare size={18} />
                            <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Compartir
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                          title="Eliminar"
                        >
                          <HiOutlineTrash size={18} />
                          <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Eliminar
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {shareModalQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{shareModalQuiz.title}</h2>
                <button
                  onClick={() => setShareModalQuiz(null)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <PublicQuizShare 
                quizId={shareModalQuiz.id} 
                quizTitle={shareModalQuiz.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}