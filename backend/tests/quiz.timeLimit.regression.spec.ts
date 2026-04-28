/**
 * Regression test for A9: quiz time_limit_minutes was not exposed in the
 * authenticated quiz listing endpoint, causing the frontend to fall back to
 * a hardcoded 10-minute default for every quiz in the list view.
 *
 * The bug had two layers:
 *  1. quiz.simple.controller.ts SQL in getQuizzes() only selected
 *     estimated_time_minutes — time_limit_minutes was never read from the DB.
 *  2. The same controller mapped only estimatedTimeMinutes in the response,
 *     so even if the field was added to the SELECT, the response would
 *     still drop it.
 *
 * This test guards the source against both regressions by inspecting the
 * controller file. We avoid spinning up sequelize/express here — these are
 * cheap source-coupled checks that catch exactly the two-line bug we fixed.
 */

import fs from 'fs';
import path from 'path';

const CONTROLLER_PATH = path.resolve(
  __dirname,
  '../src/controllers/quiz.simple.controller.ts'
);

describe('A9 regression — quiz listing exposes timeLimitMinutes', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(CONTROLLER_PATH, 'utf8');
  });

  test('controller source SELECTs q.time_limit_minutes from the quizzes table', () => {
    // The original bug: the SELECT in the listing query only fetched
    // estimated_time_minutes. We require both columns now.
    expect(source).toMatch(/q\.time_limit_minutes/);
  });

  test('controller maps timeLimitMinutes in the response payload', () => {
    // The response objects in the listing endpoint must surface
    // timeLimitMinutes for the frontend to render the configured time.
    expect(source).toMatch(/timeLimitMinutes:\s*q\.time_limit_minutes/);
  });

  test('AI-generated quiz fallback does not silently override the field with a default', () => {
    // AI quizzes get fabricated rows in the controller; ensure the
    // time_limit_minutes field is present on those rows so the response
    // mapping stays consistent (null is fine — it tells the frontend the
    // quiz has no configured limit).
    expect(source).toMatch(/time_limit_minutes:\s*null/);
  });
});
