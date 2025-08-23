import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { verifyAccessToken } from '../../utils/jwt.utils';
import logger from '../../utils/logger';

export const authenticateSocket = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
): Promise<void> => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (token) {
      try {
        const payload = verifyAccessToken(token.replace('Bearer ', ''));
        socket.data.user = {
          id: payload.id,
          email: payload.email,
          role: payload.role,
        };
      } catch (error) {
        // Token is invalid, but we allow guest connections
        logger.debug('Invalid token for socket connection, continuing as guest');
      }
    }

    // Store connection metadata
    socket.data.connectedAt = new Date();
    socket.data.ip = socket.handshake.address;
    
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};