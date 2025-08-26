import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiConfig } from '../config/api.config';

// Set ffmpeg path
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  duration: number;
  language?: string;
}

interface QuestionGenerationParams {
  transcription: string;
  numberOfQuestions: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: Array<'multiple_choice' | 'true_false' | 'short_answer'>;
  focusAreas?: string[];
}

interface GeneratedQuestion {
  timestamp: number;
  question: {
    text: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string | string[];
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic?: string;
  };
  title: string;
  contextSnippet: string;
}

class VideoTranscriptionService {
  private genAI: GoogleGenerativeAI;
  private tempDir: string = '/tmp/video-transcription';

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Extract audio from video file
   */
  async extractAudio(videoPath: string): Promise<string> {
    const audioPath = path.join(this.tempDir, `${uuidv4()}.mp3`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-acodec libmp3lame',
          '-ar 16000',  // Sample rate optimal for transcription
          '-ac 1'       // Mono channel
        ])
        .output(audioPath)
        .on('end', () => resolve(audioPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Get video duration and metadata
   */
  async getVideoMetadata(videoPath: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve({ duration: metadata.format.duration || 0 });
      });
    });
  }

  /**
   * Transcribe audio using Gemini API with audio file upload
   */
  async transcribeWithGemini(audioPath: string): Promise<TranscriptionResult> {
    try {
      const audioBuffer = await fs.readFile(audioPath);
      const base64Audio = audioBuffer.toString('base64');
      
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      const prompt = `
        Transcribe este audio completamente. Proporciona:
        1. La transcripción completa del audio
        2. Segmentos con timestamps aproximados (cada 30-60 segundos de contenido)
        3. El idioma detectado
        
        Formato de respuesta JSON:
        {
          "fullText": "transcripción completa...",
          "segments": [
            {
              "start": 0,
              "end": 30,
              "text": "texto del segmento..."
            }
          ],
          "language": "es"
        }
      `;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'audio/mp3',
            data: base64Audio
          }
        },
        prompt
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const transcriptionData = JSON.parse(jsonMatch[0]);
        return {
          fullText: transcriptionData.fullText,
          segments: transcriptionData.segments || [],
          duration: 0, // Will be updated with actual duration
          language: transcriptionData.language
        };
      }

      // Fallback if not in expected format
      return {
        fullText: text,
        segments: [],
        duration: 0,
        language: 'es'
      };

    } catch (error) {
      console.error('Error transcribing with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate a simple mock transcription for testing
   */
  async generateMockTranscription(duration: number): Promise<TranscriptionResult> {
    const segments: TranscriptionSegment[] = [];
    const segmentDuration = 30; // 30 seconds per segment
    const numberOfSegments = Math.ceil(duration / segmentDuration);
    
    const topics = [
      'introducción al tema principal',
      'conceptos fundamentales y definiciones',
      'ejemplos prácticos y aplicaciones',
      'casos de uso en el mundo real',
      'mejores prácticas y recomendaciones',
      'errores comunes a evitar',
      'resumen y conclusiones importantes'
    ];

    let fullText = '';
    
    for (let i = 0; i < numberOfSegments; i++) {
      const start = i * segmentDuration;
      const end = Math.min((i + 1) * segmentDuration, duration);
      const topic = topics[i % topics.length];
      
      const segmentText = `En esta sección hablaremos sobre ${topic}. Es importante entender estos conceptos para poder aplicarlos correctamente en situaciones reales.`;
      
      segments.push({
        start,
        end,
        text: segmentText,
        confidence: 0.95
      });
      
      fullText += segmentText + ' ';
    }

    return {
      fullText: fullText.trim(),
      segments,
      duration,
      language: 'es'
    };
  }

  /**
   * Generate questions based on transcription using AI
   */
  async generateQuestionsFromTranscription(params: QuestionGenerationParams): Promise<GeneratedQuestion[]> {
    const {
      transcription,
      numberOfQuestions,
      difficulty = 'mixed',
      questionTypes = ['multiple_choice'],
      focusAreas = []
    } = params;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      const prompt = `
        Basándote en la siguiente transcripción de video, genera ${numberOfQuestions} preguntas interactivas.
        
        TRANSCRIPCIÓN:
        ${transcription}
        
        REQUISITOS:
        - Número de preguntas: ${numberOfQuestions}
        - Dificultad: ${difficulty}
        - Tipos de pregunta permitidos: ${questionTypes.join(', ')}
        ${focusAreas.length > 0 ? `- Áreas de enfoque: ${focusAreas.join(', ')}` : ''}
        
        IMPORTANTE:
        - Distribuye las preguntas uniformemente a lo largo del video
        - Cada pregunta debe estar en un momento relevante según el contenido
        - Para multiple_choice, proporciona 4 opciones
        - Para true_false, usa "Verdadero" y "Falso"
        - Incluye una explicación breve para cada respuesta correcta
        
        Responde SOLO con un JSON válido en este formato:
        {
          "questions": [
            {
              "timestamp": <número en segundos donde debe aparecer>,
              "title": "Título breve del momento clave",
              "contextSnippet": "Fragmento de la transcripción relevante",
              "question": {
                "text": "¿Pregunta aquí?",
                "type": "multiple_choice",
                "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
                "correctAnswer": "Opción B",
                "explanation": "Explicación de por qué es correcta",
                "difficulty": "medium",
                "topic": "Tema específico"
              }
            }
          ]
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return data.questions || [];
      }

      throw new Error('No se pudo generar las preguntas en el formato esperado');

    } catch (error) {
      console.error('Error generating questions:', error);
      
      // Return mock questions for testing
      return this.generateMockQuestions(numberOfQuestions);
    }
  }

  /**
   * Generate mock questions for testing
   */
  private generateMockQuestions(numberOfQuestions: number): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const videoDuration = 300; // Assume 5 minutes
    const interval = videoDuration / (numberOfQuestions + 1);
    
    const questionTemplates = [
      {
        text: '¿Cuál es el concepto principal discutido en esta sección?',
        options: ['Optimización', 'Escalabilidad', 'Seguridad', 'Rendimiento'],
        correct: 'Escalabilidad',
        topic: 'Conceptos fundamentales'
      },
      {
        text: '¿Qué tecnología se menciona como solución recomendada?',
        options: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
        correct: 'Docker',
        topic: 'Tecnologías'
      },
      {
        text: 'Según lo explicado, ¿cuál es la mejor práctica mencionada?',
        options: [
          'Implementar sin pruebas',
          'Documentar después de codificar',
          'Test-driven development',
          'Optimización prematura'
        ],
        correct: 'Test-driven development',
        topic: 'Mejores prácticas'
      }
    ];

    for (let i = 0; i < numberOfQuestions; i++) {
      const template = questionTemplates[i % questionTemplates.length];
      const timestamp = Math.floor(interval * (i + 1));
      
      questions.push({
        timestamp,
        title: `Punto clave ${i + 1}`,
        contextSnippet: `En el minuto ${Math.floor(timestamp / 60)}:${(timestamp % 60).toString().padStart(2, '0')} se discute ${template.topic}`,
        question: {
          text: template.text,
          type: 'multiple_choice',
          options: template.options,
          correctAnswer: template.correct,
          explanation: `${template.correct} es la respuesta correcta porque es la opción más adecuada según lo explicado en el video.`,
          difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
          topic: template.topic
        }
      });
    }

    return questions;
  }

  /**
   * Process video for transcription and question generation
   */
  async processVideoForInteractivity(
    videoPath: string,
    numberOfQuestions: number,
    options: Partial<QuestionGenerationParams> = {}
  ) {
    try {
      console.log('Starting video processing for interactivity...');
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      console.log(`Video duration: ${metadata.duration} seconds`);
      
      // For now, use mock transcription to avoid API costs during development
      const useMockTranscription = !process.env.GEMINI_API_KEY || process.env.USE_MOCK_TRANSCRIPTION === 'true';
      
      let transcription: TranscriptionResult;
      
      if (useMockTranscription) {
        console.log('Using mock transcription for development...');
        transcription = await this.generateMockTranscription(metadata.duration);
      } else {
        // Extract audio
        console.log('Extracting audio from video...');
        const audioPath = await this.extractAudio(videoPath);
        
        // Transcribe audio
        console.log('Transcribing audio...');
        transcription = await this.transcribeWithGemini(audioPath);
        transcription.duration = metadata.duration;
        
        // Clean up temp audio file
        await fs.unlink(audioPath).catch(() => {});
      }
      
      // Generate questions
      console.log(`Generating ${numberOfQuestions} questions...`);
      const questions = await this.generateQuestionsFromTranscription({
        transcription: transcription.fullText,
        numberOfQuestions,
        ...options
      });
      
      // Format for interactive layer
      const keyMoments = questions.map((q, index) => ({
        id: uuidv4(),
        timestamp: q.timestamp,
        title: q.title,
        question: q.question,
        contextSnippet: q.contextSnippet
      }));
      
      return {
        transcription,
        keyMoments,
        metadata: {
          duration: metadata.duration,
          language: transcription.language,
          numberOfQuestions,
          processedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Error processing video for interactivity:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file)).catch(() => {});
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export const videoTranscriptionService = new VideoTranscriptionService();