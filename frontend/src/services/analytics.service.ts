/**
 * analytics.service.ts — frontend API client for /api/v1/analytics.
 */

import api from './api';

export interface QuizAnalyticsReport {
  quiz: {
    id: number;
    title: string;
    category: string | null;
    difficulty: string | null;
    totalQuestions: number;
    passPercentage: number | null;
  };
  overview: {
    totalAttempts: number;
    uniqueParticipants: number;
    averageScore: number;
    medianScore: number;
    passRate: number;
    averageTimeSeconds: number;
    completionRate: number;
  };
  questionBreakdown: Array<{
    questionId: number;
    orderPosition: number;
    questionText: string;
    questionType: string;
    totalAnswers: number;
    correctPercentage: number;
    averageTimeSeconds: number;
  }>;
  timeline: Array<{
    date: string;
    attempts: number;
    averageScore: number;
  }>;
  topParticipants: Array<{
    name: string;
    email: string | null;
    score: number;
    timeSeconds: number;
    completedAt: string;
  }>;
  strugglingStudents: Array<{
    name: string;
    email: string | null;
    attempts: number;
    averageScore: number;
    lastAttemptAt: string;
  }>;
}

export const analyticsService = {
  async getQuizAnalytics(quizId: number): Promise<QuizAnalyticsReport> {
    const res = await api.get<QuizAnalyticsReport>(`/analytics/quiz/${quizId}`);
    return res.data;
  },
};

export default analyticsService;
