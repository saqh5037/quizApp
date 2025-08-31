import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { 
  Video,
  InteractiveVideoLayer,
  InteractiveVideoResult,
  InteractiveVideoAnswer,
  User
} from '../models';
import { v4 as uuidv4 } from 'uuid';
import { videoAIAnalyzerService } from '../services/video-ai-analyzer.service';
import { videoTranscriptionService } from '../services/video-transcription.service';
import path from 'path';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    tenantId?: number;
  };
}

export class InteractiveVideoController {
  async createInteractiveLayer(req: AuthRequest, res: Response) {
    try {
      const { videoId } = req.params;
      const { 
        isEnabled = false,
        autoPause = true,
        requireAnswers = true,
        passingScore = 70,
        maxAttempts = 3
      } = req.body;

      const video = await Video.findByPk(videoId);
      if (!video) {
        return res.status(404).json({ error: 'Video no encontrado' });
      }

      const existingLayer = await InteractiveVideoLayer.findOne({
        where: { videoId: parseInt(videoId) }
      });

      if (existingLayer) {
        return res.status(400).json({ 
          error: 'Este video ya tiene una capa interactiva. Use el endpoint de actualización.' 
        });
      }

      const interactiveLayer = await InteractiveVideoLayer.create({
        videoId: parseInt(videoId),
        isEnabled,
        autoPause,
        requireAnswers,
        passingScore,
        maxAttempts,
        processingStatus: 'pending',
        createdBy: req.user?.id,
        tenantId: req.user?.tenantId,
        aiGeneratedContent: {}
      });

      res.status(201).json({
        message: 'Capa interactiva creada. Procesamiento iniciado.',
        data: interactiveLayer
      });

    } catch (error) {
      console.error('Error creating interactive layer:', error);
      res.status(500).json({ error: 'Error al crear capa interactiva' });
    }
  }

  async updateInteractiveLayer(req: AuthRequest, res: Response) {
    try {
      const { layerId } = req.params;
      const updates = req.body;

      const layer = await InteractiveVideoLayer.findByPk(layerId);
      if (!layer) {
        return res.status(404).json({ error: 'Capa interactiva no encontrada' });
      }

      await layer.update(updates);

      res.json({
        message: 'Capa interactiva actualizada',
        data: layer
      });

    } catch (error) {
      console.error('Error updating interactive layer:', error);
      res.status(500).json({ error: 'Error al actualizar capa interactiva' });
    }
  }

  async getInteractiveLayer(req: AuthRequest, res: Response) {
    try {
      const { videoId } = req.params;

      const layer = await InteractiveVideoLayer.findOne({
        where: { videoId: parseInt(videoId) }
      });

      if (!layer) {
        return res.status(404).json({ error: 'No se encontró capa interactiva para este video' });
      }

      res.json(layer);

    } catch (error) {
      console.error('Error getting interactive layer:', error);
      res.status(500).json({ error: 'Error al obtener capa interactiva' });
    }
  }

  async processVideoWithAI(req: AuthRequest, res: Response) {
    try {
      const { layerId } = req.params;
      const { forceReprocess = false } = req.body;

      const layer = await InteractiveVideoLayer.findByPk(layerId);

      if (!layer) {
        return res.status(404).json({ error: 'Capa interactiva no encontrada' });
      }

      if (layer.processingStatus === 'processing' && !forceReprocess) {
        return res.status(400).json({ 
          error: 'El video ya está siendo procesado' 
        });
      }

      if (layer.processingStatus === 'ready' && !forceReprocess) {
        return res.status(400).json({ 
          error: 'El video ya ha sido procesado. Use forceReprocess=true para reprocesar.' 
        });
      }

      await layer.update({ 
        processingStatus: 'processing',
        processingLog: 'Iniciando procesamiento con IA...'
      });

      // Procesar video en background
      videoAIAnalyzerService.processVideoInBackground(parseInt(layerId));

      res.status(202).json({
        message: 'Procesamiento de video iniciado',
        layerId: layer.id
      });

    } catch (error) {
      console.error('Error processing video with AI:', error);
      res.status(500).json({ error: 'Error al procesar video con IA' });
    }
  }

  async startInteractiveSession(req: AuthRequest, res: Response) {
    try {
      const { layerId } = req.params;

      const layer = await InteractiveVideoLayer.findByPk(layerId);
      if (!layer) {
        return res.status(404).json({ error: 'Capa interactiva no encontrada' });
      }

      if (!layer.isEnabled) {
        return res.status(400).json({ error: 'La capa interactiva no está habilitada' });
      }

      if (layer.processingStatus !== 'ready') {
        return res.status(400).json({ 
          error: 'El contenido interactivo aún no está listo' 
        });
      }

      const sessionId = uuidv4();

      const existingSession = await InteractiveVideoResult.findOne({
        where: {
          interactiveLayerId: parseInt(layerId),
          userId: req.user!.id,
          status: 'in_progress'
        }
      });

      if (existingSession) {
        return res.json({
          message: 'Sesión existente encontrada',
          sessionId: existingSession.sessionId,
          result: existingSession
        });
      }

      const result = await InteractiveVideoResult.create({
        interactiveLayerId: parseInt(layerId),
        userId: req.user!.id,
        sessionId,
        status: 'in_progress',
        tenantId: req.user?.tenantId,
        totalQuestions: 0,
        correctAnswers: 0,
        detailedResponses: [],
        keyMomentsCompleted: []
      });

      res.status(201).json({
        message: 'Sesión interactiva iniciada',
        sessionId,
        result
      });

    } catch (error) {
      console.error('Error starting interactive session:', error);
      res.status(500).json({ error: 'Error al iniciar sesión interactiva' });
    }
  }

  async submitAnswer(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { 
        momentId, 
        questionText, 
        userAnswer, 
        correctAnswer,
        responseTimeSeconds 
      } = req.body;

      const result = await InteractiveVideoResult.findOne({
        where: { 
          sessionId,
          userId: req.user!.id 
        }
      });

      if (!result) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      if (result.status !== 'in_progress') {
        return res.status(400).json({ error: 'La sesión ya ha finalizado' });
      }

      // Comparar respuestas normalizando espacios y mayúsculas
      const normalizedUserAnswer = userAnswer?.toString().trim().toLowerCase();
      const normalizedCorrectAnswer = correctAnswer?.toString().trim().toLowerCase();
      const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
      
      console.log('Answer comparison:', {
        userAnswer: normalizedUserAnswer,
        correctAnswer: normalizedCorrectAnswer,
        isCorrect
      });

      const answer = await InteractiveVideoAnswer.create({
        resultId: result.id,
        momentId,
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        responseTimeSeconds
      });

      // Incrementar contadores - usar valores actuales, no resetear
      const updatedTotalQuestions = (result.totalQuestions || 0) + 1;
      const updatedCorrectAnswers = (result.correctAnswers || 0) + (isCorrect ? 1 : 0);
      
      const detailedResponses = result.detailedResponses || [];
      detailedResponses.push({
        momentId,
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        responseTimeSeconds,
        timestamp: new Date()
      });

      const keyMomentsCompleted = result.keyMomentsCompleted || [];
      if (!keyMomentsCompleted.includes(parseInt(momentId))) {
        keyMomentsCompleted.push(parseInt(momentId));
      }

      const calculatedScore = updatedTotalQuestions > 0 
        ? (updatedCorrectAnswers / updatedTotalQuestions) * 100 
        : 0;

      await result.update({
        totalQuestions: updatedTotalQuestions,
        correctAnswers: updatedCorrectAnswers,
        detailedResponses,
        keyMomentsCompleted,
        finalScore: calculatedScore
      });
      
      console.log('Updated result:', {
        totalQuestions: updatedTotalQuestions,
        correctAnswers: updatedCorrectAnswers,
        finalScore: calculatedScore
      });

      res.json({
        message: 'Respuesta registrada',
        isCorrect,
        currentScore: calculatedScore,
        progress: {
          totalQuestions: updatedTotalQuestions,
          correctAnswers: updatedCorrectAnswers,
          completedMoments: keyMomentsCompleted.length
        }
      });

    } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).json({ error: 'Error al enviar respuesta' });
    }
  }

  async completeSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { watchTimeSeconds, totalPauses } = req.body;

      const result = await InteractiveVideoResult.findOne({
        where: { 
          sessionId,
          userId: req.user!.id 
        },
        include: [{
          model: InteractiveVideoLayer,
          as: 'interactiveLayer',
          attributes: ['passingScore']
        }]
      });

      if (!result) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      const finalScore = result.totalQuestions > 0 
        ? (result.correctAnswers / result.totalQuestions) * 100 
        : 0;

      const passingScore = result.interactiveLayer?.passingScore || 70;
      const certificateEarned = finalScore >= passingScore;

      await result.update({
        status: 'completed',
        completedAt: new Date(),
        watchTimeSeconds,
        totalPauses,
        finalScore,
        certificateEarned,
        completionPercentage: 100
      });

      res.json({
        message: 'Sesión completada',
        finalScore,
        certificateEarned,
        passingScore,
        result
      });

    } catch (error) {
      console.error('Error completing session:', error);
      res.status(500).json({ error: 'Error al completar sesión' });
    }
  }

  async getSessionResults(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const result = await InteractiveVideoResult.findOne({
        where: { sessionId },
        include: [
          {
            model: InteractiveVideoLayer,
            as: 'interactiveLayer',
            include: [{
              model: Video,
              as: 'video',
              attributes: ['id', 'title']
            }]
          },
          {
            model: InteractiveVideoAnswer,
            as: 'interactiveVideoAnswers',
            order: [['createdAt', 'ASC']]
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!result) {
        return res.status(404).json({ error: 'Resultados no encontrados' });
      }

      res.json(result);

    } catch (error) {
      console.error('Error getting session results:', error);
      res.status(500).json({ error: 'Error al obtener resultados' });
    }
  }

  async getUserVideoHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId || req.user?.id;

      const results = await InteractiveVideoResult.findAll({
        where: { userId },
        include: [{
          model: InteractiveVideoLayer,
          as: 'interactiveLayer',
          include: [{
            model: Video,
            as: 'video',
            attributes: ['id', 'title', 'thumbnail']
          }]
        }],
        order: [['createdAt', 'DESC']],
        limit: 20
      });

      const stats = {
        totalSessions: results.length,
        completedSessions: results.filter(r => r.status === 'completed').length,
        averageScore: results
          .filter(r => r.finalScore !== null)
          .reduce((acc, r) => acc + (r.finalScore || 0), 0) / 
          results.filter(r => r.finalScore !== null).length || 0,
        certificatesEarned: results.filter(r => r.certificateEarned).length
      };

      res.json({
        results,
        stats
      });

    } catch (error) {
      console.error('Error getting user video history:', error);
      res.status(500).json({ error: 'Error al obtener historial de videos' });
    }
  }

  async getVideoAnalytics(req: AuthRequest, res: Response) {
    try {
      const { layerId } = req.params;

      const layer = await InteractiveVideoLayer.findByPk(layerId);
      if (!layer) {
        return res.status(404).json({ error: 'Capa interactiva no encontrada' });
      }

      const results = await InteractiveVideoResult.findAll({
        where: { interactiveLayerId: parseInt(layerId) }
      });

      const analytics = {
        totalSessions: results.length,
        completedSessions: results.filter(r => r.status === 'completed').length,
        averageScore: results
          .filter(r => r.finalScore !== null)
          .reduce((acc, r) => acc + (r.finalScore || 0), 0) / 
          results.filter(r => r.finalScore !== null).length || 0,
        averageWatchTime: results
          .filter(r => r.watchTimeSeconds !== null)
          .reduce((acc, r) => acc + (r.watchTimeSeconds || 0), 0) / 
          results.filter(r => r.watchTimeSeconds !== null).length || 0,
        passRate: results
          .filter(r => r.certificateEarned === true).length / 
          results.filter(r => r.status === 'completed').length || 0,
        questionAnalytics: this.calculateQuestionAnalytics(results)
      };

      res.json(analytics);

    } catch (error) {
      console.error('Error getting video analytics:', error);
      res.status(500).json({ error: 'Error al obtener analíticas del video' });
    }
  }

  private calculateQuestionAnalytics(results: any[]) {
    const questionStats: Record<string, any> = {};

    results.forEach(result => {
      result.interactiveVideoAnswers?.forEach((answer: any) => {
        if (!questionStats[answer.momentId]) {
          questionStats[answer.momentId] = {
            questionText: answer.questionText,
            totalAttempts: 0,
            correctAttempts: 0,
            avgResponseTime: 0,
            responseTimes: []
          };
        }

        questionStats[answer.momentId].totalAttempts++;
        if (answer.isCorrect) {
          questionStats[answer.momentId].correctAttempts++;
        }
        if (answer.responseTimeSeconds) {
          questionStats[answer.momentId].responseTimes.push(answer.responseTimeSeconds);
        }
      });
    });

    Object.keys(questionStats).forEach(momentId => {
      const stats = questionStats[momentId];
      stats.successRate = (stats.correctAttempts / stats.totalAttempts) * 100;
      if (stats.responseTimes.length > 0) {
        stats.avgResponseTime = stats.responseTimes.reduce((a: number, b: number) => a + b, 0) / stats.responseTimes.length;
      }
      delete stats.responseTimes;
    });

    return questionStats;
  }

  async deleteInteractiveLayer(req: AuthRequest, res: Response) {
    try {
      const { layerId } = req.params;

      const layer = await InteractiveVideoLayer.findByPk(layerId);
      if (!layer) {
        return res.status(404).json({ error: 'Capa interactiva no encontrada' });
      }

      await InteractiveVideoAnswer.destroy({
        where: {
          resultId: {
            [Op.in]: await InteractiveVideoResult.findAll({
              where: { interactiveLayerId: parseInt(layerId) },
              attributes: ['id']
            }).then(results => results.map(r => r.id))
          }
        }
      });

      await InteractiveVideoResult.destroy({
        where: { interactiveLayerId: parseInt(layerId) }
      });

      await layer.destroy();

      res.json({ 
        message: 'Capa interactiva y todos los datos asociados eliminados' 
      });

    } catch (error) {
      console.error('Error deleting interactive layer:', error);
      res.status(500).json({ error: 'Error al eliminar capa interactiva' });
    }
  }

  /**
   * Generate interactive content with transcription and AI questions
   */
  async generateInteractiveContent(req: AuthRequest, res: Response) {
    try {
      const { layerId } = req.params;
      const { 
        numberOfQuestions = 5,
        difficulty = 'mixed',
        questionTypes = ['multiple_choice'],
        focusAreas = []
      } = req.body;

      // Get the interactive layer
      const layer = await InteractiveVideoLayer.findByPk(layerId, {
        include: [{ 
          model: Video,
          as: 'video'
        }]
      });

      if (!layer) {
        return res.status(404).json({ error: 'Capa interactiva no encontrada' });
      }

      if (layer.processingStatus === 'processing') {
        return res.status(400).json({ 
          error: 'El contenido ya se está procesando. Por favor espere.' 
        });
      }

      // Update status to processing
      await layer.update({ 
        processingStatus: 'processing',
        processingError: null 
      });

      // Start async processing
      this.processVideoInBackground(
        layer,
        numberOfQuestions,
        { difficulty, questionTypes, focusAreas }
      );

      res.json({
        message: 'Procesamiento iniciado. La transcripción y generación de preguntas tomará unos minutos.',
        layerId: layer.id,
        status: 'processing'
      });

    } catch (error) {
      console.error('Error generating interactive content:', error);
      res.status(500).json({ error: 'Error al generar contenido interactivo' });
    }
  }

  /**
   * Process video in background
   */
  private async processVideoInBackground(
    layer: any,
    numberOfQuestions: number,
    options: any
  ) {
    try {
      console.log(`Starting background processing for layer ${layer.id}`);
      
      let video = layer.video;
      
      // If video is not loaded or missing required fields, reload it
      if (!video || (!video.originalPath && !video.original_path && !video.processedPath && !video.processed_path)) {
        console.log(`Reloading video ${layer.videoId} with all fields...`);
        
        // Manually fetch with raw query to ensure we get all fields
        const sequelize = InteractiveVideoLayer.sequelize;
        const videos = await sequelize.query(
          `SELECT * FROM videos WHERE id = :videoId`,
          {
            replacements: { videoId: layer.videoId },
            type: QueryTypes.SELECT
          }
        );
        
        video = videos[0];
        
        if (!video) {
          throw new Error('Video not found');
        }
      }

      console.log('Video data:', {
        id: video.id,
        originalPath: video.originalPath || video.original_path,
        processedPath: video.processedPath || video.processed_path,
        storageProvider: video.storageProvider || video.storage_provider
      });

      // Get the video file path (from MinIO or local storage)
      const videoPath = this.getVideoPath(video);
      
      // Process video with transcription and question generation
      // Pass video info for MinIO handling
      const result = await videoTranscriptionService.processVideoForInteractivity(
        videoPath,
        numberOfQuestions,
        {
          ...options,
          videoInfo: video  // Pass video model for MinIO detection
        }
      );

      // Update layer with generated content
      await layer.update({
        processingStatus: 'ready',
        aiGeneratedContent: {
          transcription: result.transcription.fullText,
          transcriptionSegments: result.transcription.segments,
          keyMoments: result.keyMoments,
          metadata: result.metadata
        },
        processingCompletedAt: new Date()
      });

      console.log(`Processing completed for layer ${layer.id}`);
      
    } catch (error: any) {
      console.error(`Error processing video for layer ${layer.id}:`, error);
      
      await layer.update({
        processingStatus: 'error',
        processingError: error.message || 'Error desconocido durante el procesamiento'
      });
    }
  }

  /**
   * Get video file path from video model
   */
  private getVideoPath(video: any): string {
    // Check for different path fields
    const videoPath = video.filePath || video.originalPath || video.original_path || video.processedPath || video.processed_path;
    
    if (!videoPath) {
      throw new Error('No se encontró la ruta del archivo de video');
    }
    
    // For MinIO storage, we need to construct the full path
    if (video.storageProvider === 'minio' || video.storage_provider === 'minio') {
      // Assuming videos are stored in a local MinIO instance
      return path.join(
        process.cwd(),
        'storage',
        'minio-data',
        'aristotest-videos',
        videoPath.replace('aristotest-videos/', '').replace('storage/', '')
      );
    }
    
    // For local storage, check if it's a relative or absolute path
    if (videoPath.startsWith('/')) {
      return videoPath; // Absolute path
    }
    
    // Relative path from backend directory
    return path.join(process.cwd(), videoPath);
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(req: AuthRequest, res: Response) {
    try {
      const { layerId } = req.params;

      const layer = await InteractiveVideoLayer.findByPk(layerId, {
        attributes: [
          'id',
          'processingStatus',
          'processingProgress',
          'processingLog',
          'processingError',
          'processingCompletedAt',
          'aiGeneratedContent'
        ]
      });

      if (!layer) {
        return res.status(404).json({ error: 'Capa interactiva no encontrada' });
      }

      const hasContent = layer.aiGeneratedContent && 
        layer.aiGeneratedContent.keyMoments && 
        layer.aiGeneratedContent.keyMoments.length > 0;

      res.json({
        layerId: layer.id,
        status: layer.processingStatus,
        processingProgress: layer.processingProgress || 0,
        processingLog: layer.processingLog,
        error: layer.processingError,
        completedAt: layer.processingCompletedAt,
        hasContent,
        numberOfQuestions: hasContent ? layer.aiGeneratedContent.keyMoments.length : 0
      });

    } catch (error) {
      console.error('Error getting processing status:', error);
      res.status(500).json({ error: 'Error al obtener estado del procesamiento' });
    }
  }

  // ============= MÉTODOS PÚBLICOS (Sin autenticación) =============

  async getPublicInteractiveLayer(req: Request, res: Response) {
    try {
      const { videoId } = req.params;

      const layer = await InteractiveVideoLayer.findOne({
        where: { 
          videoId: parseInt(videoId),
          isEnabled: true
        },
        include: [{
          model: Video,
          as: 'video',
          attributes: ['id', 'title', 'description']
        }]
      });

      if (!layer) {
        return res.status(404).json({ error: 'Video interactivo no disponible' });
      }

      res.json(layer);
    } catch (error) {
      console.error('Error getting public interactive layer:', error);
      res.status(500).json({ error: 'Error al obtener capa interactiva' });
    }
  }

  async startPublicInteractiveSession(req: Request, res: Response) {
    try {
      const { layerId } = req.params;
      const { studentName, studentEmail, studentPhone } = req.body;

      if (!studentName || !studentEmail) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
      }

      const layer = await InteractiveVideoLayer.findByPk(layerId);
      if (!layer || !layer.isEnabled) {
        return res.status(404).json({ error: 'Capa interactiva no disponible' });
      }

      const sessionId = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Crear un resultado público (sin userId)
      const result = await InteractiveVideoResult.create({
        interactiveLayerId: parseInt(layerId),
        userId: 1, // Usuario público genérico
        sessionId,
        status: 'in_progress',
        totalQuestions: 0,
        correctAnswers: 0,
        detailedResponses: {
          studentInfo: {
            name: studentName,
            email: studentEmail,
            phone: studentPhone
          }
        }
      });

      res.json({
        message: 'Sesión pública iniciada',
        sessionId,
        result
      });

    } catch (error) {
      console.error('Error starting public session:', error);
      res.status(500).json({ error: 'Error al iniciar sesión pública' });
    }
  }

  async submitPublicAnswer(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { momentId, questionText, userAnswer, correctAnswer, responseTimeSeconds } = req.body;

      const result = await InteractiveVideoResult.findOne({
        where: { sessionId }
      });

      if (!result) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      // Comparar respuestas normalizando
      const normalizedUserAnswer = userAnswer?.toString().trim().toLowerCase();
      const normalizedCorrectAnswer = correctAnswer?.toString().trim().toLowerCase();
      const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

      // Crear registro de respuesta
      await InteractiveVideoAnswer.create({
        resultId: result.id,
        momentId,
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        responseTimeSeconds
      });

      // Actualizar contadores
      const updatedTotalQuestions = (result.totalQuestions || 0) + 1;
      const updatedCorrectAnswers = (result.correctAnswers || 0) + (isCorrect ? 1 : 0);
      
      const detailedResponses = result.detailedResponses || {};
      if (!detailedResponses.answers) {
        detailedResponses.answers = [];
      }
      detailedResponses.answers.push({
        momentId,
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        responseTimeSeconds,
        timestamp: new Date()
      });

      const calculatedScore = updatedTotalQuestions > 0 
        ? (updatedCorrectAnswers / updatedTotalQuestions) * 100 
        : 0;

      await result.update({
        totalQuestions: updatedTotalQuestions,
        correctAnswers: updatedCorrectAnswers,
        detailedResponses,
        finalScore: calculatedScore
      });

      res.json({
        message: 'Respuesta registrada',
        isCorrect,
        currentScore: calculatedScore,
        progress: {
          totalQuestions: updatedTotalQuestions,
          correctAnswers: updatedCorrectAnswers
        }
      });

    } catch (error) {
      console.error('Error submitting public answer:', error);
      res.status(500).json({ error: 'Error al enviar respuesta' });
    }
  }

  async completePublicSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { watchTimeSeconds, totalPauses } = req.body;

      const result = await InteractiveVideoResult.findOne({
        where: { sessionId }
      });

      if (!result) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }

      const finalScore = result.totalQuestions > 0 
        ? (result.correctAnswers / result.totalQuestions) * 100 
        : 0;

      await result.update({
        status: 'completed',
        completedAt: new Date(),
        watchTimeSeconds,
        totalPauses,
        finalScore,
        completionPercentage: 100
      });

      res.json({
        message: 'Sesión completada',
        finalScore,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        passed: finalScore >= 70,
        result
      });

    } catch (error) {
      console.error('Error completing public session:', error);
      res.status(500).json({ error: 'Error al completar sesión' });
    }
  }

  async getPublicSessionResults(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const result = await InteractiveVideoResult.findOne({
        where: { sessionId },
        include: [
          {
            model: InteractiveVideoAnswer,
            as: 'interactiveVideoAnswers'
          }
        ]
      });

      if (!result) {
        return res.status(404).json({ error: 'Resultados no encontrados' });
      }

      res.json(result);

    } catch (error) {
      console.error('Error getting public session results:', error);
      res.status(500).json({ error: 'Error al obtener resultados' });
    }
  }
}

export const interactiveVideoController = new InteractiveVideoController();