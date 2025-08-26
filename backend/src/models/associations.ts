import User from './User.model';
import Organization from './Organization.model';
import Quiz from './Quiz.model';
import Question from './Question.model';
import QuizSession from './QuizSession.model';
import Participant from './Participant.model';
import Answer from './Answer.model';
import Manual from './Manual.model';
import ManualChat from './ManualChat.model';
import AIGeneratedQuiz from './AIGeneratedQuiz.model';
import ManualSummary from './ManualSummary.model';
import { Video } from './Video';
import InteractiveVideoLayer from './InteractiveVideoLayer.model';
import InteractiveVideoResult from './InteractiveVideoResult.model';
import InteractiveVideoAnswer from './InteractiveVideoAnswer.model';
import Certificate from './Certificate.model';
import Tenant from './Tenant.model';

export const setupAssociations = (): void => {
  // Organization associations
  Organization.hasMany(User, {
    foreignKey: 'organizationId',
    as: 'users',
  });
  
  User.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });
  
  // User associations
  User.hasMany(Quiz, {
    foreignKey: 'creatorId',  // Fixed: use creatorId instead of userId
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
    foreignKey: 'creatorId',  // Fixed: use creatorId instead of userId
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

  // Manual associations
  Manual.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'creator',
  });

  User.hasMany(Manual, {
    foreignKey: 'user_id',
    as: 'manuals',
  });

  // ManualChat associations
  ManualChat.belongsTo(Manual, {
    foreignKey: 'manual_id',
    as: 'manual',
  });

  ManualChat.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Manual.hasMany(ManualChat, {
    foreignKey: 'manual_id',
    as: 'chats',
    onDelete: 'CASCADE',
  });

  User.hasMany(ManualChat, {
    foreignKey: 'user_id',
    as: 'manualChats',
  });

  // AIGeneratedQuiz associations
  AIGeneratedQuiz.belongsTo(Manual, {
    foreignKey: 'manual_id',
    as: 'manual',
  });

  AIGeneratedQuiz.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Manual.hasMany(AIGeneratedQuiz, {
    foreignKey: 'manual_id',
    as: 'generatedQuizzes',
    onDelete: 'CASCADE',
  });

  User.hasMany(AIGeneratedQuiz, {
    foreignKey: 'user_id',
    as: 'generatedQuizzes',
  });

  // ManualSummary associations
  ManualSummary.belongsTo(Manual, {
    foreignKey: 'manual_id',
    as: 'manual',
  });

  ManualSummary.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });

  Manual.hasMany(ManualSummary, {
    foreignKey: 'manual_id',
    as: 'summaries',
    onDelete: 'CASCADE',
  });

  User.hasMany(ManualSummary, {
    foreignKey: 'user_id',
    as: 'manualSummaries',
  });

  // Interactive Video associations
  // InteractiveVideoLayer - Video
  InteractiveVideoLayer.belongsTo(Video, {
    foreignKey: 'videoId',
    as: 'video'
  });

  Video.hasOne(InteractiveVideoLayer, {
    foreignKey: 'videoId',
    as: 'interactiveLayer'
  });

  // InteractiveVideoLayer - User (creator)
  InteractiveVideoLayer.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });

  User.hasMany(InteractiveVideoLayer, {
    foreignKey: 'createdBy',
    as: 'createdInteractiveLayers'
  });

  // InteractiveVideoLayer - Tenant
  InteractiveVideoLayer.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });

  Tenant.hasMany(InteractiveVideoLayer, {
    foreignKey: 'tenantId',
    as: 'interactiveLayers'
  });

  // InteractiveVideoResult - InteractiveVideoLayer
  InteractiveVideoResult.belongsTo(InteractiveVideoLayer, {
    foreignKey: 'interactiveLayerId',
    as: 'interactiveLayer'
  });

  InteractiveVideoLayer.hasMany(InteractiveVideoResult, {
    foreignKey: 'interactiveLayerId',
    as: 'results'
  });

  // InteractiveVideoResult - User
  InteractiveVideoResult.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  User.hasMany(InteractiveVideoResult, {
    foreignKey: 'userId',
    as: 'interactiveVideoResults'
  });

  // InteractiveVideoResult - Certificate
  InteractiveVideoResult.belongsTo(Certificate, {
    foreignKey: 'certificateId',
    as: 'certificate'
  });

  Certificate.hasMany(InteractiveVideoResult, {
    foreignKey: 'certificateId',
    as: 'interactiveVideoResults'
  });

  // InteractiveVideoResult - Tenant
  InteractiveVideoResult.belongsTo(Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });

  Tenant.hasMany(InteractiveVideoResult, {
    foreignKey: 'tenantId',
    as: 'interactiveVideoResults'
  });

  // InteractiveVideoAnswer - InteractiveVideoResult
  InteractiveVideoAnswer.belongsTo(InteractiveVideoResult, {
    foreignKey: 'resultId',
    as: 'result'
  });

  InteractiveVideoResult.hasMany(InteractiveVideoAnswer, {
    foreignKey: 'resultId',
    as: 'interactiveVideoAnswers'
  });
};