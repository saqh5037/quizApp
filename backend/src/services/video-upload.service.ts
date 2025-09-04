import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import minioService from './minio.service';
import ffmpegService from './ffmpeg.service';
import { sanitizeFilenameWithExtension } from '../utils/filename.utils';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);

interface ChunkInfo {
  index: number;
  totalChunks: number;
  filename: string;
  uploadId: string;
}

interface UploadSession {
  id: string;
  filename: string;
  totalChunks: number;
  uploadedChunks: Set<number>;
  tempDir: string;
  startTime: Date;
  lastActivity: Date;
  fileSize: number;
  mimeType: string;
  userId: number;
}

class VideoUploadService {
  private uploadSessions: Map<string, UploadSession> = new Map();
  private tempDir: string;
  private uploadDir: string;
  private processedDir: string;
  private chunkSize: number;
  private maxFileSize: number;
  private allowedFormats: string[];

  constructor() {
    this.tempDir = process.env.VIDEO_TEMP_DIR || './storage/temp';
    this.uploadDir = process.env.VIDEO_UPLOAD_DIR || './storage/uploads';
    this.processedDir = process.env.VIDEO_PROCESSED_DIR || './storage/processed';
    this.chunkSize = parseInt(process.env.VIDEO_CHUNK_SIZE || '5242880'); // 5MB
    this.maxFileSize = parseInt(process.env.VIDEO_MAX_SIZE || '2147483648'); // 2GB
    this.allowedFormats = (process.env.VIDEO_ALLOWED_FORMATS || 'mp4,mov,avi,mkv,webm').split(',');

    this.initializeDirectories();
    this.startCleanupTimer();
  }

  private async initializeDirectories(): Promise<void> {
    const dirs = [this.tempDir, this.uploadDir, this.processedDir];
    for (const dir of dirs) {
      await mkdir(dir, { recursive: true });
    }
  }

  private startCleanupTimer(): void {
    // Clean up abandoned upload sessions every hour
    setInterval(() => {
      this.cleanupAbandonedSessions();
    }, 3600000); // 1 hour
  }

  private async cleanupAbandonedSessions(): Promise<void> {
    const now = new Date();
    const timeout = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.uploadSessions) {
      if (now.getTime() - session.lastActivity.getTime() > timeout) {
        await this.cancelUpload(sessionId);
      }
    }
  }

  async initializeUpload(
    filename: string,
    fileSize: number,
    mimeType: string,
    userId: number
  ): Promise<string> {
    // Validate file
    const ext = path.extname(filename).toLowerCase().slice(1);
    if (!this.allowedFormats.includes(ext)) {
      throw new Error(`File format ${ext} not allowed`);
    }

    if (fileSize > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    // Create upload session
    const uploadId = crypto.randomBytes(16).toString('hex');
    const tempDir = path.join(this.tempDir, uploadId);
    await mkdir(tempDir, { recursive: true });

    const totalChunks = Math.ceil(fileSize / this.chunkSize);
    
    const session: UploadSession = {
      id: uploadId,
      filename,
      totalChunks,
      uploadedChunks: new Set(),
      tempDir,
      startTime: new Date(),
      lastActivity: new Date(),
      fileSize,
      mimeType,
      userId
    };

    this.uploadSessions.set(uploadId, session);

    return uploadId;
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: Buffer
  ): Promise<{ 
    uploaded: number; 
    total: number; 
    complete: boolean 
  }> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new Error('Invalid chunk index');
    }

    // Save chunk to temp file
    const chunkPath = path.join(session.tempDir, `chunk_${chunkIndex}`);
    await writeFile(chunkPath, chunkData);

    // Update session
    session.uploadedChunks.add(chunkIndex);
    session.lastActivity = new Date();

    const complete = session.uploadedChunks.size === session.totalChunks;

    return {
      uploaded: session.uploadedChunks.size,
      total: session.totalChunks,
      complete
    };
  }

  async completeUpload(uploadId: string): Promise<{
    filePath: string;
    minioPath: string;
    metadata: any;
  }> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    if (session.uploadedChunks.size !== session.totalChunks) {
      throw new Error('Not all chunks have been uploaded');
    }

    // Combine chunks with sanitized filename
    const sanitizedFilename = sanitizeFilenameWithExtension(session.filename);
    const finalFilename = `${Date.now()}_${sanitizedFilename}`;
    const finalPath = path.join(this.uploadDir, finalFilename);
    
    const writeStream = fs.createWriteStream(finalPath);
    
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(session.tempDir, `chunk_${i}`);
      const chunkData = await fs.promises.readFile(chunkPath);
      writeStream.write(chunkData);
      await unlink(chunkPath); // Clean up chunk file
    }
    
    await new Promise((resolve, reject) => {
      writeStream.end(resolve);
      writeStream.on('error', reject);
    });

    // Clean up temp directory
    await fs.promises.rmdir(session.tempDir);

    // Get video metadata
    const metadata = await ffmpegService.getMetadata(finalPath);

    // Upload to MinIO with sanitized filename for headers
    const minioObjectName = `videos/original/${finalFilename}`;
    const sanitizedOriginalFilename = sanitizeFilenameWithExtension(session.filename);
    await minioService.uploadFile(finalPath, minioObjectName, {
      'content-type': session.mimeType,
      'user-id': session.userId.toString(),
      'original-filename': sanitizedOriginalFilename
    });

    // Clean up upload session
    this.uploadSessions.delete(uploadId);

    return {
      filePath: finalPath,
      minioPath: minioObjectName,
      metadata
    };
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      return;
    }

    // Clean up temp files
    try {
      const files = await readdir(session.tempDir);
      for (const file of files) {
        await unlink(path.join(session.tempDir, file));
      }
      await fs.promises.rmdir(session.tempDir);
    } catch (error) {
      console.error('Error cleaning up upload session:', error);
    }

    this.uploadSessions.delete(uploadId);
  }

  async getUploadProgress(uploadId: string): Promise<{
    uploaded: number;
    total: number;
    percentage: number;
    complete: boolean;
  }> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    const uploaded = session.uploadedChunks.size;
    const total = session.totalChunks;
    const percentage = Math.round((uploaded / total) * 100);
    const complete = uploaded === total;

    return {
      uploaded,
      total,
      percentage,
      complete
    };
  }

  async resumeUpload(uploadId: string): Promise<{
    uploadedChunks: number[];
    totalChunks: number;
    chunkSize: number;
  }> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    return {
      uploadedChunks: Array.from(session.uploadedChunks),
      totalChunks: session.totalChunks,
      chunkSize: this.chunkSize
    };
  }

  async processVideo(
    videoPath: string,
    videoId: number,
    options: {
      generateThumbnail?: boolean;
      generateHLS?: boolean;
      generateMultipleQualities?: boolean;
      qualities?: string[];
      onProgress?: (percent: number) => void;
    } = {}
  ): Promise<{
    thumbnail?: string;
    hlsPath?: string;
    qualities?: Array<{ quality: string; path: string; size: number }>;
  }> {
    const result: any = {};
    const videoDir = path.join(this.processedDir, videoId.toString());
    await mkdir(videoDir, { recursive: true });

    // Generate thumbnail
    if (options.generateThumbnail !== false) {
      const thumbnailPath = path.join(videoDir, 'thumbnail.jpg');
      await ffmpegService.generateThumbnail(videoPath, thumbnailPath);
      
      // Upload thumbnail to MinIO
      const minioThumbPath = `videos/thumbnails/${videoId}/thumbnail.jpg`;
      await minioService.uploadFile(thumbnailPath, minioThumbPath);
      result.thumbnail = minioService.getPublicUrl(minioThumbPath);
    }

    // Generate HLS
    if (options.generateHLS) {
      const hlsDir = path.join(videoDir, 'hls');
      
      if (options.generateMultipleQualities) {
        const qualities = options.qualities || ['360p', '480p', '720p'];
        const masterPlaylist = await ffmpegService.generateMultiQualityHLS(
          videoPath,
          hlsDir,
          qualities,
          options.onProgress
        );
        
        // Upload HLS files to MinIO
        const files = await this.uploadDirectory(hlsDir, `videos/hls/${videoId}`);
        
        // Fix playlist URLs to use absolute paths
        await this.fixPlaylistUrls(videoId);
        
        // Return full MinIO URL
        result.hlsPath = minioService.getPublicUrl(`videos/hls/${videoId}/master.m3u8`);
        result.qualities = [];
        
        for (const quality of qualities) {
          const qualityDir = path.join(hlsDir, quality);
          const stats = await stat(qualityDir);
          result.qualities.push({
            quality,
            path: `videos/hls/${videoId}/${quality}/playlist.m3u8`,
            size: stats.size
          });
        }
      } else {
        const playlistPath = await ffmpegService.convertToHLS(
          videoPath,
          hlsDir,
          options.qualities?.[0] || '720p'
        );
        
        // Upload HLS files to MinIO
        await this.uploadDirectory(hlsDir, `videos/hls/${videoId}`);
        result.hlsPath = `videos/hls/${videoId}/playlist.m3u8`;
      }
    }

    return result;
  }

  private async uploadDirectory(
    localDir: string,
    minioPrefix: string
  ): Promise<string[]> {
    const uploadedFiles: string[] = [];
    
    const walkDir = async (dir: string, prefix: string): Promise<void> => {
      const files = await readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await stat(filePath);
        
        if (stats.isDirectory()) {
          await walkDir(filePath, path.join(prefix, file));
        } else {
          const minioPath = path.join(prefix, file).replace(/\\/g, '/');
          await minioService.uploadFile(filePath, minioPath);
          uploadedFiles.push(minioPath);
        }
      }
    };
    
    await walkDir(localDir, minioPrefix);
    return uploadedFiles;
  }

  private async fixPlaylistUrls(videoId: number): Promise<void> {
    const baseUrl = minioService.getPublicUrl('');
    
    // Fix master playlist
    const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
${baseUrl}videos/hls/${videoId}/360p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
${baseUrl}videos/hls/${videoId}/480p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
${baseUrl}videos/hls/${videoId}/720p/playlist.m3u8
`;
    
    await minioService.uploadContent(
      `videos/hls/${videoId}/master.m3u8`,
      masterContent,
      'application/vnd.apple.mpegurl'
    );
    
    // Fix quality playlists
    const qualities = ['360p', '480p', '720p'];
    for (const quality of qualities) {
      try {
        const playlistPath = `videos/hls/${videoId}/${quality}/playlist.m3u8`;
        const playlistContent = await minioService.getFileContent(playlistPath);
        
        // Replace relative paths with absolute URLs
        const updatedContent = playlistContent.split('\n').map((line: string) => {
          if (line.endsWith('.ts')) {
            return `${baseUrl}videos/hls/${videoId}/${quality}/${line}`;
          }
          return line;
        }).join('\n');
        
        await minioService.uploadContent(
          playlistPath,
          updatedContent,
          'application/vnd.apple.mpegurl'
        );
      } catch (error) {
        console.error(`Error fixing ${quality} playlist:`, error);
      }
    }
  }

  getChunkSize(): number {
    return this.chunkSize;
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  getAllowedFormats(): string[] {
    return this.allowedFormats;
  }
}

export default new VideoUploadService();