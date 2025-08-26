import { apiConfig } from '../config/api.config';

export interface Video {
  id: number;
  uuid: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  durationSeconds?: number;
  duration?: number;
  fileSizeBytes?: number;
  fileSize?: number;
  mimeType?: string;
  status: string;
  processingProgress?: number;
  isPublic: boolean;
  allowDownload: boolean;
  viewCount: number;
  likeCount: number;
  tags?: string[];
  language?: string;
  createdAt: string;
  publishedAt?: string;
  streamUrl?: string;
  hlsPlaylistUrl?: string;
}

class VideoService {
  private baseURL = `${apiConfig.baseURL}/videos`;

  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getVideo(id: number): Promise<Video> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    return response.json();
  }

  async getVideos(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ videos: Video[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`${this.baseURL}?${queryParams.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.statusText}`);
    }

    return response.json();
  }

  async updateVideo(id: number, data: Partial<Video>): Promise<Video> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update video: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteVideo(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete video: ${response.statusText}`);
    }
  }

  async saveProgress(videoId: number, currentTime: number, duration: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/${videoId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        currentTime,
        duration,
      }),
    });

    if (!response.ok) {
      console.error('Failed to save video progress');
    }
  }
}

export const videoService = new VideoService();