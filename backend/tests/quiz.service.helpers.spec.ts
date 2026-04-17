/**
 * Unit tests for quiz.service.ts helpers.
 *
 * Verifies:
 *  - AI quiz ID offset encoding/decoding (regression guard against future
 *    attempts to "clean up" the +100000 convention).
 *  - QuizServiceError statusCode mapping.
 */

import {
  AI_QUIZ_ID_OFFSET,
  isAiQuizId,
  toAiQuizId,
  toClientAiQuizId,
  QuizServiceError,
  NotFound,
  Forbidden,
  BadRequest,
} from '../src/services/quiz.service';

describe('AI quiz ID helpers', () => {
  test('AI_QUIZ_ID_OFFSET is 100_000', () => {
    expect(AI_QUIZ_ID_OFFSET).toBe(100_000);
  });

  test('isAiQuizId recognizes ids above the offset', () => {
    expect(isAiQuizId(100_001)).toBe(true);
    expect(isAiQuizId(250_000)).toBe(true);
  });

  test('isAiQuizId rejects ids at or below the offset', () => {
    expect(isAiQuizId(100_000)).toBe(false);
    expect(isAiQuizId(1)).toBe(false);
    expect(isAiQuizId(0)).toBe(false);
  });

  test('toAiQuizId undoes the offset', () => {
    expect(toAiQuizId(100_042)).toBe(42);
    expect(toAiQuizId(100_001)).toBe(1);
  });

  test('toClientAiQuizId applies the offset', () => {
    expect(toClientAiQuizId(42)).toBe(100_042);
    expect(toClientAiQuizId(1)).toBe(100_001);
  });

  test('round trip is identity', () => {
    for (const internal of [1, 2, 100, 9999]) {
      expect(toAiQuizId(toClientAiQuizId(internal))).toBe(internal);
    }
  });
});

describe('QuizServiceError', () => {
  test('NotFound maps to 404', () => {
    const e = NotFound();
    expect(e).toBeInstanceOf(QuizServiceError);
    expect(e.statusCode).toBe(404);
    expect(e.message).toBe('Quiz not found');
  });

  test('NotFound accepts a custom message', () => {
    expect(NotFound('custom').message).toBe('custom');
  });

  test('Forbidden maps to 403', () => {
    expect(Forbidden().statusCode).toBe(403);
  });

  test('BadRequest maps to 400', () => {
    expect(BadRequest('missing title').statusCode).toBe(400);
    expect(BadRequest('missing title').message).toBe('missing title');
  });
});
