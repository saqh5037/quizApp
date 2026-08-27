/**
 * Unit tests for config/environment.ts — verifies that required env vars are
 * enforced and that SESSION_SECRET/MINIO_* no longer have unsafe defaults.
 *
 * We use `jest.isolateModules` to re-import the module with a different
 * environment on each test so the top-level validation runs fresh every time.
 */

describe('environment config', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('throws when SESSION_SECRET is missing', () => {
    delete process.env.SESSION_SECRET;

    expect(() => {
      jest.isolateModules(() => {
        // Importing the module runs the validation at the top of the file.
        require('../src/config/environment');
      });
    }).toThrow(/SESSION_SECRET/);
  });

  test('throws when MINIO_ACCESS_KEY is missing', () => {
    delete process.env.MINIO_ACCESS_KEY;

    expect(() => {
      jest.isolateModules(() => {
        require('../src/config/environment');
      });
    }).toThrow(/MINIO_ACCESS_KEY/);
  });

  test('throws when MINIO_SECRET_KEY is missing', () => {
    delete process.env.MINIO_SECRET_KEY;

    expect(() => {
      jest.isolateModules(() => {
        require('../src/config/environment');
      });
    }).toThrow(/MINIO_SECRET_KEY/);
  });

  test('loads successfully with all required vars present', () => {
    expect(() => {
      jest.isolateModules(() => {
        const { env } = require('../src/config/environment');
        expect(env.SESSION_SECRET).toBeDefined();
        expect(env.SESSION_SECRET).not.toMatch(/^default-/i);
      });
    }).not.toThrow();
  });
});
