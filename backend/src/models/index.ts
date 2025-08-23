import User from './User.model';
import Quiz from './Quiz.model';
import Question from './Question.model';
import QuizSession from './QuizSession.model';
import Participant from './Participant.model';
import Answer from './Answer.model';
import { setupAssociations } from './associations';

// Setup all model associations
setupAssociations();

export {
  User,
  Quiz,
  Question,
  QuizSession,
  Participant,
  Answer,
};

export default {
  User,
  Quiz,
  Question,
  QuizSession,
  Participant,
  Answer,
};