import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Copy, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { buildApiUrl } from '../config/api.config';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'multiple_select' | 'dropdown' | 'multiple_choice_grid' | 'checkbox_grid';
  question: string;
  options?: string[] | { rows: string[]; columns: string[] };
  correctAnswer: string | number | number[] | Record<string, number | number[]> | null;
  points: number;
  timeLimit?: number;
  explanation?: string;
}

interface QuizForm {
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublic: boolean;
  passingScore: number;
  timeLimit?: number;
  allowReview: boolean;
  randomizeQuestions: boolean;
  showCorrectAnswers: boolean;
  questions: Question[];
}

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'details' | 'questions' | 'settings'>('details');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [quiz, setQuiz] = useState<QuizForm>({
    title: '',
    description: '',
    category: 'General',
    difficulty: 'medium',
    isPublic: false,
    passingScore: 70,
    allowReview: true,
    randomizeQuestions: false,
    showCorrectAnswers: true,
    questions: []
  });

  const fallbackCategories = ['General', 'Capacitacion', 'Evaluacion', 'Sistemas', 'Procesos', 'Otro'];
  const [categories, setCategories] = useState<string[]>(fallbackCategories);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
        const response = await fetch(buildApiUrl('/categories'), { headers });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            setCategories(data.data.map((c: any) => c.name));
          }
        }
      } catch (e) {
        // Use fallback categories
      }
    };
    fetchCategories();
  }, [accessToken]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: null, // null means no answer selected yet
      points: 1,
      timeLimit: 30
    };
    
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setCurrentQuestionIndex(quiz.questions.length);
  };

  const updateQuestion = (index: number, updatedQuestion: Partial<Question>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, ...updatedQuestion } : q
      )
    }));
  };

  const deleteQuestion = (index: number) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
    if (currentQuestionIndex >= quiz.questions.length - 1) {
      setCurrentQuestionIndex(Math.max(0, quiz.questions.length - 2));
    }
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = quiz.questions[index];
    const newQuestion = {
      ...questionToDuplicate,
      id: Date.now().toString(),
      question: `${questionToDuplicate.question} (Copy)`,
      correctAnswer: questionToDuplicate.correctAnswer // Preserve correct answer
    };
    
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions.slice(0, index + 1), newQuestion, ...prev.questions.slice(index + 1)]
    }));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === quiz.questions.length - 1)) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newQuestions = [...quiz.questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    
    setQuiz(prev => ({ ...prev, questions: newQuestions }));
    setCurrentQuestionIndex(newIndex);
  };

  const handleSaveQuiz = async () => {
    // Validations
    if (!quiz.title.trim()) {
      toast.error('Please enter a quiz title');
      setActiveTab('details');
      return;
    }
    
    if (quiz.questions.length === 0) {
      toast.error('Please add at least one question');
      setActiveTab('questions');
      return;
    }
    
    // Check for empty questions
    const emptyQuestions = quiz.questions.map((q, idx) => ({
      index: idx + 1,
      isEmpty: !q.question || !q.question.trim()
    })).filter(q => q.isEmpty);
    
    if (emptyQuestions.length > 0) {
      const questionNumbers = emptyQuestions.map(q => q.index).join(', ');
      toast.error(`Please add text for question(s): ${questionNumbers}`);
      setActiveTab('questions');
      setCurrentQuestionIndex(emptyQuestions[0].index - 1);
      return;
    }
    
    // Check for questions without correct answers
    const questionsWithoutCorrectAnswers = quiz.questions
      .map((q, idx) => {
        let hasNoAnswer = false;
        if (q.type === 'multiple_select') {
          hasNoAnswer = !Array.isArray(q.correctAnswer) || (q.correctAnswer as number[]).length === 0;
        } else if (q.type === 'multiple_choice_grid' || q.type === 'checkbox_grid') {
          const opts = q.options as { rows: string[]; columns: string[] } | undefined;
          const ca = q.correctAnswer as Record<string, number | number[]> | null;
          if (!ca || !opts) {
            hasNoAnswer = true;
          } else {
            hasNoAnswer = opts.rows.some((_, rIdx) => {
              const val = ca[rIdx];
              return val === undefined || val === null || (Array.isArray(val) && (val as number[]).length === 0);
            });
          }
        } else {
          hasNoAnswer = q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === '';
        }
        return { index: idx + 1, hasNoAnswer };
      })
      .filter(q => q.hasNoAnswer);

    if (questionsWithoutCorrectAnswers.length > 0) {
      const questionNumbers = questionsWithoutCorrectAnswers.map(q => q.index).join(', ');
      toast.error(`Please set correct answers for question(s): ${questionNumbers}`);
      setActiveTab('questions');
      setCurrentQuestionIndex(questionsWithoutCorrectAnswers[0].index - 1);
      return;
    }

    // Check for empty answers in multiple choice / multiple_select / dropdown
    const mcQuestionsWithEmptyOptions = quiz.questions
      .map((q, idx) => ({
        index: idx + 1,
        question: q,
        hasEmptyOptions: (q.type === 'multiple_choice' || q.type === 'multiple_select' || q.type === 'dropdown') &&
          Array.isArray(q.options) && (q.options as string[]).some(opt => !opt.trim())
      }))
      .filter(q => q.hasEmptyOptions);

    if (mcQuestionsWithEmptyOptions.length > 0) {
      toast.error(`Please complete all answer options for question ${mcQuestionsWithEmptyOptions[0].index}`);
      setActiveTab('questions');
      setCurrentQuestionIndex(mcQuestionsWithEmptyOptions[0].index - 1);
      return;
    }

    // Check for empty row/column labels in grid types
    const gridQuestionsWithEmptyLabels = quiz.questions
      .map((q, idx) => {
        if (q.type !== 'multiple_choice_grid' && q.type !== 'checkbox_grid') return { index: idx + 1, hasEmpty: false };
        const opts = q.options as { rows: string[]; columns: string[] } | undefined;
        const hasEmpty = !opts || opts.rows.some(r => !r.trim()) || opts.columns.some(c => !c.trim());
        return { index: idx + 1, hasEmpty };
      })
      .filter(q => q.hasEmpty);

    if (gridQuestionsWithEmptyLabels.length > 0) {
      toast.error(`Please complete all row and column labels for question ${gridQuestionsWithEmptyLabels[0].index}`);
      setActiveTab('questions');
      setCurrentQuestionIndex(gridQuestionsWithEmptyLabels[0].index - 1);
      return;
    }
    
    try {
      // Format questions for backend
      const formattedQuestions = quiz.questions.map(q => {
        let correctAnswers;
        
        if (q.type === 'multiple_choice') {
          // For multiple choice, correctAnswer is the index of the correct option
          correctAnswers = q.correctAnswer !== null && q.correctAnswer !== undefined ? [q.correctAnswer] : [];
        } else if (q.type === 'true_false') {
          // For true/false, 0 = true, 1 = false (null means not set)
          correctAnswers = q.correctAnswer !== null && q.correctAnswer !== undefined ? [q.correctAnswer === 0] : [];
        } else if (q.type === 'short_answer') {
          // For short answer, split by comma for multiple acceptable answers
          const answers = (q.correctAnswer as string || '').split(',').map(a => a.trim()).filter(a => a);
          correctAnswers = answers;
        } else if (q.type === 'multiple_select') {
          correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
        } else if (q.type === 'dropdown') {
          correctAnswers = q.correctAnswer !== null && q.correctAnswer !== undefined ? [q.correctAnswer] : [];
        } else if (q.type === 'multiple_choice_grid' || q.type === 'checkbox_grid') {
          correctAnswers = q.correctAnswer || {};
        }
        
        return {
          question: q.question,
          questionText: q.question,
          type: q.type,
          questionType: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          correctAnswers: correctAnswers,
          points: q.points,
          timeLimit: q.timeLimit,
          explanation: q.explanation
        };
      });
      
      const quizData = {
        ...quiz,
        questions: formattedQuestions,
        isPublic: quiz.isPublic,
        timeLimitMinutes: quiz.timeLimit,
        passPercentage: quiz.passingScore,
        settings: {
          allowReview: quiz.allowReview,
          randomizeQuestions: quiz.randomizeQuestions,
          showCorrectAnswers: quiz.showCorrectAnswers
        }
      };
      
      const response = await fetch(buildApiUrl('/quizzes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(quizData)
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Quiz created successfully!');
        navigate(`/quizzes/${data.data.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create quiz');
      }
    } catch (error) {
      toast.error('Error creating quiz');
      console.error(error);
    }
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/quizzes')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('quizzes.create.title')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('quizzes.create.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => toast('Preview not implemented yet', { icon: 'ℹ️' })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>{t('quizzes.create.preview')}</span>
            </button>
            <button
              onClick={handleSaveQuiz}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-600-dark transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{t('quizzes.create.saveQuiz')}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6 border-b">
          {(['details', 'questions', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`quizzes.create.tabs.${tab}`)}
              {tab === 'questions' && quiz.questions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600/10 text-blue-600 rounded-full text-xs">
                  {quiz.questions.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quizzes.create.form.title')} *
              </label>
              <input
                type="text"
                value={quiz.title}
                onChange={e => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('quizzes.create.form.titlePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quizzes.create.form.category')}
              </label>
              <select
                value={quiz.category}
                onChange={e => setQuiz(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quizzes.create.form.description')}
              </label>
              <textarea
                value={quiz.description}
                onChange={e => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder={t('quizzes.create.form.descriptionPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quizzes.create.form.difficulty')}
              </label>
              <div className="flex space-x-3">
                {(['easy', 'medium', 'hard'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setQuiz(prev => ({ ...prev, difficulty: level }))}
                    className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                      quiz.difficulty === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quizzes.create.form.timeLimit')}
              </label>
              <input
                type="number"
                value={quiz.timeLimit || ''}
                onChange={e => setQuiz(prev => ({ ...prev, timeLimit: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="No time limit"
                min="1"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="flex space-x-6">
          {/* Questions List */}
          <div className="w-80 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Questions</h3>
              <button
                onClick={addQuestion}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-600-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {quiz.questions.map((q, index) => (
                <div
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentQuestionIndex === index
                      ? 'bg-blue-600/10 border-2 border-blue-600'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <GripVertical className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">Question {index + 1}</span>
                          {(() => {
                            const ca = q.correctAnswer;
                            const hasAnswer =
                              ca !== undefined && ca !== null && ca !== '' &&
                              !(Array.isArray(ca) && (ca as number[]).length === 0) &&
                              !(typeof ca === 'object' && !Array.isArray(ca) && Object.keys(ca as object).length === 0);
                            return hasAnswer ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : null;
                          })()}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {q.type === 'multiple_choice' ? 'Opcion multiple' :
                           q.type === 'true_false' ? 'Verdadero / Falso' :
                           q.type === 'short_answer' ? 'Respuesta corta' :
                           q.type === 'multiple_select' ? 'Casillas de verificacion' :
                           q.type === 'dropdown' ? 'Lista desplegable' :
                           q.type === 'multiple_choice_grid' ? 'Cuadricula opcion multiple' :
                           'Cuadricula de casillas'}
                        </div>
                        {q.question && (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">{q.question}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQuestion(index, 'up');
                        }}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQuestion(index, 'down');
                        }}
                        disabled={index === quiz.questions.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {quiz.questions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">{t('quizzes.create.form.noQuestions')}</p>
                  <p className="text-xs mt-1">{t('quizzes.create.form.noQuestionsHint')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Question Editor */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            {currentQuestion ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t('quizzes.create.form.question')} {currentQuestionIndex + 1}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => duplicateQuestion(currentQuestionIndex)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={t('quizzes.create.form.duplicateQuestion')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(currentQuestionIndex)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      title={t('quizzes.create.form.deleteQuestion')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('quizzes.create.form.questionType')}
                  </label>
                  <select
                    value={currentQuestion.type}
                    onChange={e => {
                      const newType = e.target.value as Question['type'];
                      let updates: Partial<Question> = { type: newType };
                      
                      if (newType === 'true_false') {
                        updates.options = ['True', 'False'];
                        updates.correctAnswer = null; // No default selection
                      } else if (newType === 'multiple_choice' && currentQuestion.type !== 'multiple_choice') {
                        updates.options = ['', '', '', ''];
                        updates.correctAnswer = null; // No default selection
                      } else if (newType === 'short_answer') {
                        updates.options = undefined;
                        updates.correctAnswer = '';
                      } else if (newType === 'multiple_select') {
                        updates.options = ['', '', '', ''];
                        updates.correctAnswer = [];
                      } else if (newType === 'dropdown') {
                        updates.options = ['', '', '', ''];
                        updates.correctAnswer = null;
                      } else if (newType === 'multiple_choice_grid') {
                        updates.options = { rows: ['Enunciado 1', 'Enunciado 2'], columns: ['Opcion A', 'Opcion B', 'Opcion C'] };
                        updates.correctAnswer = {};
                      } else if (newType === 'checkbox_grid') {
                        updates.options = { rows: ['Enunciado 1', 'Enunciado 2'], columns: ['Opcion A', 'Opcion B', 'Opcion C'] };
                        updates.correctAnswer = {};
                      }

                      updateQuestion(currentQuestionIndex, updates);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="multiple_choice">{t('quizzes.create.form.multipleChoice')}</option>
                    <option value="true_false">{t('quizzes.create.form.trueFalse')}</option>
                    <option value="short_answer">{t('quizzes.create.form.shortAnswer')}</option>
                    <option value="multiple_select">Casillas de Verificacion</option>
                    <option value="dropdown">Lista Desplegable</option>
                    <option value="multiple_choice_grid">Cuadricula de Opcion Multiple</option>
                    <option value="checkbox_grid">Cuadricula de Casillas</option>
                  </select>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('quizzes.create.form.questionText')} *
                  </label>
                  <textarea
                    value={currentQuestion.question}
                    onChange={e => updateQuestion(currentQuestionIndex, { question: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder={t('quizzes.create.form.questionPlaceholder')}
                  />
                </div>

                {/* Answer Options */}
                {currentQuestion.type === 'multiple_choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('quizzes.create.form.answerOptions')}
                    </label>
                    <div className="space-y-3">
                      {(currentQuestion.options as string[] | undefined)?.map((option, optIndex) => {
                        const isCorrect = currentQuestion.correctAnswer === optIndex;
                        const hasCorrectAnswer = currentQuestion.correctAnswer !== null && 
                                                 currentQuestion.correctAnswer !== undefined && 
                                                 currentQuestion.correctAnswer !== -1;
                        const isIncorrect = hasCorrectAnswer && !isCorrect;
                        
                        return (
                          <div 
                            key={optIndex} 
                            className={`flex items-center space-x-3 p-4 rounded-lg transition-all cursor-pointer border-3 ${
                              isCorrect 
                                ? 'bg-green-50 border-green-500 shadow-md' 
                                : isIncorrect
                                ? 'bg-red-50 border-red-400 opacity-75'
                                : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                            }`}
                            onClick={() => {
                              updateQuestion(currentQuestionIndex, { correctAnswer: optIndex });
                            }}
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                              isCorrect
                                ? 'bg-green-500 text-white scale-110'
                                : isIncorrect
                                ? 'bg-red-400 text-white'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}>
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : isIncorrect ? (
                                <span className="text-lg font-bold">×</span>
                              ) : (
                                <span className="text-gray-400">{optIndex + 1}</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={option}
                              onChange={e => {
                                const newOptions = [...(currentQuestion.options as string[] || [])];
                                newOptions[optIndex] = e.target.value;
                                updateQuestion(currentQuestionIndex, { options: newOptions });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`flex-1 px-4 py-2 rounded-lg transition-all border-2 ${
                                isCorrect
                                  ? 'border-green-400 bg-white'
                                  : isIncorrect
                                  ? 'border-red-300 bg-white'
                                  : 'border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-transparent'
                              }`}
                              placeholder={`${t('quizzes.create.form.option')} ${optIndex + 1}`}
                            />
                            {isCorrect && (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-green-600 font-bold text-sm">
                                  CORRECTA
                                </span>
                              </div>
                            )}
                            {isIncorrect && (
                              <span className="text-red-500 font-medium text-sm">
                                INCORRECTA
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center space-x-2 mt-3 p-3 bg-blue-50 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-blue-700">
                        Haz clic en cualquier opción para marcarla como respuesta correcta
                      </p>
                    </div>
                  </div>
                )}

                {currentQuestion.type === 'true_false' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t('quizzes.create.form.correctAnswer')}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {[t('publicQuiz.true'), t('publicQuiz.false')].map((option, index) => {
                        const isCorrect = currentQuestion.correctAnswer === index;
                        const hasCorrectAnswer = currentQuestion.correctAnswer !== null && 
                                                 currentQuestion.correctAnswer !== undefined;
                        const isIncorrect = hasCorrectAnswer && !isCorrect;
                        
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              updateQuestion(currentQuestionIndex, { correctAnswer: index });
                            }}
                            className={`px-6 py-6 rounded-lg transition-all flex flex-col items-center space-y-3 border-3 ${
                              isCorrect
                                ? 'bg-green-50 border-green-500 shadow-md scale-105'
                                : isIncorrect
                                ? 'bg-red-50 border-red-400 opacity-75'
                                : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                            }`}
                          >
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                              isCorrect
                                ? 'bg-green-500 text-white scale-110'
                                : isIncorrect
                                ? 'bg-red-400 text-white'
                                : 'bg-gray-200'
                            }`}>
                              {isCorrect ? (
                                <CheckCircle className="w-7 h-7" />
                              ) : isIncorrect ? (
                                <span className="text-2xl font-bold">✗</span>
                              ) : (
                                <span className="text-gray-500 text-lg">{index === 0 ? '✓' : '✗'}</span>
                              )}
                            </div>
                            <span className={`font-bold text-lg ${
                              isCorrect ? 'text-green-700' : isIncorrect ? 'text-red-600' : 'text-gray-700'
                            }`}>
                              {option}
                            </span>
                            {isCorrect && (
                              <span className="text-xs text-green-600 font-bold uppercase">
                                Respuesta Correcta
                              </span>
                            )}
                            {isIncorrect && (
                              <span className="text-xs text-red-500 font-medium uppercase">
                                Incorrecta
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentQuestion.type === 'short_answer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('quizzes.create.form.acceptableAnswers')}
                    </label>
                    <div className="p-5 bg-green-50 border-3 border-green-400 rounded-lg shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm font-bold text-green-700 mb-2 block">
                            RESPUESTAS CORRECTAS ACEPTADAS:
                          </label>
                          <input
                            type="text"
                            value={currentQuestion.correctAnswer as string}
                            onChange={e => updateQuestion(currentQuestionIndex, { correctAnswer: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-green-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-600 bg-white text-lg"
                            placeholder={t('quizzes.create.form.acceptableAnswersPlaceholder')}
                          />
                          <p className="text-sm text-green-700 mt-2 font-medium">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            {t('quizzes.create.form.acceptableAnswersHint')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* multiple_select */}
                {currentQuestion.type === 'multiple_select' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opciones de respuesta
                    </label>
                    <p className="text-xs text-blue-700 mb-3 font-medium">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Selecciona TODAS las respuestas correctas
                    </p>
                    <div className="space-y-3">
                      {(currentQuestion.options as string[] || []).map((option, optIndex) => {
                        const correctArr = (currentQuestion.correctAnswer as number[] | null) || [];
                        const isCorrect = correctArr.includes(optIndex);

                        return (
                          <div
                            key={optIndex}
                            className={`flex items-center space-x-3 p-4 rounded-lg transition-all cursor-pointer border-3 ${
                              isCorrect
                                ? 'bg-green-50 border-green-500 shadow-md'
                                : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                            }`}
                            onClick={() => {
                              const current = (currentQuestion.correctAnswer as number[] | null) || [];
                              const next = isCorrect
                                ? current.filter(i => i !== optIndex)
                                : [...current, optIndex];
                              updateQuestion(currentQuestionIndex, { correctAnswer: next });
                            }}
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded transition-all ${
                              isCorrect
                                ? 'bg-green-500 text-white scale-110'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                              style={{ borderRadius: '4px' }}
                            >
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <span className="text-gray-400 text-sm">{optIndex + 1}</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={option}
                              onChange={e => {
                                const newOptions = [...(currentQuestion.options as string[] || [])];
                                newOptions[optIndex] = e.target.value;
                                updateQuestion(currentQuestionIndex, { options: newOptions });
                              }}
                              onClick={e => e.stopPropagation()}
                              className={`flex-1 px-4 py-2 rounded-lg transition-all border-2 ${
                                isCorrect
                                  ? 'border-green-400 bg-white'
                                  : 'border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-transparent'
                              }`}
                              placeholder={`Opcion ${optIndex + 1}`}
                            />
                            {isCorrect && (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-green-600 font-bold text-sm">CORRECTA</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const opts = currentQuestion.options as string[] || [];
                          updateQuestion(currentQuestionIndex, { options: [...opts, ''] });
                        }}
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        + Agregar opcion
                      </button>
                      {(currentQuestion.options as string[] || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const opts = currentQuestion.options as string[] || [];
                            const newOpts = opts.slice(0, -1);
                            const correctArr = (currentQuestion.correctAnswer as number[] || []).filter(i => i < newOpts.length);
                            updateQuestion(currentQuestionIndex, { options: newOpts, correctAnswer: correctArr });
                          }}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          - Eliminar ultima
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-3 p-3 bg-blue-50 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-blue-700">
                        Haz clic en una opcion para marcarla o desmarcarla como correcta
                      </p>
                    </div>
                  </div>
                )}

                {/* dropdown */}
                {currentQuestion.type === 'dropdown' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opciones de respuesta
                    </label>
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg mb-3">
                      <p className="text-xs text-amber-700 font-medium">
                        Se mostrara como lista desplegable al contestar
                      </p>
                    </div>
                    <div className="space-y-3">
                      {(currentQuestion.options as string[] || []).map((option, optIndex) => {
                        const isCorrect = currentQuestion.correctAnswer === optIndex;
                        const hasCorrectAnswer = currentQuestion.correctAnswer !== null &&
                                                 currentQuestion.correctAnswer !== undefined &&
                                                 currentQuestion.correctAnswer !== -1;
                        const isIncorrect = hasCorrectAnswer && !isCorrect;

                        return (
                          <div
                            key={optIndex}
                            className={`flex items-center space-x-3 p-4 rounded-lg transition-all cursor-pointer border-3 ${
                              isCorrect
                                ? 'bg-green-50 border-green-500 shadow-md'
                                : isIncorrect
                                ? 'bg-red-50 border-red-400 opacity-75'
                                : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                            }`}
                            onClick={() => updateQuestion(currentQuestionIndex, { correctAnswer: optIndex })}
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                              isCorrect
                                ? 'bg-green-500 text-white scale-110'
                                : isIncorrect
                                ? 'bg-red-400 text-white'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}>
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : isIncorrect ? (
                                <span className="text-lg font-bold">x</span>
                              ) : (
                                <span className="text-gray-400">{optIndex + 1}</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={option}
                              onChange={e => {
                                const newOptions = [...(currentQuestion.options as string[] || [])];
                                newOptions[optIndex] = e.target.value;
                                updateQuestion(currentQuestionIndex, { options: newOptions });
                              }}
                              onClick={e => e.stopPropagation()}
                              className={`flex-1 px-4 py-2 rounded-lg transition-all border-2 ${
                                isCorrect
                                  ? 'border-green-400 bg-white'
                                  : isIncorrect
                                  ? 'border-red-300 bg-white'
                                  : 'border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-transparent'
                              }`}
                              placeholder={`Opcion ${optIndex + 1}`}
                            />
                            {isCorrect && (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-green-600 font-bold text-sm">CORRECTA</span>
                              </div>
                            )}
                            {isIncorrect && (
                              <span className="text-red-500 font-medium text-sm">INCORRECTA</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const opts = currentQuestion.options as string[] || [];
                          updateQuestion(currentQuestionIndex, { options: [...opts, ''] });
                        }}
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        + Agregar opcion
                      </button>
                      {(currentQuestion.options as string[] || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const opts = currentQuestion.options as string[] || [];
                            const newOpts = opts.slice(0, -1);
                            const currentCA = currentQuestion.correctAnswer as number | null;
                            updateQuestion(currentQuestionIndex, {
                              options: newOpts,
                              correctAnswer: currentCA !== null && currentCA >= newOpts.length ? null : currentCA
                            });
                          }}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          - Eliminar ultima
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-3 p-3 bg-blue-50 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-blue-700">
                        Haz clic en cualquier opcion para marcarla como respuesta correcta
                      </p>
                    </div>
                  </div>
                )}

                {/* multiple_choice_grid */}
                {currentQuestion.type === 'multiple_choice_grid' && (() => {
                  const gridOpts = currentQuestion.options as { rows: string[]; columns: string[] } | undefined;
                  const rows = gridOpts?.rows || [];
                  const columns = gridOpts?.columns || [];
                  const correctAnswer = (currentQuestion.correctAnswer as Record<string, number> | null) || {};

                  const updateRows = (newRows: string[]) =>
                    updateQuestion(currentQuestionIndex, { options: { rows: newRows, columns } });
                  const updateColumns = (newCols: string[]) =>
                    updateQuestion(currentQuestionIndex, { options: { rows, columns: newCols } });

                  return (
                    <div className="space-y-5">
                      {/* Row labels editor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filas (enunciados)</label>
                        <div className="space-y-2">
                          {rows.map((row, rIdx) => (
                            <div key={rIdx} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={row}
                                onChange={e => {
                                  const newRows = [...rows];
                                  newRows[rIdx] = e.target.value;
                                  updateRows(newRows);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                placeholder={`Fila ${rIdx + 1}`}
                              />
                              {rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRows = rows.filter((_, i) => i !== rIdx);
                                    const newCA = { ...correctAnswer };
                                    delete newCA[rIdx];
                                    updateQuestion(currentQuestionIndex, { options: { rows: newRows, columns }, correctAnswer: newCA });
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateRows([...rows, `Enunciado ${rows.length + 1}`])}
                          className="mt-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          + Agregar fila
                        </button>
                      </div>

                      {/* Column labels editor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Columnas (opciones)</label>
                        <div className="space-y-2">
                          {columns.map((col, cIdx) => (
                            <div key={cIdx} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={col}
                                onChange={e => {
                                  const newCols = [...columns];
                                  newCols[cIdx] = e.target.value;
                                  updateColumns(newCols);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                placeholder={`Columna ${cIdx + 1}`}
                              />
                              {columns.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newCols = columns.filter((_, i) => i !== cIdx);
                                    updateColumns(newCols);
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateColumns([...columns, `Opcion ${columns.length + 1}`])}
                          className="mt-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          + Agregar columna
                        </button>
                      </div>

                      {/* Grid preview */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vista previa — marca la respuesta correcta por fila
                        </label>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-gray-600 font-medium"></th>
                                {columns.map((col, cIdx) => (
                                  <th key={cIdx} className="px-4 py-2 text-center text-gray-600 font-medium">
                                    {col || `Col ${cIdx + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, rIdx) => (
                                <tr key={rIdx} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-700 font-medium">
                                    {row || `Fila ${rIdx + 1}`}
                                  </td>
                                  {columns.map((_, cIdx) => {
                                    const isSelected = correctAnswer[rIdx] === cIdx;
                                    return (
                                      <td key={cIdx} className="px-4 py-3 text-center">
                                        <input
                                          type="radio"
                                          name={`grid-row-${rIdx}`}
                                          checked={isSelected}
                                          onChange={() => {
                                            const newCA = { ...correctAnswer, [rIdx]: cIdx };
                                            updateQuestion(currentQuestionIndex, { correctAnswer: newCA });
                                          }}
                                          className="w-4 h-4 accent-green-500 cursor-pointer"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* checkbox_grid */}
                {currentQuestion.type === 'checkbox_grid' && (() => {
                  const gridOpts = currentQuestion.options as { rows: string[]; columns: string[] } | undefined;
                  const rows = gridOpts?.rows || [];
                  const columns = gridOpts?.columns || [];
                  const correctAnswer = (currentQuestion.correctAnswer as Record<string, number[]> | null) || {};

                  const updateRows = (newRows: string[]) =>
                    updateQuestion(currentQuestionIndex, { options: { rows: newRows, columns } });
                  const updateColumns = (newCols: string[]) =>
                    updateQuestion(currentQuestionIndex, { options: { rows, columns: newCols } });

                  return (
                    <div className="space-y-5">
                      {/* Row labels editor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filas (enunciados)</label>
                        <div className="space-y-2">
                          {rows.map((row, rIdx) => (
                            <div key={rIdx} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={row}
                                onChange={e => {
                                  const newRows = [...rows];
                                  newRows[rIdx] = e.target.value;
                                  updateRows(newRows);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                placeholder={`Fila ${rIdx + 1}`}
                              />
                              {rows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRows = rows.filter((_, i) => i !== rIdx);
                                    const newCA = { ...correctAnswer };
                                    delete newCA[rIdx];
                                    updateQuestion(currentQuestionIndex, { options: { rows: newRows, columns }, correctAnswer: newCA });
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateRows([...rows, `Enunciado ${rows.length + 1}`])}
                          className="mt-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          + Agregar fila
                        </button>
                      </div>

                      {/* Column labels editor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Columnas (opciones)</label>
                        <div className="space-y-2">
                          {columns.map((col, cIdx) => (
                            <div key={cIdx} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={col}
                                onChange={e => {
                                  const newCols = [...columns];
                                  newCols[cIdx] = e.target.value;
                                  updateColumns(newCols);
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                placeholder={`Columna ${cIdx + 1}`}
                              />
                              {columns.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newCols = columns.filter((_, i) => i !== cIdx);
                                    updateColumns(newCols);
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateColumns([...columns, `Opcion ${columns.length + 1}`])}
                          className="mt-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          + Agregar columna
                        </button>
                      </div>

                      {/* Grid preview */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vista previa — marca todas las respuestas correctas por fila
                        </label>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-gray-600 font-medium"></th>
                                {columns.map((col, cIdx) => (
                                  <th key={cIdx} className="px-4 py-2 text-center text-gray-600 font-medium">
                                    {col || `Col ${cIdx + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, rIdx) => {
                                const rowSelected = (correctAnswer[rIdx] as number[] | undefined) || [];
                                return (
                                  <tr key={rIdx} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-700 font-medium">
                                      {row || `Fila ${rIdx + 1}`}
                                    </td>
                                    {columns.map((_, cIdx) => {
                                      const isChecked = rowSelected.includes(cIdx);
                                      return (
                                        <td key={cIdx} className="px-4 py-3 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              const next = isChecked
                                                ? rowSelected.filter(i => i !== cIdx)
                                                : [...rowSelected, cIdx];
                                              const newCA = { ...correctAnswer, [rIdx]: next };
                                              updateQuestion(currentQuestionIndex, { correctAnswer: newCA });
                                            }}
                                            className="w-4 h-4 accent-green-500 cursor-pointer"
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Points and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('quizzes.create.form.points')}
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.points}
                      onChange={e => updateQuestion(currentQuestionIndex, { points: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('quizzes.create.form.timeLimitSeconds')}
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.timeLimit || ''}
                      onChange={e => updateQuestion(currentQuestionIndex, { timeLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="No limit"
                      min="5"
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('quizzes.create.form.explanation')}
                  </label>
                  <textarea
                    value={currentQuestion.explanation || ''}
                    onChange={e => updateQuestion(currentQuestionIndex, { explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                    placeholder={t('quizzes.create.form.explanationPlaceholder')}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg mb-2">{t('quizzes.create.form.noQuestions')}</p>
                <p className="text-sm">{t('quizzes.create.form.noQuestionsHint')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('quizzes.create.tabs.settings')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">{t('quizzes.create.form.isPublic')}</label>
                    <p className="text-sm text-gray-500">{t('quizzes.create.form.isPublicHint')}</p>
                  </div>
                  <button
                    onClick={() => setQuiz(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      quiz.isPublic ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        quiz.isPublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">{t('quizzes.create.form.randomizeQuestions')}</label>
                    <p className="text-sm text-gray-500">{t('quizzes.create.form.randomizeQuestionsHint')}</p>
                  </div>
                  <button
                    onClick={() => setQuiz(prev => ({ ...prev, randomizeQuestions: !prev.randomizeQuestions }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      quiz.randomizeQuestions ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        quiz.randomizeQuestions ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">{t('quizzes.create.form.allowReview')}</label>
                    <p className="text-sm text-gray-500">{t('quizzes.create.form.allowReviewHint')}</p>
                  </div>
                  <button
                    onClick={() => setQuiz(prev => ({ ...prev, allowReview: !prev.allowReview }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      quiz.allowReview ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        quiz.allowReview ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">{t('quizzes.create.form.showCorrectAnswers')}</label>
                    <p className="text-sm text-gray-500">{t('quizzes.create.form.showCorrectAnswersHint')}</p>
                  </div>
                  <button
                    onClick={() => setQuiz(prev => ({ ...prev, showCorrectAnswers: !prev.showCorrectAnswers }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      quiz.showCorrectAnswers ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        quiz.showCorrectAnswers ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('quizzes.create.form.passingScore')}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={quiz.passingScore}
                      onChange={e => setQuiz(prev => ({ ...prev, passingScore: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-medium">{quiz.passingScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}