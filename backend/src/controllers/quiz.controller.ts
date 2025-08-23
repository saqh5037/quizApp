import { Request, Response, NextFunction } from 'express';
import { Quiz, Question, User } from '../models';
import { catchAsync } from '../utils/errorHandler';
import { NotFoundError, AuthorizationError } from '../utils/errorHandler';
import { Op } from 'sequelize';

export const getQuizzes = catchAsync(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  const { page = 1, limit = 20, category, search } = req.query;
  
  const offset = (Number(page) - 1) * Number(limit);
  
  const where: any = {
    [Op.or]: [
      { isPublic: true },
      { userId },
    ],
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
        attributes: ['id', 'firstName', 'lastName', 'email'],
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