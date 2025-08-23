import { Server, Socket } from 'socket.io';
import { CONSTANTS } from '../config/constants';
import logger from '../utils/logger';
import { 
  JoinSessionData, 
  SubmitAnswerData,
  SocketData 
} from '../types/socket.types';
import { sessionHandlers } from './handlers/session.handlers';
import { quizHandlers } from './handlers/quiz.handlers';
import { authenticateSocket } from './middleware/socket.auth';

export const setupSocketServer = (io: Server): void => {
  // Socket authentication middleware
  io.use(authenticateSocket);

  io.on(CONSTANTS.SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
    const socketData = socket.data as SocketData;
    
    logger.info(`Socket connected: ${socket.id}`, {
      user: socketData.user?.id,
      ip: socket.handshake.address,
    });

    // Session management events
    socket.on(CONSTANTS.SOCKET_EVENTS.CREATE_SESSION, async (data) => {
      await sessionHandlers.createSession(socket, io, data);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.JOIN_SESSION, async (data: JoinSessionData) => {
      await sessionHandlers.joinSession(socket, io, data);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.LEAVE_SESSION, async () => {
      await sessionHandlers.leaveSession(socket, io);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.START_SESSION, async () => {
      await sessionHandlers.startSession(socket, io);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.END_SESSION, async () => {
      await sessionHandlers.endSession(socket, io);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.PAUSE_SESSION, async () => {
      await sessionHandlers.pauseSession(socket, io);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.RESUME_SESSION, async () => {
      await sessionHandlers.resumeSession(socket, io);
    });

    // Quiz flow events
    socket.on(CONSTANTS.SOCKET_EVENTS.NEXT_QUESTION, async () => {
      await quizHandlers.nextQuestion(socket, io);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.PREVIOUS_QUESTION, async () => {
      await quizHandlers.previousQuestion(socket, io);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.SUBMIT_ANSWER, async (data: SubmitAnswerData) => {
      await quizHandlers.submitAnswer(socket, io, data);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.SKIP_QUESTION, async () => {
      await quizHandlers.skipQuestion(socket, io);
    });

    // Results events
    socket.on(CONSTANTS.SOCKET_EVENTS.SHOW_RESULTS, async () => {
      await quizHandlers.showResults(socket, io);
    });

    socket.on(CONSTANTS.SOCKET_EVENTS.HIDE_RESULTS, async () => {
      await quizHandlers.hideResults(socket, io);
    });

    // Disconnect event
    socket.on(CONSTANTS.SOCKET_EVENTS.DISCONNECT, async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      await sessionHandlers.handleDisconnect(socket, io);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
        message: 'An error occurred',
        code: 'SOCKET_ERROR',
      });
    });
  });

  // Periodic cleanup of stale sessions
  setInterval(async () => {
    try {
      // Cleanup logic here
      logger.debug('Running session cleanup');
    } catch (error) {
      logger.error('Session cleanup error:', error);
    }
  }, 60000); // Every minute

  logger.info('Socket.IO server initialized');
};