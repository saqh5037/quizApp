import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Video } from '../models/Video.model';
import { InteractiveVideoLayer } from '../models/InteractiveVideoLayer.model';
import { InteractiveVideoResult } from '../models/InteractiveVideoResult.model';
import { InteractiveVideoAnswer } from '../models/InteractiveVideoAnswer.model';
import { User } from '../models/User.model';
import { v4 as uuidv4 } from 'uuid';
import { videoAIAnalyzerService } from '../services/video-ai-analyzer.service';

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
        where: { videoId: parseInt(videoId) },
        include: [{
          model: Video,
          attributes: ['id', 'title', 'description', 'duration']
        }]
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

      const layer = await InteractiveVideoLayer.findByPk(layerId, {
        include: [Video]
      });

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

      const isCorrect = userAnswer === correctAnswer;

      const answer = await InteractiveVideoAnswer.create({
        resultId: result.id,
        momentId,
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        responseTimeSeconds
      });

      result.totalQuestions += 1;
      if (isCorrect) {
        result.correctAnswers += 1;
      }

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

      await result.update({
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        detailedResponses,
        keyMomentsCompleted,
        finalScore: (result.correctAnswers / result.totalQuestions) * 100
      });

      res.json({
        message: 'Respuesta registrada',
        isCorrect,
        currentScore: result.finalScore,
        progress: {
          totalQuestions: result.totalQuestions,
          correctAnswers: result.correctAnswers,
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
            include: [{
              model: Video,
              attributes: ['id', 'title']
            }]
          },
          {
            model: InteractiveVideoAnswer,
            order: [['createdAt', 'ASC']]
          },
          {
            model: User,
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
          include: [{
            model: Video,
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
        where: { interactiveLayerId: parseInt(layerId) },
        include: [{
          model: InteractiveVideoAnswer
        }]
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
}

export const interactiveVideoController = new InteractiveVideoController();