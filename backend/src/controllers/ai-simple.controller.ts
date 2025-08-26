import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Simple AI controller without complex imports
export const startChatSession = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const sessionId = uuidv4();

    // For now, just return a session ID
    res.json({
      success: true,
      data: {
        sessionId,
        manualId: parseInt(manualId),
        manualTitle: `Manual ${manualId}`
      }
    });
  } catch (error) {
    console.error('Error starting chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start chat session'
    });
  }
};

export const sendChatMessage = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    // Mock AI response for now
    const mockResponses = [
      "Según el manual de seguridad, los equipos de protección personal (EPP) son obligatorios en todas las áreas de producción.",
      "El manual establece que en caso de emergencia se debe mantener la calma y seguir los procedimientos establecidos.",
      "Los procedimientos de seguridad incluyen el uso correcto de cascos, gafas de protección y calzado de seguridad.",
      "Para el manejo de sustancias químicas, es importante leer siempre las hojas de seguridad (MSDS) antes de su uso."
    ];

    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    res.json({
      success: true,
      data: {
        message: message.trim(),
        response: response,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    // Mock chat history
    res.json({
      success: true,
      data: {
        sessionId: req.params.sessionId,
        manualId: parseInt(req.params.manualId),
        manualTitle: `Manual ${req.params.manualId}`,
        conversation: []
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
};

export const generateQuiz = async (req: Request, res: Response) => {
  try {
    const { title, difficulty = 'medium', questionCount = 5 } = req.body;

    // Mock quiz generation
    res.status(201).json({
      success: true,
      data: {
        id: Math.floor(Math.random() * 1000),
        title: title.trim(),
        status: 'generating',
        manualId: parseInt(req.params.manualId),
        manualTitle: `Manual ${req.params.manualId}`
      },
      message: 'Quiz generation started. This is a demo response.'
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quiz'
    });
  }
};

export const getGeneratedQuiz = async (req: Request, res: Response) => {
  try {
    // Mock generated quiz
    res.json({
      success: true,
      data: {
        id: parseInt(req.params.quizId),
        title: 'Quiz Demo',
        status: 'ready',
        questions: [
          {
            question: "¿Cuál es el primer paso en caso de emergencia?",
            type: "multiple_choice",
            options: ["Correr", "Mantener la calma", "Gritar", "Llamar por teléfono"],
            correct_answer: 1,
            explanation: "Según el manual, el primer paso es mantener la calma para poder evaluar la situación correctamente."
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching generated quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz'
    });
  }
};

export const generateSummary = async (req: Request, res: Response) => {
  try {
    const { title, summaryType = 'brief' } = req.body;

    // Mock summary generation
    res.status(201).json({
      success: true,
      data: {
        id: Math.floor(Math.random() * 1000),
        title: title.trim(),
        summaryType: summaryType,
        status: 'generating',
        manualId: parseInt(req.params.manualId),
        manualTitle: `Manual ${req.params.manualId}`
      },
      message: 'Summary generation started. This is a demo response.'
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
};

export const getGeneratedSummary = async (req: Request, res: Response) => {
  try {
    // Mock generated summary
    const mockSummary = `Este manual establece los procedimientos de seguridad industrial esenciales para todas las operaciones de la empresa. Los puntos principales incluyen:

1. **Equipos de Protección Personal (EPP)**: Uso obligatorio de cascos, gafas de protección, guantes y calzado de seguridad según el área de trabajo.

2. **Procedimientos de Emergencia**: Protocolo de 5 pasos que incluye mantener la calma, evaluar la situación, alertar al personal de seguridad, evacuar por rutas establecidas y dirigirse al punto de encuentro.

3. **Manejo de Sustancias Químicas**: Lectura obligatoria de hojas de seguridad (MSDS), uso de EPP apropiado y reporte inmediato de derrames.

La seguridad es responsabilidad de todos los empleados y debe ser prioritaria en cada actividad desarrollada en la empresa.`;

    res.json({
      success: true,
      data: {
        id: parseInt(req.params.summaryId),
        title: 'Resumen Demo',
        summary_type: 'brief',
        content: mockSummary,
        word_count: mockSummary.split(' ').length,
        status: 'ready'
      }
    });
  } catch (error) {
    console.error('Error fetching generated summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
};