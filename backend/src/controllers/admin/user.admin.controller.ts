import { Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sequelize } from '../../config/database';
import User from '../../models/User.model';
import Tenant from '../../models/Tenant.model';
import TenantUser from '../../models/TenantUser.model';
import AuditLog from '../../models/AuditLog.model';

export class UserAdminController {
  // GET /api/v1/admin/users
  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const tenantId = req.query.tenant_id as string;
      const role = req.query.role as string;
      const status = req.query.status as string;

      // Build where clause
      const whereClause: any = {};

      if (search) {
        whereClause[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { first_name: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (tenantId) {
        whereClause.tenant_id = tenantId;
      }

      if (role) {
        whereClause.role = role;
      }

      if (status === 'active') {
        whereClause.is_active = true;
      } else if (status === 'inactive') {
        whereClause.is_active = false;
      }

      // Fetch users
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'subdomain']
          },
          {
            model: TenantUser,
            as: 'tenantUsers',
            include: [{
              model: Tenant,
              as: 'tenant',
              attributes: ['id', 'name']
            }]
          }
        ],
        attributes: {
          exclude: ['password']
        },
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true
      });

      // Log action
      await AuditLog.logAction(
        'VIEW_USERS_LIST',
        (req as any).user?.id,
        null,
        'User',
        null,
        null,
        null,
        req
      );

      res.json({
        success: true,
        data: users,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  }

  // POST /api/v1/admin/users
  static async createUser(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const {
        email,
        password,
        first_name,
        last_name,
        role = 'student',
        tenant_id,
        send_welcome_email = true
      } = req.body;

      // Validate required fields
      if (!email || !password || !first_name || !tenant_id) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email }
      });

      if (existingUser) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Check tenant exists and has capacity
      const tenant = await Tenant.findByPk(tenant_id);
      
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      const userCount = await User.count({
        where: { tenant_id }
      });

      const maxUsers = tenant.settings?.maxUsers || 0;
      
      if (maxUsers > 0 && userCount >= maxUsers) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Tenant has reached maximum user limit'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        first_name,
        last_name: last_name || '',
        role,
        tenant_id,
        is_active: true,
        is_verified: !send_welcome_email
      }, { transaction: t });

      // Create tenant-user relationship
      await TenantUser.create({
        tenant_id,
        user_id: user.id,
        role: role === 'super_admin' ? 'tenant_admin' : role,
        permissions: []
      }, { transaction: t });

      await t.commit();

      // Remove password from response
      const userData = user.toJSON();
      delete userData.password;

      // Log action
      await AuditLog.logAction(
        'CREATE_USER',
        (req as any).user?.id,
        tenant_id,
        'User',
        user.id,
        null,
        userData,
        req
      );

      // TODO: Send welcome email if send_welcome_email is true

      res.status(201).json({
        success: true,
        data: userData,
        message: 'User created successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }
  }

  // PUT /api/v1/admin/users/:id
  static async updateUser(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const oldValues = user.toJSON();
      delete oldValues.password;

      // If password is being updated, hash it
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      // If tenant is being changed, update tenant-user relationships
      if (updates.tenant_id && updates.tenant_id !== user.tenant_id) {
        // Remove from old tenant
        await TenantUser.destroy({
          where: {
            user_id: id,
            tenant_id: user.tenant_id
          },
          transaction: t
        });

        // Add to new tenant
        await TenantUser.create({
          tenant_id: updates.tenant_id,
          user_id: parseInt(id),
          role: updates.role || user.role,
          permissions: []
        }, { transaction: t });
      }

      // Update user
      await user.update(updates, { transaction: t });

      await t.commit();

      // Remove password from response
      const userData = user.toJSON();
      delete userData.password;

      // Log action
      await AuditLog.logAction(
        'UPDATE_USER',
        (req as any).user?.id,
        user.tenant_id,
        'User',
        user.id,
        oldValues,
        userData,
        req
      );

      res.json({
        success: true,
        data: userData,
        message: 'User updated successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  }

  // DELETE /api/v1/admin/users/:id
  static async deleteUser(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { transfer_to } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Prevent deleting super admin
      if (user.role === 'super_admin') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot delete super admin user'
        });
      }

      if (transfer_to) {
        // Transfer user's content to another user
        // TODO: Implement content transfer logic
        // - Transfer quizzes
        // - Transfer videos
        // - Transfer manuals
        // - Transfer classrooms (if owner)
      }

      // Delete user
      await user.destroy({ transaction: t });

      await t.commit();

      // Log action
      await AuditLog.logAction(
        'DELETE_USER',
        (req as any).user?.id,
        user.tenant_id,
        'User',
        parseInt(id),
        user.toJSON(),
        null,
        req
      );

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  }

  // POST /api/v1/admin/users/:id/reset-password
  static async resetUserPassword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { new_password, send_email = true } = req.body;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Generate new password if not provided
      const password = new_password || Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password
      user.password = hashedPassword;
      user.reset_password_token = null;
      user.reset_password_expires = null;
      await user.save();

      // Log action
      await AuditLog.logAction(
        'RESET_USER_PASSWORD',
        (req as any).user?.id,
        user.tenant_id,
        'User',
        user.id,
        null,
        { password_reset: true },
        req
      );

      // TODO: Send email with new password if send_email is true

      res.json({
        success: true,
        message: 'Password reset successfully',
        ...(new_password ? {} : { temporary_password: password })
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password'
      });
    }
  }

  // POST /api/v1/admin/users/:id/impersonate
  static async impersonateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUser = (req as any).user;

      const user = await User.findByPk(id, {
        include: [{
          model: Tenant,
          as: 'tenant'
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Generate impersonation token
      const impersonationToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
          impersonated_by: adminUser.id,
          impersonation: true
        },
        process.env.JWT_SECRET!,
        { expiresIn: '2h' }
      );

      // Log action
      await AuditLog.logAction(
        'IMPERSONATE_USER',
        adminUser.id,
        user.tenant_id,
        'User',
        user.id,
        null,
        {
          impersonated_user: user.email,
          admin_user: adminUser.email
        },
        req
      );

      res.json({
        success: true,
        data: {
          token: impersonationToken,
          user: {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            tenant: user.tenant
          }
        },
        message: 'Impersonation token generated successfully'
      });
    } catch (error) {
      console.error('Error impersonating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to impersonate user'
      });
    }
  }

  // GET /api/v1/admin/users/:id
  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        include: [
          {
            model: Tenant,
            as: 'tenant'
          },
          {
            model: TenantUser,
            as: 'tenantUsers',
            include: [{
              model: Tenant,
              as: 'tenant',
              attributes: ['id', 'name']
            }]
          }
        ],
        attributes: {
          exclude: ['password']
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user activity
      const recentActivity = await AuditLog.findAll({
        where: { user_id: id },
        limit: 20,
        order: [['created_at', 'DESC']]
      });

      // Get user stats
      const stats = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM quizzes WHERE user_id = :userId) as quizzes,
          (SELECT COUNT(*) FROM videos WHERE user_id = :userId) as videos,
          (SELECT COUNT(*) FROM manuals WHERE user_id = :userId) as manuals,
          (SELECT COUNT(*) FROM quiz_sessions WHERE host_id = :userId) as sessions
      `, {
        replacements: { userId: id },
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          ...user.toJSON(),
          stats: stats[0],
          recentActivity
        }
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      });
    }
  }
}

export default UserAdminController;