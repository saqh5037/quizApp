import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import videoUploadService from '../services/video-upload.service';
import minioService from '../services/minio.service';
import ffmpegService from '../services/ffmpeg.service';
import { Video, VideoCategory, VideoProgress, VideoQuality, User } from '../models';
import { Op } from 'sequelize';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export class VideoController {
  // Initialize video upload
  async initializeUpload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { filename, fileSize, mimeType, metadata } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Initialize upload session
      const uploadId = await videoUploadService.initializeUpload(
        filename,
        fileSize,
        mimeType,
        userId
      );

      // Create video record in database with pending status
      const video = await Video.create({
        title: metadata.title,
        description: metadata.description,
        categoryId: metadata.categoryId,
        tags: metadata.tags,
        language: metadata.language || 'es',
        status: 'uploading',
        isPublic: metadata.isPublic || false,
        allowDownload: metadata.allowDownload || false,
        requiresAuth: !metadata.isPublic,
        creatorId: userId,
        fileSizeBytes: fileSize
      });

      const videoId = video.get('id') as number;
      // Video created successfully

      res.json({
        uploadId,
        videoId: videoId,
        chunkSize: videoUploadService.getChunkSize()
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload video chunk
  async uploadChunk(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { uploadId, chunkIndex } = req.body;
      const chunkFile = req.file;

      if (!chunkFile) {
        return res.status(400).json({ message: 'No chunk file provided' });
      }

      const result = await videoUploadService.uploadChunk(
        uploadId,
        parseInt(chunkIndex),
        chunkFile.buffer
      );

      res.json({ ...result, received: true });
    } catch (error) {
      next(error);
    }
  }

  // Complete video upload
  async completeUpload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { uploadId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Complete the upload
      const result = await videoUploadService.completeUpload(uploadId);

      // Update video record with file paths and metadata
      const video = await Video.findOne({
        where: {
          creatorId: userId,
          status: 'uploading'
        },
        order: [['created_at', 'DESC']]
      });

      if (!video) {
        return res.status(404).json({ message: 'Video record not found' });
      }

      // Update video with paths and metadata
      await video.update({
        originalPath: result.filePath,
        status: 'processing',
        durationSeconds: Math.round(result.metadata.duration),
        fileSizeBytes: result.metadata.fileSize
      });

      // Start async processing
      const videoId = video.get('id') as number;
      this.processVideoAsync(videoId, result.filePath);

      res.json({
        videoId: videoId,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  // Process video asynchronously
  private async processVideoAsync(videoId: number, videoPath: string) {
    try {
      const video = await Video.findByPk(videoId);
      if (!video) return;

      // Update processing progress
      await video.update({ processingProgress: 10 });

      // Generate thumbnail
      const thumbnailResult = await videoUploadService.processVideo(
        videoPath,
        videoId,
        {
          generateThumbnail: true,
          generateHLS: true,
          generateMultipleQualities: true,
          qualities: ['360p', '480p', '720p']
        }
      );

      await video.update({ 
        processingProgress: 50,
        thumbnailUrl: thumbnailResult.thumbnail
      });

      // Save quality information
      if (thumbnailResult.qualities) {
        for (const quality of thumbnailResult.qualities) {
          await VideoQuality.create({
            videoId: videoId,
            quality: quality.quality,
            filePath: quality.path,
            fileSizeBytes: quality.size
          });
        }
      }

      // Update HLS path
      await video.update({
        hlsPlaylistUrl: thumbnailResult.hlsPath,
        processingProgress: 90
      });

      // Generate slug
      const slug = this.generateSlug(video.get('title') as string);
      
      // Final update - mark as ready
      await video.update({
        slug,
        status: 'ready',
        processingProgress: 100,
        publishedAt: new Date()
      });

    } catch (error) {
      console.error('Error processing video:', error);
      
      // Update video with error status
      const video = await Video.findByPk(videoId);
      if (video) {
        await video.update({
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  // Get upload progress
  async getUploadProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { uploadId } = req.params;
      const progress = await videoUploadService.getUploadProgress(uploadId);
      res.json(progress);
    } catch (error) {
      next(error);
    }
  }

  // Resume upload
  async resumeUpload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { uploadId } = req.params;
      const resumeInfo = await videoUploadService.resumeUpload(uploadId);
      res.json(resumeInfo);
    } catch (error) {
      next(error);
    }
  }

  // Cancel upload
  async cancelUpload(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { uploadId } = req.params;
      await videoUploadService.cancelUpload(uploadId);
      res.json({ message: 'Upload cancelled successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Get all videos
  async getVideos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 12, 
        category, 
        search, 
        status = 'ready',
        sort = 'created_at',
        order = 'DESC' 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = { status };

      if (category) {
        const cat = await VideoCategory.findOne({ where: { slug: category } });
        if (cat) {
          where.categoryId = cat.id;
        }
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // If user is not authenticated, only show public videos
      if (!req.user) {
        where.isPublic = true;
      }

      // Map frontend field names to database column names
      const sortFieldMap: { [key: string]: string } = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'publishedAt': 'published_at'
      };
      const sortField = sortFieldMap[sort as string] || sort;

      const { count, rows: videos } = await Video.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [[sortField as string, order as string]],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'firstName', 'lastName']
          },
          {
            model: VideoCategory,
            as: 'category',
            attributes: ['id', 'name', 'slug', 'icon']
          }
        ]
      });

      // Transform thumbnail URLs to use correct host
      const requestHost = req.get('host');
      const transformedVideos = videos.map(video => {
        const videoData = video.toJSON();
        if (videoData.thumbnailUrl) {
          // If it's a relative path, convert to full URL
          if (videoData.thumbnailUrl.startsWith('videos/')) {
            videoData.thumbnailUrl = minioService.getPublicUrl(videoData.thumbnailUrl, requestHost);
          }
          // If it's already a full URL with localhost, replace the host
          else if (videoData.thumbnailUrl.includes('://localhost') || videoData.thumbnailUrl.includes('://127.0.0.1')) {
            // Extract the path from the URL (everything after the bucket name)
            const urlParts = videoData.thumbnailUrl.split('/aristotest-videos/');
            if (urlParts.length > 1) {
              videoData.thumbnailUrl = minioService.getPublicUrl(urlParts[1], requestHost);
            }
          }
        }
        return videoData;
      });

      res.json({
        videos: transformedVideos,
        totalPages: Math.ceil(count / Number(limit)),
        currentPage: Number(page),
        totalVideos: count
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single video
  async getVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const video = await Video.findOne({
        where: { 
          [Op.or]: [
            { id: isNaN(Number(id)) ? null : id },
            { slug: id }
          ]
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'firstName', 'lastName']
          },
          {
            model: VideoCategory,
            as: 'category'
          },
          {
            model: VideoQuality,
            as: 'qualities'
          }
        ]
      });

      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      // Check access permissions
      const isPublic = video.get('isPublic') as boolean;
      const creatorId = video.get('creatorId') as number;
      
      if (!isPublic && (!req.user || req.user.id !== creatorId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Increment view count
      await video.increment('viewCount');

      // Get user's progress if authenticated
      let progress = null;
      if (req.user) {
        progress = await VideoProgress.findOne({
          where: {
            userId: req.user.id,
            videoId: video.id
          }
        });
      }

      // Get streaming URL - Use public URL
      let streamUrl = null;
      const originalPath = video.get('originalPath') as string;
      // Get streaming URL from original path
      
      if (originalPath) {
        // Use public URL directly since we configured the bucket policy
        // Pass the request host to generate the correct URL for network access
        const requestHost = req.get('host');
        streamUrl = minioService.getPublicUrl(originalPath, requestHost);
        // Stream URL generated successfully
      }

      // Transform thumbnail URL if needed
      const videoData = video.toJSON();
      if (videoData.thumbnailUrl) {
        const requestHost = req.get('host');
        
        // If it's a relative path, convert to full URL
        if (videoData.thumbnailUrl.startsWith('videos/')) {
          videoData.thumbnailUrl = minioService.getPublicUrl(videoData.thumbnailUrl, requestHost);
        }
        // If it's already a full URL with localhost, replace the host
        else if (videoData.thumbnailUrl.includes('://localhost') || videoData.thumbnailUrl.includes('://127.0.0.1')) {
          // Extract the path from the URL (everything after the bucket name)
          const urlParts = videoData.thumbnailUrl.split('/aristotest-videos/');
          if (urlParts.length > 1) {
            videoData.thumbnailUrl = minioService.getPublicUrl(urlParts[1], requestHost);
          }
        }
      }

      res.json({
        ...videoData,
        progress,
        streamUrl
      });
    } catch (error) {
      next(error);
    }
  }

  // Update video
  async updateVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user?.id;

      const video = await Video.findByPk(id);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      // Get user with role
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const creatorId = video.get('creatorId') as number;
      const userRole = user.get('role') as string;
      
      // Video update - permission check completed
      
      // Check permissions: owner, admin, or teacher can edit
      const canEdit = creatorId === userId || 
                     userRole === 'admin' || 
                     userRole === 'super_admin' || 
                     userRole === 'teacher';
      
      if (!canEdit) {
        return res.status(403).json({ message: 'Access denied. Only the owner, administrators, or teachers can edit videos.' });
      }

      await video.update(updates);
      res.json(video);
    } catch (error) {
      next(error);
    }
  }

  // Delete video
  async deleteVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const video = await Video.findByPk(id);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      // Get user with role
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const creatorId = video.get('creatorId') as number;
      const userRole = user.get('role') as string;
      
      // Video deletion - permission check completed
      
      // Check permissions: owner, admin, or teacher can delete
      const canDelete = creatorId === userId || 
                       userRole === 'admin' || 
                       userRole === 'super_admin' || 
                       userRole === 'teacher';
      
      if (!canDelete) {
        return res.status(403).json({ message: 'Access denied. Only the owner, administrators, or teachers can delete videos.' });
      }

      // Delete files from MinIO
      if (video.originalPath) {
        await minioService.deleteFile(video.originalPath);
      }
      if (video.thumbnailUrl) {
        await minioService.deleteFile(video.thumbnailUrl);
      }
      if (video.hlsPlaylistUrl) {
        const hlsDir = video.hlsPlaylistUrl.substring(0, video.hlsPlaylistUrl.lastIndexOf('/'));
        const files = await minioService.listObjects(hlsDir);
        await minioService.deleteFiles(files.map(f => f.name || ''));
      }

      // Soft delete the video
      await video.destroy();
      
      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Update video progress
  async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { videoId } = req.params;
      const { currentTime, duration } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const video = await Video.findByPk(videoId);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      const completionPercentage = (currentTime / duration) * 100;
      const completed = completionPercentage >= 90; // Consider 90% as completed

      const [progress] = await VideoProgress.upsert({
        userId,
        videoId: Number(videoId),
        lastPositionSeconds: Math.round(currentTime),
        watchedSeconds: Math.round(currentTime),
        completionPercentage,
        completed,
        lastWatchedAt: new Date(),
        completedAt: completed ? new Date() : undefined
      });

      res.json(progress);
    } catch (error) {
      next(error);
    }
  }

  // Get video categories
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await VideoCategory.findAll({
        order: [['orderPosition', 'ASC']]
      });
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  // Helper function to generate slug
  private generateSlug(title: string | undefined): string {
    if (!title) {
      return `video-${Date.now()}`;
    }
    
    return title
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  // Public video access (no authentication required)
  async getPublicVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const studentInfo = req.headers['x-student-info'] as string;
      
      const video = await Video.findByPk(id, {
        where: {
          status: 'ready',
          isPublic: true
        },
        attributes: ['id', 'title', 'description', 'thumbnailUrl', 'durationSeconds', 'processedPath', 'hlsPlaylistUrl', 'originalPath', 'status'],
      });

      if (!video) {
        return res.status(404).json({ message: 'Video no encontrado o no disponible públicamente' });
      }

      // Log access if student info provided
      if (studentInfo) {
        try {
          const info = JSON.parse(studentInfo);
          console.log('Public video access:', { videoId: id, student: info });
        } catch (e) {
          console.error('Error parsing student info:', e);
        }
      }

      // Get stream URL
      const videoData = video.toJSON() as any;
      
      // Build complete streaming URL
      // Use the host from the request for proper URL construction
      const host = req.get('host')?.split(':')[0] || 'localhost';
      
      // For public access, prefer MP4 over HLS for better compatibility
      if (videoData.originalPath) {
        // Use original MP4 file served from backend
        videoData.streamUrl = `http://${host}:3001/${videoData.originalPath}`;
      } else if (videoData.processedPath) {
        // Direct file URL from MinIO
        videoData.streamUrl = `http://${host}:9000/aristotest-videos/${videoData.processedPath}`;
      } else if (videoData.hlsPlaylistUrl) {
        // HLS streaming URL from MinIO (requires HLS.js support)
        videoData.streamUrl = `http://${host}:9000/aristotest-videos/${videoData.hlsPlaylistUrl}`;
      }

      res.json(videoData);
    } catch (error) {
      next(error);
    }
  }

  // Get public interactive video
  async getPublicInteractiveVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const studentInfo = req.headers['x-student-info'] as string;
      
      const video = await Video.findByPk(id, {
        where: {
          status: 'ready',
          isPublic: true
        },
        attributes: ['id', 'title', 'description', 'thumbnailUrl', 'processedPath', 'hlsPlaylistUrl', 'originalPath', 'status'],
        include: [{
          model: require('../models/InteractiveVideoLayer.model').default,
          as: 'interactiveLayer',
          where: {
            isEnabled: true,
            processingStatus: 'ready'
          },
          required: true
        }]
      });

      if (!video) {
        return res.status(404).json({ message: 'Video interactivo no encontrado o no disponible públicamente' });
      }

      // Log access if student info provided  
      if (studentInfo) {
        try {
          const info = JSON.parse(studentInfo);
          console.log('Public interactive video access:', { videoId: id, student: info });
        } catch (e) {
          console.error('Error parsing student info:', e);
        }
      }

      // Get stream URL
      const videoData = video.toJSON() as any;
      
      // Build complete streaming URL
      // Use the host from the request for proper URL construction
      const host = req.get('host')?.split(':')[0] || 'localhost';
      
      // For public access, prefer MP4 over HLS for better compatibility
      if (videoData.originalPath) {
        // Use original MP4 file served from backend
        videoData.streamUrl = `http://${host}:3001/${videoData.originalPath}`;
      } else if (videoData.processedPath) {
        // Direct file URL from MinIO
        videoData.streamUrl = `http://${host}:9000/aristotest-videos/${videoData.processedPath}`;
      } else if (videoData.hlsPlaylistUrl) {
        // HLS streaming URL from MinIO (requires HLS.js support)
        videoData.streamUrl = `http://${host}:9000/aristotest-videos/${videoData.hlsPlaylistUrl}`;
      }

      res.json(videoData);
    } catch (error) {
      next(error);
    }
  }

  // Track public video completion
  async trackPublicCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const studentInfo = req.headers['x-student-info'] as string;
      
      if (!studentInfo) {
        return res.status(400).json({ message: 'Student information required' });
      }

      const info = JSON.parse(studentInfo);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      
      // Store in database
      const { sequelize } = require('../config/database');
      await sequelize.query(
        `INSERT INTO public_video_completions 
        (video_id, student_name, student_email, student_phone, completed, completed_at, ip_address, user_agent, created_at)
        VALUES (:videoId, :name, :email, :phone, true, NOW(), :ip, :agent, NOW())`,
        {
          replacements: {
            videoId: id,
            name: info.name,
            email: info.email,
            phone: info.phone || null,
            ip: ipAddress,
            agent: userAgent
          }
        }
      );
      
      console.log('Video completion tracked:', {
        videoId: id,
        student: info,
        completedAt: new Date()
      });
      
      res.json({ success: true, message: 'Completion tracked' });
    } catch (error) {
      next(error);
    }
  }

  // Save interactive video results
  async saveInteractiveResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { studentInfo, results, completedAt } = req.body;
      
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      
      // Store in database
      const { sequelize } = require('../config/database');
      const [result] = await sequelize.query(
        `INSERT INTO public_interactive_video_results 
        (video_id, student_name, student_email, student_phone, score, total_questions, 
         correct_answers, passed, passing_score, answers, completed_at, ip_address, 
         user_agent, created_at, updated_at)
        VALUES (:videoId, :name, :email, :phone, :score, :totalQuestions, 
                :correctAnswers, :passed, :passingScore, :answers, :completedAt, 
                :ip, :agent, NOW(), NOW())
        RETURNING id`,
        {
          replacements: {
            videoId: id,
            name: studentInfo.name,
            email: studentInfo.email,
            phone: studentInfo.phone || null,
            score: results.score || 0,
            totalQuestions: results.totalQuestions || 0,
            correctAnswers: results.correctAnswers || 0,
            passed: results.passed || false,
            passingScore: 70,
            answers: JSON.stringify(results.answers || []),
            completedAt: completedAt || new Date(),
            ip: ipAddress,
            agent: userAgent
          }
        }
      );
      
      console.log('Interactive video results saved:', {
        videoId: id,
        student: studentInfo,
        results,
        resultId: result[0].id
      });
      
      res.json({ 
        success: true, 
        message: 'Results saved successfully',
        resultId: result[0].id
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new VideoController();