import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import logger from '../utils/logger';

export const simpleLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        error: 'Server misconfiguration',
      });
    }

    // Query user from DB. Email is assumed globally unique across tenants.
    const users = (await sequelize.query(
      "SELECT id, email, password, TRIM(CONCAT(first_name, ' ', last_name)) AS name, role, tenant_id, is_active FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1",
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    )) as any[];

    const user = users[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    if (!user.tenant_id) {
      logger.warn('User has no tenant_id', { userId: user.id });
      return res.status(403).json({
        success: false,
        error: 'User does not belong to a tenant',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
        },
        accessToken: token,
      },
    });
  } catch (error) {
    logger.error('Simple login error', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
