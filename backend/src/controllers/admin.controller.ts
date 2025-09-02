import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { 
  Tenant, 
  User, 
  Classroom, 
  Quiz, 
  QuizSession, 
  TrainingProgram, 
  Certificate,
  ClassroomEnrollment 
} from '@models/index';
import { sequelize } from '@config/database';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

export class AdminController {
  /**
   * Get all users across all tenants (Super Admin only)
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        tenant_id = null, 
        role = null 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where conditions
      const whereClause: any = {};
      
      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (tenant_id) {
        whereClause.tenant_id = tenant_id;
      }

      if (role) {
        whereClause.role = role;
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'slug', 'type']
          }
        ],
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: users,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
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

  /**
   * Get specific user details
   */
  async getUserDetails(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;

      const user = await User.findByPk(id, {
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'slug', 'type', 'branding']
          },
          {
            model: ClassroomEnrollment,
            as: 'enrollments',
            include: [{
              model: Classroom,
              as: 'classroom',
              attributes: ['id', 'name', 'code']
            }]
          }
        ],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user statistics
      const stats = await this.getUserStats(Number(id));

      res.json({
        success: true,
        data: {
          ...user.toJSON(),
          stats
        }
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user details'
      });
    }
  }

  /**
   * Create new user with tenant assignment
   */
  async createUser(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { firstName, lastName, email, password, role, tenant_id } = req.body;

      // Check if tenant exists
      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        tenant_id,
        isActive: true,
        emailVerified: true // Admin created users are verified by default
      }, { transaction: t });

      await t.commit();

      // Return user without password
      const userResponse = { ...user.toJSON() };
      delete userResponse.password;

      res.status(201).json({
        success: true,
        data: userResponse,
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

  /**
   * Update user details and tenant assignment
   */
  async updateUser(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { firstName, lastName, email, role, tenant_id, isActive } = req.body;

      const user = await User.findByPk(id, { transaction: t });
      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // If changing tenant, verify it exists
      if (tenant_id && tenant_id !== user.tenant_id) {
        const tenant = await Tenant.findByPk(tenant_id);
        if (!tenant) {
          await t.rollback();
          return res.status(404).json({
            success: false,
            error: 'Target tenant not found'
          });
        }
      }

      // If changing email, check for conflicts
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ 
          where: { email, id: { [Op.ne]: id } } 
        });
        if (existingUser) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            error: 'User with this email already exists'
          });
        }
      }

      // Update user fields
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (email !== undefined) user.email = email;
      if (role !== undefined) user.role = role;
      if (tenant_id !== undefined) user.tenant_id = tenant_id;
      if (typeof isActive === 'boolean') user.isActive = isActive;

      await user.save({ transaction: t });
      await t.commit();

      // Return user without password
      const userResponse = { ...user.toJSON() };
      delete userResponse.password;

      res.json({
        success: true,
        data: userResponse,
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

  /**
   * Transfer user to different tenant
   */
  async transferUserToTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { tenant_id } = req.body;

      const user = await User.findByPk(id, { transaction: t });
      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Target tenant not found'
        });
      }

      const oldTenantId = user.tenant_id;
      user.tenant_id = tenant_id;
      await user.save({ transaction: t });

      await t.commit();

      res.json({
        success: true,
        data: {
          user_id: user.id,
          old_tenant_id: oldTenantId,
          new_tenant_id: tenant_id
        },
        message: `User transferred to ${tenant.name} successfully`
      });
    } catch (error) {
      await t.rollback();
      console.error('Error transferring user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transfer user'
      });
    }
  }

  /**
   * Bulk assign users to tenant
   */
  async bulkAssignUsersToTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { user_ids, tenant_id } = req.body;

      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Target tenant not found'
        });
      }

      const [affectedCount] = await User.update(
        { tenant_id },
        {
          where: { id: { [Op.in]: user_ids } },
          transaction: t
        }
      );

      await t.commit();

      res.json({
        success: true,
        data: {
          affected_users: affectedCount,
          tenant_id: tenant_id,
          tenant_name: tenant.name
        },
        message: `${affectedCount} users assigned to ${tenant.name} successfully`
      });
    } catch (error) {
      await t.rollback();
      console.error('Error bulk assigning users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign users to tenant'
      });
    }
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsageStats(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;

      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      const stats = await Promise.all([
        User.count({ where: { tenant_id: id } }),
        Classroom.count({ where: { tenant_id: id } }),
        Quiz.count({ where: { tenant_id: id } }),
        QuizSession.count({
          include: [{
            model: Quiz,
            as: 'quiz',
            where: { tenant_id: id },
            attributes: []
          }]
        }),
        TrainingProgram.count({ where: { tenant_id: id } }),
        Certificate.count({ where: { tenant_id: id } })
      ]);

      const [users, classrooms, quizzes, sessions, programs, certificates] = stats;

      // Get recent activity
      const recentSessions = await QuizSession.findAll({
        include: [{
          model: Quiz,
          as: 'quiz',
          where: { tenant_id: id },
          attributes: ['title']
        }],
        limit: 10,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'session_code', 'status', 'created_at']
      });

      res.json({
        success: true,
        data: {
          tenant: tenant.toJSON(),
          stats: {
            users,
            classrooms,
            quizzes,
            sessions,
            programs,
            certificates
          },
          recentActivity: recentSessions
        }
      });
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant statistics'
      });
    }
  }

  /**
   * Get tenant users
   */
  async getTenantUsers(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: users } = await User.findAndCountAll({
        where: { tenant_id: id },
        limit: Number(limit),
        offset,
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: users,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
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

  /**
   * Get all classrooms across all tenants
   */
  async getAllClassrooms(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { page = 1, limit = 20, tenant_id = null } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = {};
      if (tenant_id) {
        whereClause.tenant_id = tenant_id;
      }

      const { count, rows: classrooms } = await Classroom.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'slug']
          },
          {
            model: ClassroomEnrollment,
            as: 'enrollments',
            attributes: [],
            duplicating: false
          }
        ],
        attributes: {
          include: [
            [sequelize.fn('COUNT', sequelize.col('enrollments.id')), 'enrollmentCount']
          ]
        },
        group: ['Classroom.id', 'tenant.id'],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: classrooms,
        pagination: {
          total: Array.isArray(count) ? count.length : count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil((Array.isArray(count) ? count.length : count) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch classrooms'
      });
    }
  }

  /**
   * Transfer classroom to different tenant
   */
  async transferClassroomToTenant(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { tenant_id } = req.body;

      const classroom = await Classroom.findByPk(id, { transaction: t });
      if (!classroom) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Classroom not found'
        });
      }

      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Target tenant not found'
        });
      }

      const oldTenantId = classroom.tenant_id;
      classroom.tenant_id = tenant_id;
      await classroom.save({ transaction: t });

      await t.commit();

      res.json({
        success: true,
        data: {
          classroom_id: classroom.id,
          old_tenant_id: oldTenantId,
          new_tenant_id: tenant_id
        },
        message: `Classroom transferred to ${tenant.name} successfully`
      });
    } catch (error) {
      await t.rollback();
      console.error('Error transferring classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transfer classroom'
      });
    }
  }

  /**
   * Get system-wide statistics
   */
  async getSystemStats(req: Request, res: Response) {
    try {
      const stats = await Promise.all([
        Tenant.count({ where: { is_active: true } }),
        User.count({ where: { isActive: true } }),
        Classroom.count(),
        Quiz.count(),
        QuizSession.count(),
        TrainingProgram.count(),
        Certificate.count()
      ]);

      const [
        activeTenants,
        activeUsers,
        totalClassrooms,
        totalQuizzes,
        totalSessions,
        totalPrograms,
        totalCertificates
      ] = stats;

      // Get tenant distribution
      const tenantStats = await User.findAll({
        attributes: [
          'tenant_id',
          [sequelize.fn('COUNT', sequelize.col('User.id')), 'user_count']
        ],
        include: [{
          model: Tenant,
          as: 'tenant',
          attributes: ['name']
        }],
        group: ['tenant_id', 'tenant.id'],
        order: [[sequelize.literal('user_count'), 'DESC']]
      });

      res.json({
        success: true,
        data: {
          overview: {
            activeTenants,
            activeUsers,
            totalClassrooms,
            totalQuizzes,
            totalSessions,
            totalPrograms,
            totalCertificates
          },
          tenantDistribution: tenantStats
        }
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system statistics'
      });
    }
  }

  /**
   * Get system activity logs (placeholder for future audit functionality)
   */
  async getSystemActivity(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;

      // For now, return recent sessions as activity
      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: activities } = await QuizSession.findAndCountAll({
        limit: Number(limit),
        offset,
        include: [
          {
            model: Quiz,
            as: 'quiz',
            attributes: ['title', 'tenant_id'],
            include: [{
              model: Tenant,
              as: 'tenant',
              attributes: ['name']
            }]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: activities,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching system activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system activity'
      });
    }
  }

  /**
   * Helper method to get user statistics
   */
  private async getUserStats(userId: number) {
    const stats = await Promise.all([
      Quiz.count({ where: { creator_id: userId } }),
      QuizSession.count({
        include: [{
          model: Quiz,
          as: 'quiz',
          where: { creator_id: userId },
          attributes: []
        }]
      }),
      ClassroomEnrollment.count({ where: { student_id: userId } }),
      Certificate.count({ where: { user_id: userId } })
    ]);

    const [quizzesCreated, sessionsHosted, classroomsEnrolled, certificatesEarned] = stats;

    return {
      quizzesCreated,
      sessionsHosted,
      classroomsEnrolled,
      certificatesEarned
    };
  }
}

export default new AdminController();