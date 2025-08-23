import bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize';
import User from '../models/User.model';
import Organization from '../models/Organization.model';
import Quiz from '../models/Quiz.model';
import Question from '../models/Question.model';

export async function seedDemoData() {
  try {
    console.log('🌱 Starting demo data seeding...');

    // Create demo organization
    const [demoOrg] = await Organization.findOrCreate({
      where: { domain: 'demo.quizapp.com' },
      defaults: {
        name: 'Demo Organization',
        domain: 'demo.quizapp.com',
        settings: {
          allowGuestAccess: true,
          maxQuizDuration: 3600,
          enableLeaderboard: true,
        },
      },
    });

    console.log('✅ Organization created:', demoOrg.name);

    // Create demo users
    const users = [
      {
        email: 'admin@demo.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
        organizationId: demoOrg.id,
      },
      {
        email: 'teacher@demo.com',
        password: 'teacher123',
        name: 'Teacher Demo',
        role: 'teacher',
        organizationId: demoOrg.id,
      },
      {
        email: 'student@demo.com',
        password: 'student123',
        name: 'Student Demo',
        role: 'student',
        organizationId: demoOrg.id,
      },
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: {
          ...userData,
          password: hashedPassword,
          isActive: true,
          emailVerified: true,
        },
      });

      if (created) {
        console.log(`✅ User created: ${user.email} (Password: ${userData.password})`);
      } else {
        console.log(`ℹ️ User already exists: ${user.email}`);
      }
    }

    // Get teacher user for creating demo quizzes
    const teacherUser = await User.findOne({ where: { email: 'teacher@demo.com' } });

    if (teacherUser) {
      // Create demo quizzes
      const quizzes = [
        {
          title: 'Mathematics Basics',
          description: 'Test your knowledge of basic mathematics',
          category: 'mathematics',
          difficulty: 'easy',
          timeLimit: 600,
          passingScore: 70,
          isPublic: true,
          tags: ['math', 'basics', 'arithmetic'],
        },
        {
          title: 'Science Quiz',
          description: 'General science questions for beginners',
          category: 'science',
          difficulty: 'medium',
          timeLimit: 900,
          passingScore: 60,
          isPublic: true,
          tags: ['science', 'physics', 'chemistry', 'biology'],
        },
        {
          title: 'History Timeline',
          description: 'Important events in world history',
          category: 'history',
          difficulty: 'medium',
          timeLimit: 1200,
          passingScore: 65,
          isPublic: true,
          tags: ['history', 'world', 'events'],
        },
      ];

      for (const quizData of quizzes) {
        const [quiz, created] = await Quiz.findOrCreate({
          where: { 
            title: quizData.title,
            createdBy: teacherUser.id,
          },
          defaults: {
            ...quizData,
            createdBy: teacherUser.id,
            organizationId: demoOrg.id,
            settings: {
              shuffleQuestions: true,
              shuffleAnswers: true,
              showCorrectAnswers: true,
              allowReview: true,
            },
          },
        });

        if (created) {
          console.log(`✅ Quiz created: ${quiz.title}`);

          // Add sample questions to the Math quiz
          if (quiz.title === 'Mathematics Basics') {
            const questions = [
              {
                quizId: quiz.id,
                type: 'multiple_choice',
                question: 'What is 15 + 27?',
                options: ['42', '41', '43', '40'],
                correctAnswer: '42',
                points: 10,
                order: 1,
              },
              {
                quizId: quiz.id,
                type: 'multiple_choice',
                question: 'What is 8 × 7?',
                options: ['54', '56', '58', '52'],
                correctAnswer: '56',
                points: 10,
                order: 2,
              },
              {
                quizId: quiz.id,
                type: 'true_false',
                question: 'The square root of 144 is 12',
                correctAnswer: 'true',
                points: 10,
                order: 3,
              },
              {
                quizId: quiz.id,
                type: 'multiple_choice',
                question: 'What is 100 ÷ 4?',
                options: ['25', '24', '26', '20'],
                correctAnswer: '25',
                points: 10,
                order: 4,
              },
              {
                quizId: quiz.id,
                type: 'short_answer',
                question: 'What is the value of π (pi) to 2 decimal places?',
                correctAnswer: '3.14',
                acceptedAnswers: ['3.14', '3,14'],
                points: 15,
                order: 5,
              },
            ];

            for (const questionData of questions) {
              await Question.create(questionData);
            }
            console.log(`  ✅ Added ${questions.length} questions to ${quiz.title}`);
          }

          // Add sample questions to Science quiz
          if (quiz.title === 'Science Quiz') {
            const questions = [
              {
                quizId: quiz.id,
                type: 'multiple_choice',
                question: 'What is the chemical symbol for water?',
                options: ['H2O', 'O2', 'CO2', 'NaCl'],
                correctAnswer: 'H2O',
                points: 10,
                order: 1,
              },
              {
                quizId: quiz.id,
                type: 'multiple_choice',
                question: 'What planet is known as the Red Planet?',
                options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
                correctAnswer: 'Mars',
                points: 10,
                order: 2,
              },
              {
                quizId: quiz.id,
                type: 'true_false',
                question: 'The speed of light is faster than the speed of sound',
                correctAnswer: 'true',
                points: 10,
                order: 3,
              },
              {
                quizId: quiz.id,
                type: 'multiple_choice',
                question: 'What is the largest organ in the human body?',
                options: ['Heart', 'Brain', 'Skin', 'Liver'],
                correctAnswer: 'Skin',
                points: 15,
                order: 4,
              },
            ];

            for (const questionData of questions) {
              await Question.create(questionData);
            }
            console.log(`  ✅ Added ${questions.length} questions to ${quiz.title}`);
          }
        } else {
          console.log(`ℹ️ Quiz already exists: ${quiz.title}`);
        }
      }
    }

    console.log('\n🎉 Demo data seeding completed successfully!');
    console.log('\n📝 Demo User Credentials:');
    console.log('========================');
    console.log('Admin:   admin@demo.com / admin123');
    console.log('Teacher: teacher@demo.com / teacher123');
    console.log('Student: student@demo.com / student123');
    console.log('========================\n');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  }
}

// Run seeder if executed directly
if (require.main === module) {
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'quiz_app',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres123',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      dialect: 'postgres',
      logging: false,
    }
  );

  sequelize
    .authenticate()
    .then(() => seedDemoData())
    .then(() => {
      console.log('✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}