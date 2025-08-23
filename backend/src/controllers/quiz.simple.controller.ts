import { Request, Response } from 'express';
import { sequelize } from '../config/database';

// Get all quizzes
export const getQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 1; // Default to user 1 for testing
    
    // Get quizzes from database
    const quizzes = await sequelize.query(
      `SELECT 
        q.id,
        q.title,
        q.description,
        q.category,
        q.difficulty,
        q.time_limit as timeLimit,
        q.passing_score as passingScore,
        q.is_public as isPublic,
        q.created_at as createdAt,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questionsCount,
        0 as timesPlayed
      FROM quizzes q
      WHERE q.created_by = :userId OR q.is_public = 1
      ORDER BY q.created_at DESC`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quizzes'
    });
  }
};

// Get public quizzes
export const getPublicQuizzes = async (req: Request, res: Response) => {
  try {
    const quizzes = await sequelize.query(
      `SELECT 
        q.id,
        q.title,
        q.description,
        q.category,
        q.difficulty,
        q.time_limit as timeLimit,
        q.passing_score as passingScore,
        q.created_at as createdAt,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questionsCount
      FROM quizzes q
      WHERE q.is_public = 1
      ORDER BY q.created_at DESC`,
      {
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    console.error('Error fetching public quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public quizzes'
    });
  }
};

// Get quiz by ID
export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 1;

    const [quiz] = await sequelize.query(
      `SELECT * FROM quizzes WHERE id = :id`,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz'
    });
  }
};

// Create quiz
export const createQuiz = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 2; // Default to teacher user
    const {
      title,
      description,
      category,
      difficulty,
      isPublic,
      passingScore,
      timeLimit,
      allowReview,
      randomizeQuestions,
      showCorrectAnswers,
      questions
    } = req.body;

    // Create quiz (removed instructions column as it doesn't exist in the table)
    const quizResult = await sequelize.query(
      `INSERT INTO quizzes (
        title, description, category, difficulty, 
        is_public, passing_score, time_limit,
        created_by, organization_id, created_at, updated_at
      ) VALUES (
        :title, :description, :category, :difficulty,
        :isPublic, :passingScore, :timeLimit,
        :userId, 1, datetime('now'), datetime('now')
      )`,
      {
        replacements: {
          title,
          description: description || '',
          category: category || 'General',
          difficulty: difficulty || 'medium',
          isPublic: isPublic ? 1 : 0,
          passingScore: passingScore || 70,
          timeLimit: timeLimit || null,
          userId
        },
        type: sequelize.QueryTypes.INSERT
      }
    );

    // Get the last inserted quiz ID
    const [quizzes] = await sequelize.query(
      'SELECT last_insert_rowid() as id',
      { type: sequelize.QueryTypes.SELECT }
    ) as any;
    
    const quizId = quizzes.id;

    // Insert questions if provided
    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await sequelize.query(
          `INSERT INTO questions (
            quiz_id, type, question, 
            options, correct_answer, points,
            explanation, "order", created_at, updated_at
          ) VALUES (
            :quizId, :type, :question,
            :options, :correctAnswer, :points,
            :explanation, :order, datetime('now'), datetime('now')
          )`,
          {
            replacements: {
              quizId,
              type: q.type,
              question: q.question,
              options: q.options ? JSON.stringify(q.options) : null,
              correctAnswer: typeof q.correctAnswer === 'number' 
                ? q.correctAnswer.toString() 
                : q.correctAnswer,
              points: q.points || 1,
              explanation: q.explanation || null,
              order: i + 1
            },
            type: sequelize.QueryTypes.INSERT
          }
        );
      }
    }

    // Fetch the created quiz
    const [createdQuiz] = await sequelize.query(
      `SELECT 
        q.id, q.title, q.description, q.category,
        q.difficulty, q.is_public, q.passing_score,
        q.time_limit, q.created_at
      FROM quizzes q
      WHERE q.id = :quizId`,
      {
        replacements: { quizId },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;

    res.status(201).json({
      success: true,
      data: {
        id: quizId,
        ...createdQuiz
      }
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quiz'
    });
  }
};

// Update quiz
export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 2;
    const {
      title,
      description,
      category,
      difficulty,
      isPublic,
      passingScore,
      timeLimit,
      questions
    } = req.body;

    // Update quiz details
    await sequelize.query(
      `UPDATE quizzes SET
        title = :title,
        description = :description,
        category = :category,
        difficulty = :difficulty,
        is_public = :isPublic,
        passing_score = :passingScore,
        time_limit = :timeLimit,
        updated_at = datetime('now')
      WHERE id = :id`,
      {
        replacements: {
          id,
          title,
          description: description || '',
          category: category || 'General',
          difficulty: difficulty || 'medium',
          isPublic: isPublic ? 1 : 0,
          passingScore: passingScore || 70,
          timeLimit: timeLimit || null
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // Handle questions update
    if (questions && questions.length > 0) {
      // Get existing questions
      const existingQuestions = await sequelize.query(
        'SELECT id FROM questions WHERE quiz_id = :quizId',
        {
          replacements: { quizId: id },
          type: sequelize.QueryTypes.SELECT
        }
      ) as any[];

      const existingIds = existingQuestions.map((q: any) => q.id);
      const receivedIds = questions
        .filter((q: any) => typeof q.id === 'number')
        .map((q: any) => q.id);

      // Delete questions that are no longer in the list
      const toDelete = existingIds.filter(id => !receivedIds.includes(id));
      if (toDelete.length > 0) {
        await sequelize.query(
          'DELETE FROM questions WHERE id IN (:ids)',
          {
            replacements: { ids: toDelete },
            type: sequelize.QueryTypes.DELETE
          }
        );
      }

      // Update or insert questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        if (typeof q.id === 'number') {
          // Update existing question
          await sequelize.query(
            `UPDATE questions SET
              type = :type,
              question = :question,
              options = :options,
              correct_answer = :correctAnswer,
              points = :points,
              explanation = :explanation,
              "order" = :order,
              updated_at = datetime('now')
            WHERE id = :id AND quiz_id = :quizId`,
            {
              replacements: {
                id: q.id,
                quizId: id,
                type: q.type,
                question: q.question,
                options: q.options ? JSON.stringify(q.options) : null,
                correctAnswer: typeof q.correctAnswer === 'number' 
                  ? q.correctAnswer.toString() 
                  : q.correctAnswer,
                points: q.points || 1,
                explanation: q.explanation || null,
                order: i + 1
              },
              type: sequelize.QueryTypes.UPDATE
            }
          );
        } else {
          // Insert new question
          await sequelize.query(
            `INSERT INTO questions (
              quiz_id, type, question, 
              options, correct_answer, points,
              explanation, "order", created_at, updated_at
            ) VALUES (
              :quizId, :type, :question,
              :options, :correctAnswer, :points,
              :explanation, :order, datetime('now'), datetime('now')
            )`,
            {
              replacements: {
                quizId: id,
                type: q.type,
                question: q.question,
                options: q.options ? JSON.stringify(q.options) : null,
                correctAnswer: typeof q.correctAnswer === 'number' 
                  ? q.correctAnswer.toString() 
                  : q.correctAnswer,
                points: q.points || 1,
                explanation: q.explanation || null,
                order: i + 1
              },
              type: sequelize.QueryTypes.INSERT
            }
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Quiz updated successfully'
    });
  } catch (error) {
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
    const userId = (req as any).user?.id || 2;
    
    // Check if quiz exists and belongs to user (or user is admin)
    const [quiz] = await sequelize.query(
      `SELECT * FROM quizzes WHERE id = :id`,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // For now, allow any authenticated user to delete any quiz
    // In production, you should check if quiz.created_by === userId or user is admin
    
    // Delete associated questions first (if not using CASCADE)
    await sequelize.query(
      'DELETE FROM questions WHERE quiz_id = :quizId',
      {
        replacements: { quizId: id },
        type: sequelize.QueryTypes.DELETE
      }
    );
    
    // Delete the quiz
    await sequelize.query(
      'DELETE FROM quizzes WHERE id = :id',
      {
        replacements: { id },
        type: sequelize.QueryTypes.DELETE
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

// Duplicate quiz
export const duplicateQuiz = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
};

// Get quiz questions
export const getQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const questions = await sequelize.query(
      `SELECT * FROM questions WHERE quiz_id = :id ORDER BY "order"`,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions'
    });
  }
};

// Add question to quiz
export const addQuestion = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
};


// Update question
export const updateQuestion = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
};

// Delete question
export const deleteQuestion = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
};

// Reorder questions
export const reorderQuestions = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Not implemented yet'
  });
};

// Get quiz statistics
export const getQuizStatistics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      data: {
        quizId: id,
        totalPlays: 0,
        averageScore: 0,
        completionRate: 0,
        averageTime: 0
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

// Clone quiz
export const cloneQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 2;
    
    // Get original quiz
    const [originalQuiz] = await sequelize.query(
      `SELECT * FROM quizzes WHERE id = :id`,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    if (!originalQuiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // Create new quiz with copied data
    const newTitle = `${originalQuiz.title} (Copy)`;
    
    await sequelize.query(
      `INSERT INTO quizzes (
        title, description, category, difficulty, 
        is_public, passing_score, time_limit,
        created_by, organization_id, created_at, updated_at
      ) VALUES (
        :title, :description, :category, :difficulty,
        :isPublic, :passingScore, :timeLimit,
        :userId, :organizationId, datetime('now'), datetime('now')
      )`,
      {
        replacements: {
          title: newTitle,
          description: originalQuiz.description || '',
          category: originalQuiz.category || 'General',
          difficulty: originalQuiz.difficulty || 'medium',
          isPublic: 0, // Make cloned quiz private by default
          passingScore: originalQuiz.passing_score || 70,
          timeLimit: originalQuiz.time_limit || null,
          userId,
          organizationId: originalQuiz.organization_id || 1
        },
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    // Get the new quiz ID
    const [newQuizResult] = await sequelize.query(
      'SELECT last_insert_rowid() as id',
      { type: sequelize.QueryTypes.SELECT }
    ) as any;
    
    const newQuizId = newQuizResult.id;
    
    // Copy all questions from original quiz
    const originalQuestions = await sequelize.query(
      `SELECT * FROM questions WHERE quiz_id = :quizId ORDER BY "order"`,
      {
        replacements: { quizId: id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any[];
    
    // Insert copied questions
    for (const question of originalQuestions) {
      await sequelize.query(
        `INSERT INTO questions (
          quiz_id, type, question, 
          options, correct_answer, points,
          explanation, "order", created_at, updated_at
        ) VALUES (
          :quizId, :type, :question,
          :options, :correctAnswer, :points,
          :explanation, :order, datetime('now'), datetime('now')
        )`,
        {
          replacements: {
            quizId: newQuizId,
            type: question.type,
            question: question.question,
            options: question.options,
            correctAnswer: question.correct_answer,
            points: question.points || 1,
            explanation: question.explanation || null,
            order: question.order
          },
          type: sequelize.QueryTypes.INSERT
        }
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Quiz cloned successfully',
      data: {
        id: newQuizId,
        title: newTitle
      }
    });
  } catch (error) {
    console.error('Clone quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clone quiz'
    });
  }
};