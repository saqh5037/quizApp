/**
 * AristoTest Backend Server
 * 
 * Main entry point for the AristoTest application backend.
 * Handles HTTP requests, WebSocket connections, and database interactions.
 * 
 * @author Samuel Quiroz
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

import { env, isDevelopment } from './config/environment';
import { connectDatabase } from './config/database';
import { setupAssociations } from './models/associations';
import logger, { stream } from './utils/logger';
import { initGcpLogging } from './utils/gcpLogging';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalRateLimiter } from './middleware/rateLimiter.middleware';
import routes from './routes';
import { setupSocketServer } from './socket/socket.server';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: isDevelopment ? true : env.SOCKET_CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Configure CORS to allow multiple origins
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // In development, allow any origin
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: env.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-student-info', 'Cache-Control'],
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(isDevelopment ? 'dev' : 'combined', { stream }));

// Rate limiting
app.use(generalRateLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Health endpoints.
//
// /health        — legacy alias, kept for backwards compatibility. Liveness only.
// /health/live   — liveness probe: process is up. No DB/MinIO calls.
// /health/ready  — readiness probe: validates DB + MinIO (+ Redis if configured).
//                  Returns 503 if any hard dependency is down so load balancers
//                  and PM2 can stop routing to the instance.
import { runReadinessChecks } from './utils/healthCheck';

const livenessPayload = () => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  environment: env.NODE_ENV,
});

app.get('/health', (_req, res) => res.status(200).json(livenessPayload()));
app.get('/health/live', (_req, res) => res.status(200).json(livenessPayload()));

app.get('/health/ready', async (_req, res) => {
  try {
    const report = await runReadinessChecks();
    const statusCode = report.status === 'down' ? 503 : 200;
    res.status(statusCode).json(report);
  } catch (err: any) {
    logger.error('Readiness check crashed', { error: err?.message || err });
    res.status(503).json({
      status: 'down',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
});

// API routes
app.use(env.API_PREFIX, routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Setup Socket.IO handlers
setupSocketServer(io);

// Start server
const startServer = async () => {
  try {
    // Initialize optional observability (no-op if GCP env vars are missing)
    await initGcpLogging();

    // Connect to database
    await connectDatabase();

    // Start HTTP server
    httpServer.listen(env.PORT, env.HOST, () => {
      logger.info(`Server listening`, {
        host: env.HOST,
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
        environment: env.NODE_ENV,
      });

      // Let PM2 know we're ready to accept traffic (ecosystem.prod.config.js
      // sets wait_ready: true)
      if (typeof process.send === 'function') {
        process.send('ready');
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export { app, httpServer, io };