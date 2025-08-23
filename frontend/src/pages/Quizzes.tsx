import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiPlay, FiCopy, FiBarChart } from 'react-icons/fi';
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
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/v1/quizzes', {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.data || []);
      } else {
        // Use mock data if API fails
        setQuizzes(getMockQuizzes());
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      // Use mock data on error
      setQuizzes(getMockQuizzes());
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
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/v1/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (response.ok) {
        setQuizzes(quizzes.filter(q => q.id !== quizId));
        toast.success('Quiz deleted successfully');
      } else {
        toast.error('Failed to delete quiz');
      }
    } catch (error) {
      toast.error('Error deleting quiz');
    }
  };

  const handleDuplicateQuiz = async (quizId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/v1/quizzes/${quizId}/clone`, {
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
      case 'easy': return 'text-success';
      case 'medium': return 'text-warning';
      case 'hard': return 'text-error';
      default: return 'text-text-secondary';
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">My Assessments</h1>
            <p className="text-text-secondary mt-2">
              Create and manage your assessment collection
            </p>
          </div>
          <Link to="/quizzes/create">
            <Button variant="primary" leftIcon={<FiPlus />}>
              Create Assessment
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<FiSearch />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'public' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('public')}
            >
              Public
            </Button>
            <Button
              variant={filter === 'private' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('private')}
            >
              Private
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Assessments</p>
              <p className="text-2xl font-bold text-primary">{quizzes.length}</p>
            </div>
            <div className="text-primary bg-primary/10 p-3 rounded-lg">
              <FiBarChart size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Questions</p>
              <p className="text-2xl font-bold text-primary">
                {quizzes.reduce((acc, q) => acc + q.questionsCount, 0)}
              </p>
            </div>
            <div className="text-success bg-success/10 p-3 rounded-lg">
              <FiBarChart size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Times Played</p>
              <p className="text-2xl font-bold text-primary">
                {quizzes.reduce((acc, q) => acc + q.timesPlayed, 0)}
              </p>
            </div>
            <div className="text-warning bg-warning/10 p-3 rounded-lg">
              <FiPlay size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Public Assessments</p>
              <p className="text-2xl font-bold text-primary">
                {quizzes.filter(q => q.isPublic).length}
              </p>
            </div>
            <div className="text-error bg-error/10 p-3 rounded-lg">
              <FiBarChart size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Quiz Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-text-secondary">Loading assessments...</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FiSearch size={48} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No quizzes found</h3>
          <p className="text-text-secondary mb-6">
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first quiz to get started'}
          </p>
          {!searchTerm && (
            <Link to="/quizzes/create">
              <Button variant="primary" leftIcon={<FiPlus />}>
                Create Your First Quiz
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Quiz Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-primary mb-1">
                      {quiz.title}
                    </h3>
                    <span className={`text-sm font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    quiz.isPublic 
                      ? 'bg-success/10 text-success' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {quiz.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>

                {/* Quiz Description */}
                <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                  {quiz.description}
                </p>

                {/* Quiz Stats */}
                <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                  <span>{quiz.questionsCount} questions</span>
                  <span>•</span>
                  <span>{formatTime(quiz.timeLimit)}</span>
                  <span>•</span>
                  <span>{quiz.timesPlayed} plays</span>
                </div>

                {/* Category Badge */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {quiz.category}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link to={`/sessions/host?quiz=${quiz.id}`} className="flex-1">
                    <Button variant="primary" size="sm" fullWidth leftIcon={<FiPlay />}>
                      Start
                    </Button>
                  </Link>
                  <Link to={`/quizzes/${quiz.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" fullWidth leftIcon={<FiEdit2 />}>
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateQuiz(quiz.id)}
                    title="Duplicate Quiz"
                  >
                    <FiCopy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="text-error hover:bg-error/10"
                    title="Delete Quiz"
                  >
                    <FiTrash2 />
                  </Button>
                </div>

                {/* Last Used */}
                {quiz.lastUsed && (
                  <p className="text-xs text-text-secondary mt-4">
                    Last used: {new Date(quiz.lastUsed).toLocaleDateString()}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}