import { Request, Response } from 'express';
import { 
  Classroom, 
  ClassroomEnrollment, 
  // TrainingProgram, 
  User, 
  Tenant 
} from '@models/index';
import { getTenantContext } from '@middleware/tenant.middleware';
import { sequelize } from '@config/database';
import { Op } from 'sequelize';

export class ClassroomController {
  /**
   * Get all classrooms for current tenant
   */
  async getClassrooms(req: Request, res: Response) {
    try {
      const { tenantId } = getTenantContext(req);
      const { page = 1, limit = 10, search = '', instructor_id } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = { 
        tenant_id: tenantId,
        is_active: true  // Only show active classrooms
      };
      
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } }
        ];
      }

      if (instructor_id) {
        whereClause.instructor_id = instructor_id;
      }

      const { count, rows: classrooms } = await Classroom.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: ClassroomEnrollment,
            as: 'enrollments',
            where: { status: 'active' },
            required: false,
            attributes: ['id']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Add enrollment count
      const classroomsWithStats = classrooms.map(classroom => {
        const json = classroom.toJSON();
        return {
          ...json,
          enrollmentCount: json.enrollments?.length || 0,
          availableSeats: classroom.max_capacity - (json.enrollments?.length || 0)
        };
      });

      res.json({
        success: true,
        data: classroomsWithStats,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
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
   * Get single classroom details
   */
  async getClassroom(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);

      const classroom = await Classroom.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        },
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ]
      });

      if (!classroom) {
        return res.status(404).json({
          success: false,
          error: 'Classroom not found'
        });
      }

      // Get classroom data
      const classroomData = classroom.get ? classroom.get() : classroom.toJSON();

      // Get enrollments separately with proper structure
      const enrollments = await ClassroomEnrollment.findAll({
        where: {
          classroom_id: id,
          tenant_id: tenantId,
          status: 'active'
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });

      // Format students data
      const students = enrollments
        .filter(e => e.user)
        .map(enrollment => {
          const userData = enrollment.user.get ? enrollment.user.get() : enrollment.user;
          return {
            id: userData.id,
            firstName: userData.firstName || userData.first_name,
            lastName: userData.lastName || userData.last_name,
            email: userData.email,
            phone: null, // Phone field not available
            enrolledAt: enrollment.created_at,
            status: enrollment.status,
            role: enrollment.role
          };
        });

      const enrollmentCount = students.length;
      const availableSeats = classroomData.max_capacity - enrollmentCount;

      // Get programs count (optional) - disabled for now
      const programsCount = 0;

      // Get quizzes count (optional) - disabled for now
      const quizzesCount = 0;
      
      res.json({
        success: true,
        data: {
          id: classroomData.id,
          name: classroomData.name,
          code: classroomData.code,
          description: classroomData.description,
          max_capacity: classroomData.max_capacity,
          is_active: classroomData.is_active,
          instructor: classroomData.instructor,
          students: students,
          enrollmentCount,
          availableSeats,
          programs: [], // Empty for now
          quizzes: [], // Empty for now
          created_at: classroomData.created_at,
          updated_at: classroomData.updated_at
        }
      });
    } catch (error) {
      console.error('Error fetching classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch classroom details'
      });
    }
  }

  /**
   * Create new classroom
   */
  async createClassroom(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      console.log('CreateClassroom - Request body:', req.body);
      console.log('CreateClassroom - Request body type:', typeof req.body);
      
      const { tenantId } = getTenantContext(req);
      const { 
        name, 
        description, 
        instructor_id, 
        max_capacity = 50 
      } = req.body;
      
      let { code } = req.body;
      
      console.log('CreateClassroom - Parsed values:', { name, code, description, instructor_id, max_capacity });

      // Validate required fields
      if (!name) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Classroom name is required'
        });
      }

      // Generate a unique code if not provided
      if (!code) {
        // Generate a code from the first letters of the name and a random number
        const nameCode = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        code = `${nameCode}${randomNum}`;
      }

      // Check if code is unique
      const existingCode = await Classroom.findOne({ 
        where: { code } 
      });
      if (existingCode) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Classroom code already exists'
        });
      }

      // Create classroom
      const classroom = await Classroom.create({
        tenant_id: tenantId,
        name,
        code,
        description,
        instructor_id,
        max_capacity,
        is_active: true
      }, { transaction: t });

      // If instructor is specified, create enrollment for instructor
      if (instructor_id) {
        // Use .get() to access Sequelize model properties
        const classroomId = classroom.get('id');
        console.log('Creating enrollment - Classroom ID:', classroomId, 'Instructor ID:', instructor_id);
        
        await ClassroomEnrollment.create({
          tenant_id: tenantId,
          classroom_id: classroomId,
          user_id: instructor_id,
          role: 'instructor',
          status: 'active'
        }, { transaction: t });
      }

      await t.commit();

      res.status(201).json({
        success: true,
        data: classroom,
        message: 'Classroom created successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error creating classroom:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({
        success: false,
        error: 'Failed to create classroom',
        details: error.message // Add error details to help debug
      });
    }
  }

  /**
   * Update classroom
   */
  async updateClassroom(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);
      const { 
        name, 
        code,
        description, 
        instructor_id, 
        max_capacity, 
        is_active 
      } = req.body;

      const classroom = await Classroom.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        }
      });

      if (!classroom) {
        return res.status(404).json({
          success: false,
          error: 'Classroom not found'
        });
      }

      // Update fields
      if (name) classroom.name = name;
      if (code) classroom.code = code;
      if (description !== undefined) classroom.description = description;
      if (instructor_id !== undefined) classroom.instructor_id = instructor_id;
      if (max_capacity) classroom.max_capacity = max_capacity;
      if (typeof is_active === 'boolean') classroom.is_active = is_active;

      await classroom.save();

      res.json({
        success: true,
        data: classroom,
        message: 'Classroom updated successfully'
      });
    } catch (error) {
      console.error('Error updating classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update classroom'
      });
    }
  }

  /**
   * Delete classroom
   */
  async deleteClassroom(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);
      const { permanent = false } = req.query; // Option for permanent delete

      const classroom = await Classroom.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        }
      });

      if (!classroom) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Salón no encontrado'
        });
      }

      // Check if classroom has active enrollments
      const activeEnrollments = await ClassroomEnrollment.count({
        where: {
          classroom_id: id,
          status: 'active'
        }
      });

      if (activeEnrollments > 0 && permanent === 'true') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar permanentemente un salón con estudiantes activos'
        });
      }

      // Check if classroom has active programs (disable for now since TrainingProgram might not exist)
      /*
      const activePrograms = await TrainingProgram.count({
        where: {
          classroom_id: id,
          is_active: true
        }
      });

      if (activePrograms > 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un salón con programas activos'
        });
      }
      */

      if (permanent === 'true') {
        // Permanent delete - remove enrollments first
        await ClassroomEnrollment.destroy({
          where: { classroom_id: id },
          transaction: t
        });

        // Then delete the classroom
        await classroom.destroy({ transaction: t });

        await t.commit();

        res.json({
          success: true,
          message: 'Salón eliminado permanentemente'
        });
      } else {
        // Soft delete by deactivating
        classroom.is_active = false;
        await classroom.save({ transaction: t });

        // Update enrollments to dropped status
        await ClassroomEnrollment.update(
          { status: 'dropped' },
          { 
            where: { 
              classroom_id: id,
              status: 'active'
            },
            transaction: t 
          }
        );

        await t.commit();

        res.json({
          success: true,
          message: 'Salón desactivado exitosamente'
        });
      }
    } catch (error) {
      await t.rollback();
      console.error('Error deleting classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar el salón'
      });
    }
  }

  /**
   * Enroll user in classroom
   */
  async enrollUser(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { id } = req.params; // classroom_id
      const { tenantId } = getTenantContext(req);
      const { user_id, role = 'student' } = req.body;

      const classroom = await Classroom.findOne({
        where: { 
          id, 
          tenant_id: tenantId,
          is_active: true
        }
      });

      if (!classroom) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Classroom not found or inactive'
        });
      }

      // Check if user exists and belongs to same tenant
      const user = await User.findOne({
        where: { 
          id: user_id,
          tenant_id: tenantId,
          isActive: true
        }
      });

      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'User not found or inactive'
        });
      }

      // Check if already enrolled
      const existingEnrollment = await ClassroomEnrollment.findOne({
        where: {
          classroom_id: id,
          user_id: user_id
        }
      });

      if (existingEnrollment) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'User is already enrolled in this classroom'
        });
      }

      // Check classroom capacity
      const enrollmentCount = await ClassroomEnrollment.count({
        where: {
          classroom_id: id,
          status: 'active'
        }
      });

      if (enrollmentCount >= classroom.max_capacity) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Classroom is at full capacity'
        });
      }

      // Create enrollment
      const enrollment = await ClassroomEnrollment.create({
        tenant_id: tenantId,
        classroom_id: id,
        user_id: user_id,
        role: role,
        status: 'active'
      }, { transaction: t });

      await t.commit();

      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'User enrolled successfully'
      });
    } catch (error: any) {
      await t.rollback();
      console.error('Error enrolling user:', error);
      
      if (error.message?.includes('already enrolled')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message?.includes('full capacity')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to enroll user'
      });
    }
  }

  /**
   * Remove user from classroom
   */
  async unenrollUser(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const { tenantId } = getTenantContext(req);

      const enrollment = await ClassroomEnrollment.findOne({
        where: {
          classroom_id: id,
          user_id: userId,
          tenant_id: tenantId
        }
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: 'Enrollment not found'
        });
      }

      await enrollment.markAsDropped();

      res.json({
        success: true,
        message: 'User unenrolled successfully'
      });
    } catch (error) {
      console.error('Error unenrolling user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unenroll user'
      });
    }
  }

  /**
   * Get classroom students
   */
  async getClassroomStudents(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);

      const enrollments = await ClassroomEnrollment.findAll({
        where: {
          classroom_id: id,
          tenant_id: tenantId,
          status: 'active'
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl', 'role']
        }],
        order: [['enrolled_at', 'DESC']]
      });

      const students = enrollments.map(enrollment => ({
        ...enrollment.user?.toJSON(),
        enrollmentRole: enrollment.role,
        enrolledAt: enrollment.enrolled_at
      }));

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      console.error('Error fetching classroom students:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch classroom students'
      });
    }
  }
}

export default new ClassroomController();