import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Manual from '../models/Manual.model';
import fs from 'fs';
import pdf from 'pdf-parse';

// Session storage (in production use Redis or database)
const chatSessions = new Map<string, { 
  manualContent: string; 
  manualData: any;
  history: Array<{role: string, content: string}> 
}>();

// Helper to extract text from manual
const extractManualContent = async (manualId: string): Promise<{content: string, data: any}> => {
  try {
    const manual = await Manual.findByPk(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    // Check if we already have extracted text
    if (manual.extracted_text) {
      return {
        content: manual.extracted_text,
        data: manual
      };
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

    return {
      content,
      data: manual
    };
  } catch (error) {
    console.error('Error extracting manual content:', error);
    throw error;
  }
};

// Helper function to search for information in the manual
const searchInManual = (content: string, query: string): string => {
  const queryLower = query.toLowerCase();
  const lines = content.split('\n');
  
  // Common patterns to search for
  const patterns = [
    { key: 'rif', regex: /RIF[:\s]*([A-Z]-?\d{8,10}-?\d?)/i },
    { key: 'telefono', regex: /tel[éeÉE]fonos?[:\s]*([0-9-\s\(\)]+)/i },
    { key: 'direccion', regex: /direcci[óoÓO]n[:\s]*([^.]+)/i },
    { key: 'email', regex: /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i },
    { key: 'horario', regex: /horario[:\s]*([^.]+)/i }
  ];
  
  // Check if query is asking about specific information
  for (const pattern of patterns) {
    if (queryLower.includes(pattern.key)) {
      const match = content.match(pattern.regex);
      if (match) {
        return `Según el manual: ${match[0]}`;
      }
    }
  }
  
  // Find relevant paragraphs
  const relevantLines = [];
  const keywords = query.split(' ').filter(word => word.length > 3);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    // Check if line contains any keyword
    if (keywords.some(keyword => lineLower.includes(keyword.toLowerCase()))) {
      // Get context (2 lines before and after)
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      const context = lines.slice(start, end).join(' ').trim();
      
      if (context.length > 20) {
        relevantLines.push(context);
      }
    }
  }
  
  if (relevantLines.length > 0) {
    // Return the most relevant paragraph
    return `Según el manual: ${relevantLines[0].substring(0, 500)}${relevantLines[0].length > 500 ? '...' : ''}`;
  }
  
  return 'No encontré información específica sobre eso en el manual. Por favor, reformula tu pregunta o consulta otro tema del manual.';
};

export const startChatSession = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const sessionId = uuidv4();

    // Get manual content
    const { content, data } = await extractManualContent(manualId);

    // Store session with manual content
    chatSessions.set(sessionId, {
      manualContent: content,
      manualData: data,
      history: []
    });

    res.json({
      success: true,
      data: {
        sessionId,
        manualId: parseInt(manualId),
        manualTitle: data?.title || `Manual ${manualId}`
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

    // Get or create session
    let session = chatSessions.get(sessionId);
    if (!session) {
      const { content, data } = await extractManualContent(manualId);
      session = {
        manualContent: content,
        manualData: data,
        history: []
      };
      chatSessions.set(sessionId, session);
    }

    // Search for answer in manual content
    const response = searchInManual(session.manualContent, message);

    // Add to history
    session.history.push({
      role: 'user',
      content: message
    });
    session.history.push({
      role: 'assistant',
      content: response
    });

    res.json({
      success: true,
      data: {
        message: message.trim(),
        response: response,
        timestamp: new Date().toISOString(),
        user: null // No user info in this implementation
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

    // Format conversation for frontend
    const formattedConversation = [];
    if (session?.history) {
      for (let i = 0; i < session.history.length; i += 2) {
        const userMsg = session.history[i];
        const aiMsg = session.history[i + 1];
        
        if (userMsg && aiMsg) {
          formattedConversation.push({
            id: `msg-${i}`,
            message: userMsg.content,
            response: aiMsg.content,
            timestamp: new Date().toISOString(),
            user: null // No user info in this implementation
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        sessionId,
        manualId: parseInt(manualId),
        manualTitle: session?.manualData?.title || `Manual ${manualId}`,
        conversation: formattedConversation
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

export const generateQuiz = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const { title, difficulty = 'medium', questionCount = 5 } = req.body;

    // Get manual content
    const { content, data } = await extractManualContent(manualId);
    
    // Extract key information for quiz generation
    const lines = content.split('\n').filter(line => line.trim().length > 30);
    const questions = [];
    
    // Generate questions based on content
    const questionTemplates = [
      {
        extract: /RIF[:\s]*([A-Z]-?\d{8,10}-?\d?)/i,
        question: "¿Cuál es el RIF del laboratorio?",
        generateOptions: (correct: string) => {
          const rifBase = correct.match(/\d+/)?.[0] || '123456789';
          return [
            correct,
            `J-${parseInt(rifBase) + 1}-0`,
            `J-${parseInt(rifBase) - 1}-0`,
            `G-${rifBase}-1`
          ];
        }
      },
      {
        extract: /tel[éeÉE]fonos?[:\s]*([0-9-\s\(\)]+)/i,
        question: "¿Cuál es el número de teléfono de contacto?",
        generateOptions: (correct: string) => {
          const base = correct.replace(/\D/g, '');
          return [
            correct,
            `(0212) ${base.substring(4, 7)}-${base.substring(7)}`,
            `(0414) ${base.substring(4, 7)}-${base.substring(7)}`,
            `(0424) ${base.substring(4, 7)}-${base.substring(7)}`
          ];
        }
      },
      {
        extract: /horario[:\s]*([^.]+)/i,
        question: "¿Cuál es el horario de atención?",
        generateOptions: (correct: string) => [
          correct,
          "8:00 AM - 4:00 PM",
          "9:00 AM - 6:00 PM", 
          "7:00 AM - 3:00 PM"
        ]
      }
    ];
    
    // Try to generate questions from templates
    for (const template of questionTemplates.slice(0, questionCount)) {
      const match = content.match(template.extract);
      if (match) {
        const correctAnswer = match[1] || match[0];
        const options = template.generateOptions(correctAnswer);
        
        questions.push({
          question: template.question,
          type: "multiple_choice",
          options: options,
          correct_answer: 0,
          explanation: `La respuesta correcta según el manual es: ${correctAnswer}`
        });
      }
    }
    
    // Add generic questions if needed
    while (questions.length < questionCount) {
      const randomLine = lines[Math.floor(Math.random() * lines.length)];
      const words = randomLine.split(' ').filter(w => w.length > 4);
      
      if (words.length > 3) {
        const keyword = words[Math.floor(Math.random() * words.length)];
        questions.push({
          question: `¿Qué información proporciona el manual sobre "${keyword}"?`,
          type: "multiple_choice",
          options: [
            randomLine.substring(0, 100),
            "No se menciona en el manual",
            "Se requiere autorización especial",
            "Consultar con el departamento correspondiente"
          ],
          correct_answer: 0,
          explanation: `Esta información se encuentra en el manual: ${randomLine.substring(0, 150)}`
        });
      }
    }

    // Generate quiz ID  
    const quizId = Math.floor(Math.random() * 10000);

    res.status(201).json({
      success: true,
      data: {
        id: quizId,
        title: title.trim(),
        status: 'ready',
        manualId: parseInt(manualId),
        manualTitle: data?.title || `Manual ${manualId}`,
        questions: questions.slice(0, questionCount)
      },
      message: 'Quiz generado exitosamente desde el contenido del manual'
    });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate quiz'
    });
  }
};

export const getGeneratedQuiz = async (req: Request, res: Response) => {
  try {
    // In production, fetch from database
    res.json({
      success: true,
      data: {
        id: parseInt(req.params.quizId),
        title: 'Quiz Generado',
        status: 'ready',
        questions: [
          {
            question: "¿Cuál es el RIF del laboratorio?",
            type: "multiple_choice",
            options: ["J-31234567-8", "J-31234568-8", "J-31234566-8", "G-31234567-1"],
            correct_answer: 0,
            explanation: "El RIF correcto según el manual es J-31234567-8"
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
    const { content, data } = await extractManualContent(manualId);
    
    // Extract key sections
    const lines = content.split('\n');
    const importantLines = lines.filter(line => {
      const l = line.trim();
      return l.length > 30 && (
        l.includes('RIF') ||
        l.includes('Dirección') ||
        l.includes('Teléfono') ||
        l.includes('Horario') ||
        l.includes('importante') ||
        l.includes('obligatorio') ||
        l.includes('debe') ||
        l.includes('procedimiento')
      );
    });

    let summaryContent = '';
    
    switch (summaryType) {
      case 'brief':
        summaryContent = `Manual: ${data?.title || 'Manual de Procedimientos'}\n\n`;
        summaryContent += 'Información clave:\n';
        summaryContent += importantLines.slice(0, 3).map(line => `• ${line.trim()}`).join('\n');
        break;
        
      case 'detailed':
        summaryContent = `Manual Completo: ${data?.title || 'Manual de Procedimientos'}\n\n`;
        summaryContent += '## Información de Contacto\n';
        const contactInfo = lines.filter(l => l.includes('RIF') || l.includes('Teléfono') || l.includes('Dirección'));
        summaryContent += contactInfo.slice(0, 5).join('\n') + '\n\n';
        summaryContent += '## Procedimientos Importantes\n';
        summaryContent += importantLines.slice(0, 10).map(line => `• ${line.trim()}`).join('\n');
        break;
        
      case 'key_points':
        summaryContent = 'Puntos Clave del Manual:\n\n';
        const keyPoints = importantLines.slice(0, 7);
        summaryContent += keyPoints.map((line, index) => `${index + 1}. ${line.trim()}`).join('\n\n');
        break;
        
      default:
        summaryContent = importantLines.slice(0, 5).join('\n');
    }

    // Generate summary ID
    const summaryId = Math.floor(Math.random() * 10000);

    res.status(201).json({
      success: true,
      data: {
        id: summaryId,
        title: title.trim(),
        summaryType: summaryType,
        content: summaryContent,
        word_count: summaryContent.split(' ').length,
        status: 'ready',
        manualId: parseInt(manualId),
        manualTitle: data?.title || `Manual ${manualId}`
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
    res.json({
      success: true,
      data: {
        id: parseInt(req.params.summaryId),
        title: 'Resumen Generado',
        summary_type: 'brief',
        content: 'Este es un resumen del contenido del manual con los puntos más importantes extraídos directamente del documento.',
        word_count: 15,
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