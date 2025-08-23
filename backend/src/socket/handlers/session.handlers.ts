import { Server, Socket } from 'socket.io';
import { QuizSession, Participant, Quiz } from '../../models';
import { CONSTANTS } from '../../config/constants';
import logger from '../../utils/logger';
import { JoinSessionData, SocketData } from '../../types/socket.types';
import { generateUniqueSessionCode } from '../../utils/code.generator';
import QRCode from 'qrcode';
import { env } from '../../config/environment';

export const sessionHandlers = {
  async createSession(socket: Socket, io: Server, data: any) {
    try {
      const socketData = socket.data as SocketData;
      
      if (!socketData.user) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Authentication required to create session',
        });
        return;
      }

      // Generate unique session code
      const sessionCode = await generateUniqueSessionCode(async (code) => {
        const existing = await QuizSession.findOne({ where: { sessionCode: code } });
        return !!existing;
      });

      // Generate QR code
      const qrCodeUrl = `${env.QR_BASE_URL}/${sessionCode}`;
      const qrCode = await QRCode.toDataURL(qrCodeUrl);

      // Create session
      const session = await QuizSession.create({
        sessionCode,
        quizId: data.quizId,
        hostId: socketData.user.id,
        qrCode,
        settings: data.settings || {},
      });

      // Join the host to a room
      socket.join(`session:${session.id}`);
      socket.join(`host:${session.id}`);
      
      socket.data.sessionId = session.id;
      socket.data.sessionCode = sessionCode;

      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_UPDATED, {
        session: {
          id: session.id,
          code: sessionCode,
          qrCode,
          status: session.status,
        },
      });

      logger.info(`Session created: ${sessionCode} by user ${socketData.user.id}`);
    } catch (error) {
      logger.error('Error creating session:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to create session',
      });
    }
  },

  async joinSession(socket: Socket, io: Server, data: JoinSessionData) {
    try {
      const { sessionCode, nickname, userId } = data;
      
      // Find session
      const session = await QuizSession.findOne({
        where: { sessionCode },
        include: [{ model: Quiz, as: 'quiz' }],
      });

      if (!session) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Session not found',
        });
        return;
      }

      if (!session.canJoin()) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Cannot join this session',
        });
        return;
      }

      // Check if nickname is already taken
      const existingParticipant = await Participant.findOne({
        where: {
          sessionId: session.id,
          nickname,
        },
      });

      if (existingParticipant && existingParticipant.status !== 'disconnected') {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Nickname already taken',
        });
        return;
      }

      // Create or update participant
      let participant;
      if (existingParticipant) {
        // Reconnecting participant
        participant = await existingParticipant.update({
          status: 'waiting',
          socketId: socket.id,
        });
      } else {
        participant = await Participant.create({
          sessionId: session.id,
          userId: userId || null,
          nickname,
          socketId: socket.id,
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
        });
      }

      // Join room
      socket.join(`session:${session.id}`);
      socket.data.sessionId = session.id;
      socket.data.participantId = participant.id;
      socket.data.sessionCode = sessionCode;

      // Notify all participants
      io.to(`session:${session.id}`).emit(CONSTANTS.SOCKET_EVENTS.PARTICIPANT_JOINED, {
        participant: {
          id: participant.id,
          nickname: participant.nickname,
        },
      });

      // Send session info to the joining participant
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_UPDATED, {
        session: {
          id: session.id,
          code: sessionCode,
          status: session.status,
          quiz: session.quiz,
        },
        participant: {
          id: participant.id,
          nickname: participant.nickname,
        },
      });

      logger.info(`Participant ${nickname} joined session ${sessionCode}`);
    } catch (error) {
      logger.error('Error joining session:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to join session',
      });
    }
  },

  async leaveSession(socket: Socket, io: Server) {
    try {
      const { sessionId, participantId } = socket.data;
      
      if (!sessionId || !participantId) {
        return;
      }

      const participant = await Participant.findByPk(participantId);
      if (participant) {
        await participant.update({ status: 'disconnected' });
        
        io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.PARTICIPANT_LEFT, {
          participantId,
          nickname: participant.nickname,
        });
      }

      socket.leave(`session:${sessionId}`);
      delete socket.data.sessionId;
      delete socket.data.participantId;
      
      logger.info(`Participant ${participantId} left session`);
    } catch (error) {
      logger.error('Error leaving session:', error);
    }
  },

  async startSession(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId);
      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      await session.update({
        status: 'active',
        startedAt: new Date(),
      });

      // Update all participants to active
      await Participant.update(
        { status: 'active' },
        { where: { sessionId, status: 'waiting' } }
      );

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.SESSION_UPDATED, {
        status: 'active',
        startedAt: session.startedAt,
      });

      logger.info(`Session ${session.sessionCode} started`);
    } catch (error) {
      logger.error('Error starting session:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to start session',
      });
    }
  },

  async endSession(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId);
      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      await session.update({
        status: 'completed',
        endedAt: new Date(),
      });

      // Update all participants
      await Participant.update(
        { status: 'finished', finishedAt: new Date() },
        { where: { sessionId, status: 'active' } }
      );

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.SESSION_UPDATED, {
        status: 'completed',
        endedAt: session.endedAt,
      });

      // Send final results
      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.FINAL_RESULTS, {
        // Add final results data here
      });

      logger.info(`Session ${session.sessionCode} ended`);
    } catch (error) {
      logger.error('Error ending session:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to end session',
      });
    }
  },

  async pauseSession(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId);
      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      await session.update({ status: 'paused' });

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.SESSION_UPDATED, {
        status: 'paused',
      });

      logger.info(`Session ${session.sessionCode} paused`);
    } catch (error) {
      logger.error('Error pausing session:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to pause session',
      });
    }
  },

  async resumeSession(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId);
      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      await session.update({ status: 'active' });

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.SESSION_UPDATED, {
        status: 'active',
      });

      logger.info(`Session ${session.sessionCode} resumed`);
    } catch (error) {
      logger.error('Error resuming session:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to resume session',
      });
    }
  },

  async handleDisconnect(socket: Socket, io: Server) {
    try {
      const { sessionId, participantId } = socket.data;
      
      if (participantId) {
        const participant = await Participant.findByPk(participantId);
        if (participant) {
          await participant.update({ 
            status: 'disconnected',
            socketId: null,
          });
          
          io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.PARTICIPANT_LEFT, {
            participantId,
            nickname: participant.nickname,
            disconnected: true,
          });
        }
      }
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  },
};