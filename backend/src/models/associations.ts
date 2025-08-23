import User from './User.model';
import Quiz from './Quiz.model';
import Question from './Question.model';
import QuizSession from './QuizSession.model';
import Participant from './Participant.model';
import Answer from './Answer.model';

export const setupAssociations = (): void => {
  // User associations
  User.hasMany(Quiz, {
    foreignKey: 'userId',
    as: 'quizzes',
  });

  User.hasMany(QuizSession, {
    foreignKey: 'hostId',
    as: 'hostedSessions',
  });

  User.hasMany(Participant, {
    foreignKey: 'userId',
    as: 'participations',
  });

  // Quiz associations
  Quiz.belongsTo(User, {
    foreignKey: 'userId',
    as: 'creator',
  });

  Quiz.hasMany(Question, {
    foreignKey: 'quizId',
    as: 'questions',
    onDelete: 'CASCADE',
  });

  Quiz.hasMany(QuizSession, {
    foreignKey: 'quizId',
    as: 'sessions',
  });

  // Question associations
  Question.belongsTo(Quiz, {
    foreignKey: 'quizId',
    as: 'quiz',
  });

  Question.hasMany(Answer, {
    foreignKey: 'questionId',
    as: 'answers',
    onDelete: 'CASCADE',
  });

  // QuizSession associations
  QuizSession.belongsTo(Quiz, {
    foreignKey: 'quizId',
    as: 'quiz',
  });

  QuizSession.belongsTo(User, {
    foreignKey: 'hostId',
    as: 'host',
  });

  QuizSession.hasMany(Participant, {
    foreignKey: 'sessionId',
    as: 'participants',
    onDelete: 'CASCADE',
  });

  QuizSession.hasMany(Answer, {
    foreignKey: 'sessionId',
    as: 'answers',
    onDelete: 'CASCADE',
  });

  // Participant associations
  Participant.belongsTo(QuizSession, {
    foreignKey: 'sessionId',
    as: 'session',
  });

  Participant.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  Participant.hasMany(Answer, {
    foreignKey: 'participantId',
    as: 'answers',
    onDelete: 'CASCADE',
  });

  // Answer associations
  Answer.belongsTo(Participant, {
    foreignKey: 'participantId',
    as: 'participant',
  });

  Answer.belongsTo(Question, {
    foreignKey: 'questionId',
    as: 'question',
  });

  Answer.belongsTo(QuizSession, {
    foreignKey: 'sessionId',
    as: 'session',
  });
};