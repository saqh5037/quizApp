import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE = `${API_URL}/api/v1/interactive-video`;

export interface InteractiveLayer {
  id: number;
  videoId: number;
  isEnabled: boolean;
  aiGeneratedContent: any;
  aiModelUsed?: string;
  confidenceScore?: number;
  autoPause: boolean;
  requireAnswers: boolean;
  passingScore: number;
  maxAttempts: number;
  processingStatus: 'pending' | 'processing' | 'ready' | 'error';
  processingLog?: string;
  createdBy?: number;
  tenantId?: number;
  createdAt: string;
  updatedAt: string;
  video?: any;
}

export interface InteractiveSession {
  id: number;
  interactiveLayerId: number;
  userId: number;
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  finalScore?: number | string | null;
  completionPercentage?: number | string | null;
  watchTimeSeconds?: number;
  totalPauses: number;
  detailedResponses: any[];
  keyMomentsCompleted: number[];
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  certificateEarned: boolean;
  certificateId?: number;
}

interface AnswerSubmission {
  momentId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  responseTimeSeconds: number;
}

interface VideoAnalytics {
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  averageWatchTime: number;
  passRate: number;
  questionAnalytics: Record<string, any>;
}

class InteractiveVideoService {
  private getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async createInteractiveLayer(videoId: number, config?: any): Promise<InteractiveLayer> {
    const response = await axios.post(
      `${API_BASE}/videos/${videoId}/interactive-layer`,
      config || {},
      { headers: this.getAuthHeader() }
    );
    return response.data.data;
  }

  async updateInteractiveLayer(layerId: number, updates: any): Promise<InteractiveLayer> {
    const response = await axios.put(
      `${API_BASE}/interactive-layers/${layerId}`,
      updates,
      { headers: this.getAuthHeader() }
    );
    return response.data.data;
  }

  async getInteractiveLayer(videoId: number): Promise<InteractiveLayer> {
    const response = await axios.get(
      `${API_BASE}/videos/${videoId}/interactive-layer`,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async processVideoWithAI(layerId: number, forceReprocess = false): Promise<any> {
    const response = await axios.post(
      `${API_BASE}/interactive-layers/${layerId}/process`,
      { forceReprocess },
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async startInteractiveSession(layerId: number): Promise<InteractiveSession> {
    const response = await axios.post(
      `${API_BASE}/interactive-layers/${layerId}/start-session`,
      {},
      { headers: this.getAuthHeader() }
    );
    return response.data.result;
  }

  async submitAnswer(sessionId: string, answer: AnswerSubmission): Promise<any> {
    const response = await axios.post(
      `${API_BASE}/interactive-sessions/${sessionId}/answer`,
      answer,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async completeSession(sessionId: string, stats: { watchTimeSeconds: number; totalPauses: number }): Promise<any> {
    const response = await axios.post(
      `${API_BASE}/interactive-sessions/${sessionId}/complete`,
      stats,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async getSessionResults(sessionId: string): Promise<InteractiveSession> {
    const response = await axios.get(
      `${API_BASE}/interactive-sessions/${sessionId}/results`,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async getUserVideoHistory(userId?: number): Promise<any> {
    const url = userId 
      ? `${API_BASE}/users/${userId}/interactive-video-history`
      : `${API_BASE}/my-interactive-video-history`;
    const response = await axios.get(url, { headers: this.getAuthHeader() });
    return response.data;
  }

  async getVideoAnalytics(layerId: number): Promise<VideoAnalytics> {
    const response = await axios.get(
      `${API_BASE}/interactive-layers/${layerId}/analytics`,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async deleteInteractiveLayer(layerId: number): Promise<void> {
    await axios.delete(
      `${API_BASE}/interactive-layers/${layerId}`,
      { headers: this.getAuthHeader() }
    );
  }

  pollProcessingStatus(layerId: number, onUpdate: (status: string) => void, interval = 5000): any {
    const timer = setInterval(async () => {
      try {
        // Por ahora simulamos el polling con datos mockeados
        setTimeout(() => {
          onUpdate('ready');
          clearInterval(timer);
        }, 3000);
      } catch (error) {
        console.error('Error polling status:', error);
        clearInterval(timer);
      }
    }, interval);
    
    return timer;
  }
}

export const interactiveVideoService = new InteractiveVideoService();
export type { InteractiveLayer, InteractiveSession, AnswerSubmission, VideoAnalytics };