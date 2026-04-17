import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { apiConfig } from '../config/api.config';

// Remove static SOCKET_URL, use apiConfig.socketURL dynamically

interface Session {
  id: number;
  sessionCode: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  currentQuestionIndex: number;
  showLeaderboard: boolean;
  quiz?: any;
  participants?: Participant[];
  qrCode?: string;
}

interface Participant {
  id: number;
  nickname: string;
  score: number;
  answeredQuestions: number;
  correctAnswers: number;
  status: string;
}

interface CurrentQuestion {
  id: number;
  type: string;
  question: string;
  options?: string[];
  timeLimit?: number;
  points: number;
  imageUrl?: string;
  index: number;
  total: number;
  startTime?: Date;
}

interface LeaderboardEntry {
  participantId: number;
  nickname: string;
  score: number;
  answeredQuestions: number;
  correctAnswers: number;
  rank: number;
}

interface SessionState {
  socket: Socket | null;
  session: Session | null;
  currentQuestion: CurrentQuestion | null;
  participant: Participant | null;
  leaderboard: LeaderboardEntry[];
  isHost: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  connectSocket: (token?: string) => void;
  disconnectSocket: () => void;
  
  createSession: (quizId: number, settings?: any) => void;
  joinSession: (sessionCode: string, nickname: string) => void;
  leaveSession: () => void;
  
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  
  nextQuestion: () => void;
  previousQuestion: () => void;
  submitAnswer: (answer: any, responseTime: number) => void;
  skipQuestion: () => void;
  
  showResults: () => void;
  hideResults: () => void;
  
  updateSession: (updates: Partial<Session>) => void;
  updateQuestion: (question: CurrentQuestion) => void;
  updateLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  
  resetStore: () => void;
}


export const useSessionStore = create<SessionState>((set, get) => ({
  socket: null,
  session: null,
  currentQuestion: null,
  participant: null,
  leaderboard: [],
  isHost: false,
  isConnected: false,
  isLoading: false,
  error: null,

  connectSocket: (token?: string) => {
    // Singleton: reuse the existing socket if one is already alive instead of
    // spinning up a second connection. This prevents the leak that happened
    // when HotReload or remounts called connectSocket multiple times.
    const existing = get().socket;
    if (existing && existing.connected) {
      return;
    }
    if (existing) {
      existing.disconnect();
    }

    const socket = io(apiConfig.socketURL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // Session events
    socket.on('session_updated', (data) => {
      set((state) => ({
        session: { ...state.session, ...data },
      }));
    });

    socket.on('participant_joined', (data) => {
      toast.success(`${data.participant.nickname} joined the session`);
      // Update participants list if needed
    });

    socket.on('participant_left', (data) => {
      toast(`${data.nickname} left the session`, { icon: 'ℹ️' });
    });

    // Quiz events
    socket.on('question_changed', (data) => {
      set({
        currentQuestion: {
          ...data.question,
          startTime: data.startTime,
        },
      });
    });

    socket.on('answer_submitted', (data) => {
      if (data.isCorrect) {
        toast.success(`Correct! +${data.points} points`);
      } else {
        toast.error('Incorrect answer');
      }
      
      set((state) => ({
        participant: state.participant ? {
          ...state.participant,
          score: data.totalScore,
        } : null,
      }));
    });

    socket.on('leaderboard_update', (data) => {
      set({ leaderboard: data.leaderboard });
    });

    socket.on('show_results', () => {
      // show_results ack is handled by individual components via their own
      // socket.on listeners; nothing to do at the store level.
    });

    socket.on('final_results', (data) => {
      set((state) => ({
        session: state.session ? {
          ...state.session,
          status: 'completed',
        } : null,
      }));
    });

    // Error events
    socket.on('error', (error) => {
      toast.error(error.message || 'An error occurred');
      set({ error: error.message });
    });

    socket.on('session_error', (error) => {
      toast.error(error.message || 'Session error occurred');
      set({ error: error.message });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  createSession: (quizId: number, settings?: any) => {
    const { socket } = get();
    if (!socket) return;
    
    set({ isLoading: true, isHost: true });
    socket.emit('create_session', { quizId, settings });
  },

  joinSession: (sessionCode: string, nickname: string) => {
    let { socket } = get();
    if (!socket) {
      get().connectSocket();
      socket = get().socket;
    }

    set({ isLoading: true, isHost: false });

    const emit = () => {
      const current = get().socket;
      if (!current) return;
      current.emit('join_session', { sessionCode, nickname });
    };

    // If the socket is already connected, emit immediately; otherwise defer
    // until the 'connect' event so we don't drop the join.
    if (socket && socket.connected) {
      emit();
    } else if (socket) {
      socket.once('connect', emit);
    }
  },

  leaveSession: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('leave_session');
    set({
      session: null,
      currentQuestion: null,
      participant: null,
      leaderboard: [],
      isHost: false,
    });
  },

  startSession: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('start_session');
  },

  pauseSession: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('pause_session');
  },

  resumeSession: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('resume_session');
  },

  endSession: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('end_session');
  },

  nextQuestion: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('next_question');
  },

  previousQuestion: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('previous_question');
  },

  submitAnswer: (answer: any, responseTime: number) => {
    const { socket, currentQuestion } = get();
    if (!socket || !currentQuestion) return;
    
    socket.emit('submit_answer', {
      questionId: currentQuestion.id,
      answer,
      responseTime,
    });
  },

  skipQuestion: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('skip_question');
  },

  showResults: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('show_results');
  },

  hideResults: () => {
    const { socket } = get();
    if (!socket) return;
    
    socket.emit('hide_results');
  },

  updateSession: (updates: Partial<Session>) => {
    set((state) => ({
      session: state.session ? { ...state.session, ...updates } : null,
    }));
  },

  updateQuestion: (question: CurrentQuestion) => {
    set({ currentQuestion: question });
  },

  updateLeaderboard: (leaderboard: LeaderboardEntry[]) => {
    set({ leaderboard });
  },

  resetStore: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    
    set({
      socket: null,
      session: null,
      currentQuestion: null,
      participant: null,
      leaderboard: [],
      isHost: false,
      isConnected: false,
      isLoading: false,
      error: null,
    });
  },
}));