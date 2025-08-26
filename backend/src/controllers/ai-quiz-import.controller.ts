import { Request, Response } from 'express';
import { sequelize } from '@config/database';
import Quiz from '@models/Quiz.model';
import Question from '@models/Question.model';
import AIGeneratedQuiz from '@models/AIGeneratedQuiz.model';

/**
 * Import an AI generated quiz to the main evaluations system
 * This creates a fully functional quiz that can be shared publicly
 */
export const importAIQuizToEvaluations = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { aiQuizId } = req.params;
    const { 
      isPublic = false,
      timeLimit = 30,
      passingScore = 60,
      showResults = true,
      randomizeQuestions = false,
      allowMultipleAttempts = true,
      maxAttempts = 3
    } = req.body;

    // Fetch the AI generated quiz
    const aiQuiz = await AIGeneratedQuiz.findByPk(aiQuizId);
    
    if (!aiQuiz) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'AI generated quiz not found'
      });
    }

    // Get user ID and tenant ID from auth or defaults
    const userId = req.user?.id || 2; // Default to admin user
    const tenantId = req.tenantId || req.user?.tenant_id || 1; // Get tenant from request

    // Ensure title meets validation requirements (min 3 chars)
    const quizTitle = aiQuiz.title && aiQuiz.title.length >= 3 
      ? aiQuiz.title 
      : `Evaluación AI #${aiQuizId}`;

    // Create the main quiz (use camelCase for Sequelize model fields)
    const quiz = await Quiz.create({
      title: quizTitle,
      description: aiQuiz.description || `Evaluación generada desde el manual`,
      creatorId: userId,  // Use camelCase - Sequelize maps to creator_id
      tenantId: tenantId,  // Add tenant ID
      isPublic: isPublic,
      isActive: true,
      timeLimitMinutes: timeLimit,  // Use camelCase
      passPercentage: passingScore,  // Use camelCase
      showScore: showResults,
      showCorrectAnswers: showResults,
      shuffleQuestions: randomizeQuestions,
      shuffleOptions: false,  // Default
      allowReview: allowMultipleAttempts,
      maxAttempts: maxAttempts,
      totalQuestions: aiQuiz.questions?.length || 0,
      metadata: {
        source: 'ai_generated',
        ai_quiz_id: aiQuizId,
        manual_id: aiQuiz.manual_id,
        imported_at: new Date().toISOString()
      }
    }, { transaction });

    // Process and create questions
    const aiQuestions = aiQuiz.questions || [];
    const createdQuestions = [];

    for (let i = 0; i < aiQuestions.length; i++) {
      const aiQuestion = aiQuestions[i];
      
      // Ensure we have proper structure (use camelCase for model properties)
      const questionData: any = {
        quizId: quiz.id,  // Use camelCase - Sequelize will map to quiz_id
        questionText: aiQuestion.question || aiQuestion.text || `Pregunta ${i + 1}`,
        questionType: aiQuestion.type || 'multiple_choice',
        points: aiQuestion.points || 10,
        orderPosition: i + 1,
        explanation: aiQuestion.explanation || null,
        metadata: {}
      };

      // Handle different question types (check questionType which is the camelCase version)
      if (questionData.questionType === 'multiple_choice' || questionData.questionType === 'single_choice') {
        // Ensure options array exists
        const options = aiQuestion.options || aiQuestion.answers || [];
        
        // Convert correct_answer index to actual answer value if needed
        let correctAnswer = aiQuestion.correct_answer;
        
        if (typeof correctAnswer === 'number' && options.length > 0) {
          // If correct_answer is an index, get the actual value
          correctAnswer = options[correctAnswer] || options[0];
        } else if (!correctAnswer && options.length > 0) {
          // Default to first option if no correct answer specified
          correctAnswer = options[0];
        }

        questionData.options = options;
        // correctAnswers must be an array for the database
        questionData.correctAnswers = [correctAnswer];  // Wrap in array
        questionData.metadata = {
          ...questionData.metadata,
          original_correct_index: aiQuestion.correct_answer,
          original_correct_value: correctAnswer
        };
      } else if (questionData.questionType === 'true_false') {
        questionData.options = ['Verdadero', 'Falso'];
        const trueFalseAnswer = aiQuestion.correct_answer === true || 
                                aiQuestion.correct_answer === 'true' || 
                                aiQuestion.correct_answer === 'Verdadero' 
                                ? 'Verdadero' : 'Falso';
        questionData.correctAnswers = [trueFalseAnswer];  // Wrap in array
      } else if (questionData.questionType === 'short_answer' || questionData.questionType === 'open_text') {
        const textAnswer = aiQuestion.correct_answer || aiQuestion.answer || '';
        questionData.correctAnswers = [textAnswer];  // Wrap in array
        questionData.options = null;
      }

      const question = await Question.create(questionData, { transaction });
      createdQuestions.push(question);
    }

    // Update AI quiz metadata to indicate it was imported (keep status as 'ready')
    await aiQuiz.update({
      metadata: {
        ...aiQuiz.metadata,
        imported: true,
        imported_to_quiz_id: quiz.id,
        imported_at: new Date().toISOString()
      }
    }, { transaction });

    await transaction.commit();

    // Fetch the complete quiz with questions
    const completeQuiz = await Quiz.findByPk(quiz.id, {
      include: [{
        model: Question,
        as: 'questions',
        order: [['order', 'ASC']]
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Evaluación importada exitosamente',
      data: {
        id: completeQuiz.id,
        title: completeQuiz.title,
        description: completeQuiz.description,
        questionCount: createdQuestions.length,
        totalPoints: createdQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
        publicUrl: isPublic ? `/quiz/${completeQuiz.id}/public` : null,
        editUrl: `/quizzes/${completeQuiz.id}/edit`,
        quiz: completeQuiz
      }
    });

  } catch (error: any) {
    await transaction.rollback();
    console.error('Error importing AI quiz to evaluations:', error);
    res.status(500).json({
      success: false,
      error: 'Error al importar la evaluación',
      details: error.message
    });
  }
};

/**
 * Direct creation of quiz from manual with custom parameters
 */
export const createQuizFromManual = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { manualId } = req.params;
    const {
      title,
      description,
      questions,
      settings = {}
    } = req.body;

    // Get user ID and tenant ID from auth or defaults
    const userId = req.user?.id || 2;
    const tenantId = req.tenantId || req.user?.tenant_id || 1;

    // Ensure title meets validation requirements (min 3 chars)
    const finalTitle = title && title.length >= 3 ? title : `Evaluación del Manual ${manualId}`;

    // Create quiz with all settings (use camelCase for model fields)
    const quiz = await Quiz.create({
      title: finalTitle,
      description: description || 'Evaluación generada automáticamente desde el manual',
      creatorId: userId,  // Use camelCase
      tenantId: tenantId,  // Add tenant ID
      isPublic: settings.isPublic || false,
      isActive: true,
      timeLimitMinutes: settings.timeLimit || 30,
      passPercentage: settings.passingScore || 60,
      showScore: settings.showResults !== false,
      showCorrectAnswers: settings.showResults !== false,
      shuffleQuestions: settings.randomizeQuestions || false,
      shuffleOptions: false,
      allowReview: settings.allowMultipleAttempts !== false,
      maxAttempts: settings.maxAttempts || 3,
      totalQuestions: questions?.length || 0,
      metadata: {
        source: 'manual',
        manual_id: manualId,
        created_at: new Date().toISOString()
      }
    }, { transaction });

    // Create questions
    const createdQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      const questionData: any = {
        quizId: quiz.id,
        questionText: q.question,
        questionType: q.type || 'multiple_choice',
        points: q.points || 10,
        orderPosition: i + 1,
        explanation: q.explanation || null,
        options: q.options || [],
        // Ensure correctAnswers is always an array
        correctAnswers: Array.isArray(q.correctAnswer) 
          ? q.correctAnswer 
          : [q.correctAnswer || q.correct_answer || ''],
        metadata: q.metadata || {}
      };

      const question = await Question.create(questionData, { transaction });
      createdQuestions.push(question);
    }

    await transaction.commit();

    // Return complete quiz
    const completeQuiz = await Quiz.findByPk(quiz.id, {
      include: [{
        model: Question,
        as: 'questions',
        order: [['order', 'ASC']]
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Evaluación creada exitosamente',
      data: completeQuiz
    });

  } catch (error: any) {
    await transaction.rollback();
    console.error('Error creating quiz from manual:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la evaluación',
      details: error.message
    });
  }
};

export default {
  importAIQuizToEvaluations,
  createQuizFromManual
};