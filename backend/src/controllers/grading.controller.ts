import { Request, Response } from 'express';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

// Submit and grade public quiz
export const submitPublicQuiz = async (req: Request, res: Response) => {
  try {
    const { 
      quizId, 
      sessionId,
      participant,
      answers,
      timeSpent,
      startedAt
    } = req.body;

    // Get quiz details
    const [quiz] = await sequelize.query(
      `SELECT id, title, pass_percentage 
       FROM quizzes 
       WHERE id = :quizId AND is_public = true AND is_active = true`,
      {
        replacements: { quizId },
        type: QueryTypes.SELECT
      }
    ) as any;

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or not publicly available'
      });
    }

    // Get all questions with correct answers
    const questions = await sequelize.query(
      `SELECT 
        id,
        question_type,
        correct_answers,
        options,
        points
      FROM questions 
      WHERE quiz_id = :quizId`,
      {
        replacements: { quizId },
        type: QueryTypes.SELECT
      }
    ) as any[];

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;
    let correctAnswerCount = 0;
    const gradedAnswers: any = {};

    questions.forEach((question: any) => {
      const userAnswer = answers[question.id];
      totalPoints += question.points || 10;
      
      let isCorrect = false;
      
      if (question.question_type === 'multiple_choice') {
        // For multiple choice, check if the selected option is correct
        if (question.options && Array.isArray(question.options)) {
          // Simple array format
          const correctIndex = question.correct_answers?.[0];
          const userIndex = userAnswer ? 
            (typeof userAnswer === 'string' ? userAnswer.charCodeAt(0) - 97 : -1) : -1;
          isCorrect = userIndex === correctIndex;
        } else if (question.options?.choices) {
          // Choices format
          const correctChoice = question.options.choices.find((c: any) => c.is_correct);
          isCorrect = correctChoice && userAnswer === correctChoice.id;
        }
      } else if (question.question_type === 'true_false') {
        const correctAnswer = question.correct_answers?.[0];
        isCorrect = userAnswer === correctAnswer || 
                   userAnswer === String(correctAnswer) ||
                   (userAnswer === 'true' && correctAnswer === true) ||
                   (userAnswer === 'false' && correctAnswer === false);
      } else if (question.question_type === 'short_answer') {
        // For short answers, do a case-insensitive comparison
        const correctAnswersRaw = question.correct_answers || [];
        // Ensure correctAnswers is an array
        const correctAnswers = Array.isArray(correctAnswersRaw) ? correctAnswersRaw : [correctAnswersRaw];
        if (userAnswer && correctAnswers.length > 0) {
          isCorrect = correctAnswers.some((ca: any) => {
            const answer = String(ca || '');
            return answer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
          });
        }
      }
      
      if (isCorrect) {
        earnedPoints += question.points || 10;
        correctAnswerCount++;
      }
      
      gradedAnswers[question.id] = {
        userAnswer,
        isCorrect,
        points: isCorrect ? (question.points || 10) : 0
      };
    });

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= (quiz.pass_percentage || 70);

    // Save results to database
    try {
      // First create the table if it doesn't exist
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS public_quiz_results (
          id SERIAL PRIMARY KEY,
          quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
          session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE SET NULL,
          participant_name VARCHAR(255) NOT NULL,
          participant_email VARCHAR(255) NOT NULL,
          participant_phone VARCHAR(50),
          participant_organization VARCHAR(255),
          answers JSONB NOT NULL DEFAULT '{}',
          score DECIMAL(5,2) NOT NULL DEFAULT 0,
          total_points INTEGER NOT NULL DEFAULT 0,
          earned_points INTEGER NOT NULL DEFAULT 0,
          total_questions INTEGER NOT NULL,
          answered_questions INTEGER NOT NULL DEFAULT 0,
          correct_answers INTEGER NOT NULL DEFAULT 0,
          time_spent_seconds INTEGER,
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      // Table might already exist, continue
    }

    const [result] = await sequelize.query(
      `INSERT INTO public_quiz_results (
        quiz_id,
        session_id,
        participant_name,
        participant_email,
        participant_phone,
        participant_organization,
        answers,
        score,
        total_points,
        earned_points,
        total_questions,
        answered_questions,
        correct_answers,
        time_spent_seconds,
        started_at,
        completed_at,
        ip_address,
        user_agent
      ) VALUES (
        :quizId,
        :sessionId,
        :participantName,
        :participantEmail,
        :participantPhone,
        :participantOrganization,
        :answers,
        :score,
        :totalPoints,
        :earnedPoints,
        :totalQuestions,
        :answeredQuestions,
        :correctAnswers,
        :timeSpent,
        :startedAt,
        NOW(),
        :ipAddress,
        :userAgent
      ) RETURNING id`,
      {
        replacements: {
          quizId,
          sessionId: sessionId || null,
          participantName: `${participant.firstName} ${participant.lastName}`,
          participantEmail: participant.email,
          participantPhone: participant.phone || null,
          participantOrganization: participant.organization || null,
          answers: JSON.stringify(gradedAnswers),
          score: score.toFixed(2),
          totalPoints,
          earnedPoints,
          totalQuestions: questions.length,
          answeredQuestions: Object.keys(answers).length,
          correctAnswers: correctAnswerCount,
          timeSpent: timeSpent || null,
          startedAt: startedAt || new Date().toISOString(),
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null
        },
        type: QueryTypes.INSERT
      }
    ) as any;

    // Update quiz times taken
    await sequelize.query(
      `UPDATE quizzes SET times_taken = COALESCE(times_taken, 0) + 1 WHERE id = :quizId`,
      {
        replacements: { quizId },
        type: QueryTypes.UPDATE
      }
    );

    res.json({
      success: true,
      data: {
        resultId: result[0].id,
        score: score.toFixed(2),
        passed,
        totalPoints,
        earnedPoints,
        totalQuestions: questions.length,
        answeredQuestions: Object.keys(answers).length,
        correctAnswers: correctAnswerCount,
        timeSpent,
        gradedAnswers
      }
    });
  } catch (error) {
    console.error('Error submitting public quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quiz'
    });
  }
};

// Get public quiz result by ID
export const getPublicQuizResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [result] = await sequelize.query(
      `SELECT 
        r.*,
        q.title as quiz_title,
        q.pass_percentage
      FROM public_quiz_results r
      JOIN quizzes q ON r.quiz_id = q.id
      WHERE r.id = :id`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    ) as any;
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Result not found'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching quiz result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch result'
    });
  }
};

export default {
  submitPublicQuiz,
  getPublicQuizResult
};