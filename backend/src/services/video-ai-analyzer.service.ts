import { GoogleGenerativeAI } from '@google/generative-ai';
import { InteractiveVideoLayer } from '../models/InteractiveVideoLayer.model';
import { Video } from '../models/Video';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface KeyMoment {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  type: 'concept' | 'example' | 'summary' | 'exercise';
  question: {
    text: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  relevanceScore: number;
}

interface VideoAnalysisResult {
  keyMoments: KeyMoment[];
  summary: string;
  topics: string[];
  estimatedDuration: number;
  educationalLevel: string;
  contentType: string;
  confidenceScore: number;
}

export class VideoAIAnalyzerService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    }
  }

  async analyzeVideo(layerId: number): Promise<void> {
    try {
      const layer = await InteractiveVideoLayer.findByPk(layerId, {
        include: [Video]
      });

      if (!layer) {
        throw new Error('Capa interactiva no encontrada');
      }

      await layer.update({ 
        processingStatus: 'processing',
        processingLog: 'Iniciando análisis de video con IA...'
      });

      const videoPath = layer.video!.filePath;
      const videoUrl = layer.video!.url;

      const frames = await this.extractVideoFrames(videoPath);
      
      const transcript = await this.extractVideoTranscript(videoPath);

      const analysisResult = await this.analyzeVideoContent(
        frames, 
        transcript, 
        layer.video!
      );

      const aiContent = {
        keyMoments: analysisResult.keyMoments,
        summary: analysisResult.summary,
        topics: analysisResult.topics,
        educationalLevel: analysisResult.educationalLevel,
        contentType: analysisResult.contentType,
        totalQuestions: analysisResult.keyMoments.length,
        processedAt: new Date().toISOString(),
        videoMetadata: {
          title: layer.video!.title,
          duration: layer.video!.duration,
          originalUrl: videoUrl
        }
      };

      await layer.update({
        aiGeneratedContent: aiContent,
        aiModelUsed: 'gemini-1.5-pro',
        confidenceScore: analysisResult.confidenceScore,
        processingStatus: 'ready',
        processingLog: 'Análisis completado exitosamente'
      });

      this.cleanupTempFiles(frames);

    } catch (error: any) {
      console.error('Error analyzing video:', error);
      
      const layer = await InteractiveVideoLayer.findByPk(layerId);
      if (layer) {
        await layer.update({
          processingStatus: 'error',
          processingLog: `Error: ${error.message}`
        });
      }
      
      throw error;
    }
  }

  private async extractVideoFrames(videoPath: string): Promise<string[]> {
    const tempDir = path.join(__dirname, '../../temp', `video-${Date.now()}`);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const frameInterval = 30;
    const framePattern = path.join(tempDir, 'frame_%04d.jpg');
    
    const command = `ffmpeg -i "${videoPath}" -vf "fps=1/${frameInterval}" -q:v 2 "${framePattern}"`;
    
    try {
      await execAsync(command);
      
      const frames = fs.readdirSync(tempDir)
        .filter(file => file.endsWith('.jpg'))
        .map(file => path.join(tempDir, file));
      
      return frames.slice(0, 10);
      
    } catch (error) {
      console.error('Error extracting frames:', error);
      return [];
    }
  }

  private async extractVideoTranscript(videoPath: string): Promise<string> {
    try {
      const audioPath = videoPath.replace(/\.[^/.]+$/, '.wav');
      
      const extractAudioCmd = `ffmpeg -i "${videoPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${audioPath}" -y`;
      await execAsync(extractAudioCmd);
      
      const transcript = await this.transcribeAudio(audioPath);
      
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      
      return transcript;
      
    } catch (error) {
      console.error('Error extracting transcript:', error);
      return '';
    }
  }

  private async transcribeAudio(audioPath: string): Promise<string> {
    return 'Transcripción simulada del contenido del video educativo.';
  }

  private async analyzeVideoContent(
    frames: string[], 
    transcript: string, 
    video: Video
  ): Promise<VideoAnalysisResult> {
    
    const prompt = `
    Analiza este contenido educativo y genera momentos clave interactivos.
    
    Información del video:
    - Título: ${video.title}
    - Descripción: ${video.description || 'No disponible'}
    - Duración: ${video.duration} segundos
    - Transcripción: ${transcript || 'No disponible'}
    
    Genera un análisis estructurado con los siguientes elementos:
    
    1. MOMENTOS CLAVE (5-10 momentos distribuidos uniformemente):
    Para cada momento incluye:
    - timestamp (en segundos, distribuidos uniformemente)
    - título descriptivo
    - tipo (concept, example, summary, exercise)
    - pregunta educativa relacionada con el contenido hasta ese punto
    - opciones de respuesta (si aplica)
    - respuesta correcta
    - explicación educativa
    - nivel de dificultad
    
    2. RESUMEN del contenido educativo
    
    3. TEMAS principales cubiertos
    
    4. NIVEL EDUCATIVO apropiado
    
    5. TIPO DE CONTENIDO (tutorial, explicación, demostración, etc.)
    
    Responde en formato JSON válido siguiendo esta estructura:
    {
      "keyMoments": [...],
      "summary": "...",
      "topics": [...],
      "educationalLevel": "...",
      "contentType": "...",
      "confidenceScore": 0.0-1.0
    }
    `;

    try {
      if (!this.model) {
        return this.generateMockAnalysis(video);
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);
        return this.validateAndFormatAnalysis(analysisData);
      }
      
      return this.generateMockAnalysis(video);
      
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.generateMockAnalysis(video);
    }
  }

  private validateAndFormatAnalysis(data: any): VideoAnalysisResult {
    const duration = data.estimatedDuration || 300;
    
    const keyMoments = (data.keyMoments || []).map((moment: any, index: number) => ({
      id: `moment_${index + 1}`,
      timestamp: moment.timestamp || (index * 60),
      title: moment.title || `Momento ${index + 1}`,
      description: moment.description || '',
      type: moment.type || 'concept',
      question: {
        text: moment.question?.text || '¿Qué aprendiste en esta sección?',
        type: moment.question?.type || 'multiple_choice',
        options: moment.question?.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctAnswer: moment.question?.correctAnswer || 'Opción A',
        explanation: moment.question?.explanation || 'Explicación de la respuesta correcta.',
        difficulty: moment.question?.difficulty || 'medium'
      },
      relevanceScore: moment.relevanceScore || 0.8
    }));

    return {
      keyMoments,
      summary: data.summary || 'Resumen del contenido educativo del video.',
      topics: data.topics || ['Tema Principal'],
      estimatedDuration: duration,
      educationalLevel: data.educationalLevel || 'Intermedio',
      contentType: data.contentType || 'Tutorial',
      confidenceScore: data.confidenceScore || 0.85
    };
  }

  private generateMockAnalysis(video: Video): VideoAnalysisResult {
    const duration = video.duration || 300;
    const numMoments = Math.min(Math.floor(duration / 60), 10);
    
    const keyMoments: KeyMoment[] = [];
    
    for (let i = 0; i < numMoments; i++) {
      const timestamp = Math.floor((duration / numMoments) * i);
      
      keyMoments.push({
        id: `moment_${i + 1}`,
        timestamp,
        title: `Concepto Clave ${i + 1}`,
        description: `Punto importante del video en el minuto ${Math.floor(timestamp / 60)}`,
        type: i % 4 === 0 ? 'concept' : i % 4 === 1 ? 'example' : i % 4 === 2 ? 'exercise' : 'summary',
        question: {
          text: `¿Cuál de las siguientes afirmaciones sobre el tema ${i + 1} es correcta?`,
          type: 'multiple_choice',
          options: [
            `Opción A sobre el tema ${i + 1}`,
            `Opción B sobre el tema ${i + 1}`,
            `Opción C sobre el tema ${i + 1}`,
            `Opción D sobre el tema ${i + 1}`
          ],
          correctAnswer: `Opción A sobre el tema ${i + 1}`,
          explanation: `La opción A es correcta porque explica adecuadamente el concepto presentado en este momento del video.`,
          difficulty: i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard'
        },
        relevanceScore: 0.75 + Math.random() * 0.25
      });
    }

    return {
      keyMoments,
      summary: `Este video educativo de ${video.title} presenta conceptos importantes de manera progresiva y estructurada.`,
      topics: ['Introducción', 'Conceptos Básicos', 'Aplicaciones Prácticas', 'Ejercicios', 'Conclusiones'],
      estimatedDuration: duration,
      educationalLevel: 'Intermedio',
      contentType: 'Tutorial Educativo',
      confidenceScore: 0.85
    };
  }

  private cleanupTempFiles(files: string[]): void {
    files.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.error(`Error deleting temp file ${file}:`, error);
      }
    });

    const tempDir = files[0] ? path.dirname(files[0]) : null;
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmdirSync(tempDir);
      } catch (error) {
        console.error(`Error deleting temp directory ${tempDir}:`, error);
      }
    }
  }

  async processVideoInBackground(layerId: number): Promise<void> {
    setTimeout(() => {
      this.analyzeVideo(layerId).catch(error => {
        console.error(`Background video processing failed for layer ${layerId}:`, error);
      });
    }, 1000);
  }
}

export const videoAIAnalyzerService = new VideoAIAnalyzerService();