import axios, { AxiosProgressEvent } from 'axios';
import { apiConfig } from '../config/api.config';

interface UploadInitResponse {
  uploadId: string;
  chunkSize: number;
}

interface ChunkUploadResponse {
  uploaded: number;
  total: number;
  complete: boolean;
}

interface CompleteUploadResponse {
  videoId: number;
  filePath: string;
  minioPath: string;
  metadata: any;
}

interface VideoMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  allowDownload: boolean;
  linkedQuizId?: number;
}

class VideoUploadService {
  private baseURL: string;
  private chunkSize: number = 5 * 1024 * 1024; // 5MB default
  private maxRetries: number = 3;
  private uploadSessions: Map<string, any> = new Map();

  constructor() {
    this.baseURL = apiConfig.baseURL;
  }

  async initializeUpload(
    file: File,
    metadata: VideoMetadata,
    token: string
  ): Promise<UploadInitResponse> {
    const response = await axios.post(
      `${this.baseURL}/videos/upload/init`,
      {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        metadata
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const { uploadId, chunkSize } = response.data;
    
    // Store session info
    this.uploadSessions.set(uploadId, {
      file,
      metadata,
      totalChunks: Math.ceil(file.size / (chunkSize || this.chunkSize)),
      uploadedChunks: new Set<number>(),
      startTime: Date.now()
    });

    return response.data;
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    token: string,
    onProgress?: (progress: number) => void
  ): Promise<ChunkUploadResponse> {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('chunk', chunk);

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const response = await axios.post(
          `${this.baseURL}/videos/upload/chunk`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
              if (onProgress && progressEvent.total) {
                const percentComplete = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percentComplete);
              }
            }
          }
        );

        // Update session
        const session = this.uploadSessions.get(uploadId);
        if (session) {
          session.uploadedChunks.add(chunkIndex);
        }

        return response.data;
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }

    throw new Error('Max retries exceeded for chunk upload');
  }

  async uploadFile(
    file: File,
    metadata: VideoMetadata,
    token: string,
    onProgress?: (progress: number) => void
  ): Promise<CompleteUploadResponse> {
    // Initialize upload
    const { uploadId, chunkSize: serverChunkSize } = await this.initializeUpload(
      file,
      metadata,
      token
    );

    const chunkSize = serverChunkSize || this.chunkSize;
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      await this.uploadChunk(
        uploadId,
        i,
        chunk,
        token,
        (chunkProgress) => {
          if (onProgress) {
            // Calculate overall progress
            const overallProgress = ((i + chunkProgress / 100) / totalChunks) * 100;
            onProgress(Math.round(overallProgress));
          }
        }
      );
    }

    // Complete upload
    return await this.completeUpload(uploadId, token);
  }

  async completeUpload(
    uploadId: string,
    token: string
  ): Promise<CompleteUploadResponse> {
    const response = await axios.post(
      `${this.baseURL}/videos/upload/complete`,
      { uploadId },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Clean up session
    this.uploadSessions.delete(uploadId);

    return response.data;
  }

  async cancelUpload(uploadId: string, token: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseURL}/videos/upload/${uploadId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
    } catch (error) {
      console.error('Error canceling upload:', error);
    } finally {
      this.uploadSessions.delete(uploadId);
    }
  }

  async resumeUpload(
    uploadId: string,
    token: string
  ): Promise<{
    uploadedChunks: number[];
    totalChunks: number;
    chunkSize: number;
  }> {
    const response = await axios.get(
      `${this.baseURL}/videos/upload/${uploadId}/resume`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  }

  async getUploadProgress(
    uploadId: string,
    token: string
  ): Promise<{
    uploaded: number;
    total: number;
    percentage: number;
    complete: boolean;
  }> {
    const response = await axios.get(
      `${this.baseURL}/videos/upload/${uploadId}/progress`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  }

  // Helper method to calculate optimal chunk size based on file size
  getOptimalChunkSize(fileSize: number): number {
    if (fileSize < 10 * 1024 * 1024) { // < 10MB
      return 1 * 1024 * 1024; // 1MB chunks
    } else if (fileSize < 100 * 1024 * 1024) { // < 100MB
      return 5 * 1024 * 1024; // 5MB chunks
    } else if (fileSize < 500 * 1024 * 1024) { // < 500MB
      return 10 * 1024 * 1024; // 10MB chunks
    } else {
      return 25 * 1024 * 1024; // 25MB chunks for large files
    }
  }

  // Get upload session info
  getSessionInfo(uploadId: string): any {
    return this.uploadSessions.get(uploadId);
  }

  // Clear all upload sessions
  clearAllSessions(): void {
    this.uploadSessions.clear();
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Estimate upload time
  estimateUploadTime(fileSize: number, uploadedBytes: number, elapsedTime: number): string {
    if (uploadedBytes === 0) return 'Calculando...';
    
    const bytesPerSecond = uploadedBytes / (elapsedTime / 1000);
    const remainingBytes = fileSize - uploadedBytes;
    const remainingSeconds = remainingBytes / bytesPerSecond;
    
    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)} segundos`;
    } else if (remainingSeconds < 3600) {
      return `${Math.round(remainingSeconds / 60)} minutos`;
    } else {
      return `${Math.round(remainingSeconds / 3600)} horas`;
    }
  }
}

export default new VideoUploadService();