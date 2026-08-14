/**
 * Regression test for A9: quiz time_limit_minutes was not exposed in the
 * authenticated quiz listing endpoint, causing the frontend to fall back to
 * a hardcoded 10-minute default for every quiz in the list view.
 *
 * The bug had two layers:
 *  1. The listing SQL only selected estimated_time_minutes —
 *     time_limit_minutes was never read from the DB.
 *  2. The response mapping surfaced only estimatedTimeMinutes, so even if the
 *     column was added to the SELECT, the response would still drop it.
 *
 * The listing query later moved out of quiz.simple.controller.ts into
 * quiz.service.ts (listQuizzesForUser). The guarantee did not move — only the
 * code did — so this test now inspects both files: the SQL layer in the
 * service, the response mapping in the controller.
 *
 * We avoid spinning up sequelize/express here — these are cheap source-coupled
 * checks that catch exactly the bug we fixed.
 */

import fs from 'fs';
import path from 'path';

const CONTROLLER_PATH = path.resolve(
  __dirname,
  '../src/controllers/quiz.simple.controller.ts'
);
const SERVICE_PATH = path.resolve(__dirname, '../src/services/quiz.service.ts');

describe('A9 regression — quiz listing exposes timeLimitMinutes', () => {
  let controller: string;
  let service: string;

  beforeAll(() => {
    controller = fs.readFileSync(CONTROLLER_PATH, 'utf8');
    service = fs.readFileSync(SERVICE_PATH, 'utf8');
  });

  test('listing SQL SELECTs q.time_limit_minutes from the quizzes table', () => {
    // The original bug: the SELECT in the listing query only fetched
    // estimated_time_minutes. Anchor on the SELECT-list form (trailing comma)
    // so this cannot be satisfied by the response-mapping line alone.
    expect(service).toMatch(/q\.time_limit_minutes,/);
  });

  test('controller maps timeLimitMinutes in the response payload', () => {
    // The response objects in the listing endpoint must surface
    // timeLimitMinutes for the frontend to render the configured time.
    expect(controller).toMatch(/timeLimitMinutes:\s*q\.time_limit_minutes/);
  });

  test('AI-generated quiz fallback does not silently override the field with a default', () => {
    // AI quizzes get fabricated rows when merged into the listing; ensure the
    // time_limit_minutes field is present on those rows so the response
    // mapping stays consistent (null is fine — it tells the frontend the
    // quiz has no configured limit).
    expect(service).toMatch(/time_limit_minutes:\s*null/);
  });
});
