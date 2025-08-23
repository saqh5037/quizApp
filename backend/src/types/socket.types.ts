export interface SocketUser {
  id: number;
  email: string;
  role: string;
  nickname?: string;
}

export interface SocketData {
  user?: SocketUser;
  sessionId?: number;
  participantId?: number;
  sessionCode?: string;
}

export interface JoinSessionData {
  sessionCode: string;
  nickname: string;
  userId?: number;
}

export interface SubmitAnswerData {
  questionId: number;
  answer: any;
  responseTime: number;
}

export interface SessionUpdateData {
  status?: string;
  currentQuestionIndex?: number;
  showLeaderboard?: boolean;
}

export interface LeaderboardEntry {
  participantId: number;
  nickname: string;
  score: number;
  answeredQuestions: number;
  correctAnswers: number;
  rank: number;
}