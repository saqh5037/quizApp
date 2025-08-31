import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  RiUserLine, 
  RiMailLine, 
  RiPhoneLine, 
  RiPlayCircleLine,
  RiLoader4Line,
  RiBookOpenLine,
  RiTimeLine,
  RiQuestionLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { apiConfig, buildApiUrl } from '../config/api.config';

interface Quiz {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionsCount: number;
  timeLimit: number;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

export default function PublicQuizAccess() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [identified, setIdentified] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPublicQuiz();
  }, [id]);

  const fetchPublicQuiz = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`/quizzes/${id}/public`));
      
      if (response.ok) {
        const data = await response.json();
        setQuiz(data.data);
      } else if (response.status === 404) {
        toast.error(t('publicQuiz.notFound'));
        navigate('/');
      } else if (response.status === 403) {
        toast.error(t('publicQuiz.notPublic'));
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching public quiz:', error);
      // Use mock data for testing
      setQuiz({
        id: parseInt(id || '1'),
        title: 'Mathematics Basics',
        description: 'Test your knowledge of basic mathematics including arithmetic, algebra, and geometry',
        category: 'Mathematics',
        difficulty: 'easy',
        questionsCount: 10,
        timeLimit: 600,
        createdBy: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Por favor ingrese su nombre';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Por favor ingrese su correo electrónico';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Por favor ingrese un correo electrónico válido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleIdentification = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Store participant data in session storage (with compatibility for existing format)
    sessionStorage.setItem('publicQuizParticipant', JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      // Keep backward compatibility
      firstName: formData.name.split(' ')[0] || formData.name,
      lastName: formData.name.split(' ').slice(1).join(' ') || '',
      quizId: id,
      startTime: new Date().toISOString()
    }));
    
    setIdentified(true);
    toast.success('Identificación completada exitosamente');
  };

  const handleStartQuiz = async () => {
    try {
      const participantData = JSON.parse(sessionStorage.getItem('publicQuizParticipant') || '{}');
      
      // Create a public session
      const response = await fetch(buildApiUrl('/sessions/public'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz?.id,
          participant: participantData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Navigate to quiz taking page
        navigate(`/quiz/${quiz?.id}/take/${data.sessionId}`);
      } else {
        // For now, navigate directly to quiz taking page
        navigate(`/quiz/${quiz?.id}/take`);
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      // For testing, navigate directly
      navigate(`/quiz/${quiz?.id}/take`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-success';
      case 'medium': return 'text-warning';
      case 'hard': return 'text-error';
      default: return 'text-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="animate-spin text-6xl text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Quiz no encontrado</h2>
          <p className="text-gray-400 mb-6">El quiz que buscas no está disponible o no existe.</p>
          <button 
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            onClick={() => navigate('/')}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {!identified ? (
        /* Simplified Identification Form */
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiBookOpenLine className="text-4xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Quiz de Evaluación
            </h2>
            <p className="text-gray-400">
              {quiz.title}
            </p>
          </div>

          {/* Quiz Info */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <RiQuestionLine className="inline w-4 h-4 text-gray-400 mb-1" />
                <p className="text-white font-semibold">{quiz.questionsCount}</p>
                <p className="text-gray-400 text-xs">Preguntas</p>
              </div>
              <div>
                <RiTimeLine className="inline w-4 h-4 text-gray-400 mb-1" />
                <p className="text-white font-semibold">{Math.floor(quiz.timeLimit / 60)}</p>
                <p className="text-gray-400 text-xs">Minutos</p>
              </div>
              <div>
                <p className="text-white font-semibold capitalize">{quiz.difficulty}</p>
                <p className="text-gray-400 text-xs">Dificultad</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleIdentification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiUserLine className="inline w-4 h-4 mr-1" />
                Nombre completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Juan Pérez"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiMailLine className="inline w-4 h-4 mr-1" />
                Correo electrónico *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="juan@ejemplo.com"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <RiPhoneLine className="inline w-4 h-4 mr-1" />
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="+52 123 456 7890"
              />
            </div>

            <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4">
              <p className="text-sm text-purple-200">
                <strong>Importante:</strong> El quiz tiene un tiempo límite. 
                Una vez que comience, debe completarlo sin interrupciones.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Comenzar Quiz
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Sus respuestas serán registradas para evaluación
          </p>
        </div>
      ) : (
        /* Ready to Start */
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiPlayCircleLine className="text-4xl text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              ¡Listo para comenzar!
            </h2>
            
            <p className="text-gray-400">
              Bienvenido, <strong className="text-white">{formData.name}</strong>
            </p>
          </div>

          {/* Quiz Summary */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">{quiz.title}</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• {quiz.questionsCount} preguntas por responder</p>
              <p>• {Math.floor(quiz.timeLimit / 60)} minutos de tiempo límite</p>
              <p>• Nivel de dificultad: <span className="text-purple-400 capitalize">{quiz.difficulty}</span></p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-yellow-400 mb-2">Instrucciones</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Una vez iniciado, no podrá pausar el quiz</li>
              <li>• Responda todas las preguntas antes del tiempo límite</li>
              <li>• Sus respuestas se guardarán automáticamente</li>
              <li>• Al finalizar verá sus resultados inmediatamente</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button 
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              onClick={() => setIdentified(false)}
            >
              Atrás
            </button>
            <button 
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
              onClick={handleStartQuiz}
            >
              <RiPlayCircleLine className="mr-2" />
              Iniciar Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}