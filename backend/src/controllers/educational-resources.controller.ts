import { Request, Response } from 'express';
import { Manual, ManualSummary, StudyGuide, FlashCard, User } from '../models/index';
import { Op } from 'sequelize';
import { getTenantContext } from '../middleware/tenant.middleware';
import geminiService from '../services/gemini.service';

export const generateEducationalResource = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const { 
      contentType,
      title,
      description,
      // Summary specific
      summaryType = 'brief',
      // Study Guide specific  
      difficultyLevel = 'beginner',
      estimatedTime = 60,
      learningObjectives = [],
      // Flash Cards specific
      cardCount = 20,
      cardDifficulty = 'medium',
      categories = [],
      // General
      isPublic = false,
      customPrompt
    } = req.body;
    const userId = (req as any).user?.id || 2; // Default to admin user for testing
    const { tenantId } = getTenantContext(req);

    // Validate input
    if (!title || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Title and content type are required'
      });
    }

    if (!['summary', 'study_guide', 'flash_cards'].includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type. Must be: summary, study_guide, or flash_cards'
      });
    }

    // Verify manual exists and user has access
    const manual = await Manual.findOne({
      where: {
        id: manualId,
        ...(tenantId && { tenant_id: tenantId })
      }
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    if (!manual.extracted_text) {
      return res.status(400).json({
        success: false,
        error: 'Manual content is not yet processed for content generation'
      });
    }

    let resource: any;

    // Create resource based on type
    switch (contentType) {
      case 'summary':
        if (!['brief', 'detailed', 'key_points'].includes(summaryType)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid summary type. Must be: brief, detailed, or key_points'
          });
        }

        resource = await ManualSummary.create({
          manual_id: manualId,
          user_id: userId,
          title: title.trim(),
          summary_type: summaryType,
          status: 'generating',
          generation_prompt: customPrompt || null,
          metadata: { isPublic, description }
        });

        // Generate summary asynchronously
        generateSummaryAsync(resource, manual.extracted_text, summaryType, customPrompt);
        break;

      case 'study_guide':
        if (!['beginner', 'intermediate', 'advanced'].includes(difficultyLevel)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid difficulty level. Must be: beginner, intermediate, or advanced'
          });
        }

        if (estimatedTime < 15 || estimatedTime > 480) {
          return res.status(400).json({
            success: false,
            error: 'Estimated time must be between 15 and 480 minutes'
          });
        }

        resource = await StudyGuide.create({
          manual_id: manualId,
          user_id: userId,
          title: title.trim(),
          description: description?.trim() || null,
          difficulty_level: difficultyLevel,
          estimated_time: estimatedTime,
          topics: [],
          learning_objectives: learningObjectives.filter(obj => obj.trim()),
          is_public: isPublic,
          status: 'generating',
          metadata: { customPrompt }
        });

        // Generate study guide asynchronously
        generateStudyGuideAsync(resource, manual.extracted_text, difficultyLevel, estimatedTime, learningObjectives, customPrompt);
        break;

      case 'flash_cards':
        if (cardCount < 5 || cardCount > 100) {
          return res.status(400).json({
            success: false,
            error: 'Card count must be between 5 and 100'
          });
        }

        if (!['easy', 'medium', 'hard'].includes(cardDifficulty)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid card difficulty. Must be: easy, medium, or hard'
          });
        }

        resource = await FlashCard.create({
          manual_id: manualId,
          user_id: userId,
          set_title: title.trim(),
          set_description: description?.trim() || null,
          cards: [],
          total_cards: cardCount,
          category: categories.length > 0 ? categories[0] : null,
          difficulty_level: cardDifficulty,
          tags: categories,
          is_public: isPublic,
          study_stats: {
            times_studied: 0,
            total_reviews: 0,
            correct_answers: 0,
            last_studied: null
          },
          status: 'generating',
          metadata: { customPrompt }
        });

        // Generate flash cards asynchronously
        generateFlashCardsAsync(resource, manual.extracted_text, cardCount, cardDifficulty, categories, customPrompt);
        break;
    }

    res.status(201).json({
      success: true,
      data: {
        id: resource.id,
        title: resource.title || resource.set_title,
        contentType,
        status: resource.status,
        manualId: manual.id,
        manualTitle: manual.title
      },
      message: `${contentType.replace('_', ' ')} generation started. Check status for completion.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate educational resource'
    });
  }
};

// Async generation functions
const generateSummaryAsync = async (summary: any, extractedText: string, summaryType: string, customPrompt?: string) => {
  try {
    const content = await geminiService.generateSummary(extractedText, summaryType, customPrompt);
    const wordCount = content.trim().split(/\s+/).length;

    summary.content = content;
    summary.word_count = wordCount;
    summary.status = 'ready';
    await summary.save();
  } catch (error) {
    summary.status = 'failed';
    summary.metadata = { ...summary.metadata, error: error.message };
    await summary.save();
  }
};

const generateStudyGuideAsync = async (
  studyGuide: any, 
  extractedText: string, 
  difficultyLevel: string, 
  estimatedTime: number, 
  learningObjectives: string[], 
  customPrompt?: string
) => {
  try {
    const content = await geminiService.generateStudyGuide(
      extractedText, 
      difficultyLevel, 
      estimatedTime, 
      learningObjectives, 
      customPrompt
    );

    // Extract topics from the generated content
    const topics = await geminiService.extractTopics(extractedText);

    studyGuide.content = content;
    studyGuide.topics = topics;
    studyGuide.status = 'ready';
    await studyGuide.save();
  } catch (error) {
    studyGuide.status = 'failed';
    studyGuide.metadata = { ...studyGuide.metadata, error: error.message };
    await studyGuide.save();
  }
};

const generateFlashCardsAsync = async (
  flashCard: any, 
  extractedText: string, 
  cardCount: number, 
  difficulty: string, 
  categories: string[], 
  customPrompt?: string
) => {
  try {
    const cards = await geminiService.generateFlashCards(
      extractedText, 
      cardCount, 
      difficulty, 
      categories, 
      customPrompt
    );

    flashCard.cards = cards;
    flashCard.status = 'ready';
    await flashCard.save();
  } catch (error) {
    flashCard.status = 'failed';
    flashCard.metadata = { ...flashCard.metadata, error: error.message };
    await flashCard.save();
  }
};

export const getEducationalResource = async (req: Request, res: Response) => {
  try {
    const { resourceType, resourceId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);

    let resource: any;
    let model: any;

    // Determine which model to use
    switch (resourceType) {
      case 'summary':
        model = ManualSummary;
        break;
      case 'study_guide':
        model = StudyGuide;
        break;
      case 'flash_cards':
        model = FlashCard;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid resource type'
        });
    }

    const whereClause: any = { id: resourceId };
    
    // Access control
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      whereClause[Op.or] = [
        { user_id: userId },
        { is_public: true }
      ];
    }

    resource = await model.findOne({
      where: whereClause,
      include: [
        {
          model: Manual,
          as: 'manual',
          attributes: ['id', 'title', 'description']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        ...resource.toJSON(),
        resourceType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch educational resource'
    });
  }
};

export const listEducationalResources = async (req: Request, res: Response) => {
  try {
    const { manualId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { tenantId } = getTenantContext(req);

    // Verify manual access
    const manual = await Manual.findOne({
      where: {
        id: manualId,
        ...(tenantId && { tenant_id: tenantId }),
        [Op.or]: [
          { user_id: userId },
          { is_public: true }
        ]
      }
    });

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: 'Manual not found or access denied'
      });
    }

    const whereClause: any = { manual_id: manualId };
    
    // Access control for resources
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      whereClause[Op.or] = [
        { user_id: userId },
        { is_public: true }
      ];
    }

    // Fetch all resource types
    const [summaries, studyGuides, flashCards] = await Promise.all([
      ManualSummary.findAll({
        where: whereClause,
        attributes: ['id', 'title', 'summary_type', 'status', 'created_at', 'user_id'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName']
        }],
        order: [['created_at', 'DESC']]
      }),
      StudyGuide.findAll({
        where: whereClause,
        attributes: ['id', 'title', 'difficulty_level', 'estimated_time', 'status', 'created_at', 'user_id'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName']
        }],
        order: [['created_at', 'DESC']]
      }),
      FlashCard.findAll({
        where: whereClause,
        attributes: ['id', 'set_title', 'total_cards', 'difficulty_level', 'status', 'created_at', 'user_id'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName']
        }],
        order: [['created_at', 'DESC']]
      })
    ]);

    res.json({
      success: true,
      data: {
        manual: {
          id: manual.id,
          title: manual.title,
          description: manual.description
        },
        resources: {
          summaries: summaries.map(s => ({
            ...s.toJSON(),
            resourceType: 'summary'
          })),
          studyGuides: studyGuides.map(sg => ({
            ...sg.toJSON(),
            resourceType: 'study_guide'
          })),
          flashCards: flashCards.map(fc => ({
            ...fc.toJSON(),
            resourceType: 'flash_cards',
            title: fc.set_title
          }))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list educational resources'
    });
  }
};

export const updateFlashCardStats = async (req: Request, res: Response) => {
  try {
    const { flashCardId } = req.params;
    const { correctAnswers, totalReviews } = req.body;
    const userId = (req as any).user?.id;

    const flashCard = await FlashCard.findOne({
      where: {
        id: flashCardId,
        user_id: userId
      }
    });

    if (!flashCard) {
      return res.status(404).json({
        success: false,
        error: 'Flash card set not found or access denied'
      });
    }

    // Update stats
    const currentStats = flashCard.study_stats || {};
    const updatedStats = {
      times_studied: (currentStats.times_studied || 0) + 1,
      total_reviews: (currentStats.total_reviews || 0) + totalReviews,
      correct_answers: (currentStats.correct_answers || 0) + correctAnswers,
      last_studied: new Date()
    };

    flashCard.study_stats = updatedStats;
    await flashCard.save();

    res.json({
      success: true,
      data: {
        id: flashCard.id,
        stats: updatedStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update flash card stats'
    });
  }
};