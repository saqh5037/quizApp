import { Request, Response } from 'express';
import { Tenant, User, Classroom, TrainingProgram, Certificate } from '@models/index';
import { superAdminOnly, getTenantContext } from '@middleware/tenant.middleware';
import { sequelize } from '@config/database';

export class TenantController {
  /**
   * Get all tenants (Super Admin only)
   */
  async getAllTenants(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = {};
      if (search) {
        whereClause.name = { $like: `%${search}%` };
      }

      const { count, rows: tenants } = await Tenant.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        include: [
          {
            model: User,
            as: 'users',
            attributes: [],
            duplicating: false
          }
        ],
        attributes: {
          include: [
            [sequelize.fn('COUNT', sequelize.col('users.id')), 'userCount']
          ]
        },
        group: ['Tenant.id'],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: tenants,
        pagination: {
          total: count.length,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count.length / Number(limit))
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

  /**
   * Get single tenant details
   */
  async getTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, userRole } = getTenantContext(req);

      // Only super admins can view other tenants
      if (userRole !== 'super_admin' && Number(id) !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own tenant'
        });
      }

      const tenant = await Tenant.findByPk(id, {
        include: [
          {
            model: Classroom,
            as: 'classrooms',
            attributes: ['id', 'name', 'code', 'max_capacity']
          }
        ]
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Get statistics
      const stats = await this.getTenantStats(Number(id));

      res.json({
        success: true,
        data: {
          ...tenant.toJSON(),
          stats
        }
      });
    } catch (error) {
      console.error('Error fetching tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant details'
      });
    }
  }

  /**
   * Create new tenant (Super Admin only)
   */
  async createTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { name, type = 'client', settings = {}, branding = {} } = req.body;

      // Validate required fields
      if (!name) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Tenant name is required'
        });
      }

      // Create tenant
      const tenant = await Tenant.create({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        type,
        settings,
        branding,
        is_active: true
      }, { transaction: t });

      // Create default classroom for the tenant
      await Classroom.create({
        tenant_id: tenant.id,
        name: 'General',
        code: `${tenant.slug.toUpperCase().substring(0, 3)}-GEN-001`,
        description: `Default classroom for ${tenant.name}`,
        max_capacity: 100,
        is_active: true
      }, { transaction: t });

      await t.commit();

      res.status(201).json({
        success: true,
        data: tenant,
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

  /**
   * Update tenant details
   */
  async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, userRole } = getTenantContext(req);
      const { name, settings, branding, is_active } = req.body;

      // Only super admins can update other tenants
      if (userRole !== 'super_admin' && Number(id) !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own tenant'
        });
      }

      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Update fields
      if (name) tenant.name = name;
      if (settings) tenant.settings = { ...tenant.settings, ...settings };
      if (branding) tenant.branding = { ...tenant.branding, ...branding };
      if (typeof is_active === 'boolean' && userRole === 'super_admin') {
        tenant.is_active = is_active;
      }

      await tenant.save();

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant updated successfully'
      });
    } catch (error) {
      console.error('Error updating tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tenant'
      });
    }
  }

  /**
   * Delete tenant (Super Admin only)
   */
  async deleteTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { id } = req.params;

      // Prevent deleting the default Dynamtek tenant
      if (id === '1') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the default Dynamtek tenant'
        });
      }

      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Soft delete by deactivating
      tenant.is_active = false;
      await tenant.save({ transaction: t });

      // Optionally, deactivate all users of this tenant
      await User.update(
        { isActive: false },
        { 
          where: { tenant_id: id },
          transaction: t 
        }
      );

      await t.commit();

      res.json({
        success: true,
        message: 'Tenant deactivated successfully'
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

  /**
   * Get tenant statistics
   */
  private async getTenantStats(tenantId: number) {
    const [
      userCount,
      classroomCount,
      programCount,
      certificateCount
    ] = await Promise.all([
      User.count({ where: { tenant_id: tenantId } }),
      Classroom.count({ where: { tenant_id: tenantId } }),
      TrainingProgram.count({ where: { tenant_id: tenantId } }),
      Certificate.count({ where: { tenant_id: tenantId } })
    ]);

    return {
      users: userCount,
      classrooms: classroomCount,
      programs: programCount,
      certificates: certificateCount
    };
  }

  /**
   * Get tenant dashboard data
   */
  async getTenantDashboard(req: Request, res: Response) {
    try {
      const { tenantId } = getTenantContext(req);

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant context not established'
        });
      }

      const tenant = await Tenant.findByPk(tenantId);
      const stats = await this.getTenantStats(tenantId);

      // Get recent activity
      const recentCertificates = await Certificate.findAll({
        where: { tenant_id: tenantId },
        limit: 5,
        order: [['issued_date', 'DESC']],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      const activePrograms = await TrainingProgram.findAll({
        where: {
          tenant_id: tenantId,
          is_active: true,
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date() }
        },
        limit: 5,
        include: [{
          model: Classroom,
          as: 'classroom',
          attributes: ['id', 'name', 'code']
        }]
      });

      res.json({
        success: true,
        data: {
          tenant,
          stats,
          recentCertificates,
          activePrograms
        }
      });
    } catch (error) {
      console.error('Error fetching tenant dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data'
      });
    }
  }
}

export default new TenantController();