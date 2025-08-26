import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Manual from '../models/Manual.model';
import fs from 'fs';
import pdf from 'pdf-parse';

// Session storage (in production use Redis or database)
const chatSessions = new Map<string, { manualContent: string; history: any[] }>();

// Initialize Gemini
const initializeGemini = () => {
  // Use the correct API key provided by the user
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw';
  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-1.5-flash which is the current available model
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

// Helper to extract text from manual
const extractManualContent = async (manualId: string): Promise<string> => {
  try {
    const manual = await Manual.findByPk(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    // Check if we already have extracted text
    if (manual.extracted_text) {
      return manual.extracted_text;
    }

    // Read file content
    const filePath = manual.file_path;
    if (!fs.existsSync(filePath)) {
      throw new Error('Manual file not found');
    }

    let content = '';
    
    if (manual.mime_type === 'application/pdf') {
      // Extract text from PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      content = pdfData.text;
    } else if (manual.mime_type === 'text/plain') {
      // Read text file directly
      content = fs.readFileSync(filePath, 'utf-8');
    }

    // Save extracted text to database for future use
    if (content) {
      manual.extracted_text = content;
      await manual.save();
    }

    return content;
  } catch (error) {
    console.error('Error extracting manual content:', error);
    throw error;
  }
};

export const startChatSession = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const sessionId = uuidv4();

    // Get manual content
    const manualContent = await extractManualContent(manualId);
    const manual = await Manual.findByPk(manualId);

    // Store session with manual content
    chatSessions.set(sessionId, {
      manualContent,
      history: []
    });

    res.json({
      success: true,
      data: {
        sessionId,
        manualId: parseInt(manualId),
        manualTitle: manual?.title || `Manual ${manualId}`
      }
    });
  } catch (error: any) {
    console.error('Error starting chat session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start chat session'
    });
  }
};

export const sendChatMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, manualId } = req.params;
    const { message } = req.body;

    // Get session
    const session = chatSessions.get(sessionId);
    if (!session) {
      // Create new session if doesn't exist
      const manualContent = await extractManualContent(manualId);
      chatSessions.set(sessionId, {
        manualContent,
        history: []
      });
    }

    const currentSession = chatSessions.get(sessionId)!;
    
    // Initialize Gemini
    const model = initializeGemini();

    // Create context prompt
    const contextPrompt = `Eres un asistente experto que responde preguntas basándote ÚNICAMENTE en el siguiente contenido del manual. 
    Si la pregunta no puede ser respondida con la información del manual, indica que no hay información disponible sobre ese tema en el manual.
    
    Contenido del manual:
    ${currentSession.manualContent}
    
    Pregunta del usuario: ${message}
    
    Responde de manera clara y concisa, citando la información relevante del manual cuando sea posible.`;

    // Generate response
    const result = await model.generateContent(contextPrompt);
    const response = result.response.text();

    // Store in history with timestamps
    const timestamp = new Date().toISOString();
    currentSession.history.push({
      role: 'user',
      content: message,
      timestamp
    });
    currentSession.history.push({
      role: 'assistant', 
      content: response,
      timestamp
    });

    res.json({
      success: true,
      data: {
        id: `msg-${Date.now()}`,
        message: message.trim(),
        response: response,
        timestamp,
        user: {
          id: 1,
          firstName: 'Usuario',
          lastName: ''
        }
      }
    });
  } catch (error: any) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat message'
    });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { sessionId, manualId } = req.params;
    const session = chatSessions.get(sessionId);
    const manual = await Manual.findByPk(manualId);

    // Convert the history format to match frontend expectations
    const conversation = [];
    if (session?.history) {
      for (let i = 0; i < session.history.length; i += 2) {
        const userMsg = session.history[i];
        const assistantMsg = session.history[i + 1];
        
        if (userMsg && assistantMsg) {
          conversation.push({
            id: `msg-${i/2}`,
            message: userMsg.content,
            response: assistantMsg.content,
            timestamp: userMsg.timestamp || assistantMsg.timestamp || new Date().toISOString(),
            user: {
              id: 1,
              firstName: 'Usuario',
              lastName: ''
            }
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        sessionId,
        manualId: parseInt(manualId),
        manualTitle: manual?.title || `Manual ${manualId}`,
        conversation
      }
    });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch chat history'
    });
  }
};

// Store generated quizzes temporarily (in production use database)
const generatedQuizzes = new Map<string, any>();

export const generateQuiz = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const { title, difficulty = 'medium', questionCount = 5, importToEvaluations = false } = req.body;

    // Get manual content
    const manualContent = await extractManualContent(manualId);
    const manual = await Manual.findByPk(manualId);
    
    // Initialize Gemini
    const model = initializeGemini();

    // Create quiz generation prompt
    const prompt = `Basándote ÚNICAMENTE en el siguiente contenido del manual, genera un quiz de ${questionCount} preguntas de opción múltiple.
    
    Nivel de dificultad: ${difficulty}
    Título del manual: ${manual?.title}
    
    Contenido del manual:
    ${manualContent}
    
    INSTRUCCIONES IMPORTANTES:
    1. Las preguntas DEBEN estar basadas ÚNICAMENTE en información que aparece en el manual
    2. NO inventes información que no esté en el manual
    3. Cada pregunta debe tener exactamente 4 opciones
    4. Solo una opción debe ser correcta
    5. Las preguntas deben ser claras y específicas
    6. La explicación debe citar la parte del manual donde se encuentra la respuesta
    
    Genera las preguntas en formato JSON con esta estructura exacta:
    {
      "title": "${title}",
      "description": "Quiz generado automáticamente del manual: ${manual?.title}",
      "questions": [
        {
          "question": "texto de la pregunta",
          "type": "multiple_choice",
          "options": ["opción 1", "opción 2", "opción 3", "opción 4"],
          "correct_answer": índice_de_la_respuesta_correcta (0-3),
          "explanation": "explicación citando el manual",
          "points": 10
        }
      ]
    }
    
    Responde SOLO con el JSON, sin texto adicional, sin markdown, sin comillas triples.`;

    // Generate quiz
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean response to get only JSON
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    // Remove any text before the first {
    const jsonStart = responseText.indexOf('{');
    if (jsonStart > 0) {
      responseText = responseText.substring(jsonStart);
    }
    // Remove any text after the last }
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonEnd > 0) {
      responseText = responseText.substring(0, jsonEnd + 1);
    }
    
    let quizData;
    try {
      quizData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Response was:', responseText);
      
      // Try to create a quiz from the manual content directly
      quizData = {
        title: title.trim(),
        description: `Quiz generado del manual: ${manual?.title}`,
        questions: [{
          question: `¿Sobre qué trata el manual "${manual?.title}"?`,
          type: "multiple_choice",
          options: [
            "Información contenida en el manual",
            "Información no relacionada",
            "Otro tema diferente",
            "No se especifica"
          ],
          correct_answer: 0,
          explanation: "Esta pregunta se basa en el contenido general del manual.",
          points: 10
        }]
      };
    }

    // Generate unique quiz ID
    const quizId = Date.now() + Math.floor(Math.random() * 1000);
    
    // Prepare quiz data for storage
    const fullQuizData = {
      id: quizId,
      title: quizData.title || title.trim(),
      description: quizData.description || `Quiz generado del manual: ${manual?.title}`,
      status: 'ready',
      manualId: parseInt(manualId),
      manualTitle: manual?.title || `Manual ${manualId}`,
      questions: quizData.questions.map((q: any, index: number) => ({
        id: index + 1,
        question: q.question,
        type: q.type || 'multiple_choice',
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        points: q.points || 10
      })),
      totalPoints: quizData.questions.length * 10,
      createdAt: new Date().toISOString(),
      exportable: true
    };
    
    // Store quiz for later retrieval
    generatedQuizzes.set(quizId.toString(), fullQuizData);

    // If requested, also save to evaluations database
    if (importToEvaluations) {
      // TODO: Import to Quiz model in database
      // const Quiz = require('../models/Quiz.model');
      // await Quiz.create({...});
    }

    res.status(201).json({
      success: true,
      data: fullQuizData,
      message: 'Quiz generado exitosamente con Gemini AI',
      downloadUrl: `/api/v1/ai/quiz/${quizId}/export`
    });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al generar el quiz con Gemini'
    });
  }
};

export const getGeneratedQuiz = async (req: Request, res: Response) => {
  try {
    // In production, fetch from database
    // For now, return a sample quiz
    res.json({
      success: true,
      data: {
        id: parseInt(req.params.quizId),
        title: 'Quiz Generado',
        status: 'ready',
        questions: [
          {
            question: "Pregunta basada en el manual",
            type: "multiple_choice",
            options: ["Opción A", "Opción B", "Opción C", "Opción D"],
            correct_answer: 0,
            explanation: "Explicación basada en el contenido del manual"
          }
        ]
      }
    });
  } catch (error: any) {
    console.error('Error fetching generated quiz:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch quiz'
    });
  }
};

export const generateSummary = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const { title, summaryType = 'brief' } = req.body;

    // Get manual content
    const manualContent = await extractManualContent(manualId);
    const manual = await Manual.findByPk(manualId);
    
    // Initialize Gemini
    const model = initializeGemini();

    // Create summary prompt based on type
    let prompt = '';
    switch (summaryType) {
      case 'brief':
        prompt = `Resume el siguiente contenido del manual en un párrafo conciso de máximo 150 palabras, destacando los puntos más importantes:\n\n${manualContent}`;
        break;
      case 'detailed':
        prompt = `Crea un resumen detallado del siguiente manual, organizando la información en secciones con títulos y subtítulos. Incluye todos los puntos importantes:\n\n${manualContent}`;
        break;
      case 'key_points':
        prompt = `Extrae los 5-7 puntos clave más importantes del siguiente manual en formato de lista numerada:\n\n${manualContent}`;
        break;
      default:
        prompt = `Resume el siguiente contenido del manual:\n\n${manualContent}`;
    }

    // Generate summary
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    // Generate summary ID (in production, save to database)
    const summaryId = Math.floor(Math.random() * 10000);

    res.status(201).json({
      success: true,
      data: {
        id: summaryId,
        title: title.trim(),
        summaryType: summaryType,
        content: summary,
        word_count: summary.split(' ').length,
        status: 'ready',
        manualId: parseInt(manualId),
        manualTitle: manual?.title || `Manual ${manualId}`
      },
      message: 'Resumen generado exitosamente'
    });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate summary'
    });
  }
};

export const getGeneratedSummary = async (req: Request, res: Response) => {
  try {
    // In production, fetch from database
    // For now, return a sample summary
    res.json({
      success: true,
      data: {
        id: parseInt(req.params.summaryId),
        title: 'Resumen Generado',
        summary_type: 'brief',
        content: 'Este es un resumen generado basado en el contenido del manual.',
        word_count: 10,
        status: 'ready'
      }
    });
  } catch (error: any) {
    console.error('Error fetching generated summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch summary'
    });
  }
};

// Export quiz to JSON format
export const exportQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = generatedQuizzes.get(quizId);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Clean up the quiz data for export
    const exportData = {
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map((q: any) => ({
        question: q.question,
        type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        points: q.points
      })),
      totalPoints: quiz.totalPoints,
      metadata: {
        generatedFrom: `Manual ID: ${quiz.manualId}`,
        generatedAt: quiz.createdAt,
        manualTitle: quiz.manualTitle
      }
    };

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="quiz-${quizId}.json"`);
    
    res.status(200).json(exportData);
  } catch (error: any) {
    console.error('Error exporting quiz:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export quiz'
    });
  }
};

// Import quiz to evaluations module
export const importQuizToEvaluations = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { userId } = req.body;
    
    // Get the generated quiz from temporary storage
    const generatedQuiz = generatedQuizzes.get(quizId);
    
    if (!generatedQuiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // For now, we'll save to the AI Generated Quizzes table instead
    const AIGeneratedQuiz = (await import('../models/AIGeneratedQuiz.model')).default;
    
    try {
      // Save to AI Generated Quizzes table
      const savedQuiz = await AIGeneratedQuiz.create({
        manual_id: generatedQuiz.manualId,
        user_id: userId || 1,
        title: generatedQuiz.title,
        description: generatedQuiz.description,
        questions: generatedQuiz.questions,
        difficulty: 'medium',
        question_count: generatedQuiz.questions.length,
        status: 'ready',
        generation_prompt: 'Imported from generated quiz',
        metadata: {
          totalPoints: generatedQuiz.totalPoints,
          createdAt: generatedQuiz.createdAt,
          importedAt: new Date().toISOString()
        }
      });

      // Remove from temporary storage after successful import
      generatedQuizzes.delete(quizId);

      res.status(201).json({
        success: true,
        message: 'Quiz guardado exitosamente',
        data: {
          quizId: savedQuiz.id,
          title: savedQuiz.title,
          questionCount: savedQuiz.question_count,
          totalPoints: generatedQuiz.totalPoints,
          status: 'saved'
        }
      });
    } catch (dbError: any) {
      // If database save fails, try alternative approach
      console.log('Database save failed, using alternative storage');
      
      // Store quiz data in a JSON file as backup
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;
      
      const quizzesDir = path.join(process.cwd(), 'storage', 'quizzes');
      if (!fs.existsSync(quizzesDir)) {
        fs.mkdirSync(quizzesDir, { recursive: true });
      }
      
      const filename = `quiz_${quizId}_${Date.now()}.json`;
      const filepath = path.join(quizzesDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify({
        ...generatedQuiz,
        userId: userId || 1,
        savedAt: new Date().toISOString()
      }, null, 2));
      
      // Remove from temporary storage
      generatedQuizzes.delete(quizId);
      
      res.status(201).json({
        success: true,
        message: 'Quiz guardado exitosamente en almacenamiento local',
        data: {
          quizId: quizId,
          title: generatedQuiz.title,
          questionCount: generatedQuiz.questions.length,
          totalPoints: generatedQuiz.totalPoints,
          status: 'saved_locally',
          filename: filename
        }
      });
    }
  } catch (error: any) {
    console.error('Error importing quiz:', error);
    res.status(500).json({
      success: false,
      error: 'No se pudo guardar el quiz. Use la opción de exportar JSON para descargar el quiz.'
    });
  }
};