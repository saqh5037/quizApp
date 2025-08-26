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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-student-info'],
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

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
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
    // Connect to database
    await connectDatabase();
    
    // Start HTTP server
    httpServer.listen(env.PORT, env.HOST, () => {
      logger.info(`
        🚀 Server is running!
        🔊 Listening on http://${env.HOST}:${env.PORT}
        📝 API Prefix: ${env.API_PREFIX}
        🌍 Environment: ${env.NODE_ENV}
        🔌 Socket.IO enabled
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
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