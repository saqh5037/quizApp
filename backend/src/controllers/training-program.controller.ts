import { Request, Response } from 'express';
import { 
  TrainingProgram, 
  Classroom,
  ProgramQuiz,
  Quiz,
  QuizSession,
  Participant
} from '../models/index';
import { getTenantContext } from '../middleware/tenant.middleware';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';

export class TrainingProgramController {
  /**
   * Get all training programs
   */
  async getPrograms(req: Request, res: Response) {
    try {
      const { tenantId } = getTenantContext(req);
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        classroom_id,
        active_only = false 
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: any = { tenant_id: tenantId };
      
      if (search) {
        whereClause.name = { [Op.like]: `%${search}%` };
      }

      if (classroom_id) {
        whereClause.classroom_id = classroom_id;
      }

      if (active_only === 'true') {
        whereClause.is_active = true;
        whereClause.start_date = { [Op.lte]: new Date() };
        whereClause.end_date = { [Op.gte]: new Date() };
      }

      const { count, rows: programs } = await TrainingProgram.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        include: [
          {
            model: Classroom,
            as: 'classroom',
            attributes: ['id', 'name', 'code']
          },
          {
            model: ProgramQuiz,
            as: 'programQuizzes',
            attributes: ['id']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Add quiz count
      const programsWithStats = programs.map(program => {
        const json = program.toJSON();
        return {
          ...json,
          quizCount: json.programQuizzes?.length || 0,
          isOngoing: program.isOngoing(),
          hasStarted: program.hasStarted(),
          hasEnded: program.hasEnded()
        };
      });

      res.json({
        success: true,
        data: programsWithStats,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching programs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch training programs'
      });
    }
  }

  /**
   * Get single program details
   */
  async getProgram(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);

      const program = await TrainingProgram.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        },
        include: [
          {
            model: Classroom,
            as: 'classroom',
            attributes: ['id', 'name', 'code', 'instructor_id']
          }
        ]
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          error: 'Training program not found'
        });
      }

      // Get quizzes with details
      const quizzes = await program.getQuizzes();

      res.json({
        success: true,
        data: {
          ...program.toJSON(),
          quizzes,
          isOngoing: program.isOngoing(),
          hasStarted: program.hasStarted(),
          hasEnded: program.hasEnded()
        }
      });
    } catch (error) {
      console.error('Error fetching program:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch training program details'
      });
    }
  }

  /**
   * Create new training program
   */
  async createProgram(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { tenantId } = getTenantContext(req);
      const { 
        classroom_id,
        name, 
        description, 
        objectives,
        duration_hours,
        start_date,
        end_date
      } = req.body;

      // Validate required fields
      if (!classroom_id || !name) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Classroom ID and program name are required'
        });
      }

      // Verify classroom exists and belongs to tenant
      const classroom = await Classroom.findOne({
        where: { 
          id: classroom_id,
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

      // Create program
      const program = await TrainingProgram.create({
        tenant_id: tenantId,
        classroom_id,
        name,
        description,
        objectives,
        duration_hours,
        start_date,
        end_date,
        is_active: true
      }, { transaction: t });

      await t.commit();

      res.status(201).json({
        success: true,
        data: program,
        message: 'Training program created successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error creating program:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create training program'
      });
    }
  }

  /**
   * Update training program
   */
  async updateProgram(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);
      const { 
        name, 
        description, 
        objectives,
        duration_hours,
        start_date,
        end_date,
        is_active 
      } = req.body;

      const program = await TrainingProgram.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          error: 'Training program not found'
        });
      }

      // Update fields
      if (name) program.name = name;
      if (description !== undefined) program.description = description;
      if (objectives !== undefined) program.objectives = objectives;
      if (duration_hours !== undefined) program.duration_hours = duration_hours;
      if (start_date !== undefined) program.start_date = start_date;
      if (end_date !== undefined) program.end_date = end_date;
      if (typeof is_active === 'boolean') program.is_active = is_active;

      await program.save();

      res.json({
        success: true,
        data: program,
        message: 'Training program updated successfully'
      });
    } catch (error) {
      console.error('Error updating program:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update training program'
      });
    }
  }

  /**
   * Delete training program
   */
  async deleteProgram(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);

      const program = await TrainingProgram.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        }
      });

      if (!program) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Training program not found'
        });
      }

      // Soft delete by deactivating
      program.is_active = false;
      await program.save({ transaction: t });

      // Remove all quiz associations
      await ProgramQuiz.destroy({
        where: { program_id: id },
        transaction: t
      });

      await t.commit();

      res.json({
        success: true,
        message: 'Training program deactivated successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error deleting program:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete training program'
      });
    }
  }

  /**
   * Get program quizzes
   */
  async getProgramQuizzes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);

      const program = await TrainingProgram.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          error: 'Training program not found'
        });
      }

      const quizzes = await program.getQuizzes();

      res.json({
        success: true,
        data: quizzes
      });
    } catch (error) {
      console.error('Error fetching program quizzes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch program quizzes'
      });
    }
  }

  /**
   * Add quiz to program
   */
  async addQuizToProgram(req: Request, res: Response) {
    const t = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { tenantId } = getTenantContext(req);
      const { 
        quiz_id, 
        sequence_order, 
        is_mandatory = true, 
        passing_score = 70 
      } = req.body;

      const program = await TrainingProgram.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        }
      });

      if (!program) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Training program not found'
        });
      }

      // Verify quiz exists and belongs to tenant
      const quiz = await Quiz.findOne({
        where: { 
          id: quiz_id,
          tenant_id: tenantId
        }
      });

      if (!quiz) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: 'Quiz not found'
        });
      }

      // Check if quiz already in program
      const existing = await ProgramQuiz.findOne({
        where: {
          program_id: id,
          quiz_id
        }
      });

      if (existing) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Quiz already added to this program'
        });
      }

      // Add quiz to program
      const programQuiz = await program.addQuiz(
        quiz_id, 
        sequence_order, 
        is_mandatory, 
        passing_score
      );

      await t.commit();

      res.status(201).json({
        success: true,
        data: programQuiz,
        message: 'Quiz added to program successfully'
      });
    } catch (error) {
      await t.rollback();
      console.error('Error adding quiz to program:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add quiz to program'
      });
    }
  }

  /**
   * Update program quiz settings
   */
  async updateProgramQuiz(req: Request, res: Response) {
    try {
      const { id, quizId } = req.params;
      const { tenantId } = getTenantContext(req);
      const { sequence_order, is_mandatory, passing_score } = req.body;

      const programQuiz = await ProgramQuiz.findOne({
        where: {
          program_id: id,
          quiz_id: quizId,
          tenant_id: tenantId
        }
      });

      if (!programQuiz) {
        return res.status(404).json({
          success: false,
          error: 'Program quiz association not found'
        });
      }

      // Update fields
      if (sequence_order !== undefined) programQuiz.sequence_order = sequence_order;
      if (is_mandatory !== undefined) programQuiz.is_mandatory = is_mandatory;
      if (passing_score !== undefined) programQuiz.passing_score = passing_score;

      await programQuiz.save();

      res.json({
        success: true,
        data: programQuiz,
        message: 'Program quiz updated successfully'
      });
    } catch (error) {
      console.error('Error updating program quiz:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update program quiz'
      });
    }
  }

  /**
   * Remove quiz from program
   */
  async removeQuizFromProgram(req: Request, res: Response) {
    try {
      const { id, quizId } = req.params;
      const { tenantId } = getTenantContext(req);

      const result = await ProgramQuiz.destroy({
        where: {
          program_id: id,
          quiz_id: quizId,
          tenant_id: tenantId
        }
      });

      if (result === 0) {
        return res.status(404).json({
          success: false,
          error: 'Program quiz association not found'
        });
      }

      res.json({
        success: true,
        message: 'Quiz removed from program successfully'
      });
    } catch (error) {
      console.error('Error removing quiz from program:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove quiz from program'
      });
    }
  }

  /**
   * Get user progress in program
   */
  async getUserProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tenantId, userId } = getTenantContext(req);
      const { user_id = userId } = req.query;

      const program = await TrainingProgram.findOne({
        where: { 
          id, 
          tenant_id: tenantId 
        }
      });

      if (!program) {
        return res.status(404).json({
          success: false,
          error: 'Training program not found'
        });
      }

      const progress = await program.getProgress(Number(user_id));

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user progress'
      });
    }
  }
}

export default new TrainingProgramController();