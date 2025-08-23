import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { User } from '../models';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenVersion?: number;
}

export const generateAccessToken = (user: User): string => {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export const generateRefreshToken = (user: User): string => {
  const payload: RefreshTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: 1, // Can be used to invalidate tokens
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const generateTokenPair = (user: User) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};