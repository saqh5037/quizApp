import { Sequelize } from 'sequelize';
import path from 'path';
import bcrypt from 'bcryptjs';

// Use SQLite for local development
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: console.log,
});

async function initDatabase() {
  try {
    console.log('🚀 Initializing SQLite database...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Create tables
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'student',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER,
        created_by INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        difficulty VARCHAR(50),
        time_limit INTEGER,
        passing_score DECIMAL(5,2),
        is_public BOOLEAN DEFAULT false,
        tags TEXT,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT,
        accepted_answers TEXT,
        points DECIMAL(5,2) DEFAULT 1,
        explanation TEXT,
        media_url VARCHAR(500),
        "order" INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS quiz_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        host_id INTEGER NOT NULL,
        session_code VARCHAR(10) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'waiting',
        started_at DATETIME,
        ended_at DATETIME,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
        FOREIGN KEY (host_id) REFERENCES users(id)
      )
    `);

    console.log('✅ All tables created successfully');

    // Insert demo data
    console.log('🌱 Inserting demo data...');

    // Create organization
    await sequelize.query(`
      INSERT OR IGNORE INTO organizations (name, domain, settings)
      VALUES ('Demo Organization', 'demo.quizapp.com', '{"allowGuestAccess": true}')
    `);

    // Get organization ID
    const [[org]] = await sequelize.query(
      `SELECT id FROM organizations WHERE domain = 'demo.quizapp.com'`
    ) as any;
    const orgId = org.id;

    // Create demo users
    const users = [
      { email: 'admin@demo.com', password: 'admin123', name: 'Admin User', role: 'admin' },
      { email: 'teacher@demo.com', password: 'teacher123', name: 'Teacher Demo', role: 'teacher' },
      { email: 'student@demo.com', password: 'student123', name: 'Student Demo', role: 'student' },
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await sequelize.query(`
        INSERT OR IGNORE INTO users (organization_id, email, password, name, role, is_active, email_verified)
        VALUES (?, ?, ?, ?, ?, true, true)
      `, {
        replacements: [orgId, user.email, hashedPassword, user.name, user.role]
      });
      console.log(`✅ User created: ${user.email} / ${user.password}`);
    }

    // Get teacher ID
    const [[teacher]] = await sequelize.query(
      `SELECT id FROM users WHERE email = 'teacher@demo.com'`
    ) as any;
    const teacherId = teacher.id;

    // Create demo quiz
    await sequelize.query(`
      INSERT OR IGNORE INTO quizzes (
        organization_id, created_by, title, description, category, 
        difficulty, time_limit, passing_score, is_public, tags, settings
      )
      VALUES (?, ?, 'Mathematics Basics', 'Test your knowledge of basic mathematics', 
        'mathematics', 'easy', 600, 70, true, '["math","basics"]', 
        '{"shuffleQuestions": true, "shuffleAnswers": true}')
    `, {
      replacements: [orgId, teacherId]
    });

    // Get quiz ID
    const [[quiz]] = await sequelize.query(
      `SELECT id FROM quizzes WHERE title = 'Mathematics Basics'`
    ) as any;
    const quizId = quiz.id;

    // Create demo questions
    const questions = [
      {
        type: 'multiple_choice',
        question: 'What is 15 + 27?',
        options: '["42","41","43","40"]',
        correct_answer: '42',
        points: 10,
        order: 1
      },
      {
        type: 'multiple_choice',
        question: 'What is 8 × 7?',
        options: '["54","56","58","52"]',
        correct_answer: '56',
        points: 10,
        order: 2
      },
      {
        type: 'true_false',
        question: 'The square root of 144 is 12',
        options: '["true","false"]',
        correct_answer: 'true',
        points: 10,
        order: 3
      }
    ];

    for (const q of questions) {
      await sequelize.query(`
        INSERT INTO questions (quiz_id, type, question, options, correct_answer, points, "order")
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [quizId, q.type, q.question, q.options, q.correct_answer, q.points, q.order]
      });
    }

    console.log('✅ Demo quiz and questions created');

    console.log('\n🎉 Database initialization completed!');
    console.log('\n📝 Demo User Credentials:');
    console.log('========================');
    console.log('Admin:   admin@demo.com / admin123');
    console.log('Teacher: teacher@demo.com / teacher123');
    console.log('Student: student@demo.com / student123');
    console.log('========================\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run initialization
initDatabase()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });