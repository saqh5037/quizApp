import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

interface Environment {
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  
  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_DIALECT: string;
  DB_LOGGING: boolean;
  DB_POOL_MAX: number;
  DB_POOL_MIN: number;
  DB_POOL_ACQUIRE: number;
  DB_POOL_IDLE: number;
  
  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  
  // CORS
  CORS_ORIGIN: string;
  CORS_CREDENTIALS: boolean;
  
  // Socket.io
  SOCKET_CORS_ORIGIN: string;
  
  // Files
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;
  
  // Frontend
  FRONTEND_URL: string;
  QR_BASE_URL: string;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Logging
  LOG_LEVEL: string;
  LOG_DIR: string;
  
  // Session
  SESSION_SECRET: string;
  SESSION_MAX_AGE: number;
  
  // API
  API_PREFIX: string;
  API_DOCS_ENABLED: boolean;
}

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

// Validate required environment variables
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

export const env: Environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || 'localhost',
  
  // Database
  DB_HOST: process.env.DB_HOST!,
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME!,
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_DIALECT: process.env.DB_DIALECT || 'postgres',
  DB_LOGGING: process.env.DB_LOGGING === 'true',
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '10', 10),
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2', 10),
  DB_POOL_ACQUIRE: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
  DB_POOL_IDLE: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  
  // Socket.io
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
  
  // Files
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  QR_BASE_URL: process.env.QR_BASE_URL || 'http://localhost:5173/join',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  LOG_DIR: process.env.LOG_DIR || './logs',
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'default-session-secret',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
  
  // API
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  API_DOCS_ENABLED: process.env.API_DOCS_ENABLED === 'true',
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';