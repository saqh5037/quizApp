/**
 * Unit tests for auth.simple.middleware.
 *
 * These tests run without a DB or HTTP server — they exercise the pure
 * behavior of the middleware. They lock in the Fase 0 fix that removed the
 * hardcoded default user, so any regression reintroducing the bypass fails CI.
 */

import jwt from 'jsonwebtoken';
import { simpleAuth } from '../src/middleware/auth.simple.middleware';

const JWT_SECRET = 'unit_test_secret_0123456789abcdef0123456789abcdef';

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('simpleAuth middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  test('rejects request without authorization header', () => {
    const req: any = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    simpleAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  test('rejects request with non-Bearer authorization header', () => {
    const req: any = { headers: { authorization: 'Basic abc123' } };
    const res = makeRes();
    const next = jest.fn();

    simpleAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with literal "undefined" or "null" token', () => {
    for (const fake of ['undefined', 'null', '']) {
      const req: any = { headers: { authorization: `Bearer ${fake}` } };
      const res = makeRes();
      const next = jest.fn();

      simpleAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    }
  });

  test('rejects request with an invalid/expired JWT', () => {
    const req: any = { headers: { authorization: 'Bearer not.a.real.jwt' } };
    const res = makeRes();
    const next = jest.fn();

    simpleAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects valid JWT without a tenant_id claim', () => {
    const token = jwt.sign({ id: 42, email: 'a@b.c', role: 'admin' }, JWT_SECRET);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = jest.fn();

    simpleAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid JWT with tenant_id and attaches it to req.user', () => {
    const payload = { id: 42, email: 'a@b.c', role: 'instructor', tenant_id: 7 };
    const token = jwt.sign(payload, JWT_SECRET);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = jest.fn();

    simpleAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject(payload);
  });

  test('does not silently downgrade to a default user on any failure path', () => {
    // Regression guard: the pre-Fase-0 middleware fell back to
    // { id: 2, role: 'super_admin' } when anything went wrong. Make sure that
    // never happens again regardless of what we throw at it.
    const inputs: Array<any> = [
      { headers: {} },
      { headers: { authorization: 'Bearer ' } },
      { headers: { authorization: 'Bearer undefined' } },
      { headers: { authorization: 'Bearer garbage' } },
      { headers: { authorization: `Bearer ${jwt.sign({ id: 1 }, JWT_SECRET)}` } }, // no tenant
    ];

    for (const req of inputs) {
      const res = makeRes();
      const next = jest.fn();
      simpleAuth(req as any, res, next);
      expect(req.user).toBeUndefined();
      expect(next).not.toHaveBeenCalled();
    }
  });
});
