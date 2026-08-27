/**
 * Unit tests for session.service scoreAnswer — the pure scoring function
 * extracted from the old 900-line controller. No DB, no mocks needed.
 *
 * Locks in the existing scoring semantics so future refactors can't
 * silently change how quiz answers are graded.
 */

import { scoreAnswer } from '../src/services/session.service';

describe('scoreAnswer', () => {
  describe('multiple_choice', () => {
    const q = { question_type: 'multiple_choice', correct_answers: [2] };

    test('correct', () => {
      expect(scoreAnswer(q, [2])).toBe(true);
    });
    test('wrong', () => {
      expect(scoreAnswer(q, [1])).toBe(false);
    });
    test('null answer', () => {
      expect(scoreAnswer(q, null)).toBe(false);
    });
  });

  describe('true_false', () => {
    const q = { question_type: 'true_false', correct_answers: [true] };

    test('true correct', () => {
      expect(scoreAnswer(q, [true])).toBe(true);
    });
    test('false wrong', () => {
      expect(scoreAnswer(q, [false])).toBe(false);
    });
  });

  describe('short_answer', () => {
    const q = {
      question_type: 'short_answer',
      correct_answers: ['París', 'paris'],
    };

    test('exact match', () => {
      expect(scoreAnswer(q, 'París')).toBe(true);
    });
    test('case insensitive', () => {
      expect(scoreAnswer(q, 'PARIS')).toBe(true);
    });
    test('whitespace tolerant', () => {
      expect(scoreAnswer(q, '  paris  ')).toBe(true);
    });
    test('wrong', () => {
      expect(scoreAnswer(q, 'Londres')).toBe(false);
    });

    test('accepts a single-string correct_answers (non-array)', () => {
      const q2 = { question_type: 'short_answer', correct_answers: 'Madrid' };
      expect(scoreAnswer(q2, 'madrid')).toBe(true);
      expect(scoreAnswer(q2, 'MADRID')).toBe(true);
      expect(scoreAnswer(q2, 'Barcelona')).toBe(false);
    });
  });

  describe('multiple_select', () => {
    const q = { question_type: 'multiple_select', correct_answers: [1, 3, 5] };

    test('all correct, same order', () => {
      expect(scoreAnswer(q, [1, 3, 5])).toBe(true);
    });
    test('all correct, different order', () => {
      expect(scoreAnswer(q, [5, 1, 3])).toBe(true);
    });
    test('partial is not correct', () => {
      expect(scoreAnswer(q, [1, 3])).toBe(false);
    });
    test('superset is not correct', () => {
      expect(scoreAnswer(q, [1, 3, 5, 7])).toBe(false);
    });
    test('non-array user answer is wrong', () => {
      expect(scoreAnswer(q, 'foo')).toBe(false);
    });
  });

  describe('dropdown', () => {
    const q = { question_type: 'dropdown', correct_answers: ['2'] };

    test('correct', () => {
      expect(scoreAnswer(q, 2)).toBe(true);
    });
    test('string/number coercion', () => {
      expect(scoreAnswer(q, '2')).toBe(true);
    });
    test('wrong', () => {
      expect(scoreAnswer(q, 3)).toBe(false);
    });
  });

  describe('multiple_choice_grid', () => {
    const q = {
      question_type: 'multiple_choice_grid',
      correct_answers: { rowA: 1, rowB: 2, rowC: 0 },
    };

    test('all rows correct', () => {
      expect(scoreAnswer(q, { rowA: 1, rowB: 2, rowC: 0 })).toBe(true);
    });
    test('one row wrong', () => {
      expect(scoreAnswer(q, { rowA: 1, rowB: 9, rowC: 0 })).toBe(false);
    });
    test('missing row', () => {
      expect(scoreAnswer(q, { rowA: 1, rowB: 2 })).toBe(false);
    });
    test('non-object answer', () => {
      expect(scoreAnswer(q, 'nope')).toBe(false);
    });
  });

  describe('checkbox_grid', () => {
    const q = {
      question_type: 'checkbox_grid',
      correct_answers: { rowA: [1, 3], rowB: [0] },
    };

    test('all rows correct (order-insensitive)', () => {
      expect(scoreAnswer(q, { rowA: [3, 1], rowB: [0] })).toBe(true);
    });
    test('row missing selection', () => {
      expect(scoreAnswer(q, { rowA: [1], rowB: [0] })).toBe(false);
    });
    test('row extra selection', () => {
      expect(scoreAnswer(q, { rowA: [1, 3, 5], rowB: [0] })).toBe(false);
    });
  });

  describe('unknown question type', () => {
    test('returns false', () => {
      const q = { question_type: 'drawing', correct_answers: 'whatever' };
      expect(scoreAnswer(q, 'anything')).toBe(false);
    });
  });
});
