import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Play, Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { buildApiUrl } from '../config/api.config';

interface Quiz {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  is_public: boolean;
  passing_score: number;
  time_limit: number | null;
  created_at: string;
  questionsCount?: number;
}

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizDetails();
  }, [id]);

  const fetchQuizDetails = async () => {
    try {
      const response = await fetch(buildApiUrl(`/quizzes/${id}`), {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuiz(data.data);
      } else {
        toast.error('Failed to load quiz details');
      }
    } catch (error) {
      toast.error('Error loading quiz');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = () => {
    navigate(`/sessions/host?quiz=${id}`);
  };

  const handleEditQuiz = () => {
    navigate(`/quizzes/${id}/edit`);
  };

  const handleDuplicateQuiz = async () => {
    try {
      const response = await fetch(buildApiUrl(`/quizzes/${id}/clone`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Quiz duplicated successfully! "${data.data.title}"`);
        navigate(`/quizzes/${data.data.id}/edit`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to duplicate quiz');
      }
    } catch (error) {
      toast.error('Error duplicating quiz');
      console.error(error);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(buildApiUrl(`/quizzes/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        toast.success('Quiz deleted successfully');
        navigate('/quizzes');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete quiz');
      }
    } catch (error) {
      toast.error('Error deleting quiz');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading quiz details...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">Quiz not found</p>
        <button
          onClick={() => navigate('/quizzes')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-600-dark"
        >
          Back to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/quizzes')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded">{quiz.category}</span>
                <span className="px-2 py-1 bg-gray-100 rounded capitalize">{quiz.difficulty}</span>
                {quiz.is_public && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Public</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleStartSession}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-600-dark transition-colors flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start Session</span>
            </button>
            <button
              onClick={handleEditQuiz}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Edit Quiz"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={handleDuplicateQuiz}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Duplicate Quiz"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={handleDeleteQuiz}
              className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              title="Delete Quiz"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {quiz.description && (
          <p className="text-gray-600 mt-4">{quiz.description}</p>
        )}
      </div>

      {/* Quiz Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Questions</h3>
          <p className="text-2xl font-bold text-gray-900">{quiz.questionsCount || 0}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Passing Score</h3>
          <p className="text-2xl font-bold text-gray-900">{quiz.passing_score}%</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Time Limit</h3>
          <p className="text-2xl font-bold text-gray-900">
            {quiz.time_limit ? `${quiz.time_limit} min` : 'Unlimited'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleStartSession}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="font-medium mb-1">Host Live Session</h3>
            <p className="text-sm text-gray-500">Start a real-time quiz session with participants</p>
          </button>
          
          <button
            onClick={() => navigate(`/quizzes/${id}/questions`)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="font-medium mb-1">View Questions</h3>
            <p className="text-sm text-gray-500">Review and manage quiz questions</p>
          </button>
          
          <button
            onClick={() => navigate(`/public-results/${id}`)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="font-medium mb-1">View Results</h3>
            <p className="text-sm text-gray-500">Ver resultados de evaluaciones públicas (QR)</p>
          </button>
          
          <button
            onClick={() => toast('Share feature coming soon!', { icon: '🔗' })}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <h3 className="font-medium mb-1">Share Quiz</h3>
            <p className="text-sm text-gray-500">Get shareable link or QR code</p>
          </button>
        </div>
      </div>
    </div>
  );
}