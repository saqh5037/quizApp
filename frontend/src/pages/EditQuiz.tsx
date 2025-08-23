import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Copy, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { buildApiUrl } from '../config/api.config';

interface Question {
  id: string | number;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | number | null;
  correct_answer?: string;
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

export default function EditQuiz() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchQuizData();
  }, [id]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      
      // Fetch quiz details
      const quizResponse = await fetch(buildApiUrl(`/quizzes/${id}`), {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!quizResponse.ok) {
        throw new Error('Failed to fetch quiz');
      }
      
      const quizData = await quizResponse.json();
      
      // Fetch quiz questions
      const questionsResponse = await fetch(buildApiUrl(`/quizzes/${id}/questions`), {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!questionsResponse.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const questionsData = await questionsResponse.json();
      
      // Format the data for the form
      const formattedQuestions = questionsData.data.map((q: any) => {
        let correctAnswer;
        
        // Parse correct answer based on question type
        if (q.question_type === 'multiple_choice' || q.type === 'multiple_choice') {
          // For multiple choice, correct_answers is an array with the index
          if (q.correct_answers && Array.isArray(q.correct_answers) && q.correct_answers.length > 0) {
            correctAnswer = q.correct_answers[0]; // Get the index from the array
          } else if (q.correct_answer !== undefined) {
            correctAnswer = parseInt(q.correct_answer);
          } else {
            correctAnswer = null;
          }
        } else if (q.question_type === 'true_false' || q.type === 'true_false') {
          // For true/false, correct_answers is [true] or [false]
          if (q.correct_answers && Array.isArray(q.correct_answers) && q.correct_answers.length > 0) {
            correctAnswer = q.correct_answers[0] === true ? 0 : 1; // Convert boolean to index
          } else if (q.correct_answer !== undefined) {
            correctAnswer = parseInt(q.correct_answer);
          } else {
            correctAnswer = null;
          }
        } else if (q.question_type === 'short_answer' || q.type === 'short_answer') {
          // For short answer, join array into comma-separated string
          if (q.correct_answers && Array.isArray(q.correct_answers)) {
            correctAnswer = q.correct_answers.join(', ');
          } else {
            correctAnswer = q.correct_answer || '';
          }
        }
        
        return {
          id: q.id,
          type: q.type || q.question_type,
          question: q.question || q.question_text,
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : 
                   (q.type === 'true_false' || q.question_type === 'true_false') ? ['True', 'False'] : 
                   (q.type === 'multiple_choice' || q.question_type === 'multiple_choice') ? ['', '', '', ''] : undefined,
          correctAnswer: correctAnswer,
          points: q.points || 1,
          explanation: q.explanation || ''
        };
      });
      
      setQuiz({
        title: quizData.data.title || '',
        description: quizData.data.description || '',
        category: quizData.data.category || 'General',
        difficulty: quizData.data.difficulty || 'medium',
        isPublic: Boolean(quizData.data.is_public),
        passingScore: quizData.data.passing_score || 70,
        timeLimit: quizData.data.time_limit || undefined,
        allowReview: true,
        randomizeQuestions: false,
        showCorrectAnswers: true,
        questions: formattedQuestions
      });
      
      if (formattedQuestions.length > 0) {
        setCurrentQuestionIndex(0);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz data');
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `new_${Date.now()}`,
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
    if (quiz.questions[index] && typeof quiz.questions[index].id === 'number') {
      if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
        return;
      }
    }
    
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
      id: `new_${Date.now()}`,
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
    
    try {
      // Format questions with correct answers properly
      const formattedQuestions = quiz.questions.map(q => {
        let correctAnswers;
        
        if (q.type === 'multiple_choice') {
          // For multiple choice, correctAnswer is the index of the correct option
          correctAnswers = q.correctAnswer !== null && q.correctAnswer !== undefined ? [q.correctAnswer] : [];
        } else if (q.type === 'true_false') {
          // For true/false, 0 = true, 1 = false
          correctAnswers = q.correctAnswer !== null && q.correctAnswer !== undefined ? [q.correctAnswer === 0] : [];
        } else if (q.type === 'short_answer') {
          // For short answer, split by comma for multiple acceptable answers
          const answers = (q.correctAnswer as string || '').split(',').map(a => a.trim()).filter(a => a);
          correctAnswers = answers;
        }
        
        return {
          id: q.id,
          question: q.question,
          questionText: q.question,
          type: q.type,
          questionType: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          correctAnswers: correctAnswers,
          correct_answers: correctAnswers, // Also send as correct_answers for backend compatibility
          points: q.points,
          timeLimit: q.timeLimit,
          explanation: q.explanation
        };
      });
      
      const quizData = {
        ...quiz,
        questions: formattedQuestions,
        isPublic: quiz.isPublic,
        is_public: quiz.isPublic,
        passingScore: quiz.passingScore,
        pass_percentage: quiz.passingScore
      };
      
      const response = await fetch(buildApiUrl(`/quizzes/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(quizData)
      });
      
      if (response.ok) {
        toast.success('Quiz updated successfully!');
        navigate(`/quizzes/${id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update quiz');
      }
    } catch (error) {
      toast.error('Error updating quiz');
      console.error(error);
    }
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading quiz data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/quizzes/${id}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Quiz</h1>
              <p className="text-sm text-gray-500 mt-1">Update your quiz content and settings</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => toast('Preview not implemented yet', { icon: 'ℹ️' })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleSaveQuiz}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
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
              {tab}
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
                Quiz Title *
              </label>
              <input
                type="text"
                value={quiz.title}
                onChange={e => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter quiz title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
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
                Description
              </label>
              <textarea
                value={quiz.description}
                onChange={e => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Describe what this quiz is about"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
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
                Time Limit (minutes)
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
                        <div className="font-medium text-sm">
                          Question {index + 1}
                          {typeof q.id === 'string' && q.id.startsWith('new_') && (
                            <span className="ml-2 text-xs text-green-600">(New)</span>
                          )}
                        </div>
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
                  <p className="text-sm">No questions yet</p>
                  <p className="text-xs mt-1">Click + to add your first question</p>
                </div>
              )}
            </div>
          </div>

          {/* Question Editor */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            {currentQuestion ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Question {currentQuestionIndex + 1}
                    {typeof currentQuestion.id === 'string' && currentQuestion.id.startsWith('new_') && (
                      <span className="ml-2 text-sm text-green-600">(New)</span>
                    )}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => duplicateQuestion(currentQuestionIndex)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Duplicate Question"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(currentQuestionIndex)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type
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
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Text *
                  </label>
                  <textarea
                    value={currentQuestion.question}
                    onChange={e => updateQuestion(currentQuestionIndex, { question: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Enter your question here"
                  />
                </div>

                {/* Answer Options */}
                {currentQuestion.type === 'multiple_choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer Options
                    </label>
                    <div className="space-y-3">
                      {currentQuestion.options?.map((option, optIndex) => {
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
                                const newOptions = [...(currentQuestion.options || [])];
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
                              placeholder={`Option ${optIndex + 1}`}
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
                      Correct Answer
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {['True', 'False'].map((option, index) => {
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
                      Acceptable Answer(s)
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
                            placeholder="Enter acceptable answer(s)"
                          />
                          <p className="text-sm text-green-700 mt-2 font-medium">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Separate multiple acceptable answers with commas
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Points */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    value={currentQuestion.points}
                    onChange={e => updateQuestion(currentQuestionIndex, { points: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    min="1"
                  />
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={currentQuestion.explanation || ''}
                    onChange={e => updateQuestion(currentQuestionIndex, { explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                    placeholder="Provide an explanation for the correct answer"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-lg mb-2">No question selected</p>
                <p className="text-sm">Add a question or select one from the list</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Quiz Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-700">Public Quiz</label>
                    <p className="text-sm text-gray-500">Allow anyone to take this quiz</p>
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
                    <label className="font-medium text-gray-700">Randomize Questions</label>
                    <p className="text-sm text-gray-500">Show questions in random order</p>
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
                    <label className="font-medium text-gray-700">Allow Review</label>
                    <p className="text-sm text-gray-500">Let students review their answers after submission</p>
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
                    <label className="font-medium text-gray-700">Show Correct Answers</label>
                    <p className="text-sm text-gray-500">Display correct answers after quiz completion</p>
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
                    Passing Score (%)
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