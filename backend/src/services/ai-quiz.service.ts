/**
 * ai-quiz.service.ts — AI quiz generation with retry + timeout + persistence.
 *
 * Fase 5 deliverable. Closes the competitive gap with Kahoot/Quizizz by
 * letting users generate a quiz from **pasted text** in addition to the
 * existing "from a manual" flow.
 *
 * Key differences from the legacy ai-gemini.controller generateQuiz:
 *   - Persists results to the `ai_generated_quizzes` table from day one
 *     (the legacy flow kept them in an in-memory Map that died on PM2 restart).
 *   - Enforces tenant isolation: every row is tagged with the caller's tenant.
 *   - Wraps Gemini calls with a hard timeout and one retry to absorb
 *     transient failures.
 *   - Validates source length (Gemini has a context limit) and clamps
 *     question count to a sane range.
 *   - Returns structured errors so the controller can map to proper HTTP
 *     status codes.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import AIGeneratedQuiz from '../models/AIGeneratedQuiz.model';
import Manual from '../models/Manual.model';
import logger from '../utils/logger';
import fs from 'fs';
import pdf from 'pdf-parse';

export class AIQuizServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const BadRequest = (msg: string) => new AIQuizServiceError(msg, 400);
const NotFound = (msg: string) => new AIQuizServiceError(msg, 404);
const ServerError = (msg: string) => new AIQuizServiceError(msg, 500);
const ServiceUnavailable = (msg: string) => new AIQuizServiceError(msg, 503);

// Clamp range for the AI — very short content won't make a real quiz,
// very long content blows past Gemini's context window.
const MIN_SOURCE_CHARS = 200;
const MAX_SOURCE_CHARS = 60_000;
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 30;
const GEMINI_TIMEOUT_MS = 45_000;
const GEMINI_RETRIES = 1;

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GenerateFromTextInput {
  title: string;
  sourceText: string;
  numberOfQuestions: number;
  difficulty?: Difficulty;
  questionTypes?: QuestionType[];
  language?: 'es' | 'en';
}

export interface GenerateFromManualInput {
  manualId: number;
  title?: string;
  numberOfQuestions: number;
  difficulty?: Difficulty;
  questionTypes?: QuestionType[];
  language?: 'es' | 'en';
}

export interface UserContext {
  id: number;
  tenant_id: number;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    type: QuestionType;
    options?: string[];
    correctAnswer: any;
    explanation?: string;
    points?: number;
  }>;
}

// -----------------------------------------------------------------------------
// Gemini client
// -----------------------------------------------------------------------------

const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw ServiceUnavailable('AI service is not configured (GEMINI_API_KEY missing)');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);

const callGemini = async (prompt: string): Promise<string> => {
  const model = getGeminiModel();
  let lastErr: any;
  for (let attempt = 0; attempt <= GEMINI_RETRIES; attempt++) {
    try {
      const result = await withTimeout(
        model.generateContent(prompt),
        GEMINI_TIMEOUT_MS,
        'gemini.generateContent'
      );
      return result.response.text();
    } catch (err: any) {
      lastErr = err;
      logger.warn('Gemini call failed', {
        attempt: attempt + 1,
        error: err?.message || err,
      });
      // Don't retry on configuration errors
      if (String(err?.message || '').toLowerCase().includes('api key')) {
        throw ServiceUnavailable('AI service authentication failed');
      }
    }
  }
  throw ServiceUnavailable(`AI service unavailable: ${lastErr?.message || 'unknown'}`);
};

// -----------------------------------------------------------------------------
// Prompt builder
// -----------------------------------------------------------------------------

const buildPrompt = (input: {
  title: string;
  sourceText: string;
  numberOfQuestions: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  language: 'es' | 'en';
}): string => {
  const lang = input.language === 'en' ? 'English' : 'español';
  const typeList = input.questionTypes.join(', ');

  return `You are a quiz generator. Generate a quiz with ${input.numberOfQuestions} questions in ${lang} based STRICTLY on the following source material.

Title: ${input.title}
Difficulty: ${input.difficulty}
Allowed question types: ${typeList}

Source material (do NOT fabricate facts outside this text):
---
${input.sourceText}
---

Rules:
1. Every question must be answerable from the source alone.
2. For multiple_choice: exactly 4 options, exactly one correct.
3. For true_false: the "options" array must be ["True", "False"] (or Spanish equivalent).
4. For short_answer: omit "options", put the canonical answer string in "correctAnswer".
5. Each question must have an "explanation" citing the relevant part of the source.
6. Assign "points": 10 by default, 15 for hard, 5 for easy.

Respond with ONLY a JSON object (no markdown, no triple backticks) in this exact shape:
{
  "title": "${input.title}",
  "description": "<one-sentence summary of what the quiz covers>",
  "questions": [
    {
      "question": "<question text>",
      "type": "<one of: ${typeList}>",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": <index (number) for multiple_choice/true_false, or string for short_answer>,
      "explanation": "<why, citing source>",
      "points": 10
    }
  ]
}`;
};

// -----------------------------------------------------------------------------
// Response parsing
// -----------------------------------------------------------------------------

const parseGeminiResponse = (raw: string): GeneratedQuiz => {
  let cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw ServerError('AI response did not contain valid JSON');
  }
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    logger.warn('Failed to parse Gemini JSON response', { error: err?.message });
    throw ServerError('AI response was not valid JSON');
  }

  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw ServerError('AI response did not contain any questions');
  }

  // Normalize each question so downstream code doesn't have to defend
  // against sloppy Gemini output.
  const questions = parsed.questions.map((q: any, i: number) => ({
    question: String(q.question || q.text || `Question ${i + 1}`).trim(),
    type: (q.type || 'multiple_choice') as QuestionType,
    options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : undefined,
    correctAnswer: q.correctAnswer ?? q.correct_answer ?? q.correct ?? 0,
    explanation: q.explanation ? String(q.explanation) : undefined,
    points: typeof q.points === 'number' ? q.points : 10,
  }));

  return {
    title: String(parsed.title || 'Generated Quiz'),
    description: String(parsed.description || ''),
    questions,
  };
};

// -----------------------------------------------------------------------------
// Input validation
// -----------------------------------------------------------------------------

const normalizeInput = (input: {
  title?: string;
  sourceText: string;
  numberOfQuestions?: number;
  difficulty?: string;
  questionTypes?: string[];
  language?: string;
}): {
  title: string;
  sourceText: string;
  numberOfQuestions: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  language: 'es' | 'en';
} => {
  if (!input.sourceText || typeof input.sourceText !== 'string') {
    throw BadRequest('sourceText is required');
  }
  const sourceText = input.sourceText.trim();
  if (sourceText.length < MIN_SOURCE_CHARS) {
    throw BadRequest(`Source text must be at least ${MIN_SOURCE_CHARS} characters`);
  }
  if (sourceText.length > MAX_SOURCE_CHARS) {
    throw BadRequest(`Source text must be at most ${MAX_SOURCE_CHARS} characters`);
  }

  const numberOfQuestions = Math.max(
    MIN_QUESTIONS,
    Math.min(MAX_QUESTIONS, Number(input.numberOfQuestions) || 5)
  );

  const difficulty: Difficulty = ['easy', 'medium', 'hard'].includes(input.difficulty as any)
    ? (input.difficulty as Difficulty)
    : 'medium';

  const allowedTypes: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer'];
  const requestedTypes = Array.isArray(input.questionTypes) && input.questionTypes.length > 0
    ? (input.questionTypes.filter((t: any) => allowedTypes.includes(t)) as QuestionType[])
    : (['multiple_choice'] as QuestionType[]);

  const language: 'es' | 'en' = input.language === 'en' ? 'en' : 'es';

  return {
    title: (input.title || 'Generated Quiz').trim(),
    sourceText,
    numberOfQuestions,
    difficulty,
    questionTypes: requestedTypes.length > 0 ? requestedTypes : ['multiple_choice'],
    language,
  };
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Generate a quiz from a block of pasted text and persist it to
 * ai_generated_quizzes, scoped to the caller's tenant.
 */
export const generateQuizFromText = async (
  rawInput: GenerateFromTextInput,
  user: UserContext
): Promise<AIGeneratedQuiz> => {
  const input = normalizeInput(rawInput);

  const prompt = buildPrompt(input);
  const raw = await callGemini(prompt);
  const quiz = parseGeminiResponse(raw);

  // Persist
  const record = await AIGeneratedQuiz.create({
    title: quiz.title || input.title,
    description: quiz.description,
    difficulty: input.difficulty,
    question_count: quiz.questions.length,
    questions: { questions: quiz.questions },
    status: 'ready',
    user_id: user.id,
    tenant_id: user.tenant_id,
    metadata: {
      source: 'text',
      sourceLength: input.sourceText.length,
      language: input.language,
      questionTypes: input.questionTypes,
      generatedAt: new Date().toISOString(),
    },
  });

  logger.info('AI quiz generated from text', {
    aiQuizId: record.id,
    tenantId: user.tenant_id,
    userId: user.id,
    questions: quiz.questions.length,
  });

  return record;
};

/**
 * Generate a quiz from an existing manual. Enforces tenant isolation on the
 * manual lookup (the legacy endpoint skipped this).
 */
export const generateQuizFromManual = async (
  rawInput: GenerateFromManualInput,
  user: UserContext
): Promise<AIGeneratedQuiz> => {
  const manual = await Manual.findOne({
    where: { id: rawInput.manualId, tenant_id: user.tenant_id },
  });

  if (!manual) {
    throw NotFound('Manual not found or access denied');
  }

  // Extract text from the manual (reuses the existing logic inline)
  let content = (manual.get('extracted_text') as string) || '';
  if (!content) {
    const filePath = manual.get('file_path') as string;
    if (!filePath || !fs.existsSync(filePath)) {
      throw ServerError('Manual file not found on disk');
    }
    const mime = manual.get('mime_type') as string;
    if (mime === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      content = pdfData.text;
    } else if (mime === 'text/plain') {
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      throw BadRequest(`Unsupported manual mime type: ${mime}`);
    }
    // Cache for future generations
    try {
      await (manual as any).update({ extracted_text: content });
    } catch (e) {
      logger.debug('Failed to cache extracted text', { error: e });
    }
  }

  return generateQuizFromText(
    {
      title: rawInput.title || (manual.get('title') as string) || 'Generated Quiz',
      sourceText: content,
      numberOfQuestions: rawInput.numberOfQuestions,
      difficulty: rawInput.difficulty,
      questionTypes: rawInput.questionTypes,
      language: rawInput.language,
    },
    user
  );
};

/**
 * Fetch a generated quiz by ID, enforcing tenant isolation.
 */
export const getGeneratedQuiz = async (
  id: number,
  user: UserContext
): Promise<AIGeneratedQuiz> => {
  const quiz = await AIGeneratedQuiz.findOne({
    where: { id, tenant_id: user.tenant_id },
  });
  if (!quiz) throw NotFound('Generated quiz not found');
  return quiz;
};
