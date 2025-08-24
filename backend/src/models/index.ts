import User from './User.model';
import Organization from './Organization.model';
import Quiz from './Quiz.model';
import Question from './Question.model';
import QuizSession from './QuizSession.model';
import Participant from './Participant.model';
import Answer from './Answer.model';
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
import { setupAssociations } from './associations';
import { sequelize } from '../config/database';

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

// Setup all model associations
setupAssociations();

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
  PlaylistVideo
});

export {
  User,
  Organization,
  Quiz,
  Question,
  QuizSession,
  Participant,
  Answer,
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
};

export default {
  User,
  Organization,
  Quiz,
  Question,
  QuizSession,
  Participant,
  Answer,
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
};