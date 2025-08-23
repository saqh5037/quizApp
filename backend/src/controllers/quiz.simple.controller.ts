import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// Get all quizzes for the authenticated user
export const getQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, category, search } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = ['(q.is_public = true OR q.creator_id = :userId)'];
    const replacements: any = { userId, limit: Number(limit), offset };
    
    if (category) {
      whereConditions.push('q.category = :category');
      replacements.category = category;
    }
    
    if (search) {
      whereConditions.push("(q.title ILIKE :search OR q.description ILIKE :search)");
      replacements.search = `%${search}%`;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get quizzes with creator info
    const quizzes = await sequelize.query(
      `SELECT 
        q.id,
        q.title,
        q.description,
        q.category,
        q.cover_image_url,
        q.difficulty,
        q.estimated_time_minutes,
        q.pass_percentage,
        q.is_public,
        q.is_active,
        q.total_questions,
        q.times_taken,
        q.created_at,
        q.updated_at,
        u.id as creator_id,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.email as creator_email
      FROM quizzes q
      LEFT JOIN users u ON q.creator_id = u.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );
    
    // Get total count
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total
      FROM quizzes q
      ${whereClause}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    ) as any;
    
    const total = parseInt(countResult.total) || 0;
    
    res.json({
      success: true,
      data: quizzes.map((q: any) => ({
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category,
        coverImageUrl: q.cover_image_url,
        difficulty: q.difficulty,
        estimatedTimeMinutes: q.estimated_time_minutes,
        passPercentage: q.pass_percentage,
        isPublic: q.is_public,
        isActive: q.is_active,
        totalQuestions: q.total_questions || 0,
        timesTaken: q.times_taken || 0,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        creator: q.creator_id ? {
          id: q.creator_id,
          firstName: q.creator_first_name,
          lastName: q.creator_last_name,
          email: q.creator_email
        } : null
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quizzes'
    });
  }
};

// Get single quiz by ID
export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    // Get quiz details
    const [quiz] = await sequelize.query(
      `SELECT 
        q.*,
        u.id as creator_id,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.email as creator_email
      FROM quizzes q
      LEFT JOIN users u ON q.creator_id = u.id
      WHERE q.id = :id AND (q.is_public = true OR q.creator_id = :userId)`,
      {
        replacements: { id, userId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // Get questions for the quiz
    const questions = await sequelize.query(
      `SELECT * FROM questions 
      WHERE quiz_id = :quizId 
      ORDER BY order_position`,
      {
        replacements: { quizId: id },
        type: QueryTypes.SELECT
      }
    );
    
    res.json({
      success: true,
      data: {
        ...quiz,
        creator: quiz.creator_id ? {
          id: quiz.creator_id,
          firstName: quiz.creator_first_name,
          lastName: quiz.creator_last_name,
          email: quiz.creator_email
        } : null,
        questions
      }
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz'
    });
  }
};

// Create a new quiz
export const createQuiz = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId || 1;
    const { 
      title, 
      description, 
      category, 
      difficulty = 'medium',
      questions = [],
      settings = {},
      isPublic = false
    } = req.body;
    
    // Create quiz
    const [quizResult] = await sequelize.query(
      `INSERT INTO quizzes (
        title, description, creator_id, organization_id, category,
        difficulty, is_public, is_active, total_questions,
        shuffle_questions, shuffle_options, show_correct_answers,
        show_score, allow_review, settings, metadata,
        created_at, updated_at
      ) VALUES (
        :title, :description, :creatorId, :organizationId, :category,
        :difficulty, :isPublic, true, :totalQuestions,
        :shuffleQuestions, :shuffleOptions, :showCorrectAnswers,
        :showScore, :allowReview, :settings, :metadata,
        NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          title,
          description: description || null,
          creatorId: userId,
          organizationId,
          category: category || 'General',
          difficulty,
          isPublic,
          totalQuestions: questions.length,
          shuffleQuestions: settings.shuffleQuestions || false,
          shuffleOptions: settings.shuffleOptions || false,
          showCorrectAnswers: settings.showCorrectAnswers !== false,
          showScore: settings.showScore !== false,
          allowReview: settings.allowReview !== false,
          settings: JSON.stringify(settings),
          metadata: JSON.stringify({})
        },
        type: QueryTypes.INSERT,
        transaction
      }
    ) as any;
    
    const quiz = quizResult[0];
    
    // Add questions if provided
    if (questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await sequelize.query(
          `INSERT INTO questions (
            quiz_id, question_text, question_type, options,
            correct_answers, explanation, points, order_position,
            difficulty, metadata, created_at, updated_at
          ) VALUES (
            :quizId, :questionText, :questionType, :options,
            :correctAnswers, :explanation, :points, :orderPosition,
            :difficulty, :metadata, NOW(), NOW()
          )`,
          {
            replacements: {
              quizId: quiz.id,
              questionText: q.questionText || q.question,
              questionType: q.questionType || q.type || 'multiple_choice',
              options: JSON.stringify(q.options || []),
              correctAnswers: JSON.stringify(q.correctAnswers || q.correctAnswer),
              explanation: q.explanation || null,
              points: q.points || 1,
              orderPosition: i,
              difficulty: q.difficulty || 'medium',
              metadata: JSON.stringify({})
            },
            type: QueryTypes.INSERT,
            transaction
          }
        );
      }
    }
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quiz'
    });
  }
};

// Update quiz
export const updateQuiz = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updates = req.body;
    
    // Check if user owns the quiz
    const [quiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :id AND creator_id = :userId',
      {
        replacements: { id, userId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to update it'
      });
    }
    
    // Build update query
    const updateFields: string[] = [];
    const replacements: any = { id };
    
    if (updates.title !== undefined) {
      updateFields.push('title = :title');
      replacements.title = updates.title;
    }
    if (updates.description !== undefined) {
      updateFields.push('description = :description');
      replacements.description = updates.description;
    }
    if (updates.category !== undefined) {
      updateFields.push('category = :category');
      replacements.category = updates.category;
    }
    if (updates.difficulty !== undefined) {
      updateFields.push('difficulty = :difficulty');
      replacements.difficulty = updates.difficulty;
    }
    if (updates.isPublic !== undefined) {
      updateFields.push('is_public = :isPublic');
      replacements.isPublic = updates.isPublic;
    }
    if (updates.settings !== undefined) {
      updateFields.push('settings = :settings');
      replacements.settings = JSON.stringify(updates.settings);
    }
    
    updateFields.push('updated_at = NOW()');
    
    // Update quiz
    await sequelize.query(
      `UPDATE quizzes SET ${updateFields.join(', ')} WHERE id = :id`,
      {
        replacements,
        type: QueryTypes.UPDATE,
        transaction
      }
    );
    
    // Handle questions update if provided
    if (updates.questions && Array.isArray(updates.questions)) {
      // Delete existing questions
      await sequelize.query(
        'DELETE FROM questions WHERE quiz_id = :quizId',
        {
          replacements: { quizId: id },
          type: QueryTypes.DELETE,
          transaction
        }
      );
      
      // Insert new questions
      for (let i = 0; i < updates.questions.length; i++) {
        const q = updates.questions[i];
        await sequelize.query(
          `INSERT INTO questions (
            quiz_id, question_text, question_type, options,
            correct_answers, explanation, points, order_position,
            difficulty, metadata, created_at, updated_at
          ) VALUES (
            :quizId, :questionText, :questionType, :options,
            :correctAnswers, :explanation, :points, :orderPosition,
            :difficulty, :metadata, NOW(), NOW()
          )`,
          {
            replacements: {
              quizId: id,
              questionText: q.questionText || q.question,
              questionType: q.questionType || q.type || 'multiple_choice',
              options: JSON.stringify(q.options || []),
              correctAnswers: JSON.stringify(q.correctAnswers || q.correctAnswer),
              explanation: q.explanation || null,
              points: q.points || 1,
              orderPosition: i,
              difficulty: q.difficulty || 'medium',
              metadata: JSON.stringify({})
            },
            type: QueryTypes.INSERT,
            transaction
          }
        );
      }
      
      // Update total questions count
      await sequelize.query(
        'UPDATE quizzes SET total_questions = :count WHERE id = :id',
        {
          replacements: { count: updates.questions.length, id },
          type: QueryTypes.UPDATE,
          transaction
        }
      );
    }
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Quiz updated successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quiz'
    });
  }
};

// Delete quiz
export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    // Check if user owns the quiz
    const [quiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :id AND creator_id = :userId',
      {
        replacements: { id, userId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to delete it'
      });
    }
    
    // Soft delete the quiz
    await sequelize.query(
      'UPDATE quizzes SET deleted_at = NOW() WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.UPDATE
      }
    );
    
    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quiz'
    });
  }
};

// Clone/duplicate quiz
export const cloneQuiz = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId || 1;
    
    // Get original quiz
    const [originalQuiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :id AND (is_public = true OR creator_id = :userId)',
      {
        replacements: { id, userId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!originalQuiz) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to clone it'
      });
    }
    
    // Create new quiz with "Copy of" prefix
    const [newQuizResult] = await sequelize.query(
      `INSERT INTO quizzes (
        title, description, creator_id, organization_id, category,
        difficulty, is_public, is_active, total_questions,
        shuffle_questions, shuffle_options, show_correct_answers,
        show_score, allow_review, settings, metadata,
        estimated_time_minutes, pass_percentage, max_attempts,
        instructions, tags, cover_image_url,
        created_at, updated_at
      ) VALUES (
        :title, :description, :creatorId, :organizationId, :category,
        :difficulty, false, true, :totalQuestions,
        :shuffleQuestions, :shuffleOptions, :showCorrectAnswers,
        :showScore, :allowReview, :settings, :metadata,
        :estimatedTimeMinutes, :passPercentage, :maxAttempts,
        :instructions, :tags, :coverImageUrl,
        NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          title: `Copy of ${originalQuiz.title}`,
          description: originalQuiz.description,
          creatorId: userId,
          organizationId,
          category: originalQuiz.category,
          difficulty: originalQuiz.difficulty,
          totalQuestions: originalQuiz.total_questions || 0,
          shuffleQuestions: originalQuiz.shuffle_questions,
          shuffleOptions: originalQuiz.shuffle_options,
          showCorrectAnswers: originalQuiz.show_correct_answers,
          showScore: originalQuiz.show_score,
          allowReview: originalQuiz.allow_review,
          settings: originalQuiz.settings,
          metadata: originalQuiz.metadata,
          estimatedTimeMinutes: originalQuiz.estimated_time_minutes,
          passPercentage: originalQuiz.pass_percentage,
          maxAttempts: originalQuiz.max_attempts,
          instructions: originalQuiz.instructions,
          tags: originalQuiz.tags,
          coverImageUrl: originalQuiz.cover_image_url
        },
        type: QueryTypes.INSERT,
        transaction
      }
    ) as any;
    
    const newQuiz = newQuizResult[0];
    
    // Copy questions
    const questions = await sequelize.query(
      'SELECT * FROM questions WHERE quiz_id = :quizId ORDER BY order_position',
      {
        replacements: { quizId: id },
        type: QueryTypes.SELECT,
        transaction
      }
    );
    
    for (const q of questions) {
      await sequelize.query(
        `INSERT INTO questions (
          quiz_id, question_text, question_type, question_image_url,
          explanation, hint, difficulty, points, negative_points,
          time_limit_seconds, order_position, is_required,
          options, correct_answers, validation_rules, metadata,
          created_at, updated_at
        ) VALUES (
          :quizId, :questionText, :questionType, :questionImageUrl,
          :explanation, :hint, :difficulty, :points, :negativePoints,
          :timeLimitSeconds, :orderPosition, :isRequired,
          :options, :correctAnswers, :validationRules, :metadata,
          NOW(), NOW()
        )`,
        {
          replacements: {
            quizId: newQuiz.id,
            questionText: (q as any).question_text,
            questionType: (q as any).question_type,
            questionImageUrl: (q as any).question_image_url,
            explanation: (q as any).explanation,
            hint: (q as any).hint,
            difficulty: (q as any).difficulty,
            points: (q as any).points,
            negativePoints: (q as any).negative_points,
            timeLimitSeconds: (q as any).time_limit_seconds,
            orderPosition: (q as any).order_position,
            isRequired: (q as any).is_required,
            options: (q as any).options,
            correctAnswers: (q as any).correct_answers,
            validationRules: (q as any).validation_rules,
            metadata: (q as any).metadata
          },
          type: QueryTypes.INSERT,
          transaction
        }
      );
    }
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      data: newQuiz,
      message: 'Quiz cloned successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Clone quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clone quiz'
    });
  }
};

// Get public quizzes (for browsing/marketplace)
export const getPublicQuizzes = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = ['q.is_public = true AND q.is_active = true'];
    const replacements: any = { limit: Number(limit), offset };
    
    if (category) {
      whereConditions.push('q.category = :category');
      replacements.category = category;
    }
    
    if (search) {
      whereConditions.push("(q.title ILIKE :search OR q.description ILIKE :search)");
      replacements.search = `%${search}%`;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get public quizzes
    const quizzes = await sequelize.query(
      `SELECT 
        q.id,
        q.title,
        q.description,
        q.category,
        q.cover_image_url,
        q.difficulty,
        q.estimated_time_minutes,
        q.total_questions,
        q.times_taken,
        q.average_score,
        q.created_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM quizzes q
      LEFT JOIN users u ON q.creator_id = u.id
      ${whereClause}
      ORDER BY q.times_taken DESC, q.created_at DESC
      LIMIT :limit OFFSET :offset`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );
    
    // Get total count
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total
      FROM quizzes q
      ${whereClause}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    ) as any;
    
    const total = parseInt(countResult.total) || 0;
    
    res.json({
      success: true,
      data: quizzes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching public quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public quizzes'
    });
  }
};

// Get quiz questions
export const getQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    
    // Verify quiz exists and user has access
    const [quiz] = await sequelize.query(
      `SELECT id, title FROM quizzes 
      WHERE id = :id AND (is_public = true OR creator_id = :userId)`,
      {
        replacements: { id, userId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or access denied'
      });
    }
    
    // Get questions
    const questions = await sequelize.query(
      `SELECT 
        id,
        quiz_id,
        question_text,
        question_type,
        question_image_url,
        explanation,
        hint,
        difficulty,
        points,
        negative_points,
        time_limit_seconds,
        order_position,
        is_required,
        options,
        correct_answers,
        validation_rules,
        metadata,
        created_at,
        updated_at
      FROM questions 
      WHERE quiz_id = :quizId 
      ORDER BY order_position`,
      {
        replacements: { quizId: id },
        type: QueryTypes.SELECT
      }
    );
    
    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz questions'
    });
  }
};

export default {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  cloneQuiz,
  getPublicQuizzes,
  getQuizQuestions
};