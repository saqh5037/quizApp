import axios from 'axios';
import { apiConfig } from '../config/api.config';

// Use dynamic API URL that detects the current hostname
const getApiBase = () => `${apiConfig.apiURL}/api/v1/interactive-video`;

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
      `${getApiBase()}/videos/${videoId}/interactive-layer`,
      config || {},
      { headers: this.getAuthHeader() }
    );
    return response.data.data;
  }

  async updateInteractiveLayer(layerId: number, updates: any): Promise<InteractiveLayer> {
    const response = await axios.put(
      `${getApiBase()}/interactive-layers/${layerId}`,
      updates,
      { headers: this.getAuthHeader() }
    );
    return response.data.data;
  }

  async getInteractiveLayer(videoId: number): Promise<InteractiveLayer> {
    const response = await axios.get(
      `${getApiBase()}/videos/${videoId}/interactive-layer`,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async processVideoWithAI(layerId: number, forceReprocess = false): Promise<any> {
    const response = await axios.post(
      `${getApiBase()}/interactive-layers/${layerId}/process`,
      { forceReprocess },
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async startInteractiveSession(layerId: number): Promise<InteractiveSession> {
    const response = await axios.post(
      `${getApiBase()}/interactive-layers/${layerId}/start-session`,
      {},
      { headers: this.getAuthHeader() }
    );
    return response.data.result;
  }

  async submitAnswer(sessionId: string, answer: AnswerSubmission): Promise<any> {
    const response = await axios.post(
      `${getApiBase()}/interactive-sessions/${sessionId}/answer`,
      answer,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async completeSession(sessionId: string, stats: { watchTimeSeconds: number; totalPauses: number }): Promise<any> {
    const response = await axios.post(
      `${getApiBase()}/interactive-sessions/${sessionId}/complete`,
      stats,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async getSessionResults(sessionId: string): Promise<InteractiveSession> {
    const response = await axios.get(
      `${getApiBase()}/interactive-sessions/${sessionId}/results`,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async getUserVideoHistory(userId?: number): Promise<any> {
    const url = userId 
      ? `${getApiBase()}/users/${userId}/interactive-video-history`
      : `${getApiBase()}/my-interactive-video-history`;
    const response = await axios.get(url, { headers: this.getAuthHeader() });
    return response.data;
  }

  async getVideoAnalytics(layerId: number): Promise<VideoAnalytics> {
    const response = await axios.get(
      `${getApiBase()}/interactive-layers/${layerId}/analytics`,
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async deleteInteractiveLayer(layerId: number): Promise<void> {
    await axios.delete(
      `${getApiBase()}/interactive-layers/${layerId}`,
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

  // ============= MÉTODOS PÚBLICOS (Sin autenticación) =============
  
  async getPublicInteractiveLayer(videoId: number): Promise<InteractiveLayer> {
    const response = await axios.get(
      `${getApiBase()}/public/videos/${videoId}/interactive-layer`
    );
    return response.data;
  }

  async startPublicSession(layerId: number, studentInfo: any): Promise<any> {
    const response = await axios.post(
      `${getApiBase()}/public/interactive-layers/${layerId}/start-session`,
      studentInfo
    );
    return response.data;
  }

  async submitPublicAnswer(sessionId: string, answer: AnswerSubmission): Promise<any> {
    const response = await axios.post(
      `${getApiBase()}/public/interactive-sessions/${sessionId}/answer`,
      answer
    );
    return response.data;
  }

  async completePublicSession(sessionId: string, stats: any): Promise<any> {
    const response = await axios.post(
      `${getApiBase()}/public/interactive-sessions/${sessionId}/complete`,
      stats
    );
    return response.data;
  }

  async getPublicSessionResults(sessionId: string): Promise<any> {
    const response = await axios.get(
      `${getApiBase()}/public/interactive-sessions/${sessionId}/results`
    );
    return response.data;
  }
}

export const interactiveVideoService = new InteractiveVideoService();
export type { InteractiveLayer, InteractiveSession, AnswerSubmission, VideoAnalytics };