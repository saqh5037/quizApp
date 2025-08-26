import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    // Don't initialize here to avoid startup errors
  }

  private initialize() {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is required in environment variables');
      }
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      this.initialize();
      const fullPrompt = context 
        ? `Contexto: ${context}\n\nPregunta: ${prompt}\n\nResponde de manera concisa y útil basándote en el contexto proporcionado.`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response with Gemini:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async chatWithManual(message: string, manualContent: string, chatHistory?: Array<{role: string, message: string, response: string}>): Promise<string> {
    try {
      this.initialize();
      let conversationContext = `Manual Content:\n${manualContent}\n\n`;
      
      if (chatHistory && chatHistory.length > 0) {
        conversationContext += "Previous conversation:\n";
        chatHistory.slice(-5).forEach((chat) => {
          conversationContext += `User: ${chat.message}\nAssistant: ${chat.response}\n\n`;
        });
      }

      const prompt = `${conversationContext}
Current question: ${message}

Instructions:
- You are a helpful assistant that answers questions based on the manual content provided
- Always reference specific parts of the manual when possible
- Keep responses concise but informative
- If the question is not related to the manual content, politely redirect the user
- Answer in Spanish
- Be conversational and helpful

Please answer the current question:`;

      return await this.generateResponse(prompt);
    } catch (error) {
      console.error('Error in chat with manual:', error);
      throw new Error('Failed to process chat message');
    }
  }

  async generateQuiz(manualContent: string, difficulty: 'easy' | 'medium' | 'hard', questionCount: number, customPrompt?: string): Promise<any[]> {
    try {
      this.initialize();
      const difficultyInstructions = {
        easy: 'preguntas básicas de comprensión y definiciones simples',
        medium: 'preguntas que requieren análisis y aplicación de conceptos',
        hard: 'preguntas complejas que requieren síntesis y evaluación crítica'
      };

      const basePrompt = customPrompt || `Basándote en el siguiente contenido de manual, genera exactamente ${questionCount} ${difficultyInstructions[difficulty]}.

Manual Content:
${manualContent}

Genera un quiz en formato JSON con la siguiente estructura:
[
  {
    "question": "Texto de la pregunta",
    "type": "multiple_choice",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct_answer": 0,
    "explanation": "Explicación de por qué esta respuesta es correcta",
    "difficulty": "${difficulty}",
    "points": 1
  }
]

Instrucciones:
- Todas las preguntas deben ser tipo "multiple_choice" con exactamente 4 opciones
- El campo "correct_answer" debe ser el índice (0-3) de la respuesta correcta
- Incluye una explicación clara para cada respuesta
- Las preguntas deben cubrir diferentes secciones del manual
- Asegúrate de que solo hay UNA respuesta correcta por pregunta
- Responde SOLO con el JSON válido, sin texto adicional`;

      const response = await this.generateResponse(basePrompt);
      
      // Clean the response to extract only JSON
      let cleanResponse = response.trim();
      
      // Remove any markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Remove any non-JSON text before or after the JSON
      const jsonStart = cleanResponse.indexOf('[');
      const jsonEnd = cleanResponse.lastIndexOf(']') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);
      }

      const questions = JSON.parse(cleanResponse);
      
      // Validate the questions structure
      if (!Array.isArray(questions)) {
        throw new Error('Invalid questions format: not an array');
      }

      questions.forEach((question, index) => {
        if (!question.question || !question.options || !Array.isArray(question.options) || question.options.length !== 4) {
          throw new Error(`Invalid question format at index ${index}`);
        }
        if (typeof question.correct_answer !== 'number' || question.correct_answer < 0 || question.correct_answer > 3) {
          throw new Error(`Invalid correct_answer at index ${index}`);
        }
      });

      return questions;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw new Error('Failed to generate quiz questions');
    }
  }

  async generateSummary(manualContent: string, summaryType: 'brief' | 'detailed' | 'key_points', customPrompt?: string): Promise<string> {
    try {
      this.initialize();
      const summaryInstructions = {
        brief: 'un resumen breve de 2-3 párrafos que capture los puntos más importantes',
        detailed: 'un resumen detallado que cubra todas las secciones principales con ejemplos',
        key_points: 'una lista estructurada con los puntos clave y conceptos principales'
      };

      const basePrompt = customPrompt || `Basándote en el siguiente contenido de manual, genera ${summaryInstructions[summaryType]}.

Manual Content:
${manualContent}

Instrucciones:
- Mantén el tono profesional y educativo
- Organiza la información de manera lógica
- Incluye los conceptos más importantes
- Utiliza español claro y preciso
- ${summaryType === 'key_points' ? 'Usa viñetas o numeración para organizar los puntos' : 'Escribe en párrafos bien estructurados'}

Por favor genera el resumen:`;

      const response = await this.generateResponse(basePrompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  async extractTextFromContent(content: string): Promise<string> {
    try {
      this.initialize();
      const prompt = `Extract and clean the text content from the following input, removing any formatting artifacts, headers, footers, and irrelevant information. Return only the main textual content:

${content}

Please return the cleaned text content:`;

      const response = await this.generateResponse(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error extracting text:', error);
      throw new Error('Failed to extract text content');
    }
  }
}

export default new GeminiService();