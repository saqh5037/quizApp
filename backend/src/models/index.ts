import User from './User.model';
import Organization from './Organization.model';
import Quiz from './Quiz.model';
import Question from './Question.model';
import QuizSession from './QuizSession.model';
import Participant from './Participant.model';
import Answer from './Answer.model';
import Tenant from './Tenant.model';
import Classroom from './Classroom.model';
import TrainingProgram from './TrainingProgram.model';
import ClassroomEnrollment from './ClassroomEnrollment.model';
import ProgramQuiz from './ProgramQuiz.model';
import Certificate from './Certificate.model';
import Manual from './Manual.model';
import ManualChat from './ManualChat.model';
import AIGeneratedQuiz from './AIGeneratedQuiz.model';
import ManualSummary from './ManualSummary.model';
import { 
  Video, 
  VideoCategory, 
  VideoQuality, 
  VideoChapter, 
  VideoTranscription,
  VideoProgress,
  VideoNote,
  VideoBookmark,
  VideoComment,
  VideoAnalytics,
  VideoQuizPoint,
  VideoPlaylist,
  PlaylistVideo
} from './Video';
import InteractiveVideoLayer from './InteractiveVideoLayer.model';
import InteractiveVideoResult from './InteractiveVideoResult.model';
import InteractiveVideoAnswer from './InteractiveVideoAnswer.model';
import { setupAssociations } from './associations';
import { sequelize } from '../config/database';

// Initialize Multi-tenant models
Tenant.initModel(sequelize);
Classroom.initModel(sequelize);
TrainingProgram.initModel(sequelize);
ClassroomEnrollment.initModel(sequelize);
ProgramQuiz.initModel(sequelize);
Certificate.initModel(sequelize);

// Manual model is already initialized in Manual.model.ts

// Initialize Video models
Video.initModel(sequelize);
VideoCategory.initModel(sequelize);
VideoQuality.initModel(sequelize);
VideoChapter.initModel(sequelize);
VideoTranscription.initModel(sequelize);
VideoProgress.initModel(sequelize);
VideoNote.initModel(sequelize);
VideoBookmark.initModel(sequelize);
VideoComment.initModel(sequelize);
VideoAnalytics.initModel(sequelize);
VideoQuizPoint.initModel(sequelize);
VideoPlaylist.initModel(sequelize);
PlaylistVideo.initModel(sequelize);

// Initialize Interactive Video models
InteractiveVideoLayer.initModel(sequelize);
InteractiveVideoResult.initModel(sequelize);
InteractiveVideoAnswer.initModel(sequelize);

// Setup all model associations
setupAssociations();

// Setup Multi-tenant associations
Tenant.associate({
  User,
  Classroom,
  TrainingProgram,
  Quiz,
  Certificate,
  InteractiveVideoLayer,
  InteractiveVideoResult
});

Classroom.associate({
  Tenant,
  User,
  TrainingProgram,
  ClassroomEnrollment
});

TrainingProgram.associate({
  Tenant,
  Classroom,
  ProgramQuiz,
  Quiz
});

ClassroomEnrollment.associate({
  Tenant,
  Classroom,
  User
});

ProgramQuiz.associate({
  Tenant,
  TrainingProgram,
  Quiz
});

Certificate.associate({
  Tenant,
  User,
  InteractiveVideoResult
});

// Setup Video associations
Video.associate({
  User,
  Quiz,
  VideoCategory,
  VideoQuality,
  VideoChapter,
  VideoTranscription,
  VideoProgress,
  VideoNote,
  VideoBookmark,
  VideoComment,
  VideoAnalytics,
  VideoQuizPoint,
  VideoPlaylist,
  PlaylistVideo,
  InteractiveVideoLayer
});

export {
  User,
  Organization,
  Quiz,
  Question,
  QuizSession,
  Participant,
  Answer,
  Tenant,
  Classroom,
  TrainingProgram,
  ClassroomEnrollment,
  ProgramQuiz,
  Certificate,
  Manual,
  ManualChat,
  AIGeneratedQuiz,
  ManualSummary,
  Video,
  VideoCategory,
  VideoQuality,
  VideoChapter,
  VideoTranscription,
  VideoProgress,
  VideoNote,
  VideoBookmark,
  VideoComment,
  VideoAnalytics,
  VideoQuizPoint,
  VideoPlaylist,
  PlaylistVideo,
  InteractiveVideoLayer,
  InteractiveVideoResult,
  InteractiveVideoAnswer
};

export default {
  User,
  Organization,
  Quiz,
  Question,
  QuizSession,
  Participant,
  Answer,
  Tenant,
  Classroom,
  TrainingProgram,
  ClassroomEnrollment,
  ProgramQuiz,
  Certificate,
  Manual,
  ManualChat,
  AIGeneratedQuiz,
  ManualSummary,
  Video,
  VideoCategory,
  VideoQuality,
  VideoChapter,
  VideoTranscription,
  VideoProgress,
  VideoNote,
  VideoBookmark,
  VideoComment,
  VideoAnalytics,
  VideoQuizPoint,
  VideoPlaylist,
  PlaylistVideo,
  InteractiveVideoLayer,
  InteractiveVideoResult,
  InteractiveVideoAnswer
};