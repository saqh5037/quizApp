/**
 * Unit tests for ai-quiz.service.ts error types and helpers.
 *
 * Intentionally does NOT call Gemini (would require a real API key and
 * network). The generation logic itself is integration-tested when the
 * feature is exercised end-to-end.
 */

import {
  AIQuizServiceError,
} from '../src/services/ai-quiz.service';

describe('AIQuizServiceError', () => {
  test('preserves message and statusCode', () => {
    const e = new AIQuizServiceError('nope', 418);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('nope');
    expect(e.statusCode).toBe(418);
  });
});

// Validate the service module loads without throwing at import time.
// This catches the most common refactor regression (accidental top-level
// side effect that reads an env var at import).
describe('ai-quiz.service module loads', () => {
  test('importing the module does not throw', () => {
    expect(() => require('../src/services/ai-quiz.service')).not.toThrow();
  });

  test('module exposes the expected public API', () => {
    const mod = require('../src/services/ai-quiz.service');
    expect(typeof mod.generateQuizFromText).toBe('function');
    expect(typeof mod.generateQuizFromManual).toBe('function');
    expect(typeof mod.getGeneratedQuiz).toBe('function');
    expect(mod.AIQuizServiceError).toBeDefined();
  });
});
