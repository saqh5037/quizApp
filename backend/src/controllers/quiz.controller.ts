import { Request, Response, NextFunction } from 'express';
import { Quiz, Question, User } from '../models';
import { catchAsync } from '../utils/errorHandler';
import { NotFoundError, AuthorizationError } from '../utils/errorHandler';
import { Op } from 'sequelize';
import { logger } from '../utils/logger';

export const getQuizzes = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info('getQuizzes function called');
  const userId = req.user?.id;
  const { page = 1, limit = 20, category, search } = req.query;
  logger.info('Query params:', { page, limit, category, search });
  
  const offset = (Number(page) - 1) * Number(limit);
  
  // Get regular quizzes
  const where: any = {
    [Op.or]: [
      { isPublic: true },
      { userId },
    ],
    isActive: true,
  };

  if (category && category !== 'AI Generated') {
    where.category = category;
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  let regularQuizzes = [];
  let regularCount = 0;

  // Fetch regular quizzes (including those with AI Generated category from regular table)
  const result = await Quiz.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  regularQuizzes = result.rows;
  regularCount = result.count;

  // Get AI generated quizzes
  let aiQuizzes = [];
  let aiCount = 0;

  // Fetch AI quizzes using sequelize directly
  logger.info('About to fetch AI quizzes - category:', category);
  try {
    if (!category || category === 'AI Generated' || category === 'all') {
      logger.info('Fetching AI quizzes...');
      // Import sequelize directly from config
      const { sequelize } = require('../config/database');
      
      const queryText = `
        SELECT id, title, description, difficulty, question_count, questions, status, created_at, updated_at, user_id
        FROM ai_generated_quizzes
        WHERE status = 'ready'
        ${search ? `AND (title ILIKE '%${search}%' OR description ILIKE '%${search}%')` : ''}
        ORDER BY created_at DESC
        LIMIT ${category === 'AI Generated' ? Number(limit) : Math.max(0, Number(limit) - regularQuizzes.length)}
        OFFSET ${category === 'AI Generated' ? offset : 0}
      `;
      
      logger.info('Query:', queryText);
      const [results] = await sequelize.query(queryText);
      logger.info('AI Quiz Results found:', results ? (results as any[]).length : 0);
      
      // Also get count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM ai_generated_quizzes
        WHERE status = 'ready'
        ${search ? `AND (title ILIKE '%${search}%' OR description ILIKE '%${search}%')` : ''}
      `;
      const [[{ count }]] = await sequelize.query(countQuery);
      logger.info('AI Quiz total count:', count);

      // Transform AI quizzes to match regular quiz format
      aiQuizzes = (results as any[]).map((aiQuiz: any) => ({
        id: aiQuiz.id + 100000, // Add offset to avoid ID conflicts
        title: aiQuiz.title,
        description: aiQuiz.description || 'Quiz generado por IA',
        category: 'AI Generated',
        difficulty: aiQuiz.difficulty || 'medium',
        questionsCount: aiQuiz.question_count || (aiQuiz.questions ? aiQuiz.questions.length : 0),
        timeLimit: 0,
        isPublic: true,
        isActive: true,
        createdAt: aiQuiz.created_at,
        updatedAt: aiQuiz.updated_at,
        userId: aiQuiz.user_id,
        creator: {
          id: aiQuiz.user_id || 1,
          firstName: 'IA',
          lastName: 'Gemini',
          email: 'ai@aristotest.com'
        },
        timesPlayed: 0,
        // Store original data for reference
        _aiGenerated: true,
        _originalId: aiQuiz.id,
        _questions: aiQuiz.questions
      }));
      aiCount = parseInt(count) || 0;
    }
  } catch (error) {
    logger.error('Error fetching AI quizzes:', error);
    // Continue without AI quizzes if there's an error
  }

  // Add hardcoded AI quiz to test
  const testAIQuiz = {
    id: 100001,
    title: 'Quiz de Prueba - Guardar',
    description: 'Quiz generado por IA',
    category: 'AI Generated',
    difficulty: 'medium',
    questionsCount: 5,
    timeLimit: 0,
    isPublic: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 1,
    creator: {
      id: 1,
      firstName: 'IA',
      lastName: 'Gemini',
      email: 'ai@aristotest.com'
    },
    timesPlayed: 0,
    _aiGenerated: true,
    _originalId: 1
  };

  // Combine both types of quizzes
  const allQuizzes = [...regularQuizzes, ...aiQuizzes, testAIQuiz];
  const totalCount = regularCount + aiCount + 1;

  res.json({
    success: true,
    data: allQuizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      questionsCount: quiz.questionsCount || quiz.question_count || 0,
      timeLimit: quiz.timeLimit || quiz.time_limit || 0,
      isPublic: quiz.isPublic || quiz.is_public || false,
      createdAt: quiz.createdAt || quiz.created_at,
      lastUsed: quiz.lastUsed || quiz.last_used,
      timesPlayed: quiz.timesPlayed || quiz.times_played || 0,
      _aiGenerated: quiz._aiGenerated,
      _originalId: quiz._originalId
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
    },
  });
});

export const getPublicQuizzes = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { page = 1, limit = 20, category, search } = req.query;
  
  const offset = (Number(page) - 1) * Number(limit);
  
  const where: any = {
    isPublic: true,
    isActive: true,
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Quiz.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      quizzes: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    },
  });
});

export const getQuizById = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const quiz = await Quiz.findByPk(id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
      {
        model: Question,
        as: 'questions',
        order: [['order', 'ASC']],
      },
    ],
  });

  if (!quiz) {
    throw new NotFoundError('Quiz not found');
  }

  // Check access rights
  if (!quiz.isPublic && quiz.userId !== userId) {
    throw new AuthorizationError('Access denied to this quiz');
  }

  res.json({
    success: true,
    data: { quiz },
  });
});

export const createQuiz = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user!.id;
  const quizData = { ...req.body, userId };

  const quiz = await Quiz.create(quizData);

  res.status(201).json({
    success: true,
    message: 'Quiz created successfully',
    data: { quiz },
  });
});

export const updateQuiz = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const quiz = await Quiz.findByPk(id);

  if (!quiz) {
    throw new NotFoundError('Quiz not found');
  }

  if (quiz.userId !== userId && req.user!.role !== 'admin') {
    throw new AuthorizationError('You can only edit your own quizzes');
  }

  await quiz.update(req.body);

  res.json({
    success: true,
    message: 'Quiz updated successfully',
    data: { quiz },
  });
});

export const deleteQuiz = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const quiz = await Quiz.findByPk(id);

  if (!quiz) {
    throw new NotFoundError('Quiz not found');
  }

  if (quiz.userId !== userId && req.user!.role !== 'admin') {
    throw new AuthorizationError('You can only delete your own quizzes');
  }

  await quiz.destroy();

  res.json({
    success: true,
    message: 'Quiz deleted successfully',
  });
});

export const getQuizQuestions = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const questions = await Question.findAll({
    where: { quizId: id },
    order: [['order', 'ASC']],
  });

  res.json({
    success: true,
    data: { questions },
  });
});

export const addQuestion = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const quiz = await Quiz.findByPk(id);

  if (!quiz) {
    throw new NotFoundError('Quiz not found');
  }

  if (quiz.userId !== userId && req.user!.role !== 'admin') {
    throw new AuthorizationError('You can only add questions to your own quizzes');
  }

  const questionCount = await Question.count({ where: { quizId: id } });
  
  const question = await Question.create({
    ...req.body,
    quizId: id,
    order: questionCount,
  });

  res.status(201).json({
    success: true,
    message: 'Question added successfully',
    data: { question },
  });
});

export const updateQuestion = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, questionId } = req.params;
  const userId = req.user!.id;

  const quiz = await Quiz.findByPk(id);

  if (!quiz) {
    throw new NotFoundError('Quiz not found');
  }

  if (quiz.userId !== userId && req.user!.role !== 'admin') {
    throw new AuthorizationError('You can only edit questions in your own quizzes');
  }

  const question = await Question.findOne({
    where: { id: questionId, quizId: id },
  });

  if (!question) {
    throw new NotFoundError('Question not found');
  }

  await question.update(req.body);

  res.json({
    success: true,
    message: 'Question updated successfully',
    data: { question },
  });
});

export const deleteQuestion = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, questionId } = req.params;
  const userId = req.user!.id;

  const quiz = await Quiz.findByPk(id);

  if (!quiz) {
    throw new NotFoundError('Quiz not found');
  }

  if (quiz.userId !== userId && req.user!.role !== 'admin') {
    throw new AuthorizationError('You can only delete questions from your own quizzes');
  }

  const question = await Question.findOne({
    where: { id: questionId, quizId: id },
  });

  if (!question) {
    throw new NotFoundError('Question not found');
  }

  await question.destroy();

  // Reorder remaining questions
  await Question.update(
    { order: Question.sequelize!.literal('\"order\" - 1') },
    { where: { quizId: id, order: { [Op.gt]: question.order } } }
  );

  res.json({
    success: true,
    message: 'Question deleted successfully',
  });
});

export const getQuizStatistics = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Implement statistics logic
  res.json({
    success: true,
    data: { statistics: {} },
  });
});

export const cloneQuiz = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const originalQuiz = await Quiz.findByPk(id, {
    include: [{ model: Question, as: 'questions' }],
  });

  if (!originalQuiz) {
    throw new NotFoundError('Quiz not found');
  }

  // Create new quiz
  const newQuiz = await Quiz.create({
    ...originalQuiz.toJSON(),
    id: undefined,
    title: `${originalQuiz.title} (Copy)`,
    userId,
    createdAt: undefined,
    updatedAt: undefined,
  });

  // Clone questions
  if (originalQuiz.questions) {
    for (const question of originalQuiz.questions) {
      await Question.create({
        ...question.toJSON(),
        id: undefined,
        quizId: newQuiz.id,
        createdAt: undefined,
        updatedAt: undefined,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: 'Quiz cloned successfully',
    data: { quiz: newQuiz },
  });
});