import { Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../../config/database';
import Tenant from '../../models/Tenant.model';
import TenantUser from '../../models/TenantUser.model';
import User from '../../models/User.model';
import Quiz from '../../models/Quiz.model';
import { Video } from '../../models/Video';
import Manual from '../../models/Manual.model';
import Classroom from '../../models/Classroom.model';
import AuditLog from '../../models/AuditLog.model';
import TenantStats from '../../models/TenantStats.model';

export class TenantAdminController {
  // GET /api/v1/admin/tenants
  static async getAllTenants(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const plan = req.query.plan as string;

      // Build where clause
      const whereClause: any = {};
      
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { slug: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      if (status === 'active') {
        whereClause.is_active = true;
      } else if (status === 'inactive') {
        whereClause.is_active = false;
      }

      // Fetch tenants without complex includes to avoid errors
      const { count, rows: tenants } = await Tenant.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true
      });

      // Calculate additional metrics for each tenant
      const tenantsWithMetrics = await Promise.all(
        tenants.map(async (tenant) => {
          const tenantData = tenant.get ? tenant.get() : tenant;
          
          // Calculate user count
          const userCount = await User.count({
            where: { tenant_id: tenantData.id }
          });
          
          return {
            ...tenantData,
            user_count: userCount,
            storage_used_mb: 0,
            max_users: tenantData.settings?.maxUsers || 0,
            max_storage: tenantData.settings?.maxStorage || 0
          };
        })
      );

      res.json({
        success: true,
        data: tenantsWithMetrics,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenants'
      });
    }
  }

  // GET /api/v1/admin/tenants/:id
  static async getTenantById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenant = await Tenant.findByPk(id);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Get additional metrics
      const [userCount, quizCount, videoCount, manualCount, classroomCount] = await Promise.all([
        User.count({ where: { tenant_id: id } }),
        Quiz.count({ where: { tenant_id: id } }),
        Video.count({ where: { tenant_id: id } }),
        Manual.count({ where: { tenant_id: id } }),
        Classroom.count({ where: { tenant_id: id } })
      ]);

      // Get recent users
      const recentUsers = await User.findAll({
        where: { tenant_id: id },
        limit: 5,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'created_at']
      });

      // Get session count (if QuizSession model is available)
      let sessionCount = 0;
      try {
        const QuizSession = require('../../models/QuizSession.model').default;
        if (QuizSession && QuizSession.count) {
          sessionCount = await QuizSession.count({ where: { tenant_id: id } });
        }
      } catch (e) {
        // QuizSession model may not be available
        console.log('QuizSession model not available');
      }

      const tenantData = tenant.get ? tenant.get() : tenant.toJSON();
      
      const responseData = {
        ...tenantData,
        user_count: userCount,
        quiz_count: quizCount,
        session_count: sessionCount,
        video_count: videoCount,
        manual_count: manualCount,
        classroom_count: classroomCount,
        storage_used_mb: 0, // TODO: Calculate actual storage
        max_users: tenantData.settings?.maxUsers || null,
        max_storage: tenantData.settings?.maxStorage || null,
        recent_users: recentUsers.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          created_at: user.created_at
        }))
      };

      // Log action disabled temporarily due to AuditLog initialization issues
      // TODO: Fix AuditLog model initialization
      console.log(`Tenant ${id} viewed by user ${(req as any).user?.id || 'anonymous'}`);

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Error fetching tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant'
      });
    }
  }

  // POST /api/v1/admin/tenants
  static async createTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const {
        name,
        domain,
        subdomain,
        subscription_plan = 'free',
        owner_email,
        owner_first_name,
        owner_last_name,
        owner_password,
        settings = {}
      } = req.body;

      // Validate required fields
      if (!name || !owner_email || !owner_first_name || !owner_password) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Check if subdomain is unique
      if (subdomain) {
        const existingTenant = await Tenant.findOne({
          where: { subdomain }
        });

        if (existingTenant) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: 'Subdomain already exists'
          });
        }
      }

      // Set default settings based on plan
      const planDefaults = {
        free: { maxUsers: 5, maxStorage: 100, aiCreditsMonthly: 10 },
        basic: { maxUsers: 10, maxStorage: 1000, aiCreditsMonthly: 100 },
        premium: { maxUsers: 50, maxStorage: 10000, aiCreditsMonthly: 500 },
        enterprise: { maxUsers: -1, maxStorage: -1, aiCreditsMonthly: -1 }
      };

      const finalSettings = {
        ...planDefaults[subscription_plan],
        ...settings,
        features: settings.features || ['quizzes', 'videos', 'manuals'],
        allowPublicQuizzes: settings.allowPublicQuizzes ?? true,
        allowVideoUpload: settings.allowVideoUpload ?? true
      };

      // Generate slug from name if not provided
      const slug = subdomain || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      // Create tenant
      const tenant = await Tenant.create({
        name,
        slug,
        domain,
        subdomain,
        type: 'client',
        subscription_plan,
        settings: finalSettings,
        branding: {
          primaryColor: '#0066CC',
          secondaryColor: '#00A3FF'
        },
        is_active: true
      }, { transaction: t });

      // Create tenant stats
      await TenantStats.create({
        tenant_id: tenant.id,
        total_users: 1
      }, { transaction: t });

      // Check if user already exists
      let owner = await User.findOne({
        where: { email: owner_email }
      });

      if (!owner) {
        // Create owner user
        const hashedPassword = await bcrypt.hash(owner_password, 10);
        
        owner = await User.create({
          email: owner_email,
          password: hashedPassword,
          first_name: owner_first_name,
          last_name: owner_last_name || '',
          role: 'tenant_admin',
          tenant_id: tenant.id,
          is_active: true,
          is_verified: true
        }, { transaction: t });
      }

      // Create tenant-user relationship
      await TenantUser.create({
        tenant_id: tenant.id,
        user_id: owner.id,
        role: 'tenant_owner',
        permissions: ['all']
      }, { transaction: t });

      await t.commit();

      // Log action disabled temporarily due to AuditLog initialization issues
      console.log(`Tenant created: ${tenant.id} by user ${(req as any).user?.id || 'anonymous'}`);

      // TODO: Send welcome email to owner
      // TODO: Create MinIO bucket for tenant

      res.status(201).json({
        success: true,
        data: {
          tenant,
          owner: {
            id: owner.id,
            email: owner.email,
            first_name: owner_first_name,
            last_name: owner_last_name
          }
        },
        message: 'Tenant created successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error creating tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create tenant'
      });
    }
  }

  // PUT /api/v1/admin/tenants/:id
  static async updateTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

      const tenant = await Tenant.findByPk(id);

      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      const oldValues = tenant.toJSON();

      // Update tenant
      await tenant.update(updates, { transaction: t });

      // If subscription plan changed, update settings
      if (updates.subscription_plan && updates.subscription_plan !== oldValues.subscription_plan) {
        const planDefaults = {
          free: { maxUsers: 5, maxStorage: 100, aiCreditsMonthly: 10 },
          basic: { maxUsers: 10, maxStorage: 1000, aiCreditsMonthly: 100 },
          premium: { maxUsers: 50, maxStorage: 10000, aiCreditsMonthly: 500 },
          enterprise: { maxUsers: -1, maxStorage: -1, aiCreditsMonthly: -1 }
        };

        tenant.settings = {
          ...tenant.settings,
          ...planDefaults[updates.subscription_plan]
        };
        await tenant.save({ transaction: t });
      }

      await t.commit();

      // Log action disabled temporarily due to AuditLog initialization issues
      console.log(`Tenant updated: ${tenant.id} by user ${(req as any).user?.id || 'anonymous'}`);

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant updated successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error updating tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tenant'
      });
    }
  }

  // DELETE /api/v1/admin/tenants/:id
  static async deleteTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { hard_delete = false } = req.body;

      const tenant = await Tenant.findByPk(id);

      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      if (hard_delete) {
        // Hard delete - remove all data
        await tenant.destroy({ transaction: t });
      } else {
        // Soft delete - just deactivate
        tenant.is_active = false;
        await tenant.save({ transaction: t });
      }

      await t.commit();

      // Log action disabled temporarily due to AuditLog initialization issues
      console.log(`Tenant ${hard_delete ? 'deleted' : 'deactivated'}: ${id} by user ${(req as any).user?.id || 'anonymous'}`);

      res.json({
        success: true,
        message: hard_delete ? 'Tenant deleted successfully' : 'Tenant deactivated successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error deleting tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete tenant'
      });
    }
  }

  // POST /api/v1/admin/tenants/:id/activate
  static async activateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { activate = true } = req.body;

      const tenant = await Tenant.findByPk(id);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      tenant.is_active = activate;
      await tenant.save();

      // Log action disabled temporarily due to AuditLog initialization issues
      console.log(`Tenant ${activate ? 'activated' : 'deactivated'}: ${id} by user ${(req as any).user?.id || 'anonymous'}`);

      res.json({
        success: true,
        data: tenant,
        message: `Tenant ${activate ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error activating tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to activate tenant'
      });
    }
  }

  // GET /api/v1/admin/tenants/:id/stats
  static async getTenantStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { period = '30d' } = req.query;

      const tenant = await Tenant.findByPk(id, {
        include: [{
          model: TenantStats,
          as: 'stats'
        }]
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Get activity metrics over time
      const activityData = await sequelize.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as actions
        FROM audit_logs
        WHERE tenant_id = :tenantId
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE(created_at)
        ORDER BY date
      `, {
        replacements: {
          tenantId: id,
          startDate,
          endDate
        },
        type: sequelize.QueryTypes.SELECT
      });

      // Get usage percentages
      const stats = tenant.stats || await TenantStats.create({ tenant_id: tenant.id });
      const usagePercentages = await stats.getUsagePercentages(tenant);

      res.json({
        success: true,
        data: {
          current: stats.toJSON(),
          usage: usagePercentages,
          activity: activityData,
          period
        }
      });
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant stats'
      });
    }
  }

  // GET /api/v1/admin/tenants/:id/users
  static async getTenantUsers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get users directly from tenant_id
      const { count, rows: users } = await User.findAndCountAll({
        where: { tenant_id: id },
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      // Format users with basic tenant info
      const usersFormatted = users.map(user => {
        const userData = user.toJSON();
        return {
          ...userData,
          tenant_role: userData.role || 'student',
          tenant_permissions: [],
          full_name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        };
      });

      res.json({
        success: true,
        data: usersFormatted,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching tenant users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant users'
      });
    }
  }

  // POST /api/v1/admin/tenants/:id/users
  static async addUserToTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { email, first_name, last_name = '', password, role = 'student', send_invite = true } = req.body;
      

      const tenant = await Tenant.findByPk(id);

      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Check tenant user limits
      const userCount = await User.count({ where: { tenant_id: id } });
      const maxUsers = tenant.settings?.maxUsers || 0;

      if (maxUsers > 0 && userCount >= maxUsers) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Tenant has reached maximum user limit'
        });
      }

      // Check if user exists
      let user = await User.findOne({ where: { email } });

      if (user) {
        // Check if user already belongs to this tenant (basic check)
        if (user.tenant_id === parseInt(id)) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: 'User already belongs to this tenant'
          });
        }

        // Update existing user to belong to this tenant
        user.tenant_id = parseInt(id);
        user.role = role === 'tenant_owner' ? 'tenant_admin' : role;
        await user.save({ transaction: t });
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);

        user = await User.create({
          email,
          password: hashedPassword,
          firstName: first_name,
          lastName: last_name || '',
          role: role === 'tenant_owner' ? 'tenant_admin' : role,
          tenant_id: parseInt(id),
          isActive: true,
          isVerified: !send_invite
        }, { transaction: t });

        // Skip TenantUser creation for now due to model initialization issues
        console.log(`User created for tenant ${id}: ${email}`);
      }

      // Update tenant stats - skip for now due to model issues
      // const stats = await TenantStats.findOne({ where: { tenant_id: id } });
      // if (stats) {
      //   await stats.incrementUsers(1);
      // }

      await t.commit();

      // TODO: Send invitation email if send_invite is true

      res.status(201).json({
        success: true,
        data: user,
        message: 'User added to tenant successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error adding user to tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add user to tenant'
      });
    }
  }

  // DELETE /api/v1/admin/tenants/:id/users/:userId
  static async removeUserFromTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id, userId } = req.params;

      const relation = await TenantUser.findOne({
        where: { tenant_id: id, user_id: userId }
      });

      if (!relation) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found in tenant'
        });
      }

      // Don't allow removing the last owner
      if (relation.role === 'tenant_owner') {
        const ownerCount = await TenantUser.count({
          where: { tenant_id: id, role: 'tenant_owner' }
        });

        if (ownerCount <= 1) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: 'Cannot remove the last owner of the tenant'
          });
        }
      }

      await relation.destroy({ transaction: t });

      // Update tenant stats
      const stats = await TenantStats.findOne({ where: { tenant_id: id } });
      if (stats) {
        await stats.incrementUsers(-1);
      }

      await t.commit();

      res.json({
        success: true,
        message: 'User removed from tenant successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error removing user from tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove user from tenant'
      });
    }
  }

  // PUT /api/v1/admin/tenants/:id/users/:userId
  static async updateTenantUser(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const { id, userId } = req.params;
      const { email, first_name, last_name, role, is_active, is_verified } = req.body;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Find user in tenant
      const user = await User.findOne({
        where: { 
          id: userId,
          tenant_id: id 
        },
        transaction: t
      });

      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found in tenant'
        });
      }

      // Update user fields
      const updateData: any = {};
      if (email !== undefined) updateData.email = email;
      if (first_name !== undefined) updateData.firstName = first_name;
      if (last_name !== undefined) updateData.lastName = last_name;
      if (role !== undefined) updateData.role = role;
      if (is_active !== undefined) updateData.isActive = is_active;
      if (is_verified !== undefined) updateData.isVerified = is_verified;

      await user.update(updateData, { transaction: t });

      await t.commit();

      // Log audit after commit (disabled for now due to model issues)
      // try {
      //   await AuditLog.create({
      //     action: 'update_tenant_user',
      //     resourceType: 'tenant_user',
      //     resourceId: user.id,
      //     userId: (req as any).user?.id || null,
      //     tenantId: parseInt(id),
      //     changes: updateData,
      //     ipAddress: req.ip
      //   });
      // } catch (auditError) {
      //   console.warn('Failed to log audit:', auditError);
      // }

      console.log(`User ${user.id} updated in tenant ${id}`);

      res.json({
        success: true,
        data: user.toJSON(),
        message: 'User updated successfully'
      });
    } catch (error) {
      // Only rollback if transaction is still active
      if (!t.finished) {
        await t.rollback();
      }
      console.error('Error updating tenant user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  }

  // DELETE /api/v1/admin/tenants/:id/users/:userId
  static async removeTenantUser(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const { id, userId } = req.params;
      const { permanent = false } = req.body;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Find user in tenant
      const user = await User.findOne({
        where: { 
          id: userId,
          tenant_id: id 
        },
        transaction: t
      });

      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found in tenant'
        });
      }

      // Don't allow removing super admin
      if (user.get('role') === 'super_admin') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot remove super admin user'
        });
      }

      // Don't allow removing last admin in tenant
      if (user.get('role') === 'admin') {
        const adminCount = await User.count({
          where: { 
            tenant_id: id, 
            role: 'admin',
            isActive: true 
          }
        });

        if (adminCount <= 1) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: 'Cannot remove the last admin of the tenant'
          });
        }
      }

      if (permanent) {
        // Only allow permanent deletion of already inactive users
        if (user.get('isActive')) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: 'User must be deactivated before permanent deletion. Deactivate the user first, then delete permanently.'
          });
        }
        // Permanently delete user
        await user.destroy({ transaction: t });
      } else {
        // Just deactivate user (always allowed for active users)
        if (!user.get('isActive')) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: 'User is already deactivated'
          });
        }
        await user.update({ isActive: false }, { transaction: t });
      }

      await t.commit();

      // Log audit after commit (disabled for now due to model issues)
      // try {
      //   await AuditLog.create({
      //     action: permanent ? 'delete_tenant_user' : 'deactivate_tenant_user',
      //     resourceType: 'tenant_user',
      //     resourceId: user.id,
      //     userId: (req as any).user?.id || null,
      //     tenantId: parseInt(id),
      //     changes: { permanent },
      //     ipAddress: req.ip
      //   });
      // } catch (auditError) {
      //   console.warn('Failed to log audit:', auditError);
      // }

      console.log(`User ${user.get('id')} ${permanent ? 'deleted' : 'deactivated'} from tenant ${id}`);

      res.json({
        success: true,
        message: `User ${permanent ? 'deleted' : 'deactivated'} successfully`
      });
    } catch (error) {
      // Only rollback if transaction is still active
      if (!t.finished) {
        await t.rollback();
      }
      console.error('Error removing tenant user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove user'
      });
    }
  }

  // POST /api/v1/admin/tenants/:id/users/:userId/reactivate
  static async reactivateTenantUser(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const { id, userId } = req.params;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Find user in tenant
      const user = await User.findOne({
        where: { 
          id: userId,
          tenant_id: id 
        },
        transaction: t
      });

      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found in tenant'
        });
      }

      // Check if user is already active
      if (user.get('isActive')) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'User is already active'
        });
      }

      // Reactivate user
      await user.update({ isActive: true }, { transaction: t });

      await t.commit();

      console.log(`User ${user.get('id')} reactivated in tenant ${id}`);

      res.json({
        success: true,
        message: 'User reactivated successfully'
      });
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
      console.error('Error reactivating tenant user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate user'
      });
    }
  }
}

export default TenantAdminController;