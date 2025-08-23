import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Copy, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
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

  const categories = [
    'General', 'Math', 'Science', 'History', 'Geography', 
    'Literature', 'Technology', 'Languages', 'Business', 'Other'
  ];

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
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
      question: `${questionToDuplicate.question} (Copy)`
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
    
    // Check for empty answers in multiple choice
    const mcQuestionsWithEmptyOptions = quiz.questions
      .map((q, idx) => ({
        index: idx + 1,
        question: q,
        hasEmptyOptions: q.type === 'multiple_choice' && 
          q.options?.some(opt => !opt.trim())
      }))
      .filter(q => q.hasEmptyOptions);
    
    if (mcQuestionsWithEmptyOptions.length > 0) {
      toast.error(`Please complete all answer options for question ${mcQuestionsWithEmptyOptions[0].index}`);
      setActiveTab('questions');
      setCurrentQuestionIndex(mcQuestionsWithEmptyOptions[0].index - 1);
      return;
    }
    
    try {
      // Format questions for backend
      const formattedQuestions = quiz.questions.map(q => {
        let correctAnswers;
        
        if (q.type === 'multiple_choice') {
          // For multiple choice, correctAnswer is the index of the correct option
          correctAnswers = [q.correctAnswer];
        } else if (q.type === 'true_false') {
          // For true/false, 0 = true, 1 = false
          correctAnswers = [q.correctAnswer === 0];
        } else if (q.type === 'short_answer') {
          // For short answer, split by comma for multiple acceptable answers
          const answers = (q.correctAnswer as string || '').split(',').map(a => a.trim()).filter(a => a);
          correctAnswers = answers;
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
        isPublic: quiz.settings.isPublic,
        settings: quiz.settings
      };
      
      const response = await fetch('http://localhost:3001/api/v1/quizzes', {
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
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
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
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`quizzes.create.tabs.${tab}`)}
              {tab === 'questions' && quiz.questions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
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
                        ? 'bg-primary text-white'
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
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
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
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <GripVertical className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Question {index + 1}</div>
                        <div className="text-xs text-gray-500 capitalize">{q.type.replace('_', ' ')}</div>
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
                        updates.correctAnswer = 0;
                      } else if (newType === 'multiple_choice' && currentQuestion.type !== 'multiple_choice') {
                        updates.options = ['', '', '', ''];
                        updates.correctAnswer = 0;
                      } else if (newType === 'short_answer') {
                        updates.options = undefined;
                        updates.correctAnswer = '';
                      }
                      
                      updateQuestion(currentQuestionIndex, updates);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="multiple_choice">{t('quizzes.create.form.multipleChoice')}</option>
                    <option value="true_false">{t('quizzes.create.form.trueFalse')}</option>
                    <option value="short_answer">{t('quizzes.create.form.shortAnswer')}</option>
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
                      {currentQuestion.options?.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            checked={currentQuestion.correctAnswer === optIndex}
                            onChange={() => updateQuestion(currentQuestionIndex, { correctAnswer: optIndex })}
                            className="w-4 h-4 text-primary"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={e => {
                              const newOptions = [...(currentQuestion.options || [])];
                              newOptions[optIndex] = e.target.value;
                              updateQuestion(currentQuestionIndex, { options: newOptions });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder={`${t('quizzes.create.form.option')} ${optIndex + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t('quizzes.create.form.correctAnswerHint')}</p>
                  </div>
                )}

                {currentQuestion.type === 'true_false' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('quizzes.create.form.correctAnswer')}
                    </label>
                    <div className="flex space-x-3">
                      {[t('publicQuiz.true'), t('publicQuiz.false')].map((option, index) => (
                        <button
                          key={option}
                          onClick={() => updateQuestion(currentQuestionIndex, { correctAnswer: index })}
                          className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                            currentQuestion.correctAnswer === index
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {currentQuestion.correctAnswer === index && (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentQuestion.type === 'short_answer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('quizzes.create.form.acceptableAnswers')}
                    </label>
                    <input
                      type="text"
                      value={currentQuestion.correctAnswer as string}
                      onChange={e => updateQuestion(currentQuestionIndex, { correctAnswer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={t('quizzes.create.form.acceptableAnswersPlaceholder')}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('quizzes.create.form.acceptableAnswersHint')}</p>
                  </div>
                )}

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
                      quiz.isPublic ? 'bg-primary' : 'bg-gray-200'
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
                      quiz.randomizeQuestions ? 'bg-primary' : 'bg-gray-200'
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
                      quiz.allowReview ? 'bg-primary' : 'bg-gray-200'
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
                      quiz.showCorrectAnswers ? 'bg-primary' : 'bg-gray-200'
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