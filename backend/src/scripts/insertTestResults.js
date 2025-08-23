const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('aristotest', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log
});

async function insertTestResults() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // First, get a public quiz
    const [quizzes] = await sequelize.query(
      'SELECT id, title FROM quizzes WHERE is_public = true LIMIT 1'
    );
    
    if (!quizzes || quizzes.length === 0) {
      console.log('No public quizzes found. Please create a public quiz first.');
      return;
    }

    const quizId = quizzes[0].id;
    console.log(`Using quiz: ${quizzes[0].title} (ID: ${quizId})`);

    // Insert test results with all required fields
    const testResults = [
      {
        quiz_id: quizId,
        participant_name: 'Juan Pérez',
        participant_email: 'juan@example.com',
        score: 85.50,
        total_points: 100,
        earned_points: 85,
        correct_answers: 17,
        total_questions: 20,
        answers: JSON.stringify({
          "1": { "answer": "A", "correct": true },
          "2": { "answer": "B", "correct": true },
          "3": { "answer": "C", "correct": true }
        })
      },
      {
        quiz_id: quizId,
        participant_name: 'María García',
        participant_email: 'maria@example.com',
        score: 92.00,
        total_points: 100,
        earned_points: 92,
        correct_answers: 18,
        total_questions: 20,
        answers: JSON.stringify({
          "1": { "answer": "A", "correct": true },
          "2": { "answer": "B", "correct": true },
          "3": { "answer": "D", "correct": false }
        })
      },
      {
        quiz_id: quizId,
        participant_name: 'Carlos López',
        participant_email: 'carlos@example.com',
        score: 65.00,
        total_points: 100,
        earned_points: 65,
        correct_answers: 13,
        total_questions: 20,
        answers: JSON.stringify({
          "1": { "answer": "B", "correct": false },
          "2": { "answer": "A", "correct": true },
          "3": { "answer": "C", "correct": true }
        })
      },
      {
        quiz_id: quizId,
        participant_name: 'Ana Martínez',
        participant_email: 'ana@example.com',
        score: 78.00,
        total_points: 100,
        earned_points: 78,
        correct_answers: 15,
        total_questions: 20,
        answers: JSON.stringify({
          "1": { "answer": "A", "correct": true },
          "2": { "answer": "B", "correct": true },
          "3": { "answer": "C", "correct": true }
        })
      },
      {
        quiz_id: quizId,
        participant_name: 'Pedro Rodríguez',
        participant_email: 'pedro@example.com',
        score: 45.00,
        total_points: 100,
        earned_points: 45,
        correct_answers: 9,
        total_questions: 20,
        answers: JSON.stringify({
          "1": { "answer": "C", "correct": false },
          "2": { "answer": "D", "correct": false },
          "3": { "answer": "A", "correct": true }
        })
      }
    ];

    for (const result of testResults) {
      // Add started_at as 30 minutes before now and completed_at as now
      const completedAt = new Date();
      const startedAt = new Date(completedAt.getTime() - 30 * 60 * 1000); // 30 minutes before
      
      await sequelize.query(
        `INSERT INTO public_quiz_results (
          quiz_id, participant_name, participant_email, score, 
          total_points, earned_points, correct_answers, total_questions, 
          answers, started_at, completed_at
        ) VALUES (
          :quiz_id, :participant_name, :participant_email, :score,
          :total_points, :earned_points, :correct_answers, :total_questions, 
          :answers::jsonb, :started_at, :completed_at
        )`,
        {
          replacements: {
            ...result,
            started_at: startedAt,
            completed_at: completedAt
          },
          type: Sequelize.QueryTypes.INSERT
        }
      );
      console.log(`Inserted result for ${result.participant_name}`);
    }

    console.log('\n✅ Test results inserted successfully!');
    console.log('You can now view them at http://localhost:5173/public-results');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

insertTestResults();