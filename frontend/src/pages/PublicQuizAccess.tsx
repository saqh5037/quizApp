import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { FiUser, FiMail, FiPhone, FiPlay } from 'react-icons/fi';
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
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: ''
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
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('publicQuiz.errors.firstNameRequired');
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('publicQuiz.errors.lastNameRequired');
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('publicQuiz.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('publicQuiz.errors.emailInvalid');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleIdentification = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Store participant data in session storage
    sessionStorage.setItem('publicQuizParticipant', JSON.stringify({
      ...formData,
      quizId: id,
      startTime: new Date().toISOString()
    }));
    
    setIdentified(true);
    toast.success(t('publicQuiz.identificationSuccess'));
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">{t('publicQuiz.notFound')}</h2>
          <p className="text-text-secondary mb-6">{t('publicQuiz.notFoundDesc')}</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            {t('common.back')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <img 
            src="/images/logoAristoTest.svg" 
            alt="AristoTest" 
            className="h-24 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-primary">{t('publicQuiz.title')}</h1>
        </div>

        {!identified ? (
          /* Identification Form */
          <Card className="max-w-2xl mx-auto">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-primary mb-2">
                {t('publicQuiz.identificationTitle')}
              </h2>
              <p className="text-text-secondary mb-6">
                {t('publicQuiz.identificationSubtitle')}
              </p>

              {/* Quiz Info */}
              <div className="bg-background rounded-lg p-4 mb-6">
                <h3 className="text-xl font-semibold text-primary mb-2">{quiz.title}</h3>
                <p className="text-text-secondary mb-3">{quiz.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <strong>{t('publicQuiz.questions')}:</strong> {quiz.questionsCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <strong>{t('publicQuiz.timeLimit')}:</strong> {Math.floor(quiz.timeLimit / 60)} {t('publicQuiz.minutes')}
                  </span>
                  <span className="flex items-center gap-1">
                    <strong>{t('publicQuiz.difficulty')}:</strong>
                    <span className={getDifficultyColor(quiz.difficulty)}>
                      {t(`quizzes.card.difficulty.${quiz.difficulty}`)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <strong>{t('publicQuiz.category')}:</strong> {quiz.category}
                  </span>
                </div>
              </div>

              {/* Identification Form */}
              <form onSubmit={handleIdentification}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {t('publicQuiz.firstName')} *
                    </label>
                    <Input
                      type="text"
                      placeholder={t('publicQuiz.firstNamePlaceholder')}
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      leftIcon={<FiUser />}
                      error={errors.firstName}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {t('publicQuiz.lastName')} *
                    </label>
                    <Input
                      type="text"
                      placeholder={t('publicQuiz.lastNamePlaceholder')}
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      leftIcon={<FiUser />}
                      error={errors.lastName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {t('publicQuiz.email')} *
                    </label>
                    <Input
                      type="email"
                      placeholder={t('publicQuiz.emailPlaceholder')}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      leftIcon={<FiMail />}
                      error={errors.email}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      {t('publicQuiz.phone')}
                    </label>
                    <Input
                      type="tel"
                      placeholder={t('publicQuiz.phonePlaceholder')}
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      leftIcon={<FiPhone />}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('publicQuiz.organization')}
                  </label>
                  <Input
                    type="text"
                    placeholder={t('publicQuiz.organizationPlaceholder')}
                    value={formData.organization}
                    onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  />
                </div>

                <div className="text-sm text-text-secondary mb-6">
                  {t('publicQuiz.requiredFields')}
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth>
                  {t('publicQuiz.continue')}
                </Button>
              </form>
            </div>
          </Card>
        ) : (
          /* Ready to Start */
          <Card className="max-w-2xl mx-auto">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiPlay className="text-success" size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-primary mb-2">
                {t('publicQuiz.readyTitle')}
              </h2>
              
              <p className="text-text-secondary mb-2">
                {t('publicQuiz.welcome')}, <strong>{formData.firstName} {formData.lastName}</strong>!
              </p>
              
              <p className="text-text-secondary mb-6">
                {t('publicQuiz.readyDesc')}
              </p>

              {/* Quiz Summary */}
              <div className="bg-background rounded-lg p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-primary mb-3">{quiz.title}</h3>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>• {quiz.questionsCount} {t('publicQuiz.questionsToAnswer')}</p>
                  <p>• {Math.floor(quiz.timeLimit / 60)} {t('publicQuiz.minutesTimeLimit')}</p>
                  <p>• {t('publicQuiz.difficultyLevel')}: <span className={getDifficultyColor(quiz.difficulty)}>{t(`quizzes.card.difficulty.${quiz.difficulty}`)}</span></p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-semibold text-warning mb-2">{t('publicQuiz.instructions')}</h4>
                <ul className="text-sm text-text-secondary space-y-1">
                  <li>• {t('publicQuiz.instruction1')}</li>
                  <li>• {t('publicQuiz.instruction2')}</li>
                  <li>• {t('publicQuiz.instruction3')}</li>
                  <li>• {t('publicQuiz.instruction4')}</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setIdentified(false)}
                  fullWidth
                >
                  {t('common.back')}
                </Button>
                <Button 
                  variant="primary" 
                  size="lg" 
                  leftIcon={<FiPlay />}
                  onClick={handleStartQuiz}
                  fullWidth
                >
                  {t('publicQuiz.startQuiz')}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}