import { Request, Response } from 'express';
import { sequelize } from '../config/database';

// Create a new session
export const createSession = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.body;
    const hostId = (req as any).user?.id || 2;
    
    // Generate a unique session code
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Get quiz details with question count
    const [quiz] = await sequelize.query(
      `SELECT q.*, 
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questions_count
      FROM quizzes q 
      WHERE q.id = :quizId`,
      {
        replacements: { quizId },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // Create session
    await sequelize.query(
      `INSERT INTO sessions (
        quiz_id, host_id, code, status, 
        current_question, created_at, updated_at
      ) VALUES (
        :quizId, :hostId, :code, 'waiting',
        0, datetime('now'), datetime('now')
      )`,
      {
        replacements: {
          quizId,
          hostId,
          code: sessionCode
        },
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    // Get the created session ID
    const [sessionResult] = await sequelize.query(
      'SELECT last_insert_rowid() as id',
      { type: sequelize.QueryTypes.SELECT }
    ) as any;
    
    res.status(201).json({
      success: true,
      data: {
        id: sessionResult.id,
        code: sessionCode,
        status: 'waiting',
        currentQuestion: 0,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          questionsCount: quiz.questions_count || 0
        },
        participantsCount: 0
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
      ? 'SELECT * FROM sessions WHERE code = :identifier'
      : 'SELECT * FROM sessions WHERE id = :identifier';
    
    const [session] = await sequelize.query(
      query,
      {
        replacements: { identifier: id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Get quiz details
    const [quiz] = await sequelize.query(
      'SELECT * FROM quizzes WHERE id = :quizId',
      {
        replacements: { quizId: session.quiz_id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    // Get questions count
    const [questionCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM questions WHERE quiz_id = :quizId',
      {
        replacements: { quizId: session.quiz_id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    // Get participants count
    const [participantCount] = await sequelize.query(
      'SELECT COUNT(DISTINCT participant_name) as count FROM responses WHERE session_id = :sessionId',
      {
        replacements: { sessionId: session.id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    res.json({
      success: true,
      data: {
        id: session.id,
        code: session.code,
        status: session.status,
        currentQuestion: session.current_question,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questionsCount: questionCount.count,
          timeLimit: quiz.time_limit
        },
        participantsCount: participantCount.count || 0
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
    const { status, currentQuestion } = req.body;
    
    const updates: any = {
      status,
      updated_at: "datetime('now')"
    };
    
    if (currentQuestion !== undefined) {
      updates.current_question = currentQuestion;
    }
    
    const updateFields = Object.keys(updates)
      .map(key => `${key} = :${key}`)
      .join(', ');
    
    await sequelize.query(
      `UPDATE sessions SET ${updateFields} WHERE id = :id`,
      {
        replacements: { ...updates, id },
        type: sequelize.QueryTypes.UPDATE
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
      'SELECT * FROM sessions WHERE id = :id',
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Get all questions for the quiz
    const questions = await sequelize.query(
      'SELECT * FROM questions WHERE quiz_id = :quizId ORDER BY "order"',
      {
        replacements: { quizId: session.quiz_id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any[];
    
    const currentQuestionIndex = session.current_question || 0;
    
    if (currentQuestionIndex >= questions.length) {
      return res.json({
        success: true,
        data: {
          finished: true,
          totalQuestions: questions.length
        }
      });
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    
    // Parse options if it's a JSON string
    if (currentQuestion.options && typeof currentQuestion.options === 'string') {
      try {
        currentQuestion.options = JSON.parse(currentQuestion.options);
      } catch (e) {
        // Keep as is if not valid JSON
      }
    }
    
    res.json({
      success: true,
      data: {
        questionNumber: currentQuestionIndex + 1,
        totalQuestions: questions.length,
        question: {
          id: currentQuestion.id,
          type: currentQuestion.type,
          question: currentQuestion.question,
          options: currentQuestion.options,
          points: currentQuestion.points || 10,
          timeLimit: null // No time limit per question, use quiz time limit if needed
        }
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
    const { sessionId, questionId, answer, participantName, timeSpent } = req.body;
    
    // Get the correct answer
    const [question] = await sequelize.query(
      'SELECT correct_answer, points FROM questions WHERE id = :questionId',
      {
        replacements: { questionId },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }
    
    // Check if answer is correct
    const isCorrect = String(answer) === String(question.correct_answer);
    const score = isCorrect ? question.points : 0;
    
    // Save response
    await sequelize.query(
      `INSERT INTO responses (
        session_id, question_id, participant_name,
        answer, is_correct, score, time_spent,
        created_at
      ) VALUES (
        :sessionId, :questionId, :participantName,
        :answer, :isCorrect, :score, :timeSpent,
        datetime('now')
      )`,
      {
        replacements: {
          sessionId,
          questionId,
          participantName,
          answer: String(answer),
          isCorrect: isCorrect ? 1 : 0,
          score,
          timeSpent: timeSpent || 0
        },
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    res.json({
      success: true,
      data: {
        isCorrect,
        score
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
    const { participantName } = req.query;
    
    // Get session and quiz info
    const [session] = await sequelize.query(
      `SELECT s.*, q.title as quiz_title, q.passing_score
       FROM sessions s
       JOIN quizzes q ON s.quiz_id = q.id
       WHERE s.id = :id`,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    ) as any;
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    if (participantName) {
      // Get individual participant results
      const responses = await sequelize.query(
        `SELECT r.*, q.question, q.correct_answer, q.options
         FROM responses r
         JOIN questions q ON r.question_id = q.id
         WHERE r.session_id = :sessionId AND r.participant_name = :participantName
         ORDER BY r.created_at`,
        {
          replacements: { sessionId: id, participantName },
          type: sequelize.QueryTypes.SELECT
        }
      ) as any[];
      
      const totalScore = responses.reduce((sum, r) => sum + r.score, 0);
      const totalPossible = responses.length > 0 ? 
        await sequelize.query(
          `SELECT SUM(points) as total FROM questions 
           WHERE quiz_id = :quizId`,
          {
            replacements: { quizId: session.quiz_id },
            type: sequelize.QueryTypes.SELECT
          }
        ).then((r: any) => r[0].total) : 0;
      
      const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
      
      res.json({
        success: true,
        data: {
          participant: participantName,
          quizTitle: session.quiz_title,
          totalScore,
          totalPossible,
          percentage: Math.round(percentage),
          passed: percentage >= session.passing_score,
          passingScore: session.passing_score,
          responses: responses.map(r => ({
            question: r.question,
            answer: r.answer,
            correctAnswer: r.correct_answer,
            isCorrect: r.is_correct === 1,
            score: r.score,
            options: r.options ? JSON.parse(r.options) : null
          }))
        }
      });
    } else {
      // Get all participants results (for host)
      const participants = await sequelize.query(
        `SELECT 
          participant_name,
          SUM(score) as total_score,
          COUNT(*) as questions_answered,
          SUM(is_correct) as correct_answers,
          AVG(time_spent) as avg_time
         FROM responses
         WHERE session_id = :sessionId
         GROUP BY participant_name
         ORDER BY total_score DESC`,
        {
          replacements: { sessionId: id },
          type: sequelize.QueryTypes.SELECT
        }
      ) as any[];
      
      res.json({
        success: true,
        data: {
          quizTitle: session.quiz_title,
          participants,
          totalParticipants: participants.length
        }
      });
    }
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get results'
    });
  }
};