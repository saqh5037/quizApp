import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database';
import Classroom from '../../models/Classroom.model';
import ClassroomEnrollment from '../../models/ClassroomEnrollment.model';
import User from '../../models/User.model';
import Tenant from '../../models/Tenant.model';
import Quiz from '../../models/Quiz.model';
import AuditLog from '../../models/AuditLog.model';

export class ClassroomAdminController {
  // GET /api/v1/admin/classrooms
  static async getAllClassrooms(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const tenantId = req.query.tenant_id as string;
      const instructorId = req.query.instructor_id as string;
      const status = req.query.status as string;

      // Build where clause
      const whereClause: any = {};

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { code: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (tenantId) {
        whereClause.tenant_id = tenantId;
      }

      if (instructorId) {
        whereClause.instructor_id = instructorId;
      }

      if (status === 'active') {
        whereClause.is_active = true;
      } else if (status === 'inactive') {
        whereClause.is_active = false;
      }

      // Fetch classrooms
      const { count, rows: classrooms } = await Classroom.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'email', 'first_name', 'last_name']
          },
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'subdomain']
          },
          {
            model: ClassroomEnrollment,
            as: 'enrollments',
            separate: true,
            limit: 5,
            include: [{
              model: User,
              as: 'student',
              attributes: ['id', 'email', 'first_name', 'last_name']
            }]
          }
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
        distinct: true
      });

      // Get enrollment counts
      const enrollmentCounts = await ClassroomEnrollment.findAll({
        where: {
          classroom_id: classrooms.map(c => c.id)
        },
        attributes: [
          'classroom_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'enrollment_count']
        ],
        group: ['classroom_id'],
        raw: true
      });

      const countsMap = enrollmentCounts.reduce((acc: any, curr: any) => {
        acc[curr.classroom_id] = parseInt(curr.enrollment_count);
        return acc;
      }, {});

      // Add enrollment counts to classrooms
      const enrichedClassrooms = classrooms.map(classroom => ({
        ...classroom.toJSON(),
        enrollment_count: countsMap[classroom.id] || 0
      }));

      // Log action
      await AuditLog.logAction(
        'VIEW_CLASSROOMS_LIST',
        (req as any).user?.id,
        null,
        'Classroom',
        null,
        null,
        null,
        req
      );

      res.json({
        success: true,
        data: enrichedClassrooms,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
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

  // GET /api/v1/admin/classrooms/:id
  static async getClassroomById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const classroom = await Classroom.findByPk(id, {
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'email', 'first_name', 'last_name']
          },
          {
            model: Tenant,
            as: 'tenant'
          },
          {
            model: ClassroomEnrollment,
            as: 'enrollments',
            include: [{
              model: User,
              as: 'student',
              attributes: ['id', 'email', 'first_name', 'last_name']
            }]
          }
        ]
      });

      if (!classroom) {
        return res.status(404).json({
          success: false,
          error: 'Classroom not found'
        });
      }

      // Get classroom statistics
      const stats = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM classroom_enrollments WHERE classroom_id = :classroomId) as total_enrollments,
          (SELECT COUNT(*) FROM classroom_enrollments WHERE classroom_id = :classroomId AND completed_at IS NOT NULL) as completed_enrollments,
          (SELECT COUNT(DISTINCT quiz_id) FROM training_programs tp 
           JOIN program_quizzes pq ON tp.id = pq.program_id 
           WHERE tp.classroom_id = :classroomId) as total_quizzes,
          (SELECT AVG(progress) FROM classroom_enrollments WHERE classroom_id = :classroomId) as avg_progress
      `, {
        replacements: { classroomId: id },
        type: sequelize.QueryTypes.SELECT
      });

      // Get recent activity
      const recentActivity = await AuditLog.findAll({
        where: {
          entity_type: 'Classroom',
          entity_id: parseInt(id)
        },
        limit: 20,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          ...classroom.toJSON(),
          stats: stats[0],
          recentActivity
        }
      });
    } catch (error) {
      console.error('Error fetching classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch classroom'
      });
    }
  }

  // POST /api/v1/admin/classrooms
  static async createClassroom(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const {
        name,
        description,
        instructor_id,
        tenant_id,
        start_date,
        end_date,
        max_students = 30,
        is_active = true,
        allow_self_enrollment = true
      } = req.body;

      // Validate required fields
      if (!name || !instructor_id || !tenant_id) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Check tenant exists
      const tenant = await Tenant.findByPk(tenant_id);
      if (!tenant) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Check instructor exists and belongs to tenant
      const instructor = await User.findOne({
        where: {
          id: instructor_id,
          tenant_id
        }
      });

      if (!instructor) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Instructor not found or does not belong to this tenant'
        });
      }

      // Generate unique enrollment code
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let code = generateCode();
      let codeExists = true;
      while (codeExists) {
        const existing = await Classroom.findOne({ where: { code } });
        if (!existing) {
          codeExists = false;
        } else {
          code = generateCode();
        }
      }

      // Create classroom
      const classroom = await Classroom.create({
        name,
        description,
        code,
        instructor_id,
        tenant_id,
        start_date,
        end_date,
        max_students,
        is_active,
        allow_self_enrollment,
        settings: {}
      }, { transaction: t });

      await t.commit();

      // Log action
      await AuditLog.logAction(
        'CREATE_CLASSROOM',
        (req as any).user?.id,
        tenant_id,
        'Classroom',
        classroom.id,
        null,
        classroom.toJSON(),
        req
      );

      res.status(201).json({
        success: true,
        data: classroom,
        message: 'Classroom created successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error creating classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create classroom'
      });
    }
  }

  // PUT /api/v1/admin/classrooms/:id
  static async updateClassroom(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

      const classroom = await Classroom.findByPk(id);

      if (!classroom) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Classroom not found'
        });
      }

      const oldValues = classroom.toJSON();

      // If instructor is being changed, verify they exist and belong to tenant
      if (updates.instructor_id) {
        const instructor = await User.findOne({
          where: {
            id: updates.instructor_id,
            tenant_id: classroom.tenant_id
          }
        });

        if (!instructor) {
          await t.rollback();
          return res.status(404).json({
            success: false,
            error: 'Instructor not found or does not belong to this tenant'
          });
        }
      }

      // Update classroom
      await classroom.update(updates, { transaction: t });

      await t.commit();

      // Log action
      await AuditLog.logAction(
        'UPDATE_CLASSROOM',
        (req as any).user?.id,
        classroom.tenant_id,
        'Classroom',
        classroom.id,
        oldValues,
        classroom.toJSON(),
        req
      );

      res.json({
        success: true,
        data: classroom,
        message: 'Classroom updated successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error updating classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update classroom'
      });
    }
  }

  // DELETE /api/v1/admin/classrooms/:id
  static async deleteClassroom(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { force = false } = req.body;

      const classroom = await Classroom.findByPk(id, {
        include: [{
          model: ClassroomEnrollment,
          as: 'enrollments'
        }]
      });

      if (!classroom) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Classroom not found'
        });
      }

      // Check for active enrollments
      const activeEnrollments = classroom.enrollments?.filter(e => !e.completed_at) || [];
      
      if (activeEnrollments.length > 0 && !force) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Classroom has ${activeEnrollments.length} active enrollments. Use force=true to delete anyway.`
        });
      }

      const classroomData = classroom.toJSON();

      // Delete classroom (will cascade delete enrollments)
      await classroom.destroy({ transaction: t });

      await t.commit();

      // Log action
      await AuditLog.logAction(
        'DELETE_CLASSROOM',
        (req as any).user?.id,
        classroomData.tenant_id,
        'Classroom',
        parseInt(id),
        classroomData,
        null,
        req
      );

      res.json({
        success: true,
        message: 'Classroom deleted successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error deleting classroom:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete classroom'
      });
    }
  }

  // POST /api/v1/admin/classrooms/:id/enroll
  static async enrollStudent(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { student_id } = req.body;

      const classroom = await Classroom.findByPk(id);

      if (!classroom) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Classroom not found'
        });
      }

      // Check if student exists
      const student = await User.findByPk(student_id);
      
      if (!student) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      // Check if already enrolled
      const existingEnrollment = await ClassroomEnrollment.findOne({
        where: {
          classroom_id: id,
          student_id
        }
      });

      if (existingEnrollment) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Student already enrolled in this classroom'
        });
      }

      // Check classroom capacity
      const enrollmentCount = await ClassroomEnrollment.count({
        where: { classroom_id: id }
      });

      if (enrollmentCount >= classroom.max_students) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Classroom has reached maximum capacity'
        });
      }

      // Create enrollment
      const enrollment = await ClassroomEnrollment.create({
        classroom_id: parseInt(id),
        student_id,
        enrolled_at: new Date(),
        progress: 0
      }, { transaction: t });

      await t.commit();

      // Log action
      await AuditLog.logAction(
        'ENROLL_STUDENT',
        (req as any).user?.id,
        classroom.tenant_id,
        'ClassroomEnrollment',
        enrollment.id,
        null,
        {
          classroom_id: id,
          student_id,
          student_email: student.email
        },
        req
      );

      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Student enrolled successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error enrolling student:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enroll student'
      });
    }
  }

  // DELETE /api/v1/admin/classrooms/:id/enroll/:studentId
  static async unenrollStudent(req: Request, res: Response) {
    const t = await sequelize.transaction();

    try {
      const { id, studentId } = req.params;

      const enrollment = await ClassroomEnrollment.findOne({
        where: {
          classroom_id: id,
          student_id: studentId
        }
      });

      if (!enrollment) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Enrollment not found'
        });
      }

      const enrollmentData = enrollment.toJSON();

      await enrollment.destroy({ transaction: t });

      await t.commit();

      // Log action
      await AuditLog.logAction(
        'UNENROLL_STUDENT',
        (req as any).user?.id,
        null,
        'ClassroomEnrollment',
        enrollmentData.id,
        enrollmentData,
        null,
        req
      );

      res.json({
        success: true,
        message: 'Student unenrolled successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error unenrolling student:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unenroll student'
      });
    }
  }

  // GET /api/v1/admin/classrooms/stats
  static async getClassroomStats(req: Request, res: Response) {
    try {
      const tenantId = req.query.tenant_id as string;

      let whereClause = '';
      if (tenantId) {
        whereClause = `WHERE c.tenant_id = ${tenantId}`;
      }

      const stats = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT c.id) as total_classrooms,
          COUNT(DISTINCT CASE WHEN c.is_active = true THEN c.id END) as active_classrooms,
          COUNT(DISTINCT ce.id) as total_enrollments,
          COUNT(DISTINCT ce.student_id) as unique_students,
          AVG(ce.progress) as avg_progress,
          COUNT(DISTINCT CASE WHEN ce.completed_at IS NOT NULL THEN ce.id END) as completed_enrollments
        FROM classrooms c
        LEFT JOIN classroom_enrollments ce ON c.id = ce.classroom_id
        ${whereClause}
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      // Get enrollment trends
      const enrollmentTrends = await sequelize.query(`
        SELECT 
          DATE_TRUNC('day', ce.enrolled_at) as date,
          COUNT(*) as enrollments
        FROM classroom_enrollments ce
        JOIN classrooms c ON ce.classroom_id = c.id
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} ce.enrolled_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', ce.enrolled_at)
        ORDER BY date
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          summary: stats[0],
          enrollmentTrends
        }
      });
    } catch (error) {
      console.error('Error fetching classroom stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch classroom statistics'
      });
    }
  }
}

export default ClassroomAdminController;