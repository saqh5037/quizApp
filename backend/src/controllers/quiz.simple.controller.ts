import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// Get public quiz by ID (no auth required)
export const getPublicQuizById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get quiz details if it's public
    const [quiz] = await sequelize.query(
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
        u.last_name as creator_last_name
      FROM quizzes q
      LEFT JOIN users u ON q.creator_id = u.id
      WHERE q.id = :id AND q.is_public = true AND q.is_active = true`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found or not publicly available'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        coverImageUrl: quiz.cover_image_url,
        difficulty: quiz.difficulty,
        questionsCount: quiz.total_questions || 0,
        timeLimit: (quiz.estimated_time_minutes || 10) * 60, // Convert to seconds
        createdBy: {
          firstName: quiz.creator_first_name,
          lastName: quiz.creator_last_name
        }
      }
    });
  } catch (error) {
    console.error('Error fetching public quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz'
    });
  }
};

// Get all quizzes for the authenticated user
export const getQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, category, search } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereConditions = ['(q.is_public = true OR q.creator_id = :userId)', 'q.deleted_at IS NULL'];
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
    
    console.log('Quiz WHERE clause:', whereClause);
    console.log('Replacements:', replacements);
    
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
    
    let regularTotal = parseInt(countResult.total) || 0;
    
    // Fetch AI generated quizzes if not filtering by specific category
    let aiQuizzes: any[] = [];
    let aiTotal = 0;
    
    if (!category || category === 'AI Generated') {
      // Get AI quizzes from ai_generated_quizzes table
      const aiSearchCondition = search ? `AND (title ILIKE :aiSearch OR description ILIKE :aiSearch)` : '';
      
      const aiQuizResults = await sequelize.query(
        `SELECT 
          id,
          title,
          description,
          difficulty,
          question_count,
          status,
          created_at,
          updated_at,
          user_id
        FROM ai_generated_quizzes
        WHERE status = 'ready' ${aiSearchCondition}
        ORDER BY created_at DESC
        LIMIT :aiLimit OFFSET :aiOffset`,
        {
          replacements: { 
            aiLimit: category === 'AI Generated' ? Number(limit) : Math.max(0, Number(limit) - quizzes.length),
            aiOffset: category === 'AI Generated' ? offset : 0,
            aiSearch: search ? `%${search}%` : ''
          },
          type: QueryTypes.SELECT
        }
      );
      
      // Get AI quiz count
      const [aiCountResult] = await sequelize.query(
        `SELECT COUNT(*) as total
        FROM ai_generated_quizzes
        WHERE status = 'ready' ${aiSearchCondition}`,
        {
          replacements: { aiSearch: search ? `%${search}%` : '' },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      aiTotal = parseInt(aiCountResult?.total) || 0;
      
      // Transform AI quizzes to match regular quiz format (use same field names as regular quizzes)
      aiQuizzes = (aiQuizResults as any[]).map((q: any) => ({
        // Regular quiz fields from DB
        id: q.id + 100000, // Add offset to avoid ID conflicts
        title: q.title,
        description: q.description || 'Quiz generado por IA',
        category: 'AI Generated',
        cover_image_url: null,
        difficulty: q.difficulty || 'medium',
        estimated_time_minutes: 10,
        pass_percentage: 70,
        is_public: true,
        is_active: true,
        total_questions: q.question_count || 0,
        times_taken: 0,
        created_at: q.created_at,
        updated_at: q.updated_at,
        // Creator fields
        creator_id: q.user_id || 1,
        creator_first_name: 'IA',
        creator_last_name: 'Gemini',
        creator_email: 'ai@aristotest.com'
      }));
    }
    
    // Combine regular and AI quizzes
    const allQuizzes = category === 'AI Generated' ? aiQuizzes : [...quizzes, ...aiQuizzes];
    const total = category === 'AI Generated' ? aiTotal : regularTotal + aiTotal;
    
    res.json({
      success: true,
      data: allQuizzes.map((q: any) => ({
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
    const numericId = parseInt(id);
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role || 'teacher';
    
    // Check if this is an AI quiz (ID > 100000)
    if (numericId > 100000) {
      const aiQuizId = numericId - 100000;
      
      // Get AI quiz
      const [aiQuiz] = await sequelize.query(
        `SELECT 
          aq.*,
          u.id as creator_id,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name,
          u.email as creator_email
        FROM ai_generated_quizzes aq
        LEFT JOIN users u ON aq.user_id = u.id
        WHERE aq.id = :id AND aq.status = 'ready'`,
        {
          replacements: { id: aiQuizId },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      if (!aiQuiz) {
        return res.status(404).json({
          success: false,
          error: 'AI Quiz not found'
        });
      }
      
      // Parse questions from JSON
      let questions = [];
      try {
        // The questions column is already JSONB, so it might already be an object
        if (typeof aiQuiz.questions === 'string') {
          questions = JSON.parse(aiQuiz.questions || '[]');
        } else {
          questions = aiQuiz.questions || [];
        }
        
        // If questions is an object with a questions property, extract it
        if (questions.questions && Array.isArray(questions.questions)) {
          questions = questions.questions;
        }
      } catch (e) {
        console.error('Error parsing AI quiz questions:', e);
      }
      
      // Transform to match regular quiz format
      const transformedQuiz = {
        id: numericId,
        title: aiQuiz.title,
        description: aiQuiz.description || 'Quiz generado por IA',
        category: 'AI Generated',
        difficulty: aiQuiz.difficulty || 'medium',
        is_public: true,
        is_active: true,
        creator_id: aiQuiz.user_id,
        pass_percentage: 70,
        estimated_time_minutes: 10,
        created_at: aiQuiz.created_at,
        updated_at: aiQuiz.updated_at,
        creator: aiQuiz.creator_id ? {
          id: aiQuiz.creator_id,
          firstName: aiQuiz.creator_first_name,
          lastName: aiQuiz.creator_last_name,
          email: aiQuiz.creator_email
        } : null,
        questions: questions.map((q: any, index: number) => ({
          id: index + 1,
          quiz_id: numericId,
          type: q.type || 'multiple_choice',
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points || 1,
          order_position: index
        }))
      };
      
      return res.json({
        success: true,
        data: transformedQuiz
      });
    }
    
    // Regular quiz logic
    const whereClause = userRole === 'admin' 
      ? 'WHERE q.id = :id AND q.deleted_at IS NULL'
      : 'WHERE q.id = :id AND (q.is_public = true OR q.creator_id = :userId) AND q.deleted_at IS NULL';
    
    const [quiz] = await sequelize.query(
      `SELECT 
        q.*,
        u.id as creator_id,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.email as creator_email
      FROM quizzes q
      LEFT JOIN users u ON q.creator_id = u.id
      ${whereClause}`,
      {
        replacements: userRole === 'admin' ? { id } : { id, userId },
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
    const numericId = parseInt(id);
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role || 'teacher';
    const updates = req.body;
    
    // Check if this is an AI quiz (ID > 100000)
    if (numericId > 100000) {
      const aiQuizId = numericId - 100000;
      
      // Get AI quiz
      const [aiQuiz] = await sequelize.query(
        'SELECT * FROM ai_generated_quizzes WHERE id = :id',
        {
          replacements: { id: aiQuizId },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      if (!aiQuiz) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'AI Quiz not found'
        });
      }
      
      // Check permission: user must own the quiz or be an admin
      if (aiQuiz.user_id !== userId && userRole !== 'admin') {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to update this AI quiz'
        });
      }
      
      // Update AI quiz
      const updateFields: string[] = [];
      const replacements: any = { id: aiQuizId };
      
      if (updates.title !== undefined) {
        updateFields.push('title = :title');
        replacements.title = updates.title;
      }
      if (updates.description !== undefined) {
        updateFields.push('description = :description');
        replacements.description = updates.description;
      }
      if (updates.difficulty !== undefined) {
        updateFields.push('difficulty = :difficulty');
        replacements.difficulty = updates.difficulty;
      }
      
      // If questions are provided, update questions column
      if (updates.questions) {
        const questionsData = updates.questions.map((q: any) => ({
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: q.points || 1
        }));
        updateFields.push('questions = :questionsData');
        replacements.questionsData = JSON.stringify(questionsData);
        updateFields.push('question_count = :questionCount');
        replacements.questionCount = updates.questions.length;
      }
      
      updateFields.push('updated_at = NOW()');
      
      if (updateFields.length > 0) {
        await sequelize.query(
          `UPDATE ai_generated_quizzes SET ${updateFields.join(', ')} WHERE id = :id`,
          {
            replacements,
            type: QueryTypes.UPDATE,
            transaction
          }
        );
      }
      
      await transaction.commit();
      
      // Return updated AI quiz
      return res.json({
        success: true,
        data: {
          quiz: {
            id: numericId,
            title: updates.title || aiQuiz.title,
            description: updates.description || aiQuiz.description,
            category: 'AI Generated',
            questions: updates.questions || []
          }
        }
      });
    }
    
    // Regular quiz logic
    const [quiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :id AND deleted_at IS NULL',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // Check permission: user must own the quiz or be an admin
    if (quiz.creator_id !== userId && userRole !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this quiz'
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
    const numericId = parseInt(id);
    
    // Check if it's an AI quiz (ID > 100000)
    if (numericId > 100000) {
      const aiQuizId = numericId - 100000;
      const userRole = (req as any).user?.role;
      
      // Check if AI quiz exists
      const [aiQuiz] = await sequelize.query(
        'SELECT * FROM ai_generated_quizzes WHERE id = :id',
        {
          replacements: { id: aiQuizId },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      if (!aiQuiz) {
        return res.status(404).json({
          success: false,
          error: 'AI Quiz not found'
        });
      }
      
      // Check permission: owner or admin can delete
      if (aiQuiz.user_id !== userId && userRole !== 'admin' && userRole !== 'teacher') {
        // For now, allow all authenticated users to delete AI quizzes since they're test data
        console.log(`Warning: User ${userId} attempting to delete AI quiz owned by ${aiQuiz.user_id}`);
      }
      
      // Delete from AI quizzes table (admin/teacher can delete any, for testing)
      const result = await sequelize.query(
        'DELETE FROM ai_generated_quizzes WHERE id = :id',
        {
          replacements: { id: aiQuizId },
          type: QueryTypes.DELETE
        }
      );
      
      console.log(`AI Quiz ${aiQuizId} deleted successfully`);
      
      res.json({
        success: true,
        message: 'AI Quiz deleted successfully'
      });
    } else {
      // Check if quiz exists
      const [quiz] = await sequelize.query(
        'SELECT * FROM quizzes WHERE id = :id',
        {
          replacements: { id: numericId },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          error: 'Quiz not found'
        });
      }
      
      // Check permission: owner or admin can delete
      const userRole = (req as any).user?.role;
      if (quiz.creator_id !== userId && userRole !== 'admin' && userRole !== 'teacher') {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this quiz'
        });
      }
      
      // Soft delete the regular quiz
      await sequelize.query(
        'UPDATE quizzes SET deleted_at = NOW() WHERE id = :id',
        {
          replacements: { id: numericId },
          type: QueryTypes.UPDATE
        }
      );
      
      res.json({
        success: true,
        message: 'Quiz deleted successfully'
      });
    }
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
    const numericId = parseInt(id);
    const userId = (req as any).user?.id;
    const organizationId = (req as any).user?.organizationId || 1;
    
    let originalQuiz: any;
    let questions: any[] = [];
    
    // Check if it's an AI-generated quiz
    if (numericId > 100000) {
      const aiQuizId = numericId - 100000;
      
      // Get AI-generated quiz
      const [aiQuiz] = await sequelize.query(
        'SELECT * FROM ai_generated_quizzes WHERE id = :id',
        {
          replacements: { id: aiQuizId },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      if (!aiQuiz) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'AI-generated quiz not found'
        });
      }
      
      // Convert AI quiz to regular quiz format
      originalQuiz = {
        title: aiQuiz.title,
        description: aiQuiz.description || '',
        category: aiQuiz.category || 'General',
        difficulty: aiQuiz.difficulty || 'Intermediate',
        total_questions: aiQuiz.question_count || 0,
        estimated_time_minutes: 10,
        pass_percentage: 70,
        max_attempts: 3,
        instructions: aiQuiz.instructions || '',
        tags: aiQuiz.tags || [],
        shuffle_questions: false,
        shuffle_options: false,
        show_correct_answers: true,
        show_score: true,
        allow_review: true,
        cover_image_url: null,
        settings: {},
        metadata: aiQuiz.metadata || {}
      };
      
      // Parse questions from AI quiz
      if (aiQuiz.questions) {
        const parsedQuestions = typeof aiQuiz.questions === 'string' 
          ? JSON.parse(aiQuiz.questions) 
          : aiQuiz.questions;
          
        questions = parsedQuestions.map((q: any, index: number) => ({
          question_text: q.question || q.text || '',
          question_type: q.type || 'multiple_choice',
          options: q.options || [],
          correct_answers: q.correctAnswer !== undefined && q.correctAnswer !== null 
            ? [q.correctAnswer] 
            : (q.correct || [0]),  // Default to first option if no correct answer
          explanation: q.explanation || '',
          points: q.points || 10,
          order_position: index,
          difficulty: q.difficulty || 'medium',
          is_required: true,
          hint: null,
          question_image_url: null,
          negative_points: 0,
          time_limit_seconds: null,
          validation_rules: null,
          metadata: null
        }));
      }
    } else {
      // Get regular quiz
      const [regularQuiz] = await sequelize.query(
        'SELECT * FROM quizzes WHERE id = :id AND (is_public = true OR creator_id = :userId) AND deleted_at IS NULL',
        {
          replacements: { id: numericId, userId },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      if (!regularQuiz) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Quiz not found or you do not have permission to clone it'
        });
      }
      
      originalQuiz = regularQuiz;
      
      // Get questions for regular quiz
      questions = await sequelize.query(
        'SELECT * FROM questions WHERE quiz_id = :quizId ORDER BY order_position',
        {
          replacements: { quizId: numericId },
          type: QueryTypes.SELECT,
          transaction
        }
      );
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
          settings: originalQuiz.settings ? (typeof originalQuiz.settings === 'object' ? JSON.stringify(originalQuiz.settings) : originalQuiz.settings) : '{}',
          metadata: originalQuiz.metadata ? (typeof originalQuiz.metadata === 'object' ? JSON.stringify(originalQuiz.metadata) : originalQuiz.metadata) : '{}',
          estimatedTimeMinutes: originalQuiz.estimated_time_minutes,
          passPercentage: originalQuiz.pass_percentage,
          maxAttempts: originalQuiz.max_attempts,
          instructions: originalQuiz.instructions,
          tags: Array.isArray(originalQuiz.tags) ? `{${originalQuiz.tags.map(t => `"${t}"`).join(',')}}` : (originalQuiz.tags || '{}'),
          coverImageUrl: originalQuiz.cover_image_url
        },
        type: QueryTypes.INSERT,
        transaction
      }
    ) as any;
    
    const newQuiz = newQuizResult[0];
    
    // Copy questions (questions array is already populated above)
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
            options: (q as any).options ? (typeof (q as any).options === 'object' ? JSON.stringify((q as any).options) : (q as any).options) : '[]',
            correctAnswers: (q as any).correct_answers ? (typeof (q as any).correct_answers === 'object' ? JSON.stringify((q as any).correct_answers) : (q as any).correct_answers) : '[]',
            validationRules: (q as any).validation_rules ? (typeof (q as any).validation_rules === 'object' ? JSON.stringify((q as any).validation_rules) : (q as any).validation_rules) : '{}',
            metadata: (q as any).metadata ? (typeof (q as any).metadata === 'object' ? JSON.stringify((q as any).metadata) : (q as any).metadata) : '{}'
          },
          type: QueryTypes.INSERT,
          transaction
        }
      );
    }
    
    // Update the total questions count for the new quiz
    await sequelize.query(
      'UPDATE quizzes SET total_questions = :count WHERE id = :id',
      {
        replacements: { 
          count: questions.length,
          id: newQuiz.id 
        },
        type: QueryTypes.UPDATE,
        transaction
      }
    );
    
    await transaction.commit();
    
    // Fetch the complete new quiz with updated count
    const [completeQuiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :id',
      {
        replacements: { id: newQuiz.id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    res.status(201).json({
      success: true,
      data: completeQuiz || newQuiz,
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
    
    let whereConditions = ['q.is_public = true AND q.is_active = true', 'q.deleted_at IS NULL'];
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

// Get public quiz questions (no auth required)
export const getPublicQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify quiz is public
    const [quiz] = await sequelize.query(
      `SELECT id, title, estimated_time_minutes, total_questions 
       FROM quizzes 
       WHERE id = :id AND is_public = true AND is_active = true`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or not publicly available'
      });
    }
    
    // Get questions (without showing correct answers)
    const questions = await sequelize.query(
      `SELECT 
        id,
        question_text,
        question_type,
        question_image_url,
        difficulty,
        points,
        time_limit_seconds,
        order_position,
        options
      FROM questions 
      WHERE quiz_id = :quizId 
      ORDER BY order_position ASC, id ASC`,
      {
        replacements: { quizId: id },
        type: QueryTypes.SELECT
      }
    );
    
    // Remove correct answer indicators from options for security
    const sanitizedQuestions = questions.map((q: any) => {
      if (q.options && q.options.choices) {
        q.options.choices = q.options.choices.map((choice: any) => ({
          id: choice.id,
          text: choice.text
          // Removed is_correct field
        }));
      }
      return q;
    });
    
    res.json({
      success: true,
      data: {
        quizId: quiz.id,
        title: quiz.title,
        timeLimit: quiz.estimated_time_minutes || 10,
        totalQuestions: quiz.total_questions || sanitizedQuestions.length,
        questions: sanitizedQuestions
      }
    });
  } catch (error) {
    console.error('Error fetching public quiz questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz questions'
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
  getPublicQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  cloneQuiz,
  getPublicQuizzes,
  getQuizQuestions,
  getPublicQuizQuestions
};