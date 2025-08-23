import { Server, Socket } from 'socket.io';
import { QuizSession, Participant, Question, Answer } from '../../models';
import { CONSTANTS } from '../../config/constants';
import logger from '../../utils/logger';
import { SubmitAnswerData, SocketData, LeaderboardEntry } from '../../types/socket.types';
import { Op } from 'sequelize';

export const quizHandlers = {
  async nextQuestion(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId, {
        include: [{
          model: Question,
          as: 'questions',
          through: { attributes: [] },
        }],
      });

      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const questions = await Question.findAll({
        where: { quizId: session.quizId },
        order: [['order', 'ASC']],
      });

      const nextIndex = session.currentQuestionIndex + 1;
      if (nextIndex >= questions.length) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'No more questions',
        });
        return;
      }

      await session.update({ currentQuestionIndex: nextIndex });

      const currentQuestion = questions[nextIndex];
      
      // Don't send correct answer to participants
      const questionData = {
        id: currentQuestion.id,
        type: currentQuestion.type,
        question: currentQuestion.question,
        options: currentQuestion.options,
        timeLimit: currentQuestion.timeLimit,
        points: currentQuestion.points,
        imageUrl: currentQuestion.imageUrl,
        index: nextIndex,
        total: questions.length,
      };

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.QUESTION_CHANGED, {
        question: questionData,
        startTime: new Date(),
      });

      logger.info(`Session ${session.sessionCode} moved to question ${nextIndex + 1}`);
    } catch (error) {
      logger.error('Error moving to next question:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to load next question',
      });
    }
  },

  async previousQuestion(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId);
      
      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const prevIndex = Math.max(0, session.currentQuestionIndex - 1);
      
      if (prevIndex === session.currentQuestionIndex) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Already at first question',
        });
        return;
      }

      await session.update({ currentQuestionIndex: prevIndex });

      const questions = await Question.findAll({
        where: { quizId: session.quizId },
        order: [['order', 'ASC']],
      });

      const currentQuestion = questions[prevIndex];
      
      const questionData = {
        id: currentQuestion.id,
        type: currentQuestion.type,
        question: currentQuestion.question,
        options: currentQuestion.options,
        timeLimit: currentQuestion.timeLimit,
        points: currentQuestion.points,
        imageUrl: currentQuestion.imageUrl,
        index: prevIndex,
        total: questions.length,
      };

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.QUESTION_CHANGED, {
        question: questionData,
        startTime: new Date(),
      });

      logger.info(`Session ${session.sessionCode} moved to question ${prevIndex + 1}`);
    } catch (error) {
      logger.error('Error moving to previous question:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to load previous question',
      });
    }
  },

  async submitAnswer(socket: Socket, io: Server, data: SubmitAnswerData) {
    try {
      const { sessionId, participantId } = socket.data;
      const { questionId, answer, responseTime } = data;
      
      if (!sessionId || !participantId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Not in a session',
        });
        return;
      }

      // Check if answer already exists
      const existingAnswer = await Answer.findOne({
        where: {
          participantId,
          questionId,
        },
      });

      if (existingAnswer) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Already answered this question',
        });
        return;
      }

      // Get question to verify answer
      const question = await Question.findByPk(questionId);
      if (!question) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Question not found',
        });
        return;
      }

      // Check if answer is correct
      const isCorrect = question.isCorrectAnswer(answer);
      
      // Calculate points (with time bonus)
      const basePoints = question.points;
      const maxTime = question.timeLimit || 30;
      const timeBonus = Math.max(0, 1 - (responseTime / maxTime)) * 0.5;
      const points = isCorrect ? Math.round(basePoints * (1 + timeBonus)) : 0;

      // Save answer
      const answerRecord = await Answer.create({
        participantId,
        questionId,
        sessionId,
        answer,
        isCorrect,
        points,
        responseTime,
      });

      // Update participant score
      const participant = await Participant.findByPk(participantId);
      if (participant) {
        await participant.increment({
          score: points,
          answeredQuestions: 1,
          correctAnswers: isCorrect ? 1 : 0,
        });

        // Update average response time
        const totalTime = participant.averageResponseTime * (participant.answeredQuestions - 1) + responseTime;
        await participant.update({
          averageResponseTime: totalTime / participant.answeredQuestions,
        });
      }

      // Notify host about answer received
      io.to(`host:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.ANSWER_RECEIVED, {
        participantId,
        questionId,
        isCorrect,
        responseTime,
      });

      // Send confirmation to participant
      socket.emit('answer_submitted', {
        isCorrect,
        points,
        totalScore: participant?.score || 0,
      });

      // Update leaderboard
      await updateAndBroadcastLeaderboard(io, sessionId);

      logger.info(`Answer submitted by participant ${participantId} for question ${questionId}`);
    } catch (error) {
      logger.error('Error submitting answer:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to submit answer',
      });
    }
  },

  async skipQuestion(socket: Socket, io: Server) {
    try {
      const { sessionId, participantId } = socket.data;
      
      if (!sessionId || !participantId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Not in a session',
        });
        return;
      }

      // Record skipped question (0 points)
      const session = await QuizSession.findByPk(sessionId);
      if (!session) return;

      const questions = await Question.findAll({
        where: { quizId: session.quizId },
        order: [['order', 'ASC']],
      });

      const currentQuestion = questions[session.currentQuestionIndex];
      if (!currentQuestion) return;

      await Answer.create({
        participantId,
        questionId: currentQuestion.id,
        sessionId,
        answer: null,
        isCorrect: false,
        points: 0,
        responseTime: 0,
      });

      const participant = await Participant.findByPk(participantId);
      if (participant) {
        await participant.increment('answeredQuestions');
      }

      socket.emit('question_skipped');
      
      logger.info(`Participant ${participantId} skipped question`);
    } catch (error) {
      logger.error('Error skipping question:', error);
    }
  },

  async showResults(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId);
      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      await session.update({ showLeaderboard: true });

      // Get current question results
      const questions = await Question.findAll({
        where: { quizId: session.quizId },
        order: [['order', 'ASC']],
      });

      const currentQuestion = questions[session.currentQuestionIndex];
      if (!currentQuestion) return;

      const answers = await Answer.findAll({
        where: {
          sessionId,
          questionId: currentQuestion.id,
        },
        include: [{
          model: Participant,
          as: 'participant',
        }],
      });

      const stats = {
        totalAnswers: answers.length,
        correctAnswers: answers.filter(a => a.isCorrect).length,
        averageResponseTime: answers.reduce((sum, a) => sum + a.responseTime, 0) / answers.length || 0,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
      };

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.SHOW_RESULTS, {
        questionId: currentQuestion.id,
        stats,
      });

      logger.info(`Showing results for session ${session.sessionCode}`);
    } catch (error) {
      logger.error('Error showing results:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to show results',
      });
    }
  },

  async hideResults(socket: Socket, io: Server) {
    try {
      const { sessionId } = socket.data;
      const socketData = socket.data as SocketData;
      
      if (!socketData.user || !sessionId) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      const session = await QuizSession.findByPk(sessionId);
      if (!session || session.hostId !== socketData.user.id) {
        socket.emit(CONSTANTS.SOCKET_EVENTS.ERROR, {
          message: 'Unauthorized',
        });
        return;
      }

      await session.update({ showLeaderboard: false });

      io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.HIDE_RESULTS);

      logger.info(`Hiding results for session ${session.sessionCode}`);
    } catch (error) {
      logger.error('Error hiding results:', error);
      socket.emit(CONSTANTS.SOCKET_EVENTS.SESSION_ERROR, {
        message: 'Failed to hide results',
      });
    }
  },
};

async function updateAndBroadcastLeaderboard(io: Server, sessionId: number) {
  try {
    const participants = await Participant.findAll({
      where: { sessionId },
      order: [
        ['score', 'DESC'],
        ['averageResponseTime', 'ASC'],
      ],
      limit: 10,
    });

    const leaderboard: LeaderboardEntry[] = participants.map((p, index) => ({
      participantId: p.id,
      nickname: p.nickname,
      score: p.score,
      answeredQuestions: p.answeredQuestions,
      correctAnswers: p.correctAnswers,
      rank: index + 1,
    }));

    io.to(`session:${sessionId}`).emit(CONSTANTS.SOCKET_EVENTS.LEADERBOARD_UPDATE, {
      leaderboard,
    });
  } catch (error) {
    logger.error('Error updating leaderboard:', error);
  }
}