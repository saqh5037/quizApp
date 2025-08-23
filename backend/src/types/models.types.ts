export interface PaginationOptions {
  page?: number;
  limit?: number;
  order?: string;
  sort?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface QuizFilters {
  userId?: number;
  category?: string;
  isPublic?: boolean;
  isActive?: boolean;
  search?: string;
}

export interface SessionFilters {
  hostId?: number;
  quizId?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface QuizStatistics {
  totalSessions: number;
  totalParticipants: number;
  averageScore: number;
  completionRate: number;
  averageTime: number;
}

export interface ParticipantStatistics {
  totalQuizzes: number;
  totalAnswers: number;
  correctAnswers: number;
  averageScore: number;
  averageResponseTime: number;
  bestCategory?: string;
}