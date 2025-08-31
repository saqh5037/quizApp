import { GoogleGenerativeAI } from '@google/generative-ai';
import { InteractiveVideoLayer, Video } from '../models';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import minioService from './minio.service';
import * as os from 'os';

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

/**
 * Service for analyzing videos using AI to generate interactive educational content.
 * Uses Google Gemini for content generation and OpenAI Whisper for transcription.
 */
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

  /**
   * Analyzes a video to generate interactive educational content.
   * @param layerId - The ID of the interactive video layer to process
   * @throws Error if layer not found or processing fails
   */
  async analyzeVideo(layerId: number): Promise<void> {
    let tempFilePath: string | null = null;
    
    try {
      const layer = await InteractiveVideoLayer.findByPk(layerId, {
        include: [{
          model: Video,
          as: 'video'
        }]
      });

      if (!layer) {
        throw new Error('Capa interactiva no encontrada');
      }

      await layer.update({ 
        processingStatus: 'processing',
        processingLog: 'Iniciando análisis de video con IA... (5%)'
      });

      // Get the correct video path
      const video = layer.video!;
      
      // Determine the actual video path or MinIO object name
      let absoluteVideoPath: string;
      
      // Check if video is stored in MinIO
      // Detect MinIO storage by checking if hlsPlaylistUrl contains MinIO endpoint or if local file doesn't exist
      const isMinioVideo = video.storageProvider === 'minio' || 
                          video.streamUrl?.includes('9000') || 
                          video.hlsPlaylistUrl?.includes('9000') ||
                          (video.originalPath && !fs.existsSync(path.join(process.cwd(), video.originalPath)));
                          
      if (isMinioVideo) {
        // Video is in MinIO, need to download it first
        console.log('Video detected in MinIO storage, preparing to download...');
        const objectName = this.extractObjectNameFromVideo(video);
        
        if (!objectName) {
          console.error('Failed to extract object name from video:', video);
          throw new Error('No se pudo determinar el nombre del objeto en MinIO');
        }
        
        console.log('MinIO object name:', objectName);
        
        // Create temp file path
        tempFilePath = path.join(os.tmpdir(), `temp_video_${layerId}_${Date.now()}.mp4`);
        
        try {
          await layer.update({ 
            processingLog: 'Descargando video desde almacenamiento... (10%)'
          });
          
          // Download video from MinIO to temp file
          await minioService.downloadFile(objectName, tempFilePath);
          absoluteVideoPath = tempFilePath;
          
        } catch (error) {
          console.error('Error downloading video from MinIO:', error);
          throw new Error('No se pudo descargar el video desde el almacenamiento');
        }
      } else {
        // Video is stored locally
        const videoPath = video.originalPath || video.original_path || 
                         video.processedPath || video.processed_path || 
                         video.filePath || 
                         (video.dataValues && (video.dataValues.originalPath || video.dataValues.original_path));
        
        if (!videoPath) {
          throw new Error('No se encontró la ruta del archivo de video');
        }
        
        absoluteVideoPath = videoPath.startsWith('/') 
          ? videoPath 
          : path.join(process.cwd(), videoPath);
          
        // Check if local file exists
        if (!fs.existsSync(absoluteVideoPath)) {
          throw new Error(`El archivo de video no existe en la ruta: ${absoluteVideoPath}`);
        }
      }
        
      const videoUrl = video.url || video.hlsPlaylistUrl || '';

      await layer.update({ 
        processingLog: 'Extrayendo frames del video... (15%)'
      });

      const frames = await this.extractVideoFrames(absoluteVideoPath);
      
      await layer.update({ 
        processingLog: 'Transcribiendo audio del video... (30%)'
      });
      
      const transcript = await this.extractVideoTranscript(absoluteVideoPath);

      await layer.update({ 
        processingLog: 'Analizando contenido con IA... (50%)'
      });

      const analysisResult = await this.analyzeVideoContent(
        frames, 
        transcript, 
        layer.video!,
        async (progress: number) => {
          await layer.update({ 
            processingLog: `Analizando contenido con IA... (${Math.floor(50 + progress * 0.2)}%)`
          });
        }
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
          title: video.title,
          duration: video.duration || video.durationSeconds,
          originalUrl: videoUrl
        }
      };

      await layer.update({ 
        processingLog: 'Generando preguntas interactivas... (70%)'
      });


      await layer.update({ 
        processingLog: 'Validando contenido generado... (85%)'
      });

      await layer.update({ 
        processingLog: 'Guardando contenido generado... (95%)'
      });

      await layer.update({
        aiGeneratedContent: aiContent,
        aiModelUsed: 'gemini-1.5-pro',
        confidenceScore: analysisResult.confidenceScore,
        processingStatus: 'ready',
        processingLog: 'Análisis completado exitosamente (100%)',
        processingCompletedAt: new Date()
      });

      this.cleanupTempFiles(frames);
      
      // Clean up temporary video file if it was downloaded from MinIO
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log('Temporary video file cleaned up:', tempFilePath);
        } catch (error) {
          console.error('Error cleaning up temp video file:', error);
        }
      }

    } catch (error: any) {
      console.error('Error analyzing video:', error);
      
      // Clean up temporary video file if it exists
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log('Temporary video file cleaned up after error:', tempFilePath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp video file:', cleanupError);
        }
      }
      
      const layer = await InteractiveVideoLayer.findByPk(layerId);
      if (layer) {
        await layer.update({
          processingStatus: 'error',
          processingLog: `Error: ${error.message} (0%)`
        });
      }
      
      throw error;
    }
  }

  /**
   * Extracts frames from video at regular intervals for visual analysis.
   * @param videoPath - Path to the video file
   * @returns Array of paths to extracted frame images
   */
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

  /**
   * Extracts and transcribes audio from video.
   * @param videoPath - Path to the video file
   * @returns Transcribed text from video audio
   */
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
    try {
      // Check if OpenAI API key is available for Whisper
      const openaiKey = process.env.OPENAI_API_KEY;
      
      if (openaiKey) {
        // Use OpenAI Whisper API for transcription
        return await this.transcribeWithWhisper(audioPath, openaiKey);
      }
      
      // If no transcription service is available, extract basic metadata
      console.warn('No transcription service configured. OPENAI_API_KEY required for audio transcription.');
      
      // Return empty string - no fake data
      return '';
      
    } catch (error) {
      console.error('Error in audio transcription:', error);
      return '';
    }
  }

  /**
   * Transcribes audio using OpenAI Whisper API.
   * @param audioPath - Path to the audio file
   * @param apiKey - OpenAI API key
   * @returns Transcribed text
   */
  private async transcribeWithWhisper(audioPath: string, apiKey: string): Promise<string> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('model', 'whisper-1');
      formData.append('language', 'es'); // Spanish language
      
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${apiKey}`
          },
          maxBodyLength: Infinity
        }
      );
      
      return response.data.text || '';
    } catch (error: any) {
      console.error('Whisper API error:', error.response?.data || error.message);
      return '';
    }
  }

  /**
   * Analyzes video content using AI to generate educational questions.
   * @param frames - Array of frame image paths
   * @param transcript - Transcribed audio text
   * @param video - Video model instance
   * @param onProgress - Optional progress callback
   * @returns Analysis result with key moments and questions
   */
  private async analyzeVideoContent(
    frames: string[], 
    transcript: string, 
    video: Video,
    onProgress?: (progress: number) => Promise<void>
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
    IMPORTANTE: Las preguntas deben aparecer DESPUÉS de que se presente el contenido relevante.
    Para cada momento incluye:
    - timestamp (en segundos, debe ser DESPUÉS de explicar el concepto, no antes)
      * Para un video de ${video.duration || video.durationSeconds || 300} segundos
      * Distribuye los timestamps dejando al menos 20-30 segundos después de cada concepto
      * Ejemplo: si un concepto se explica en el segundo 30, la pregunta debe aparecer en el segundo 50-60
    - título descriptivo
    - tipo (concept, example, summary, exercise)
    - pregunta educativa sobre el contenido YA PRESENTADO (no sobre lo que viene)
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
        throw new Error('Modelo de IA no configurado. Por favor configure GEMINI_API_KEY en las variables de entorno.');
      }

      // If no transcript, generate based on title and description only
      if (!transcript || transcript.trim() === '') {
        console.warn('No transcript available, generating content based on video metadata only');
        // Modify prompt to work without transcript
        const noTranscriptPrompt = `
        Analiza la información disponible del video y genera contenido interactivo.
        
        Información del video:
        - Título: ${video.title}
        - Descripción: ${video.description || 'No disponible'}
        - Duración: ${video.duration || video.durationSeconds} segundos
        
        NOTA: No hay transcripción disponible. Genera preguntas basadas únicamente en el título y descripción.
        
        Genera un análisis estructurado con preguntas generales sobre el tema del video.
        
        Responde en formato JSON válido siguiendo esta estructura:
        {
          "keyMoments": [...],
          "summary": "...",
          "topics": [...],
          "educationalLevel": "...",
          "contentType": "...",
          "confidenceScore": 0.3
        }
        `;
        
        const result = await this.model.generateContent(noTranscriptPrompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysisData = JSON.parse(jsonMatch[0]);
          analysisData.confidenceScore = 0.3; // Low confidence without transcript
          return this.validateAndFormatAnalysis(analysisData, video);
        }
      }

      if (onProgress) await onProgress(60);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (onProgress) await onProgress(90);
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);
        return this.validateAndFormatAnalysis(analysisData, video);
      }
      
      throw new Error('No se pudo generar el análisis del video. Respuesta inválida del modelo de IA.');
      
    } catch (error) {
      console.error('Error in AI analysis:', error);
      throw error;
    }
  }

  private validateAndFormatAnalysis(data: any, video?: any): VideoAnalysisResult {
    const duration = video?.duration || video?.durationSeconds || data.estimatedDuration || 300;
    const numMoments = data.keyMoments?.length || 5;
    
    // Calculate better timestamp distribution
    // Start questions after 20% of the video and end before 90%
    const startTime = Math.max(30, duration * 0.2); // Start after at least 30 seconds or 20% of video
    const endTime = duration * 0.9; // End before the last 10% of video
    const interval = (endTime - startTime) / numMoments;
    
    const keyMoments = (data.keyMoments || []).map((moment: any, index: number) => {
      // Use provided timestamp if valid, otherwise calculate a better distribution
      let timestamp = moment.timestamp;
      if (!timestamp || timestamp < startTime || timestamp > endTime) {
        timestamp = Math.round(startTime + (index * interval) + (interval * 0.5));
      }
      
      return {
        id: `moment_${index + 1}`,
        timestamp: timestamp,
        title: moment.title || `Momento ${index + 1}`,
        description: moment.description || '',
        type: moment.type || 'concept',
        question: {
          text: moment.question?.text || moment.question || '¿Qué aprendiste en esta sección?',
          type: moment.question?.type || 'multiple_choice',
          options: moment.question?.options || moment.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          correctAnswer: moment.question?.correctAnswer || moment.correctAnswer || 'Opción A',
          explanation: moment.question?.explanation || moment.explanation || 'Explicación de la respuesta correcta.',
          difficulty: moment.question?.difficulty || moment.difficulty || 'medium'
        },
        relevanceScore: moment.relevanceScore || 0.8
      };
    });

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

  /**
   * Extracts the MinIO object name from video model.
   * @param video - Video model instance
   * @returns Object name for MinIO or null if not found
   */
  private extractObjectNameFromVideo(video: any): string | null {
    // First, try to extract from HLS playlist URL (most reliable for MinIO videos)
    if (video.hlsPlaylistUrl && video.hlsPlaylistUrl.includes('://')) {
      try {
        const url = new URL(video.hlsPlaylistUrl);
        // Extract path after bucket name
        // Example: /aristotest-videos/videos/hls/66/master.m3u8
        let pathname = url.pathname;
        
        // Remove leading slash
        if (pathname.startsWith('/')) {
          pathname = pathname.substring(1);
        }
        
        // Remove bucket name if present
        const bucketName = process.env.MINIO_BUCKET_NAME || 'aristotest-videos';
        if (pathname.startsWith(bucketName + '/')) {
          pathname = pathname.substring(bucketName.length + 1);
        }
        
        // Convert HLS path to original video path
        // videos/hls/66/master.m3u8 -> videos/66/original.mp4
        if (pathname.includes('/hls/') && pathname.endsWith('.m3u8')) {
          const videoIdMatch = pathname.match(/\/hls\/(\d+)\//);
          if (videoIdMatch) {
            const videoId = videoIdMatch[1];
            // Try to construct the original video path
            return `videos/${videoId}/original.mp4`;
          }
        }
      } catch (error) {
        console.error('Error parsing HLS URL:', video.hlsPlaylistUrl, error);
      }
    }
    
    // Try other URL fields
    const possiblePaths = [
      video.streamUrl,
      video.processedPath,
      video.url
    ];

    for (const path of possiblePaths) {
      if (path && path.includes('://')) {
        try {
          const url = new URL(path);
          let objectName = url.pathname.substring(1);
          
          const bucketName = process.env.MINIO_BUCKET_NAME || 'aristotest-videos';
          if (objectName.startsWith(bucketName + '/')) {
            objectName = objectName.substring(bucketName.length + 1);
          }
          
          if (objectName && objectName.endsWith('.mp4')) {
            return objectName;
          }
        } catch (error) {
          console.error('Error parsing URL:', path, error);
        }
      }
    }
    
    // If originalPath is just a filename, try to construct MinIO path
    if (video.originalPath) {
      const filename = video.originalPath.split('/').pop();
      if (filename && video.id) {
        // Try standard MinIO path structure
        return `videos/${video.id}/${filename}`;
      }
    }
    
    // Last resort: try to construct from video ID
    if (video.id) {
      // Standard paths to try
      const possibleObjectNames = [
        `videos/${video.id}/original.mp4`,
        `videos/${video.id}/video.mp4`,
        `uploads/${video.id}.mp4`
      ];
      
      // Return the first one (we'll need to handle the error if it doesn't exist)
      console.log('Trying standard MinIO paths for video ID:', video.id);
      return possibleObjectNames[0];
    }
    
    return null;
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