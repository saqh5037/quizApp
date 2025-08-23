import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';
import crypto from 'crypto';

// Generate a unique session code
const generateSessionCode = (): string => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Create a new session
export const createSession = async (req: Request, res: Response) => {
  try {
    const { quizId, name, settings = {} } = req.body;
    const hostId = (req as any).user?.id;
    
    if (!hostId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Generate a unique session code
    let sessionCode = generateSessionCode();
    let codeExists = true;
    let attempts = 0;
    
    // Check if code already exists
    while (codeExists && attempts < 10) {
      const [existing] = await sequelize.query(
        'SELECT id FROM quiz_sessions WHERE session_code = :code',
        {
          replacements: { code: sessionCode },
          type: QueryTypes.SELECT
        }
      ) as any;
      
      if (!existing) {
        codeExists = false;
      } else {
        sessionCode = generateSessionCode();
        attempts++;
      }
    }
    
    // Get quiz details
    const [quiz] = await sequelize.query(
      `SELECT q.*, 
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questions_count
      FROM quizzes q 
      WHERE q.id = :quizId AND q.is_active = true`,
      {
        replacements: { quizId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or inactive'
      });
    }
    
    // Create session
    const [result] = await sequelize.query(
      `INSERT INTO quiz_sessions (
        quiz_id, host_id, session_code, name, status, mode,
        current_question_index, max_participants, allow_late_joining,
        show_leaderboard, show_correct_after_each, nickname_generator,
        require_names, settings, created_at, updated_at
      ) VALUES (
        :quizId, :hostId, :sessionCode, :name, 'waiting', 'live',
        0, :maxParticipants, :allowLateJoining,
        :showLeaderboard, :showCorrectAfterEach, :nicknameGenerator,
        :requireNames, :settings, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          quizId,
          hostId,
          sessionCode,
          name: name || `Session for ${quiz.title}`,
          maxParticipants: settings.maxParticipants || 100,
          allowLateJoining: settings.allowLateJoining !== false,
          showLeaderboard: settings.showLeaderboard !== false,
          showCorrectAfterEach: settings.showCorrectAfterEach || false,
          nicknameGenerator: settings.nicknameGenerator || false,
          requireNames: settings.requireNames !== false,
          settings: JSON.stringify(settings)
        },
        type: QueryTypes.INSERT
      }
    ) as any;
    
    const session = result[0];
    
    res.status(201).json({
      success: true,
      data: {
        id: session.id,
        code: session.session_code,
        name: session.name,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          questionsCount: parseInt(quiz.questions_count) || 0,
          timeLimit: quiz.time_limit_minutes
        },
        participantsCount: 0,
        settings: session.settings
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
};

// Get session by ID or code
export const getSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if it's an ID or a code
    const isCode = isNaN(Number(id));
    
    const query = isCode
      ? `SELECT s.*, q.title as quiz_title, q.total_questions,
         (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
         FROM quiz_sessions s
         JOIN quizzes q ON s.quiz_id = q.id
         WHERE s.session_code = :identifier`
      : `SELECT s.*, q.title as quiz_title, q.total_questions,
         (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
         FROM quiz_sessions s
         JOIN quizzes q ON s.quiz_id = q.id
         WHERE s.id = :identifier`;
    
    const [session] = await sequelize.query(
      query,
      {
        replacements: { identifier: id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: session.id,
        code: session.session_code,
        name: session.name,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        quiz: {
          id: session.quiz_id,
          title: session.quiz_title,
          questionsCount: session.total_questions || 0
        },
        participantsCount: parseInt(session.participants_count) || 0,
        settings: session.settings,
        startedAt: session.started_at,
        endedAt: session.ended_at
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session'
    });
  }
};

// Update session status
export const updateSessionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, currentQuestionIndex } = req.body;
    const hostId = (req as any).user?.id;
    
    // Verify host
    const [session] = await sequelize.query(
      'SELECT * FROM quiz_sessions WHERE id = :id AND host_id = :hostId',
      {
        replacements: { id, hostId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!session) {
      return res.status(403).json({
        success: false,
        error: 'Session not found or you are not the host'
      });
    }
    
    // Update session
    const updates: string[] = [];
    const replacements: any = { id };
    
    if (status) {
      updates.push('status = :status');
      replacements.status = status;
      
      if (status === 'active' && !session.started_at) {
        updates.push('started_at = NOW()');
      } else if (status === 'completed' && !session.ended_at) {
        updates.push('ended_at = NOW()');
      }
    }
    
    if (currentQuestionIndex !== undefined) {
      updates.push('current_question_index = :currentQuestionIndex');
      updates.push('current_question_started_at = NOW()');
      replacements.currentQuestionIndex = currentQuestionIndex;
    }
    
    updates.push('updated_at = NOW()');
    
    await sequelize.query(
      `UPDATE quiz_sessions SET ${updates.join(', ')} WHERE id = :id`,
      {
        replacements,
        type: QueryTypes.UPDATE
      }
    );
    
    res.json({
      success: true,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session'
    });
  }
};

// Get current question for session
export const getCurrentQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get session
    const [session] = await sequelize.query(
      'SELECT * FROM quiz_sessions WHERE id = :id OR session_code = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Get current question
    const [question] = await sequelize.query(
      `SELECT * FROM questions 
       WHERE quiz_id = :quizId 
       ORDER BY order_position 
       LIMIT 1 OFFSET :offset`,
      {
        replacements: {
          quizId: session.quiz_id,
          offset: session.current_question_index
        },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!question) {
      return res.json({
        success: true,
        data: null,
        message: 'No more questions'
      });
    }
    
    // Don't send correct answers to participants
    const questionData = { ...question };
    delete questionData.correct_answers;
    
    res.json({
      success: true,
      data: {
        question: questionData,
        questionNumber: session.current_question_index + 1,
        totalQuestions: session.total_questions || 0,
        timeStarted: session.current_question_started_at
      }
    });
  } catch (error) {
    console.error('Get current question error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current question'
    });
  }
};

// Submit answer
export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { sessionId, participantId, questionId, answer, timeSpent } = req.body;
    
    // Get question to check answer
    const [question] = await sequelize.query(
      'SELECT * FROM questions WHERE id = :questionId',
      {
        replacements: { questionId },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }
    
    // Check if answer is correct
    let isCorrect = false;
    let points = 0;
    
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      isCorrect = JSON.stringify(answer) === JSON.stringify(question.correct_answers);
    } else if (question.question_type === 'short_answer') {
      // Simple text comparison (case insensitive)
      const correctAnswers = Array.isArray(question.correct_answers) 
        ? question.correct_answers 
        : [question.correct_answers];
      isCorrect = correctAnswers.some((correct: string) => 
        correct.toLowerCase().trim() === String(answer).toLowerCase().trim()
      );
    }
    
    if (isCorrect) {
      points = question.points || 1;
    }
    
    // Save answer
    await sequelize.query(
      `INSERT INTO answers (
        session_id, participant_id, question_id, 
        answer, is_correct, points_earned, 
        time_spent_seconds, created_at
      ) VALUES (
        :sessionId, :participantId, :questionId,
        :answer, :isCorrect, :points,
        :timeSpent, NOW()
      ) ON CONFLICT (session_id, participant_id, question_id) 
      DO UPDATE SET 
        answer = :answer,
        is_correct = :isCorrect,
        points_earned = :points,
        time_spent_seconds = :timeSpent`,
      {
        replacements: {
          sessionId,
          participantId,
          questionId,
          answer: JSON.stringify(answer),
          isCorrect,
          points,
          timeSpent: timeSpent || 0
        },
        type: QueryTypes.INSERT
      }
    );
    
    res.json({
      success: true,
      data: {
        isCorrect,
        points,
        correctAnswer: question.correct_answers
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit answer'
    });
  }
};

// Get session results
export const getSessionResults = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get leaderboard
    const leaderboard = await sequelize.query(
      `SELECT 
        p.id,
        p.nickname,
        p.email,
        COALESCE(SUM(a.points_earned), 0) as total_points,
        COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_answers,
        COUNT(a.id) as total_answers,
        AVG(a.time_spent_seconds) as avg_time
      FROM participants p
      LEFT JOIN answers a ON p.id = a.participant_id
      WHERE p.session_id = :sessionId
      GROUP BY p.id, p.nickname, p.email
      ORDER BY total_points DESC, avg_time ASC`,
      {
        replacements: { sessionId: id },
        type: QueryTypes.SELECT
      }
    );
    
    // Get session statistics
    const [stats] = await sequelize.query(
      `SELECT 
        COUNT(DISTINCT p.id) as total_participants,
        COUNT(DISTINCT a.question_id) as questions_answered,
        AVG(CASE WHEN a.is_correct THEN 100.0 ELSE 0 END) as avg_score,
        AVG(a.time_spent_seconds) as avg_time_per_question
      FROM quiz_sessions s
      LEFT JOIN participants p ON s.id = p.session_id
      LEFT JOIN answers a ON p.id = a.participant_id
      WHERE s.id = :sessionId
      GROUP BY s.id`,
      {
        replacements: { sessionId: id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    res.json({
      success: true,
      data: {
        leaderboard,
        statistics: stats || {
          total_participants: 0,
          questions_answered: 0,
          avg_score: 0,
          avg_time_per_question: 0
        }
      }
    });
  } catch (error) {
    console.error('Get session results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session results'
    });
  }
};

// Get active sessions
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await sequelize.query(
      `SELECT 
        s.id,
        s.session_code as code,
        s.name,
        s.status,
        s.current_question_index,
        s.started_at,
        q.id as quiz_id,
        q.title as quiz_title,
        q.total_questions as questions_count,
        q.time_limit_minutes,
        (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
      FROM quiz_sessions s
      JOIN quizzes q ON s.quiz_id = q.id
      WHERE s.status IN ('waiting', 'active')
      ORDER BY s.created_at DESC`,
      {
        type: QueryTypes.SELECT
      }
    );
    
    res.json({
      success: true,
      data: sessions.map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        currentQuestionIndex: s.current_question_index,
        startedAt: s.started_at,
        quiz: {
          id: s.quiz_id,
          title: s.quiz_title,
          questionsCount: s.questions_count || 0,
          timeLimit: s.time_limit_minutes
        },
        participantsCount: parseInt(s.participants_count) || 0
      }))
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions'
    });
  }
};

// Get user's hosted sessions
export const getMySessions = async (req: Request, res: Response) => {
  try {
    const hostId = (req as any).user?.id;
    
    const sessions = await sequelize.query(
      `SELECT 
        s.id,
        s.session_code as code,
        s.name,
        s.status,
        s.current_question_index,
        s.started_at,
        s.ended_at,
        q.id as quiz_id,
        q.title as quiz_title,
        q.total_questions as questions_count,
        q.time_limit_minutes,
        (SELECT COUNT(*) FROM participants WHERE session_id = s.id) as participants_count
      FROM quiz_sessions s
      JOIN quizzes q ON s.quiz_id = q.id
      WHERE s.host_id = :hostId
      ORDER BY s.created_at DESC
      LIMIT 20`,
      {
        replacements: { hostId },
        type: QueryTypes.SELECT
      }
    );
    
    res.json({
      success: true,
      data: sessions.map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        currentQuestionIndex: s.current_question_index,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        quiz: {
          id: s.quiz_id,
          title: s.quiz_title,
          questionsCount: s.questions_count || 0,
          timeLimit: s.time_limit_minutes
        },
        participantsCount: parseInt(s.participants_count) || 0,
        isHost: true
      }))
    });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get your sessions'
    });
  }
};

// Join session as participant
export const joinSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nickname } = req.body;
    const userId = (req as any).user?.id;
    const email = (req as any).user?.email;
    
    // Check if session exists and is joinable
    const [session] = await sequelize.query(
      `SELECT * FROM quiz_sessions 
      WHERE (id = :id OR session_code = :id) 
      AND status IN ('waiting', 'active')`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or not available'
      });
    }
    
    // Check if already joined
    const [existing] = await sequelize.query(
      `SELECT id FROM participants 
      WHERE session_id = :sessionId 
      AND (user_id = :userId OR email = :email)`,
      {
        replacements: { 
          sessionId: session.id,
          userId: userId || 0,
          email: email || ''
        },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (existing) {
      return res.json({
        success: true,
        data: {
          participantId: existing.id,
          sessionId: session.id,
          message: 'Already joined this session'
        }
      });
    }
    
    // Join session
    const [result] = await sequelize.query(
      `INSERT INTO participants (
        session_id, user_id, nickname, email, 
        status, joined_at, last_activity_at
      ) VALUES (
        :sessionId, :userId, :nickname, :email,
        'active', NOW(), NOW()
      ) RETURNING id`,
      {
        replacements: {
          sessionId: session.id,
          userId: userId || null,
          nickname: nickname || 'Anonymous',
          email: email || null
        },
        type: QueryTypes.INSERT
      }
    ) as any;
    
    res.json({
      success: true,
      data: {
        participantId: result[0].id,
        sessionId: session.id,
        sessionCode: session.session_code
      }
    });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join session'
    });
  }
};

export default {
  createSession,
  getSession,
  updateSessionStatus,
  getCurrentQuestion,
  submitAnswer,
  getSessionResults,
  getActiveSessions,
  getMySessions,
  joinSession
};