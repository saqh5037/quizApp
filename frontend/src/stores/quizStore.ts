import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Quiz {
  id: number;
  title: string;
  description?: string;
  category?: string;
  coverImage?: string;
  timeLimit?: number;
  passingScore?: number;
  isPublic: boolean;
  isActive: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  allowRetake: boolean;
  maxAttempts?: number;
  userId: number;
  totalQuestions?: number;
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  questions?: Question[];
}

interface Question {
  id: number;
  quizId: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: any;
  explanation?: string;
  points: number;
  timeLimit?: number;
  order: number;
  imageUrl?: string;
}

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  isLoading: boolean;
  error: string | null;
  
  fetchQuizzes: (filters?: any) => Promise<void>;
  fetchQuizById: (id: number) => Promise<void>;
  createQuiz: (data: Partial<Quiz>) => Promise<Quiz>;
  updateQuiz: (id: number, data: Partial<Quiz>) => Promise<void>;
  deleteQuiz: (id: number) => Promise<void>;
  
  addQuestion: (quizId: number, question: Partial<Question>) => Promise<void>;
  updateQuestion: (quizId: number, questionId: number, data: Partial<Question>) => Promise<void>;
  deleteQuestion: (quizId: number, questionId: number) => Promise<void>;
  
  clearError: () => void;
  resetStore: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  currentQuiz: null,
  isLoading: false,
  error: null,

  fetchQuizzes: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/api/v1/quizzes`, {
        params: filters,
      });
      
      set({
        quizzes: response.data.data.quizzes,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to fetch quizzes',
        isLoading: false,
      });
      toast.error('Failed to load quizzes');
    }
  },

  fetchQuizById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/api/v1/quizzes/${id}`);
      
      set({
        currentQuiz: response.data.data.quiz,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to fetch quiz',
        isLoading: false,
      });
      toast.error('Failed to load quiz details');
      throw error;
    }
  },

  createQuiz: async (data: Partial<Quiz>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/api/v1/quizzes`, data);
      const newQuiz = response.data.data.quiz;
      
      set((state) => ({
        quizzes: [...state.quizzes, newQuiz],
        currentQuiz: newQuiz,
        isLoading: false,
      }));
      
      toast.success('Quiz created successfully');
      return newQuiz;
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to create quiz',
        isLoading: false,
      });
      toast.error('Failed to create quiz');
      throw error;
    }
  },

  updateQuiz: async (id: number, data: Partial<Quiz>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/api/v1/quizzes/${id}`, data);
      const updatedQuiz = response.data.data.quiz;
      
      set((state) => ({
        quizzes: state.quizzes.map(q => q.id === id ? updatedQuiz : q),
        currentQuiz: state.currentQuiz?.id === id ? updatedQuiz : state.currentQuiz,
        isLoading: false,
      }));
      
      toast.success('Quiz updated successfully');
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to update quiz',
        isLoading: false,
      });
      toast.error('Failed to update quiz');
      throw error;
    }
  },

  deleteQuiz: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/api/v1/quizzes/${id}`);
      
      set((state) => ({
        quizzes: state.quizzes.filter(q => q.id !== id),
        currentQuiz: state.currentQuiz?.id === id ? null : state.currentQuiz,
        isLoading: false,
      }));
      
      toast.success('Quiz deleted successfully');
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to delete quiz',
        isLoading: false,
      });
      toast.error('Failed to delete quiz');
      throw error;
    }
  },

  addQuestion: async (quizId: number, question: Partial<Question>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/quizzes/${quizId}/questions`,
        question
      );
      
      const newQuestion = response.data.data.question;
      
      set((state) => {
        if (state.currentQuiz?.id === quizId) {
          return {
            currentQuiz: {
              ...state.currentQuiz,
              questions: [...(state.currentQuiz.questions || []), newQuestion],
            },
            isLoading: false,
          };
        }
        return { isLoading: false };
      });
      
      toast.success('Question added successfully');
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to add question',
        isLoading: false,
      });
      toast.error('Failed to add question');
      throw error;
    }
  },

  updateQuestion: async (quizId: number, questionId: number, data: Partial<Question>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/api/v1/quizzes/${quizId}/questions/${questionId}`,
        data
      );
      
      const updatedQuestion = response.data.data.question;
      
      set((state) => {
        if (state.currentQuiz?.id === quizId) {
          return {
            currentQuiz: {
              ...state.currentQuiz,
              questions: state.currentQuiz.questions?.map(q =>
                q.id === questionId ? updatedQuestion : q
              ),
            },
            isLoading: false,
          };
        }
        return { isLoading: false };
      });
      
      toast.success('Question updated successfully');
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to update question',
        isLoading: false,
      });
      toast.error('Failed to update question');
      throw error;
    }
  },

  deleteQuestion: async (quizId: number, questionId: number) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(
        `${API_URL}/api/v1/quizzes/${quizId}/questions/${questionId}`
      );
      
      set((state) => {
        if (state.currentQuiz?.id === quizId) {
          return {
            currentQuiz: {
              ...state.currentQuiz,
              questions: state.currentQuiz.questions?.filter(q => q.id !== questionId),
            },
            isLoading: false,
          };
        }
        return { isLoading: false };
      });
      
      toast.success('Question deleted successfully');
    } catch (error: any) {
      set({
        error: error.response?.data?.error?.message || 'Failed to delete question',
        isLoading: false,
      });
      toast.error('Failed to delete question');
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  resetStore: () => {
    set({
      quizzes: [],
      currentQuiz: null,
      isLoading: false,
      error: null,
    });
  },
}));