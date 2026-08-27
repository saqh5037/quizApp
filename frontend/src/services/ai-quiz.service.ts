/**
 * ai-quiz.service.ts — frontend API client for the Fase 5 AI quiz endpoints.
 *
 * Talks to /api/v1/ai/generate-quiz-from-text and friends. These are the
 * tenant-isolated, DB-persisted replacements for the legacy in-memory flow.
 */

import api from './api';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface GeneratedQuestion {
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: number | string;
  explanation?: string;
  points?: number;
}

export interface GeneratedQuiz {
  id: number;
  title: string;
  description?: string;
  difficulty?: Difficulty;
  questionCount?: number;
  questions: GeneratedQuestion[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateFromTextInput {
  title: string;
  sourceText: string;
  numberOfQuestions: number;
  difficulty?: Difficulty;
  questionTypes?: QuestionType[];
  language?: 'es' | 'en';
}

export interface GenerateFromManualInput {
  manualId: number;
  title?: string;
  numberOfQuestions: number;
  difficulty?: Difficulty;
  questionTypes?: QuestionType[];
  language?: 'es' | 'en';
}

export const aiQuizService = {
  async generateFromText(input: GenerateFromTextInput): Promise<GeneratedQuiz> {
    const res = await api.post<GeneratedQuiz>('/ai/generate-quiz-from-text', input);
    return res.data;
  },

  async generateFromManual(input: GenerateFromManualInput): Promise<GeneratedQuiz> {
    const res = await api.post<GeneratedQuiz>('/ai/generate-quiz-from-manual', input);
    return res.data;
  },

  async getGenerated(id: number): Promise<GeneratedQuiz> {
    const res = await api.get<GeneratedQuiz>(`/ai/generated-quiz/${id}`);
    return res.data;
  },
};

export default aiQuizService;
