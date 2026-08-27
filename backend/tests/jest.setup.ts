/**
 * Global Jest setup — populates environment variables that config/environment.ts
 * requires at import time. Values are intentionally long and random-looking so
 * the weak-secret warning stays quiet in test output.
 */

const RANDOM_32 = '0123456789abcdef0123456789abcdef01234567';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'aristotest_test';
process.env.DB_USER = process.env.DB_USER || 'aristotest';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'aristotest_test_pass';
process.env.JWT_SECRET = process.env.JWT_SECRET || `jwt_${RANDOM_32}`;
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `ref_${RANDOM_32}`;
process.env.SESSION_SECRET = process.env.SESSION_SECRET || `sess_${RANDOM_32}`;
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'test_access';
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'test_secret_longer_than_32_chars_xxx';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
