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
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

  async generateStudyGuide(
    manualContent: string, 
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced', 
    estimatedTime: number, 
    learningObjectives: string[], 
    customPrompt?: string
  ): Promise<string> {
    try {
      this.initialize();
      const difficultyInstructions = {
        beginner: 'conceptos básicos y fundamentos, con explicaciones simples y ejemplos claros',
        intermediate: 'aplicación práctica de conceptos con casos de uso y ejercicios',
        advanced: 'análisis profundo, síntesis de información compleja y pensamiento crítico'
      };

      const objectivesText = learningObjectives.length > 0 
        ? `\nObjetivos de aprendizaje específicos:\n${learningObjectives.map(obj => `- ${obj}`).join('\n')}`
        : '';

      const basePrompt = customPrompt || `Basándote en el siguiente contenido de manual, genera una guía de estudio completa para nivel ${difficultyLevel}.

Manual Content:
${manualContent}

Tiempo estimado de estudio: ${estimatedTime} minutos
Nivel de dificultad: ${difficultyLevel} (${difficultyInstructions[difficultyLevel]})${objectivesText}

Estructura de la guía de estudio:

1. **Introducción y Objetivos**
   - Resumen del contenido
   - Objetivos de aprendizaje claros
   - Tiempo estimado por sección

2. **Conceptos Clave**
   - Definiciones importantes
   - Términos técnicos
   - Fundamentos teóricos

3. **Contenido Principal**
   - Desarrollo de temas principales
   - Explicaciones detalladas
   - Ejemplos prácticos
   - Casos de estudio (si aplica)

4. **Ejercicios y Actividades**
   - Preguntas de repaso
   - Ejercicios prácticos
   - Actividades de aplicación

5. **Recursos Adicionales**
   - Enlaces conceptuales
   - Materiales complementarios sugeridos
   - Próximos pasos para profundizar

6. **Evaluación**
   - Criterios de comprensión
   - Lista de verificación de aprendizaje
   - Preguntas de autoevaluación

Instrucciones:
- Adapta el contenido al nivel ${difficultyLevel}
- Incluye ejemplos prácticos y relevantes
- Estructura el contenido de forma pedagógica
- Utiliza español claro y profesional
- Divide el contenido en secciones manejables
- Incluye elementos interactivos cuando sea posible

Por favor genera la guía de estudio:`;

      const response = await this.generateResponse(basePrompt);
      return response.trim();
    } catch (error) {
      console.error('Error generating study guide:', error);
      throw new Error('Failed to generate study guide');
    }
  }

  async generateFlashCards(
    manualContent: string, 
    cardCount: number, 
    difficulty: 'easy' | 'medium' | 'hard', 
    categories: string[], 
    customPrompt?: string
  ): Promise<any[]> {
    try {
      this.initialize();
      const difficultyInstructions = {
        easy: 'definiciones básicas, conceptos simples y preguntas directas',
        medium: 'aplicación de conceptos, relaciones entre ideas y análisis',
        hard: 'síntesis compleja, evaluación crítica y resolución de problemas avanzados'
      };

      const categoriesText = categories.length > 0 
        ? `\nCategorías específicas a cubrir:\n${categories.map(cat => `- ${cat}`).join('\n')}`
        : '';

      const basePrompt = customPrompt || `Basándote en el siguiente contenido de manual, genera exactamente ${cardCount} tarjetas de estudio (flashcards) con nivel de dificultad ${difficulty}.

Manual Content:
${manualContent}

Dificultad: ${difficulty} (${difficultyInstructions[difficulty]})${categoriesText}

Genera las tarjetas en formato JSON con la siguiente estructura:
[
  {
    "front": "Pregunta o concepto en el frente de la tarjeta",
    "back": "Respuesta completa y explicación",
    "category": "Categoría del tema",
    "difficulty": "${difficulty}",
    "tags": ["tag1", "tag2"],
    "hints": "Pista opcional para ayudar con la respuesta"
  }
]

Instrucciones:
- Crea preguntas variadas que cubran diferentes aspectos del manual
- Las preguntas del frente deben ser claras y concisas
- Las respuestas del reverso deben ser completas pero no excesivamente largas
- Incluye una categoría relevante para cada tarjeta
- Añade 2-3 tags relacionados por tarjeta
- Proporciona pistas útiles cuando sea apropiado
- Distribuye las tarjetas entre diferentes temas del manual
- Asegúrate de que las tarjetas sean educativas y prácticas
- Utiliza español claro y preciso
- Responde SOLO con el JSON válido, sin texto adicional

Genera las ${cardCount} tarjetas:`;

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

      const cards = JSON.parse(cleanResponse);
      
      // Validate the cards structure
      if (!Array.isArray(cards)) {
        throw new Error('Invalid cards format: not an array');
      }

      cards.forEach((card, index) => {
        if (!card.front || !card.back) {
          throw new Error(`Invalid card format at index ${index}: missing front or back`);
        }
        if (!card.category) {
          card.category = categories[0] || 'General';
        }
        if (!card.tags || !Array.isArray(card.tags)) {
          card.tags = [];
        }
      });

      return cards;
    } catch (error) {
      console.error('Error generating flash cards:', error);
      throw new Error('Failed to generate flash cards');
    }
  }

  async extractTopics(manualContent: string): Promise<string[]> {
    try {
      this.initialize();
      const prompt = `Analiza el siguiente contenido de manual y extrae los temas principales. Devuelve una lista de 5-10 temas clave que representen las áreas principales de contenido.

Manual Content:
${manualContent}

Instrucciones:
- Identifica los temas más importantes y relevantes
- Usa nombres concisos pero descriptivos
- Evita duplicados o temas muy similares
- Ordena por importancia/relevancia
- Responde con una lista en formato JSON simple

Ejemplo de formato de respuesta:
["Tema 1", "Tema 2", "Tema 3", "Tema 4", "Tema 5"]

Extrae los temas principales:`;

      const response = await this.generateResponse(prompt);
      
      // Clean and parse response
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const arrayStart = cleanResponse.indexOf('[');
      const arrayEnd = cleanResponse.lastIndexOf(']') + 1;
      
      if (arrayStart !== -1 && arrayEnd !== -1) {
        cleanResponse = cleanResponse.substring(arrayStart, arrayEnd);
      }

      const topics = JSON.parse(cleanResponse);
      
      if (!Array.isArray(topics)) {
        throw new Error('Invalid topics format: not an array');
      }

      return topics.filter(topic => typeof topic === 'string' && topic.trim().length > 0);
    } catch (error) {
      console.error('Error extracting topics:', error);
      // Return default topics if extraction fails
      return ['Conceptos principales', 'Procedimientos', 'Definiciones', 'Aplicaciones prácticas'];
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