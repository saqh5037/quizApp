import { sequelize } from '../config/database';
import Organization from '../models/Organization.model';
import User, { UserRole } from '../models/User.model';
import Quiz from '../models/Quiz.model';
import Question from '../models/Question.model';
import QuizSession from '../models/QuizSession.model';
import Participant from '../models/Participant.model';
import Answer from '../models/Answer.model';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data (be careful in production!)
    await sequelize.sync({ force: true });
    
    // =============================================
    // Create Organizations
    // =============================================
    const [org1, org2] = await Organization.bulkCreate([
      {
        name: 'Demo School',
        slug: 'demo-school',
        logoUrl: 'https://ui-avatars.com/api/?name=Demo+School&background=03A9F4&color=fff',
        settings: {
          maxUsers: 100,
          maxQuizzes: 50,
          features: {
            advancedReporting: true,
            customBranding: true,
          },
        },
        isActive: true,
      },
      {
        name: 'Test University',
        slug: 'test-university',
        logoUrl: 'https://ui-avatars.com/api/?name=Test+University&background=4CAF50&color=fff',
        settings: {
          maxUsers: 500,
          maxQuizzes: 200,
          features: {
            advancedReporting: true,
            customBranding: true,
            ssoEnabled: true,
          },
        },
        isActive: true,
      },
    ]);

    console.log('✅ Organizations created');

    // =============================================
    // Create Users
    // =============================================
    const users = await User.bulkCreate([
      {
        email: 'admin@demo.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        organizationId: org1.id,
        isActive: true,
        isVerified: true,
        metadata: {
          preferences: { theme: 'dark' },
        },
      },
      {
        email: 'teacher@demo.com',
        password: 'Teacher123!',
        firstName: 'John',
        lastName: 'Teacher',
        role: UserRole.TEACHER,
        organizationId: org1.id,
        isActive: true,
        isVerified: true,
      },
      {
        email: 'teacher2@demo.com',
        password: 'Teacher123!',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: UserRole.TEACHER,
        organizationId: org2.id,
        isActive: true,
        isVerified: true,
      },
      {
        email: 'student@demo.com',
        password: 'Student123!',
        firstName: 'Alice',
        lastName: 'Student',
        role: UserRole.STUDENT,
        organizationId: org1.id,
        isActive: true,
        isVerified: true,
      },
      {
        email: 'student2@demo.com',
        password: 'Student123!',
        firstName: 'Bob',
        lastName: 'Smith',
        role: UserRole.STUDENT,
        organizationId: org1.id,
        isActive: true,
        isVerified: true,
      },
    ]);

    const [admin, teacher1, teacher2, student1, student2] = users;
    console.log('✅ Users created');

    // =============================================
    // Create Quizzes
    // =============================================
    const quizzes = await Quiz.bulkCreate([
      {
        title: 'JavaScript Fundamentals',
        description: 'Test your knowledge of JavaScript basics including variables, functions, and control flow.',
        coverImageUrl: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a',
        creatorId: teacher1.id,
        organizationId: org1.id,
        category: 'Programming',
        tags: ['javascript', 'programming', 'web development'],
        difficulty: 'medium',
        estimatedTimeMinutes: 15,
        passPercentage: 70,
        maxAttempts: 3,
        shuffleQuestions: true,
        shuffleOptions: true,
        showCorrectAnswers: true,
        showScore: true,
        allowReview: true,
        instructions: 'Answer all questions to the best of your ability. You have 15 minutes to complete this quiz.',
        settings: {
          allowBackNavigation: true,
          showQuestionNumbers: true,
          showProgressBar: true,
        },
        isPublic: true,
        isActive: true,
      },
      {
        title: 'Math Quiz - Algebra Basics',
        description: 'Basic algebra concepts including equations, inequalities, and functions.',
        coverImageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904',
        creatorId: teacher2.id,
        organizationId: org2.id,
        category: 'Mathematics',
        tags: ['math', 'algebra', 'equations'],
        difficulty: 'easy',
        estimatedTimeMinutes: 10,
        passPercentage: 60,
        maxAttempts: 2,
        shuffleQuestions: false,
        shuffleOptions: true,
        showCorrectAnswers: true,
        showScore: true,
        allowReview: true,
        isPublic: true,
        isActive: true,
      },
      {
        title: 'World History Quiz',
        description: 'Test your knowledge of major historical events and figures.',
        coverImageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1',
        creatorId: teacher1.id,
        organizationId: org1.id,
        category: 'History',
        tags: ['history', 'world history', 'education'],
        difficulty: 'medium',
        estimatedTimeMinutes: 20,
        passPercentage: 65,
        maxAttempts: 1,
        shuffleQuestions: true,
        shuffleOptions: true,
        showCorrectAnswers: false,
        showScore: true,
        allowReview: false,
        isPublic: false,
        isActive: true,
      },
      {
        title: 'Science - Biology Fundamentals',
        description: 'Basic concepts in biology including cells, genetics, and ecosystems.',
        coverImageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d',
        creatorId: teacher2.id,
        organizationId: org2.id,
        category: 'Science',
        tags: ['science', 'biology', 'nature'],
        difficulty: 'hard',
        estimatedTimeMinutes: 25,
        passPercentage: 75,
        maxAttempts: 2,
        shuffleQuestions: true,
        shuffleOptions: true,
        showCorrectAnswers: true,
        showScore: true,
        allowReview: true,
        timeLimitMinutes: 30,
        isPublic: true,
        isActive: true,
      },
      {
        title: 'English Grammar Test',
        description: 'Comprehensive test covering grammar rules, punctuation, and sentence structure.',
        coverImageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d',
        creatorId: teacher1.id,
        organizationId: org1.id,
        category: 'Language',
        tags: ['english', 'grammar', 'language'],
        difficulty: 'medium',
        estimatedTimeMinutes: 15,
        passPercentage: 70,
        maxAttempts: 3,
        shuffleQuestions: false,
        shuffleOptions: false,
        showCorrectAnswers: true,
        showScore: true,
        allowReview: true,
        isPublic: true,
        isActive: true,
      },
    ]);

    console.log('✅ Quizzes created');

    // =============================================
    // Create Questions for JavaScript Quiz
    // =============================================
    const jsQuiz = quizzes[0];
    await Question.bulkCreate([
      {
        quizId: jsQuiz.id,
        questionText: 'What is the correct way to declare a variable in JavaScript?',
        questionType: 'multiple_choice',
        explanation: 'In modern JavaScript, `let` and `const` are preferred over `var` for variable declaration.',
        hint: 'Think about modern JavaScript practices.',
        difficulty: 'easy',
        points: 10,
        orderPosition: 1,
        options: [
          { id: 'a', text: 'var x = 5;', isCorrect: false },
          { id: 'b', text: 'let x = 5;', isCorrect: true },
          { id: 'c', text: 'const x = 5;', isCorrect: true },
          { id: 'd', text: 'All of the above', isCorrect: true },
        ],
        correctAnswers: ['d'],
      },
      {
        quizId: jsQuiz.id,
        questionText: 'JavaScript is a statically typed language.',
        questionType: 'true_false',
        explanation: 'JavaScript is dynamically typed, meaning variable types are determined at runtime.',
        difficulty: 'easy',
        points: 5,
        orderPosition: 2,
        options: [
          { id: 'true', text: 'True', isCorrect: false },
          { id: 'false', text: 'False', isCorrect: true },
        ],
        correctAnswers: [false],
      },
      {
        quizId: jsQuiz.id,
        questionText: 'What will be the output of: console.log(typeof null);',
        questionType: 'short_answer',
        explanation: 'This is a famous JavaScript quirk where typeof null returns "object".',
        difficulty: 'hard',
        points: 15,
        orderPosition: 3,
        correctAnswers: ['object', '"object"'],
        validationRules: {
          caseSensitive: false,
          trimSpaces: true,
        },
      },
      {
        quizId: jsQuiz.id,
        questionText: 'Which array method does NOT mutate the original array?',
        questionType: 'multiple_choice',
        explanation: 'Methods like map, filter, and concat return new arrays without modifying the original.',
        difficulty: 'medium',
        points: 10,
        orderPosition: 4,
        options: [
          { id: 'a', text: 'push()', isCorrect: false },
          { id: 'b', text: 'pop()', isCorrect: false },
          { id: 'c', text: 'map()', isCorrect: true },
          { id: 'd', text: 'sort()', isCorrect: false },
        ],
        correctAnswers: ['c'],
      },
      {
        quizId: jsQuiz.id,
        questionText: 'What is a closure in JavaScript?',
        questionType: 'multiple_choice',
        explanation: 'A closure gives you access to an outer function\'s scope from an inner function.',
        difficulty: 'hard',
        points: 15,
        orderPosition: 5,
        options: [
          { id: 'a', text: 'A function that has access to variables in its outer scope', isCorrect: true },
          { id: 'b', text: 'A way to close a function', isCorrect: false },
          { id: 'c', text: 'A type of loop', isCorrect: false },
          { id: 'd', text: 'A method to end a program', isCorrect: false },
        ],
        correctAnswers: ['a'],
        timeLimitSeconds: 60,
      },
    ]);

    // =============================================
    // Create Questions for Math Quiz
    // =============================================
    const mathQuiz = quizzes[1];
    await Question.bulkCreate([
      {
        quizId: mathQuiz.id,
        questionText: 'Solve for x: 2x + 5 = 15',
        questionType: 'short_answer',
        explanation: '2x + 5 = 15 → 2x = 10 → x = 5',
        difficulty: 'easy',
        points: 10,
        orderPosition: 1,
        correctAnswers: ['5', 'x=5', 'x = 5'],
        validationRules: {
          caseSensitive: false,
          trimSpaces: true,
        },
      },
      {
        quizId: mathQuiz.id,
        questionText: 'What is the slope of the line y = 3x + 2?',
        questionType: 'multiple_choice',
        explanation: 'In the equation y = mx + b, m represents the slope.',
        difficulty: 'easy',
        points: 10,
        orderPosition: 2,
        options: [
          { id: 'a', text: '2', isCorrect: false },
          { id: 'b', text: '3', isCorrect: true },
          { id: 'c', text: '-3', isCorrect: false },
          { id: 'd', text: '1/3', isCorrect: false },
        ],
        correctAnswers: ['b'],
      },
      {
        quizId: mathQuiz.id,
        questionText: 'The quadratic formula can be used to solve any quadratic equation.',
        questionType: 'true_false',
        explanation: 'The quadratic formula works for all quadratic equations of the form ax² + bx + c = 0.',
        difficulty: 'medium',
        points: 5,
        orderPosition: 3,
        options: [
          { id: 'true', text: 'True', isCorrect: true },
          { id: 'false', text: 'False', isCorrect: false },
        ],
        correctAnswers: [true],
      },
    ]);

    // =============================================
    // Create more questions for other quizzes...
    // =============================================
    
    console.log('✅ Questions created');

    // =============================================
    // Create Quiz Sessions
    // =============================================
    const sessions = await QuizSession.bulkCreate([
      {
        quizId: jsQuiz.id,
        hostId: teacher1.id,
        sessionCode: 'DEMO1234',
        name: 'Morning JavaScript Class',
        status: 'completed',
        mode: 'live',
        maxParticipants: 30,
        allowLateJoining: true,
        showLeaderboard: true,
        nicknameGenerator: true,
        startedAt: new Date(Date.now() - 86400000), // Yesterday
        endedAt: new Date(Date.now() - 82800000), // Yesterday + 1 hour
        statistics: {
          totalParticipants: 2,
          completedParticipants: 2,
          averageScore: 75,
          highestScore: 85,
          lowestScore: 65,
          averageTimeSeconds: 600,
        },
      },
      {
        quizId: mathQuiz.id,
        hostId: teacher2.id,
        sessionCode: 'MATH5678',
        name: 'Algebra Practice Session',
        status: 'waiting',
        mode: 'live',
        maxParticipants: 50,
        allowLateJoining: true,
        showLeaderboard: true,
        nicknameGenerator: false,
        requireNames: true,
      },
    ]);

    console.log('✅ Quiz sessions created');

    // =============================================
    // Create Participants for completed session
    // =============================================
    const completedSession = sessions[0];
    const participants = await Participant.bulkCreate([
      {
        sessionId: completedSession.id,
        userId: student1.id,
        nickname: 'Alice',
        email: student1.email,
        status: 'finished',
        score: 85,
        correctAnswers: 4,
        incorrectAnswers: 1,
        unanswered: 0,
        timeTakenSeconds: 540,
        rankPosition: 1,
        streakCount: 3,
        joinedAt: new Date(Date.now() - 86400000),
        startedAt: new Date(Date.now() - 86400000),
        finishedAt: new Date(Date.now() - 82800000),
      },
      {
        sessionId: completedSession.id,
        userId: student2.id,
        nickname: 'Bob',
        email: student2.email,
        status: 'finished',
        score: 65,
        correctAnswers: 3,
        incorrectAnswers: 2,
        unanswered: 0,
        timeTakenSeconds: 660,
        rankPosition: 2,
        streakCount: 1,
        joinedAt: new Date(Date.now() - 86400000),
        startedAt: new Date(Date.now() - 86400000),
        finishedAt: new Date(Date.now() - 82800000),
      },
    ]);

    console.log('✅ Participants created');

    // =============================================
    // Create sample answers
    // =============================================
    const questions = await Question.findAll({ where: { quizId: jsQuiz.id } });
    
    // Alice's answers (mostly correct)
    await Answer.bulkCreate([
      {
        participantId: participants[0].id,
        questionId: questions[0].id,
        sessionId: completedSession.id,
        answerValue: { selected: ['d'] },
        isCorrect: true,
        pointsEarned: 10,
        timeTakenSeconds: 45,
      },
      {
        participantId: participants[0].id,
        questionId: questions[1].id,
        sessionId: completedSession.id,
        answerValue: { selected: false },
        isCorrect: true,
        pointsEarned: 5,
        timeTakenSeconds: 20,
      },
      {
        participantId: participants[0].id,
        questionId: questions[2].id,
        sessionId: completedSession.id,
        answerValue: { text: 'object' },
        isCorrect: true,
        pointsEarned: 15,
        timeTakenSeconds: 60,
      },
      {
        participantId: participants[0].id,
        questionId: questions[3].id,
        sessionId: completedSession.id,
        answerValue: { selected: ['c'] },
        isCorrect: true,
        pointsEarned: 10,
        timeTakenSeconds: 30,
      },
      {
        participantId: participants[0].id,
        questionId: questions[4].id,
        sessionId: completedSession.id,
        answerValue: { selected: ['b'] },
        isCorrect: false,
        pointsEarned: 0,
        timeTakenSeconds: 50,
      },
    ]);

    // Bob's answers (mixed results)
    await Answer.bulkCreate([
      {
        participantId: participants[1].id,
        questionId: questions[0].id,
        sessionId: completedSession.id,
        answerValue: { selected: ['b'] },
        isCorrect: false,
        pointsEarned: 0,
        timeTakenSeconds: 60,
      },
      {
        participantId: participants[1].id,
        questionId: questions[1].id,
        sessionId: completedSession.id,
        answerValue: { selected: false },
        isCorrect: true,
        pointsEarned: 5,
        timeTakenSeconds: 25,
      },
      {
        participantId: participants[1].id,
        questionId: questions[2].id,
        sessionId: completedSession.id,
        answerValue: { text: 'string' },
        isCorrect: false,
        pointsEarned: 0,
        timeTakenSeconds: 90,
      },
      {
        participantId: participants[1].id,
        questionId: questions[3].id,
        sessionId: completedSession.id,
        answerValue: { selected: ['c'] },
        isCorrect: true,
        pointsEarned: 10,
        timeTakenSeconds: 40,
      },
      {
        participantId: participants[1].id,
        questionId: questions[4].id,
        sessionId: completedSession.id,
        answerValue: { selected: ['a'] },
        isCorrect: true,
        pointsEarned: 15,
        timeTakenSeconds: 55,
      },
    ]);

    console.log('✅ Answers created');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('Admin: admin@demo.com / Admin123!');
    console.log('Teacher: teacher@demo.com / Teacher123!');
    console.log('Student: student@demo.com / Student123!');
    console.log('\n🔑 Session codes:');
    console.log('Completed session: DEMO1234');
    console.log('Active session: MATH5678');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;