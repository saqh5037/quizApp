import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.utils';
import { catchAsync } from '../utils/errorHandler';
import { AuthenticationError, ValidationError, ConflictError } from '../utils/errorHandler';
import { CONSTANTS } from '../config/constants';
import bcrypt from 'bcryptjs';

export const register = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, firstName, lastName, role = 'student' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  // Create new user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    role,
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user);

  // Save refresh token
  await user.update({ refreshToken });

  res.status(201).json({
    success: true,
    message: CONSTANTS.SUCCESS_MESSAGES.REGISTER_SUCCESS,
    data: {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    },
  });
});

export const login = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.scope('withPassword').findOne({ 
    where: { email }
  });
  if (!user) {
    throw new AuthenticationError(CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Check password
  const isValidPassword = await user.validatePassword(password);
  if (!isValidPassword) {
    throw new AuthenticationError(CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AuthenticationError('Account is deactivated');
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user);

  // Update user
  await user.update({
    refreshToken,
    lastLogin: new Date(),
  });

  res.json({
    success: true,
    message: CONSTANTS.SUCCESS_MESSAGES.LOGIN_SUCCESS,
    data: {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    },
  });
});

export const refreshToken = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }

  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Find user
  const user = await User.findByPk(payload.id);
  if (!user || user.refreshToken !== refreshToken) {
    throw new AuthenticationError('Invalid refresh token');
  }

  // Generate new tokens
  const tokens = generateTokenPair(user);

  // Update user
  await user.update({ refreshToken: tokens.refreshToken });

  res.json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});

export const logout = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.currentUser;

  if (user) {
    await user.update({ refreshToken: null });
  }

  res.json({
    success: true,
    message: CONSTANTS.SUCCESS_MESSAGES.LOGOUT_SUCCESS,
  });
});

export const getCurrentUser = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.currentUser;

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    success: true,
    data: {
      user: user.toJSON(),
    },
  });
});

export const updateProfile = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.currentUser;
  const { firstName, lastName } = req.body;

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  await user.update({
    firstName: firstName || user.firstName,
    lastName: lastName || user.lastName,
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toJSON(),
    },
  });
});

export const changePassword = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.currentUser;
  const { currentPassword, newPassword } = req.body;

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // Verify current password
  const isValidPassword = await user.validatePassword(currentPassword);
  if (!isValidPassword) {
    throw new ValidationError('Current password is incorrect');
  }

  // Update password
  await user.update({ password: newPassword });

  // Generate new tokens
  const { accessToken, refreshToken } = generateTokenPair(user);
  await user.update({ refreshToken });

  res.json({
    success: true,
    message: 'Password changed successfully',
    data: {
      accessToken,
      refreshToken,
    },
  });
});